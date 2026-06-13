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

/** Active embedding dimensionality (depends on provider). */
export const EMBED_DIM = PROVIDER === "dashscope" ? DASHSCOPE_DIM : 512;

// BGE wants the *query* (not passages) prefixed with this retrieval instruction.
const BGE_QUERY_INSTRUCTION = "为这个句子生成表示以用于检索相关文章:";

/* ----------------------------- local (BGE) ----------------------------- */

// Lazily imported so production (dashscope) never loads onnxruntime.
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

/* --------------------------- cloud (DashScope) -------------------------- */

const DASHSCOPE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const DASHSCOPE_BATCH = 10; // API max inputs per request

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
    // keep input order
    json.data
      .sort((a, b) => a.index - b.index)
      .forEach((d) => all.push(d.embedding));
  }
  return all;
}

/* ------------------------------- public -------------------------------- */

/** Embed passages for storage. Returns one unit vector per input. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return PROVIDER === "dashscope"
    ? dashscopeEmbed(texts)
    : localEmbed(texts);
}

/** Embed a single search query (BGE gets its retrieval instruction prefix). */
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
