"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, Logo } from "../icons";

type Mode = "login" | "register";

export function AuthModal({
  initialMode,
  onClose,
  onSuccess,
}: {
  initialMode: Mode;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // 打开即聚焦,Esc 关闭
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error || "操作失败,请重试");
        return;
      }
      await onSuccess();
    } catch {
      setError("网络异常,请稍后重试");
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* 卡片 */}
      <div className="animate-scale-in relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
        >
          <CloseIcon width={16} height={16} />
        </button>

        <div className="px-7 pb-7 pt-8">
          {/* 品牌 */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo className="h-10 w-10" />
            <div>
              <h2 className="font-serif text-lg font-semibold tracking-tight">
                {isLogin ? "欢迎回来" : "创建账号"}
              </h2>
              <p className="mt-1 text-xs text-faint">
                {isLogin
                  ? "登录后继续使用 Cortex 知识库"
                  : "注册后即可拥有专属知识库,不限次使用"}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">用户名</span>
              <input
                ref={firstFieldRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="2 个字符以上"
                className="rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:bg-surface"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="6 位以上"
                className="rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:bg-surface"
              />
            </label>

            {!isLogin && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">确认密码</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="再输入一次密码"
                  className="rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:bg-surface"
                />
              </label>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "请稍候…" : isLogin ? "登录" : "注册并登录"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-faint">
            {isLogin ? "还没有账号?" : "已有账号?"}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "register" : "login")}
              className="ml-1 font-medium text-accent hover:underline"
            >
              {isLogin ? "去注册" : "去登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
