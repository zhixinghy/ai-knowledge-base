// 检索评估脚本(P6)。运行:npm run eval
//
// 核心思想:优化前先有「尺子」。它把一份带标准答案的小知识库灌进一个临时向量库,
// 然后对每个问题跑两遍检索——纯向量 vs 向量+重排——量化对比检索质量。
//
// 指标:
//   Hit@k  = 正确片段出现在前 k 名的问题占比(越高越好,看「捞没捞到」)。
//   MRR    = 正确片段排名倒数的平均(1/排名;越高越靠前,看「排得好不好」)。
//
// 临时库放在系统临时目录,跑完即删,绝不碰你真实的 .lancedb。

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// 仅类型导入,编译期擦除,不会触发 vectorstore 模块加载(所以放心放最上面)。
import type { ChunkRow, DocMeta } from "../lib/vectorstore";

// 必须在 import vectorstore 之前设好,因为它在模块加载时就读取 LANCEDB_DIR。
const tmp = mkdtempSync(path.join(tmpdir(), "cortex-eval-"));
process.env.LANCEDB_DIR = tmp;

const { PASSAGES, QUESTIONS } = await import("./dataset");
const { embed } = await import("../lib/embedding");
const { addDocument } = await import("../lib/vectorstore");
const { retrieve } = await import("../lib/retrieve");
const { rerankEnabled } = await import("../lib/rerank");

const TOP_K = 5;

/** 把迷你知识库 embed 后写入临时向量库。 */
async function seed() {
  const vectors = await embed(PASSAGES.map((p) => p.text));
  const byDoc = new Map<string, typeof PASSAGES>();
  PASSAGES.forEach((p) => {
    (byDoc.get(p.docId) ?? byDoc.set(p.docId, []).get(p.docId)!).push(p);
  });

  for (const [docId, passages] of byDoc) {
    const chunks: ChunkRow[] = passages.map((p) => ({
      id: p.id,
      collection: "docs",
      ownerId: "eval",
      docId,
      docName: p.docName,
      page: p.page,
      text: p.text,
      vector: vectors[PASSAGES.indexOf(p)],
    }));
    const meta: DocMeta = {
      id: docId,
      collection: "docs",
      ownerId: "eval",
      name: passages[0].docName,
      size: 0,
      pages: passages.length,
      chunks: chunks.length,
      addedAt: Date.now(),
    };
    await addDocument(meta, chunks);
  }
}

// snippet → passage id,用于把检索结果对回标注。
const idOfText = new Map(PASSAGES.map((p) => [p.text, p.id]));

/** 返回首个相关片段在结果里的排名(1 起;没命中返回 0)。 */
function rankOfFirstHit(snippets: string[], relevant: string[]): number {
  for (let i = 0; i < snippets.length; i++) {
    const id = idOfText.get(snippets[i]);
    if (id && relevant.includes(id)) return i + 1;
  }
  return 0;
}

interface Metrics {
  hit1: number;
  hit3: number;
  hit5: number;
  mrr: number;
  ranks: number[];
}

function aggregate(ranks: number[]): Metrics {
  const n = ranks.length;
  const frac = (pred: (r: number) => boolean) =>
    ranks.filter((r) => r > 0 && pred(r)).length / n;
  return {
    hit1: frac((r) => r <= 1),
    hit3: frac((r) => r <= 3),
    hit5: frac((r) => r <= 5),
    mrr: ranks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / n,
    ranks,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function main() {
  console.log(`\n临时向量库:${tmp}`);
  console.log("正在 embed 并灌入语料(本地 BGE 首次会下载模型)...\n");
  await seed();

  if (!rerankEnabled) {
    console.warn(
      "⚠️  未检测到 DASHSCOPE_API_KEY,重排序会直通(= 不重排)。\n" +
        "    想看重排效果,请确保 .env.local 里有 DASHSCOPE_API_KEY。\n",
    );
  }

  const baseRanks: number[] = [];
  const rerankRanks: number[] = [];
  const rerankScores: number[] = []; // 收集命中片段的 rerank 分,用于校准下限

  console.log("逐题对比(排名越小越好,— 表示前 5 没命中):\n");
  console.log(
    "问题".padEnd(34) + "纯向量".padStart(8) + "  重排后".padStart(8),
  );
  console.log("-".repeat(54));

  for (const { q, relevant } of QUESTIONS) {
    const base = await retrieve(q, {
      topK: TOP_K,
      useRerank: false,
      applyFloor: false,
    });
    const reranked = await retrieve(q, {
      topK: TOP_K,
      useRerank: true,
      applyFloor: false,
    });

    const br = rankOfFirstHit(base.map((s) => s.snippet), relevant);
    const rr = rankOfFirstHit(reranked.map((s) => s.snippet), relevant);
    baseRanks.push(br);
    rerankRanks.push(rr);
    if (rr > 0) rerankScores.push(reranked[rr - 1].score);

    const cell = (r: number) => (r > 0 ? `#${r}` : "—");
    console.log(
      q.slice(0, 16).padEnd(20) +
        cell(br).padStart(8) +
        cell(rr).padStart(10),
    );
  }

  const base = aggregate(baseRanks);
  const rk = aggregate(rerankRanks);

  const row = (label: string, b: number, r: number, fmt = pct) =>
    label.padEnd(10) +
    fmt(b).padStart(10) +
    fmt(r).padStart(12) +
    (r - b >= 0 ? `   +${fmt(r - b)}` : `   ${fmt(r - b)}`);

  console.log("\n汇总指标:\n");
  console.log("指标".padEnd(10) + "纯向量".padStart(10) + "向量+重排".padStart(12) + "   提升");
  console.log("-".repeat(48));
  console.log(row("Hit@1", base.hit1, rk.hit1));
  console.log(row("Hit@3", base.hit3, rk.hit3));
  console.log(row("Hit@5", base.hit5, rk.hit5));
  console.log(row("MRR", base.mrr, rk.mrr, (x) => x.toFixed(3)));

  if (rerankScores.length > 0) {
    const sorted = [...rerankScores].sort((a, b) => a - b);
    console.log(
      `\n命中片段的 rerank 分:最低 ${sorted[0].toFixed(3)} / ` +
        `中位 ${sorted[Math.floor(sorted.length / 2)].toFixed(3)} / ` +
        `最高 ${sorted[sorted.length - 1].toFixed(3)}`,
    );
    console.log("(用最低值参考校准 retrieve.ts 里的 RERANK_MIN 下限。)");
  }
  console.log();
}

try {
  await main();
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
