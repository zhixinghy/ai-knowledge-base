import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  decrypt,
  encrypt,
  readSession,
  type SessionUser,
} from "./session";
import { getAnonQuota } from "./settings";

const AID = "aid"; // 匿名身份 id(cookie)
const AQ = "aq"; // 匿名已用额度(签名 cookie)
const YEAR = 365 * 24 * 60 * 60;
const MONTH = 30 * 24 * 60 * 60;

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** 当前登录用户(无则 null)。按请求记忆化。 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return readSession();
});

/** 是否管理员。 */
export async function isAdmin(): Promise<boolean> {
  return (await getCurrentUser())?.role === "admin";
}

/**
 * 管理员接口守卫:未登录返回 401、非管理员返回 403。
 * 用法:`const g = await requireAdmin(); if ("error" in g) return g.error;`
 */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "未登录" }, { status: 401 }) };
  if (user.role !== "admin")
    return { error: Response.json({ error: "无权限" }, { status: 403 }) };
  return { user };
}

/**
 * 文档归属键:登录用户用 userId;匿名用 aid cookie(没有就发一个)。
 * 上传 / 列表 / 检索 / 删除统一用它来隔离数据。
 */
export async function resolveOwnerId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.userId;
  const cookieStore = await cookies();
  let aid = cookieStore.get(AID)?.value;
  if (!aid) {
    aid = `anon-${randomUUID()}`;
    cookieStore.set(AID, aid, cookieOpts(YEAR));
  }
  return aid;
}

/** 读取匿名已用次数。 */
export async function getAnonUsage(): Promise<number> {
  const cookieStore = await cookies();
  const payload = await decrypt(cookieStore.get(AQ)?.value);
  const n = payload?.n;
  return typeof n === "number" ? n : 0;
}

export interface QuotaResult {
  ok: boolean;
  used: number;
  limit: number;
}

/**
 * 消耗一次匿名试用额度。登录用户不受限。
 * 超额返回 ok:false,调用方据此回 401 让前端弹登录框。
 */
export async function consumeAnonQuota(): Promise<QuotaResult> {
  const user = await getCurrentUser();
  if (user) return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY };

  const limit = await getAnonQuota();
  const used = await getAnonUsage();
  if (used >= limit) return { ok: false, used, limit };

  const next = used + 1;
  const cookieStore = await cookies();
  cookieStore.set(AQ, await encrypt({ n: next }), cookieOpts(MONTH));
  return { ok: true, used: next, limit };
}
