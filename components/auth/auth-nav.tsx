"use client";

import { useAuth } from "./auth-context";
import { UserMenu } from "./user-menu";

/** 首页头部右侧的登录/用户入口。 */
export function AuthNav() {
  const { user, loading, openAuthModal } = useAuth();

  if (loading) {
    return <div className="h-9 w-20 rounded-lg bg-surface-2/60" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text sm:px-3.5"
      >
        <span className="sm:hidden">登录</span>
        <span className="hidden sm:inline">登录 / 注册</span>
      </button>
    );
  }

  return <UserMenu direction="down" align="right" />;
}
