import type { PdfPage } from "./pdf";

export interface Chunk {
  text: string;
  /** page the chunk came from (for citations) */
  page: number;
  /** sequential index across the whole document */
  index: number;
}

interface ChunkOptions {
  /** target chunk length in characters */
  size?: number;
  /** overlap between consecutive chunks, in characters */
  overlap?: number;
}

/**
 * Split per-page text into overlapping chunks. Chunks never span pages, so each
 * one keeps an accurate page number for source attribution. Character-based
 * (works well for Chinese, which lacks word boundaries).
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
