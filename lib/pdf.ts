import { PDFParse } from "pdf-parse";

export interface PdfPage {
  /** 页码,从 1 开始 */
  page: number;
  text: string;
}

/** 把 PDF buffer 解析为逐页文本(保留页码用于标注出处)。 */
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
