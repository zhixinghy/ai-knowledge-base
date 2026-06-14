import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

// 使用分析(仅管理员)。返回聚合后的统计,不暴露逐条原始日志接口。
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  return Response.json(await getAnalytics());
}
