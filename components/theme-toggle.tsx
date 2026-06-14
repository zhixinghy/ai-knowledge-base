"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";
import { cn } from "@/lib/utils";

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle(e: React.MouseEvent) {
    const next = !dark;
    const root = document.documentElement;

    const apply = () => {
      root.classList.toggle("dark", next);
      setDark(next);
      try {
        localStorage.setItem("cortex-theme", next ? "dark" : "light");
      } catch {}
    };

    const doc = document as ViewTransitionDocument;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!doc.startViewTransition || prefersReduced) {
      apply();
      return;
    }

    root.style.setProperty("--vt-x", `${e.clientX}px`);
    root.style.setProperty("--vt-y", `${e.clientY}px`);
    doc.startViewTransition(apply);
  }

  /* SSR 占位,尺寸与正文一致,防止布局抖动 */
  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 w-16 rounded-full border border-zinc-800 bg-zinc-950",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-16 cursor-pointer items-center justify-between rounded-full border p-1 transition-all duration-300",
        dark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white",
        className,
      )}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-label="切换明暗主题"
    >
      {/* 左侧槽:暗色时是活跃月亮,亮色时 translate 到右侧变活跃太阳 */}
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300",
          dark
            ? "translate-x-0 bg-zinc-800"
            : "translate-x-8 bg-gray-200",
        )}
      >
        {dark ? (
          <MoonIcon width={14} height={14} className="text-white" />
        ) : (
          <SunIcon width={14} height={14} className="text-gray-700" />
        )}
      </div>

      {/* 右侧槽:暗色时是非活跃太阳,亮色时 -translate 到左侧变非活跃月亮 */}
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300",
          dark ? "bg-transparent" : "-translate-x-8",
        )}
      >
        {dark ? (
          <SunIcon width={14} height={14} className="text-gray-500" />
        ) : (
          <MoonIcon width={14} height={14} className="text-black" />
        )}
      </div>
    </div>
  );
}
