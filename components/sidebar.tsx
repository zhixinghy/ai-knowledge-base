"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, LibraryIcon, Logo, PlusIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { useDocuments } from "./documents-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/chat", label: "问答", icon: ChatIcon },
  { href: "/knowledge", label: "知识库", icon: LibraryIcon },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { docs } = useDocuments();

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* brand — back to home */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="返回首页"
        className="flex h-16 items-center gap-2.5 px-5 transition-opacity hover:opacity-70"
      >
        <Logo />
        <span className="font-serif text-lg font-semibold tracking-tight">
          Cortex
        </span>
      </Link>

      {/* primary nav */}
      <nav className="px-3 pt-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon width={18} height={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* knowledge list */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-faint">
            知识库
          </span>
          <span className="font-mono text-xs text-faint">{docs.length}</span>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {docs.length === 0 ? (
            <p className="px-3 py-2 text-xs text-faint">还没有文档</p>
          ) : (
            docs.map((doc) => (
              <Link
                key={doc.id}
                href="/knowledge"
                onClick={onNavigate}
                className="group block rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
              >
                <div className="truncate text-sm text-text/90 group-hover:text-text">
                  {doc.name}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-faint">
                  {doc.chunks} 块 · {doc.pages} 页
                </div>
              </Link>
            ))
          )}
        </div>

        {pathname !== "/knowledge" && (
          <Link
            href="/knowledge"
            onClick={onNavigate}
            className="mt-2 mb-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <PlusIcon width={16} height={16} />
            上传 PDF
          </Link>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-faint">主题</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
