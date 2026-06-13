import { requireAdmin } from "@/lib/auth";
import { countUsers, deleteUser, listUsers } from "@/lib/users";
import { countDocsByOwner, deleteDocumentsByOwner } from "@/lib/vectorstore";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const [count, users, docCounts] = await Promise.all([
    countUsers(),
    listUsers(),
    countDocsByOwner(),
  ]);
  return Response.json({ count, users, docCounts });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = (await req.json()) as { id?: string };
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
  if (id === guard.user.userId) {
    return Response.json({ error: "不能删除自己" }, { status: 400 });
  }

  // 级联:先删该用户名下的文档与分块,再删账号
  await deleteDocumentsByOwner(id);
  await deleteUser(id);
  return Response.json({ ok: true });
}
