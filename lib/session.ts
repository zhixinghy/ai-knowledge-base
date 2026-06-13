import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

// 无状态 session:HS256 JWT 存进 httpOnly cookie。密钥来自 SESSION_SECRET。
// dev 下允许用固定 fallback,方便本地起步;线上缺密钥才报错。
// 注意:密钥「用时才解析」(getKey),不在模块加载时检查 —— 否则 next build
// 收集页面数据时 import 本模块就会抛错(CI 构建环境没有 SESSION_SECRET)。
let cachedKey: Uint8Array | null = null;
function getKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-insecure-session-secret-change-me"
      : "");
  if (!secret) {
    throw new Error("缺少 SESSION_SECRET,无法签发会话");
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

const COOKIE = "session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 天(秒)

export type Role = "user" | "admin";

/** session cookie 里携带的用户信息(只放最小必要字段,绝不含密码)。 */
export interface SessionUser {
  userId: string;
  username: string;
  role: Role;
}

export async function encrypt(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function decrypt(token?: string): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

/** 登录/注册成功后写入会话。 */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await encrypt({ ...user });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** 退出登录:删除会话 cookie。 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

/** 读取并校验当前会话,返回用户信息或 null。 */
export async function readSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const payload = await decrypt(cookieStore.get(COOKIE)?.value);
  if (!payload || typeof payload.userId !== "string") return null;
  return {
    userId: payload.userId as string,
    username: payload.username as string,
    role: (payload.role as Role) ?? "user",
  };
}
