import "server-only";
import path from "node:path";
import * as lancedb from "@lancedb/lancedb";

// 可后台调整的全局设置,持久化在 LanceDB(随 LANCEDB_DIR 一起保存)。
// 目前只有「匿名试用额度」。单行表 {id:"global", anonQuota}。
const DB_DIR = process.env.LANCEDB_DIR || path.join(process.cwd(), ".lancedb");
const SETTINGS = "settings";
const ROW_ID = "global";
// 没设置过时的默认值,回退到环境变量 ANON_QUOTA。
const DEFAULT_ANON_QUOTA = Number(process.env.ANON_QUOTA ?? 5);

interface SettingsRow {
  id: string;
  anonQuota: number;
}

let dbPromise: Promise<lancedb.Connection> | null = null;
function db() {
  dbPromise ??= lancedb.connect(DB_DIR);
  return dbPromise;
}

// 读缓存,避免每次 chat/上传都查库;写时更新。
const TTL = 60_000;
let cache: { anonQuota: number; exp: number } | null = null;

async function readRow(): Promise<SettingsRow | null> {
  const conn = await db();
  const names = await conn.tableNames();
  if (!names.includes(SETTINGS)) return null;
  const tbl = await conn.openTable(SETTINGS);
  const rows = (await tbl
    .query()
    .where(`id = '${ROW_ID}'`)
    .limit(1)
    .toArray()) as SettingsRow[];
  return rows[0] ?? null;
}

/** 当前匿名试用总额度(带 60s 缓存,回退到默认值)。 */
export async function getAnonQuota(): Promise<number> {
  if (cache && cache.exp > Date.now()) return cache.anonQuota;
  const row = await readRow().catch(() => null);
  const v =
    row && Number.isFinite(row.anonQuota)
      ? Number(row.anonQuota)
      : DEFAULT_ANON_QUOTA;
  cache = { anonQuota: v, exp: Date.now() + TTL };
  return v;
}

/** 设置匿名试用总额度(整表 overwrite 单行)。 */
export async function setAnonQuota(n: number): Promise<void> {
  const conn = await db();
  await conn.createTable(SETTINGS, [{ id: ROW_ID, anonQuota: n }], {
    mode: "overwrite",
  });
  cache = { anonQuota: n, exp: Date.now() + TTL };
}
