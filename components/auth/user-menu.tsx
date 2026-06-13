"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { LogOutIcon, SettingsIcon } from "../icons";

/**
 * 已登录用户的头像 + 下拉菜单(管理设置 / 退出登录)。
 * 首页头部用「向下」,侧栏底部用「向上」,故支持 direction/align 两个方向参数。
 * 未登录时不渲染(登录入口由各自的父组件处理)。
 */
export function UserMenu({
  direction = "down",
  align = "left",
  showBadge = false,
  onNavigate,
}: {
  direction?: "up" | "down";
  align?: "left" | "right";
  /** 是否在触发器上显示「管理员」标签 */
  showBadge?: boolean;
  /** 点击菜单项后的额外回调(如移动端关抽屉) */
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!user) return null;

  const pos = [
    direction === "up" ? "bottom-full mb-2" : "top-full mt-2",
    align === "right" ? "right-0" : "left-0",
  ].join(" ");

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-32 truncate text-sm font-medium">
          {user.username}
        </span>
        {showBadge && user.role === "admin" && (
          <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
            管理员
          </span>
        )}
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
          <div
            className={`animate-scale-in absolute z-20 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl ${pos}`}
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.username}</p>
              <p className="text-xs text-faint">
                {user.role === "admin" ? "管理员" : "已登录"}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            {user.role === "admin" && pathname !== "/admin" && (
              <Link
                href="/admin"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <SettingsIcon width={16} height={16} />
                管理设置
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <LogOutIcon width={16} height={16} />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
