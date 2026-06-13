import { createUser } from "@/lib/users";
import { createSession, type Role } from "@/lib/session";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };
    const name = username?.trim();
    if (!name || name.length < 2) {
      return Response.json({ error: "用户名至少 2 个字符" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const role: Role = name === ADMIN_USERNAME ? "admin" : "user";
    const user = await createUser(name, password, role);
    await createSession({ userId: user.id, username: user.username, role: user.role });
    return Response.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "注册失败";
    // 用户名重复属可预期错误,回 409
    const status = message.includes("已被注册") ? 409 : 500;
    if (status === 500) console.error("[/api/auth/register]", err);
    return Response.json({ error: message }, { status });
  }
}
