// LanceDB 封装 —— 唯一了解向量库细节的文件。
// 以后若要换成 Qdrant,只需重新实现本模块导出的接口。
import path from "node:path";
import * as lancedb from "@lancedb/lancedb";
import type { Collection, KnowledgeDoc, Source } from "./types";

// 线上持久化到部署目录之外(通过 LANCEDB_DIR 指定),这样每次代码部署都不会
// 抹掉知识库。本地开发默认用 ./.lancedb。
const DB_DIR = process.env.LANCEDB_DIR || path.join(process.cwd(), ".lancedb");
const DOCS = "documents";
const CHUNKS = "chunks";

export interface ChunkRow {
  id: string;
  collection: Collection;
  /** 归属键:docs 库为上传者 id;support 库为共享哨兵,检索时不据此过滤。 */
  ownerId: string;
  docId: string;
  docName: string;
  page: number;
  text: string;
  vector: number[];
}

export interface DocMeta {
  id: string;
  collection: Collection;
  /** 归属键:docs 库为上传者 id;support 库为共享哨兵。 */
  ownerId: string;
  name: string;
  size: number;
  pages: number;
  chunks: number;
  addedAt: number;
}

function escape(value: string): string {
  return value.replace(/'/g, "''");
}

let dbPromise: Promise<lancedb.Connection> | null = null;
function db() {
  dbPromise ??= lancedb.connect(DB_DIR);
  return dbPromise;
}

async function openOrNull(name: string) {
  const conn = await db();
  const names = await conn.tableNames();
  return names.includes(name) ? conn.openTable(name) : null;
}

// 串行化写入,避免并发上传时在建表上发生竞态。
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function addRows(conn: lancedb.Connection, name: string, rows: object[]) {
  const data = rows as Record<string, unknown>[];
  const names = await conn.tableNames();
  if (names.includes(name)) {
    const tbl = await conn.openTable(name);
    await tbl.add(data);
  } else {
    await conn.createTable(name, data);
  }
}

/** 持久化一个文档的元数据 + 其 embedding 后的分块。 */
export function addDocument(meta: DocMeta, chunks: ChunkRow[]): Promise<void> {
  return serialize(async () => {
    const conn = await db();
    if (chunks.length > 0) await addRows(conn, CHUNKS, chunks);
    await addRows(conn, DOCS, [meta]);
  });
}

/**
 * 列出对该用户可见的文档(最新的在前):自己的 docs + 共享的 support。
 * 不传 ownerId 时返回全部(评估 / 迁移脚本用)。
 */
export async function listDocuments(ownerId?: string): Promise<KnowledgeDoc[]> {
  const tbl = await openOrNull(DOCS);
  if (!tbl) return [];
  const rows = (await tbl.query().limit(10_000).toArray()) as DocMeta[];
  return rows
    .filter((r) => {
      if (!ownerId) return true;
      return r.collection === "support" || r.ownerId === ownerId;
    })
    .map((r) => ({
      id: r.id,
      collection: (r.collection ?? "docs") as Collection,
      name: r.name,
      size: Number(r.size),
      pages: Number(r.pages),
      chunks: Number(r.chunks),
      status: "ready" as const,
      addedAt: Number(r.addedAt),
    }))
    .sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * 删除一个文档及其所有分块。
 * 普通用户只能删自己的;管理员可删任意(含 support)。
 * 返回是否真的删除(无权限 / 不存在则 false)。
 */
export function deleteDocument(
  id: string,
  opts: { ownerId: string; isAdmin?: boolean },
): Promise<boolean> {
  return serialize(async () => {
    const safe = escape(id);
    const docs = await openOrNull(DOCS);
    if (!docs) return false;
    const found = (await docs
      .query()
      .where(`id = '${safe}'`)
      .limit(1)
      .toArray()) as DocMeta[];
    const doc = found[0];
    if (!doc) return false;
    if (!opts.isAdmin && doc.ownerId !== opts.ownerId) return false;

    await docs.delete(`id = '${safe}'`);
    const chunks = await openOrNull(CHUNKS);
    if (chunks) await chunks.delete(`docId = '${safe}'`);
    return true;
  });
}

// 余弦相似度下限:丢弃弱/不相关的匹配,避免引用那些其实答不了问题的分块。
// 针对 bge-small-zh 在「中文查询 ↔ 中文段落」上标定:
//   相关 ≈ 0.43–0.55,不相关 ≈ 0.31–0.33 → 0.38 能干净地把两者分开。
//(英文 ↔ 英文在这个中文模型上得分更高且更难区分。)
// 越低召回越多,越高精度越高。可调;P6 可能会再优化。
const MIN_SCORE = 0.38;

/**
 * 在某个知识库的分块上做向量搜索(读取路径 —— 供 RAG 使用)。
 * docs 库按 ownerId 隔离(只搜自己的);support 库共享,不按 owner 过滤。
 */
export async function search(
  queryVector: number[],
  topK = 5,
  collection: Collection = "docs",
  minScore = MIN_SCORE,
  ownerId?: string,
): Promise<Source[]> {
  const tbl = await openOrNull(CHUNKS);
  if (!tbl) return [];
  const where =
    collection === "docs" && ownerId
      ? `collection = 'docs' AND ownerId = '${escape(ownerId)}'`
      : `collection = '${collection}'`;
  const rows = (await tbl
    .query()
    .nearestTo(queryVector)
    .distanceType("cosine")
    .where(where)
    .limit(topK)
    .toArray()) as Array<ChunkRow & { _distance: number }>;
  return rows
    .map((r) => ({
      docId: r.docId,
      docName: r.docName,
      page: Number(r.page),
      score: Math.max(0, Math.min(1, 1 - r._distance)),
      snippet: r.text,
    }))
    .filter((s) => s.score >= minScore);
}
