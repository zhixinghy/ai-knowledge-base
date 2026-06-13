"use client";

import { useState } from "react";
import { useAuth } from "./auth-context";

/** 首页头部右侧的登录/用户入口。 */
export function AuthNav() {
  const { user, loading, openAuthModal, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-9 w-20 rounded-lg bg-surface-2/60" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        登录 / 注册
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-surface-2"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-28 truncate text-sm font-medium">
          {user.username}
        </span>
      </button>

      {open && (
        <>
          {/* 点击空白处关闭 */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="animate-scale-in absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.username}</p>
              <p className="text-xs text-faint">
                {user.role === "admin" ? "管理员" : "已登录"}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
