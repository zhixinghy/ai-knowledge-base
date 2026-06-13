import { deleteDocument, listDocuments } from "@/lib/vectorstore";
import { isAdmin, resolveOwnerId } from "@/lib/auth";

export async function GET() {
  try {
    const ownerId = await resolveOwnerId();
    return Response.json(await listDocuments(ownerId));
  } catch (err) {
    console.error("[/api/documents GET]", err);
    return Response.json({ error: "读取文档列表失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
    const [ownerId, admin] = await Promise.all([resolveOwnerId(), isAdmin()]);
    const ok = await deleteDocument(id, { ownerId, isAdmin: admin });
    if (!ok) {
      return Response.json({ error: "文档不存在或无权删除" }, { status: 403 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/documents DELETE]", err);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
