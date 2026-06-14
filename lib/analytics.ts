import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as lancedb from "@lancedb/lancedb";
import type { ChatMode } from "./types";

// 问答埋点 —— 把每次提问记一条日志到 LanceDB(随 LANCEDB_DIR 落盘,数据不出境)。
// 用于 /admin 的「使用分析」:活跃度、场景分布、知识库命中率、热门文档、知识盲区。
// 只有管理员能读;普通用户/匿名访客看不到。
const DB_DIR = process.env.LANCEDB_DIR || path.join(process.cwd(), ".lancedb");
const LOGS = "query_logs";

// 保留期:只统计近 90 天,更老的在聚合时顺手清理,控制表体积(省空间)。
const RETENTION_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;

// 只有这两种模式走 RAG(会检索知识库),命中率/盲区统计只对它们有意义。
const RAG_MODES: ReadonlySet<string> = new Set(["docs", "support"]);

export interface QueryLogRow {
  id: string;
  ts: number; // 毫秒时间戳
  ownerId: string; // 登录用户 id 或 anon-xxx
  anon: boolean; // 是否未登录访客
  isAdmin: boolean; // 是否管理员提问(默认从统计中排除,避免自测污染数据)
  mode: string; // ChatMode
  query: string; // 用户提问原文(仅 admin 可见)
  hit: boolean; // RAG 模式下是否命中知识库
  hitCount: number; // 召回条数
  topDoc: string; // 命中的首个文档名,未命中为 ""
}

let dbPromise: Promise<lancedb.Connection> | null = null;
function db() {
  dbPromise ??= lancedb.connect(DB_DIR);
  return dbPromise;
}

// 串行化写入,避免并发提问时在建表上发生竞态(同 vectorstore 的做法)。
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export interface LogInput {
  ownerId: string;
  anon: boolean;
  isAdmin: boolean;
  mode: ChatMode;
  query: string;
  sourcesCount: number;
  topDoc?: string;
}

/**
 * 记录一次提问。fire-and-forget:调用方不要 await,失败也不能影响问答主流程。
 * query 为空(例如纯工具调用没有问题文本)时跳过。
 */
export function logQuery(input: LogInput): void {
  const query = input.query.trim();
  if (!query) return;
  const row: QueryLogRow = {
    id: randomUUID(),
    ts: Date.now(),
    ownerId: input.ownerId,
    anon: input.anon,
    isAdmin: input.isAdmin,
    mode: input.mode,
    query,
    hit: input.sourcesCount > 0,
    hitCount: input.sourcesCount,
    topDoc: input.topDoc ?? "",
  };
  const data = [row as unknown as Record<string, unknown>];
  void serialize(async () => {
    const conn = await db();
    const names = await conn.tableNames();
    if (!names.includes(LOGS)) {
      await conn.createTable(LOGS, data);
      return;
    }
    const tbl = await conn.openTable(LOGS);
    try {
      await tbl.add(data);
    } catch {
      // 旧表(早于 isAdmin 字段)缺列会导致 add 失败 → 补列再写。
      // 历史行 isAdmin 填 false(按非管理员处理),不影响既有统计。
      await tbl.addColumns([{ name: "isAdmin", valueSql: "false" }]);
      await tbl.add(data);
    }
  }).catch((err) => {
    // 埋点失败只记日志,绝不向上抛——不能因为统计写不进去而影响用户提问。
    console.error("[analytics] logQuery failed", err);
  });
}

// ---- 聚合(供 /api/admin/analytics 读取)----

export interface AnalyticsResult {
  total: number; // 保留期内总提问数
  daily: { date: string; count: number }[]; // 近 14 天每日
  byMode: { mode: ChatMode; count: number }[];
  hitRate: { hit: number; miss: number }; // 仅 RAG 模式
  topDocs: { name: string; count: number }[]; // 被命中引用最多的文档 Top 8
  blindSpots: { query: string; count: number }[]; // 未命中的提问 Top 10(知识盲区)
  topQueries: { query: string; count: number }[]; // 高频提问 Top 10
  hasAny: boolean; // 保留期内是否有任何日志(过滤前):前端据此判断「全空才禁用筛选」
}

