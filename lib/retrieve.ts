// 检索编排:embed → 向量召回 → (可选)重排 → 取前 K。
// 聊天接口和评估脚本都走这里,保证「评估测的就是线上真实行为」。
import { embedQuery } from "./embedding";
import { rerank, rerankEnabled } from "./rerank";
import { search } from "./vectorstore";
import type { Collection, Source } from "./types";

// 开启重排时,先用向量「广撒网」捞这么多候选,再交给 rerank 精挑。
// 候选越多召回越全(不容易漏),但 rerank 调用越慢/越贵。20 是常见折中。
export const CANDIDATE_K = 20;

// 重排后相关度下限(gte-rerank 分数 0–1)。低于此判为不相关、丢弃。
// 由评估脚本校准:命中片段的 rerank 分最低见到 0.186,故下限取 0.15 留余量,
// 避免误杀正确答案;真正不相关的片段分数远低于此。改语料后重跑 npm run eval 复校。
const RERANK_MIN = 0.15;

export interface RetrieveOptions {
  collection?: Collection;
  /** 最终返回几条(喂给 LLM 的出处数)。 */
  topK?: number;
  /** 是否重排;默认看有没有 DASHSCOPE_API_KEY。评估时显式传 true/false 做对比。 */
  useRerank?: boolean;
  /** 是否应用相关度下限过滤。线上 true;评估「纯排序质量」时传 false。 */
  applyFloor?: boolean;
  /** 归属键:docs 库据此隔离用户;support 库共享时不传。 */
  ownerId?: string;
}

/**
 * 拿到一个问题,返回用于 grounding 的出处片段(已排好序)。
 * - 不重排:向量 top-K(沿用 vectorstore 里的余弦下限)。
 * - 重排:向量 top-CANDIDATE_K(不预过滤)→ cross-encoder 精排 → top-K → 相关度下限。
 */
export async function retrieve(
  query: string,
  {
    collection = "docs",
    topK = 5,
    useRerank = rerankEnabled,
    applyFloor = true,
    ownerId,
  }: RetrieveOptions = {},
): Promise<Source[]> {
  const vector = await embedQuery(query);

  if (!useRerank) {
    // minScore=0 时关掉下限,交给 search 的默认值(applyFloor)决定
    return search(vector, topK, collection, applyFloor ? undefined : 0, ownerId);
  }

  // 广撒网:召回阶段不预过滤(minScore=0),把判断权交给 rerank
  const candidates = await search(vector, CANDIDATE_K, collection, 0, ownerId);
  const ranked = await rerank(query, candidates, topK);
  return applyFloor ? ranked.filter((s) => s.score >= RERANK_MIN) : ranked;
}
