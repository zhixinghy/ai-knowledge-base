import { requireAdmin } from "@/lib/auth";
import { getAnonQuota, setAnonQuota } from "@/lib/settings";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  return Response.json({ anonQuota: await getAnonQuota() });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { anonQuota } = (await req.json()) as { anonQuota?: number };
  const n = Number(anonQuota);
  if (!Number.isInteger(n) || n < 0 || n > 1000) {
    return Response.json({ error: "额度需为 0–1000 的整数" }, { status: 400 });
  }
  await setAnonQuota(n);
  return Response.json({ ok: true, anonQuota: n });
}
