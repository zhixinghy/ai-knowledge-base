import type { PdfPage } from "./pdf";

export interface Chunk {
  text: string;
  /** 分块来自第几页(用于标注出处) */
  page: number;
  /** 在整个文档中的连续序号 */
  index: number;
}

interface ChunkOptions {
  /** 目标分块长度(字符数) */
  size?: number;
  /** 相邻分块之间的重叠字符数 */
  overlap?: number;
}

/**
 * 把逐页文本切成带重叠的分块。分块不会跨页,因此每块都能保留准确的页码用于标注
 * 出处。按字符切分(对没有词边界的中文也适用)。
 */
export function chunkPages(
  pages: PdfPage[],
  { size = 500, overlap = 80 }: ChunkOptions = {},
): Chunk[] {
  const step = Math.max(1, size - overlap);
  const chunks: Chunk[] = [];
  let index = 0;

  for (const { page, text } of pages) {
    const clean = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) continue;

    for (let start = 0; start < clean.length; start += step) {
      const slice = clean.slice(start, start + size).trim();
      if (slice.length >= 10) {
        chunks.push({ text: slice, page, index: index++ });
      }
      if (start + size >= clean.length) break;
    }
  }

  return chunks;
}
