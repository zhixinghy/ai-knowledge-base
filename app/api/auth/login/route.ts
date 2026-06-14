import { getUserByUsername, verifyUser } from "@/lib/users";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };
    const name = username?.trim();
    if (!name || !password) {
      return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    if (!(await getUserByUsername(name))) {
      return Response.json(
        { error: "该用户名还没有注册", code: "NO_USER" },
        { status: 401 },
      );
    }
    const user = await verifyUser(name, password);
    if (!user) {
      return Response.json({ error: "密码不正确,请重试" }, { status: 401 });
    }
    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    return Response.json({ user });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return Response.json({ error: "登录失败" }, { status: 500 });
  }
}
