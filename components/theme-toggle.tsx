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

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
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

    // 不支持 View Transitions(或用户偏好减少动效)→ 直接切换。
    if (!doc.startViewTransition || prefersReduced) {
      apply();
      return;
    }

    // 以点击位置作为圆形揭开动画的锚点。
    root.style.setProperty("--vt-x", `${e.clientX}px`);
    root.style.setProperty("--vt-y", `${e.clientY}px`);

    doc.startViewTransition(apply);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换明暗主题"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      {mounted && (dark ? <MoonIcon /> : <SunIcon />)}
    </button>
  );
}
