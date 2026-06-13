import { PDFParse } from "pdf-parse";

export interface PdfPage {
  /** 1-based page number */
  page: number;
  text: string;
}

/** Parse a PDF buffer into per-page text (page numbers preserved for citations). */
export async function parsePdf(
  buffer: Buffer,
): Promise<{ pages: PdfPage[]; total: number }> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const pages = result.pages.map((p) => ({ page: p.num, text: p.text }));
    return { pages, total: result.total };
  } finally {
    await parser.destroy();
  }
}
