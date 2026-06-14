"use client";

import { useAuth } from "./auth-context";
import { cn } from "@/lib/utils";

/**
 * 未登录时的「登录 / 注册」入口,首页头部与侧栏底部共用同一胶囊样式。
 * 点击打开登录弹窗;窄屏只显示「登录」。className 用于按需微调外距。
 */
export function LoginButton({ className }: { className?: string }) {
  const { openAuthModal } = useAuth();
  return (
    <button
      type="button"
      onClick={() => openAuthModal("login")}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/50 hover:bg-surface",
        className,
      )}
    >
      <span className="text-muted transition-colors group-hover:text-text">
        <span className="hidden sm:inline">登录 / 注册</span>
        <span className="sm:hidden">登录</span>
      </span>
    </button>
  );
}
