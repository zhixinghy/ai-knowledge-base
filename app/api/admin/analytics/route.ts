import { requireAdmin } from "@/lib/auth";
import { getAnalytics, type AnalyticsScope } from "@/lib/analytics";

// 使用分析(仅管理员)。返回聚合后的统计,不暴露逐条原始日志接口。
// ?scope=user(默认,排除管理员自测) | admin(只看管理员) | all(合计)。
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const raw = new URL(req.url).searchParams.get("scope");
  const scope: AnalyticsScope = raw === "admin" || raw === "all" ? raw : "user";
  return Response.json(await getAnalytics({ scope }));
}
