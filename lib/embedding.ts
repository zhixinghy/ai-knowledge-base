// Pluggable embedding layer.
//   - dev / 本地:Xenova BGE(transformers.js,512 维,免费、离线)
//   - 线上 2G 机器:阿里云 DashScope text-embedding-v3(1024 维,云端,省内存)
// 切换方式:环境变量 EMBEDDING_PROVIDER=local | dashscope(默认 local)。
// 只改这一个文件即可换实现,其余代码不动。
import { isDev } from "./utils";

type Provider = "local" | "dashscope";

const PROVIDER: Provider =
  process.env.EMBEDDING_PROVIDER === "dashscope" ? "dashscope" : "local";

const LOCAL_MODEL = "Xenova/bge-small-zh-v1.5";
const DASHSCOPE_MODEL = "text-embedding-v3";
const DASHSCOPE_DIM = 1024;

/** 当前 embedding 的维度(取决于 provider)。 */
export const EMBED_DIM = PROVIDER === "dashscope" ? DASHSCOPE_DIM : 512;

// BGE 要求给「查询」(而非文档段落)加上这条检索指令前缀。
const BGE_QUERY_INSTRUCTION = "为这个句子生成表示以用于检索相关文章:";

/* ----------------------------- 本地 (BGE) ----------------------------- */

// 懒加载,这样线上(dashscope)永远不会加载 onnxruntime。
let localPipe: Promise<unknown> | null = null;
async function getLocalPipe() {
  if (!localPipe) {
    localPipe = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", LOCAL_MODEL),
    );
  }
  return localPipe as Promise<
    (
      texts: string[],
      opts: { pooling: "mean"; normalize: boolean },
    ) => Promise<{ tolist: () => number[][] }>
  >;
}

async function localEmbed(texts: string[]): Promise<number[][]> {
  const pipe = await getLocalPipe();
  const out = await pipe(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}

/* --------------------------- 云端 (DashScope) -------------------------- */

const DASHSCOPE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const DASHSCOPE_BATCH = 10; // API 单次请求最多输入条数

async function dashscopeEmbed(texts: string[]): Promise<number[][]> {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("缺少 DASHSCOPE_API_KEY,无法使用云端 embedding");

  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += DASHSCOPE_BATCH) {
    const batch = texts.slice(i, i + DASHSCOPE_BATCH);
    const res = await fetch(DASHSCOPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DASHSCOPE_MODEL,
        input: batch,
        dimensions: DASHSCOPE_DIM,
        encoding_format: "float",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DashScope embedding 失败 ${res.status} ${detail}`);
    }
    const json = (await res.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    // 保持输入顺序
    json.data
      .sort((a, b) => a.index - b.index)
      .forEach((d) => all.push(d.embedding));
  }
  return all;
}

/* ------------------------------- 对外接口 -------------------------------- */

/** 对文档段落做 embedding 用于入库。每条输入返回一个单位向量。 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return PROVIDER === "dashscope"
    ? dashscopeEmbed(texts)
    : localEmbed(texts);
}

/** 对单条搜索查询做 embedding(BGE 会加上检索指令前缀)。 */
export async function embedQuery(query: string): Promise<number[]> {
  if (PROVIDER === "dashscope") {
    const [v] = await dashscopeEmbed([query]);
    return v;
  }
  const [v] = await localEmbed([BGE_QUERY_INSTRUCTION + query]);
  return v;
}

if (isDev) {
  console.log(`[embedding] provider=${PROVIDER} dim=${EMBED_DIM}`);
}
