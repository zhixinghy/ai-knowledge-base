"use client";

import { useAuth } from "./auth-context";
import { UserMenu } from "./user-menu";
import { UserIcon } from "@/components/icons";

/** 首页头部右侧的登录/用户入口。 */
export function AuthNav() {
  const { user, loading, openAuthModal } = useAuth();

  if (loading) {
    return <div className="h-7 w-20 rounded-full bg-surface-2/60" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="group inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1.5 text-sm transition-colors hover:border-accent/50 hover:bg-surface"
      >
        {/* 迷你头像占位圆 */}
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-surface-2 text-faint ring-1 ring-border transition-colors group-hover:ring-accent/40">
          <UserIcon width={11} height={11} />
        </span>
        <span className="text-muted transition-colors group-hover:text-text">
          <span className="hidden sm:inline">登录 / 注册</span>
          <span className="sm:hidden">登录</span>
        </span>
      </button>
    );
  }

  return <UserMenu direction="down" align="right" />;
}
