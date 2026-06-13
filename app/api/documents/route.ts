import { deleteDocument, listDocuments } from "@/lib/vectorstore";

export async function GET() {
  try {
    return Response.json(await listDocuments());
  } catch (err) {
    console.error("[/api/documents GET]", err);
    return Response.json({ error: "读取文档列表失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/documents DELETE]", err);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