function dayKey(ts: number): string {
  // 以北京时间分天,与站内其它时间口径一致。
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 按 query 文本计数并取 Top N(忽略大小写/首尾空白)。 */
function topByQuery(
  rows: QueryLogRow[],
  n: number,
): { query: string; count: number }[] {
  const map = new Map<string, { query: string; count: number }>();
  for (const r of rows) {
    const key = r.query.toLowerCase();
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { query: r.query, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

// 统计口径:user=只看普通用户/访客(默认), admin=只看管理员, all=合计。
export type AnalyticsScope = "user" | "admin" | "all";

export async function getAnalytics(
  opts: { scope?: AnalyticsScope } = {},
): Promise<AnalyticsResult> {
  const conn = await db();
  const names = await conn.tableNames();
  const empty: AnalyticsResult = {
    total: 0,
    daily: [],
    byMode: [],
    hitRate: { hit: 0, miss: 0 },
    topDocs: [],
    blindSpots: [],
    topQueries: [],
    hasAny: false,
  };
  if (!names.includes(LOGS)) return empty;

  const tbl = await conn.openTable(LOGS);
  const cutoff = Date.now() - RETENTION_DAYS * DAY;

  // 顺手清理超出保留期的旧行(读路径触发,不拖慢写路径)。
  void serialize(() => tbl.delete(`ts < ${cutoff}`)).catch(() => {});

  const all = (await tbl
    .query()
    .where(`ts >= ${cutoff}`)
    .limit(500_000)
    .toArray()) as QueryLogRow[];
  // 默认只看普通用户(排除管理员自测);admin 只看管理员,all 看合计。
  // 旧数据没有 isAdmin 字段 → undefined:user 保留、admin 排除,符合预期。
  const scope = opts.scope ?? "user";
  const rows =
    scope === "all"
      ? all
      : scope === "admin"
        ? all.filter((r) => r.isAdmin)
        : all.filter((r) => !r.isAdmin);
  // 当前筛选下没数据,但全表可能有(如切到「管理员」却没管理员提问)→ hasAny 仍为真。
  if (rows.length === 0) return { ...empty, hasAny: all.length > 0 };

  // 近 14 天每日提问量(补零,保证连续)。
  const since = Date.now() - 13 * DAY;
  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 14; i++) dayCounts.set(dayKey(since + i * DAY), 0);
  for (const r of rows) {
    if (r.ts >= since) {
      const k = dayKey(r.ts);
      if (dayCounts.has(k)) dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
    }
  }
  const daily = [...dayCounts.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  // 场景分布。
  const modeCounts = new Map<ChatMode, number>();
  for (const r of rows) {
    const m = r.mode as ChatMode;
    modeCounts.set(m, (modeCounts.get(m) ?? 0) + 1);
  }
  const byMode = [...modeCounts.entries()]
    .map(([mode, count]) => ({ mode, count }))
    .sort((a, b) => b.count - a.count);

  // 命中率(仅 RAG 模式)。
  let hit = 0;
  let miss = 0;
  const ragRows = rows.filter((r) => RAG_MODES.has(r.mode));
  for (const r of ragRows) {
    if (r.hit) hit += 1;
    else miss += 1;
  }

  // 热门引用文档 Top 8。
  const docCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.topDoc) docCounts.set(r.topDoc, (docCounts.get(r.topDoc) ?? 0) + 1);
  }
  const topDocs = [...docCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 知识盲区:RAG 模式下未命中的提问 Top 10。
  const blindSpots = topByQuery(
    ragRows.filter((r) => !r.hit),
    10,
  );

  // 高频提问 Top 10(全部模式)。
  const topQueries = topByQuery(rows, 10);

  return {
    total: rows.length,
    daily,
    byMode,
    hitRate: { hit, miss },
    topDocs,
    blindSpots,
    topQueries,
    hasAny: true,
  };
}
