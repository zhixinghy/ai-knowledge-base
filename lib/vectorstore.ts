// LanceDB wrapper — the ONLY file that knows about the vector store.
// Swap to Qdrant later by reimplementing this module's exports.
import path from "node:path";
import * as lancedb from "@lancedb/lancedb";
import type { Collection, KnowledgeDoc, Source } from "./types";

const DB_DIR = path.join(process.cwd(), ".lancedb");
const DOCS = "documents";
const CHUNKS = "chunks";

export interface ChunkRow {
  id: string;
  collection: Collection;
  docId: string;
  docName: string;
  page: number;
  text: string;
  vector: number[];
}

export interface DocMeta {
  id: string;
  collection: Collection;
  name: string;
  size: number;
  pages: number;
  chunks: number;
  addedAt: number;
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

// Serialize writes so concurrent uploads don't race on table creation.
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

/** Persist a document's metadata + its embedded chunks. */
export function addDocument(meta: DocMeta, chunks: ChunkRow[]): Promise<void> {
  return serialize(async () => {
    const conn = await db();
    if (chunks.length > 0) await addRows(conn, CHUNKS, chunks);
    await addRows(conn, DOCS, [meta]);
  });
}

/** List all stored documents (newest first). */
export async function listDocuments(): Promise<KnowledgeDoc[]> {
  const tbl = await openOrNull(DOCS);
  if (!tbl) return [];
  const rows = (await tbl.query().limit(10_000).toArray()) as DocMeta[];
  return rows
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

/** Delete a document and all its chunks. */
export function deleteDocument(id: string): Promise<void> {
  return serialize(async () => {
    const safe = id.replace(/'/g, "''");
    const docs = await openOrNull(DOCS);
    if (docs) await docs.delete(`id = '${safe}'`);
    const chunks = await openOrNull(CHUNKS);
    if (chunks) await chunks.delete(`docId = '${safe}'`);
  });
}

// Cosine-similarity floor: drop weak/irrelevant matches so we don't cite
// chunks that don't actually answer the question.
// Calibrated for bge-small-zh on Chinese query↔Chinese passage:
//   relevant ≈ 0.43–0.55, irrelevant ≈ 0.31–0.33 → 0.38 separates cleanly.
// (English↔English scores run higher and less separable on this zh model.)
// Lower = more recall, higher = more precision. Tunable; P6 may refine.
const MIN_SCORE = 0.38;

/** Vector search over one collection's chunks (read path — used by RAG). */
export async function search(
  queryVector: number[],
  topK = 5,
  collection: Collection = "docs",
  minScore = MIN_SCORE,
): Promise<Source[]> {
  const tbl = await openOrNull(CHUNKS);
  if (!tbl) return [];
  const rows = (await tbl
    .query()
    .nearestTo(queryVector)
    .distanceType("cosine")
    .where(`collection = '${collection}'`)
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
