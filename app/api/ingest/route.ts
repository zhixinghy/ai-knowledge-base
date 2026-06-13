import { randomUUID } from "node:crypto";
import { parsePdf } from "@/lib/pdf";
import { chunkPages } from "@/lib/chunk";
import { embed } from "@/lib/embedding";
import { addDocument, type ChunkRow } from "@/lib/vectorstore";
import { consumeAnonQuota, isAdmin, resolveOwnerId } from "@/lib/auth";
import type { Collection, KnowledgeDoc } from "@/lib/types";

// 大 PDF 的解析 + embedding 可能比较耗时
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

    // support 客服库只有管理员能上传(共享给所有人)
    if (collection === "support" && !(await isAdmin())) {
      return Response.json({ error: "仅管理员可上传到客服库" }, { status: 403 });
    }

    // 匿名试用额度:用尽则回 401(放在重活之前,避免白白解析/embedding)
    const quota = await consumeAnonQuota();
    if (!quota.ok) {
      return Response.json(
        { error: "试用次数已用完,请注册或登录后继续", code: "QUOTA" },
        { status: 401 },
      );
    }
    const ownerId = await resolveOwnerId();

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1) 解析 → 逐页文本
    const { pages, total } = await parsePdf(buffer);

    // 2) 分块(带页码归属)
    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      return Response.json(
        { error: "未能从该 PDF 提取到文本(可能是扫描件/图片型 PDF)" },
        { status: 422 },
      );
    }

    // 3) 对所有分块做 embedding
    const vectors = await embed(chunks.map((c) => c.text));

    // 4) 持久化
    const docId = randomUUID();
    const docName = file.name;
    const rows: ChunkRow[] = chunks.map((c, i) => ({
      id: `${docId}-${i}`,
      collection,
      ownerId,
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
        ownerId,
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
    const message = err instanceof Error ? err.message : "入库失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
