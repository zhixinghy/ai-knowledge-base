// Pluggable reranker (P6 检索优化).
//
// 为什么需要它:embedding 检索是「粗排」——把问题和片段各自压成一个向量再比
// 余弦,快,但两边是「分开看」的,容易把「字面像、其实答非所问」的片段排前面。
// rerank 用的是 cross-encoder:把(问题 + 片段)**拼在一起**喂进模型,直接打一个
// 相关度分,精度高得多但更慢。所以标准做法是「向量召回一批 → rerank 精排留几条」。
//
// provider:dashscope(阿里云 gte-rerank-v2,云端、不吃内存)| none(无 key 时直通)。
// 切换方式同 embedding:有 DASHSCOPE_API_KEY 即启用,可用 RERANK_PROVIDER=none 关掉。
import type { Source } from "./types";
import { isDev } from "./utils";

type Provider = "dashscope" | "none";

const PROVIDER: Provider =
  process.env.RERANK_PROVIDER === "none"
    ? "none"
    : process.env.DASHSCOPE_API_KEY
      ? "dashscope"
      : "none";

/** 当前是否真的会做重排(无 key 时为 false,调用方据此决定召回多少候选)。 */
export const rerankEnabled = PROVIDER === "dashscope";

const DASHSCOPE_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank";
const RERANK_MODEL = "gte-rerank-v2";

interface RerankResponse {
  output: { results: { index: number; relevance_score: number }[] };
}

/**
 * 用 cross-encoder 对候选片段按与 query 的相关度重新排序,返回前 topN 条。
 * 返回的 Source.score 被替换成 rerank 相关度(0–1),语义比向量余弦更可信。
 * 无 provider / 出错时优雅降级:原样返回前 topN(退回向量排序),绝不让检索挂掉。
 */
export async function rerank(
  query: string,
  candidates: Source[],
  topN = 5,
): Promise<Source[]> {
  if (PROVIDER === "none" || candidates.length === 0) {
    return candidates.slice(0, topN);
  }

  try {
    const res = await fetch(DASHSCOPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        input: { query, documents: candidates.map((c) => c.snippet) },
        parameters: { top_n: topN, return_documents: false },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`gte-rerank 失败 ${res.status} ${detail}`);
    }
    const json = (await res.json()) as RerankResponse;
    // results 已按相关度降序;index 指回原候选数组。把分数换成 rerank 分。
    return json.output.results
      .filter((r) => candidates[r.index] !== undefined)
      .map((r) => ({ ...candidates[r.index], score: r.relevance_score }));
  } catch (err) {
    console.error("[rerank] 降级为向量排序:", err);
    return candidates.slice(0, topN);
  }
}

if (isDev) {
  console.log(`[rerank] provider=${PROVIDER}`);
}
