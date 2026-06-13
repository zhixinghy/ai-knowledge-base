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

    // No View Transitions support (or reduced motion) → plain swap.
    if (!doc.startViewTransition || prefersReduced) {
      apply();
      return;
    }

    // Anchor the circular reveal at the click point.
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
