import { randomUUID } from "node:crypto";
import { parsePdf } from "@/lib/pdf";
import { chunkPages } from "@/lib/chunk";
import { embed } from "@/lib/embedding";
import { addDocument, type ChunkRow } from "@/lib/vectorstore";
import type { Collection, KnowledgeDoc } from "@/lib/types";

// parsing + embedding can take a while for big PDFs
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "缺少文件" }, { status: 400 });
    }
    const collection: Collection =
      form.get("collection") === "support" ? "support" : "docs";
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "仅支持 PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1) parse → per-page text
    const { pages, total } = await parsePdf(buffer);

    // 2) chunk (page-attributed)
    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      return Response.json(
        { error: "未能从该 PDF 提取到文本(可能是扫描件/图片型 PDF)" },
        { status: 422 },
      );
    }

    // 3) embed all chunks
    const vectors = await embed(chunks.map((c) => c.text));

    // 4) persist
    const docId = randomUUID();
    const docName = file.name;
    const rows: ChunkRow[] = chunks.map((c, i) => ({
      id: `${docId}-${i}`,
      collection,
      docId,
      docName,
      page: c.page,
      text: c.text,
      vector: vectors[i],
    }));
    const addedAt = Date.now();
    await addDocument(
      {
        id: docId,
        collection,
        name: docName,
        size: file.size,
        pages: total,
        chunks: rows.length,
        addedAt,
      },
      rows,
    );

    const doc: KnowledgeDoc = {
      id: docId,
      collection,
      name: docName,
      size: file.size,
      pages: total,
      chunks: rows.length,
      status: "ready",
      addedAt,
    };
    return Response.json(doc);
  } catch (err) {
    console.error("[/api/ingest]", err);
    const message = err instanceof Error ? err.message : "摄入失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
