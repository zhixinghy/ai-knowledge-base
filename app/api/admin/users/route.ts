import { getCurrentUser } from "@/lib/auth";
import { countUsers, listUsers } from "@/lib/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "无权限" }, { status: 403 });
  }
  const [count, users] = await Promise.all([countUsers(), listUsers()]);
  return Response.json({ count, users });
}
