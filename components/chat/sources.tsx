"use client";

import { useState } from "react";
import { ChevronDownIcon, FileIcon } from "../icons";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <FileIcon width={14} height={14} />
        参考来源 {sources.length}
        <ChevronDownIcon
          width={14}
          height={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="animate-scale-in mt-2 origin-top space-y-2">
          {sources.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileIcon
                    width={14}
                    height={14}
                    className="shrink-0 text-accent"
                  />
                  <span className="truncate text-xs font-medium">
                    {s.docName}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    第 {s.page} 页
                  </span>
                </div>
                <ScoreBar score={s.score} />
              </div>
              <p className="mt-2 border-l-2 border-border-strong pl-2.5 text-xs leading-relaxed text-muted">
                {s.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-faint">
        {score.toFixed(2)}
      </span>
    </div>
  );
}
