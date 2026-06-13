"use client";

import Link from "next/link";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { CloseIcon, Logo, MenuIcon } from "./icons";
import { DocumentsProvider } from "./documents-context";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DocumentsProvider>
      <div className="flex h-screen overflow-hidden">
      {/* desktop sidebar */}
      <aside className="hidden w-66 shrink-0 border-r border-border md:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-70 border-r border-border shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="打开菜单"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link
            href="/"
            aria-label="返回首页"
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <Logo className="h-6 w-6" />
            <span className="font-serif font-semibold">Cortex</span>
          </Link>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
      </div>
    </DocumentsProvider>
  );
}
