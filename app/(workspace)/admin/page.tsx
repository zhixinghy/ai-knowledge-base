import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPanel } from "@/components/admin/admin-panel";

// 仅管理员可见的管理设置页(用户管理 + 试用额度)。
// 非管理员直接跳回问答页。
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/chat");
  return <AdminPanel />;
}
