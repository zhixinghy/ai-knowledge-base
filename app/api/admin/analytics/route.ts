import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

// 使用分析(仅管理员)。返回聚合后的统计,不暴露逐条原始日志接口。
// ?includeAdmin=1 时把管理员自己的提问也算进去(默认排除,避免自测污染)。
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const includeAdmin =
    new URL(req.url).searchParams.get("includeAdmin") === "1";
  return Response.json(await getAnalytics({ includeAdmin }));
}
