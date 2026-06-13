"use client";

import { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SpinnerIcon,
  ToolIcon,
} from "../icons";
import type { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ToolCallList({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="mb-3 space-y-1.5">
      {calls.map((call) => (
        <ToolCallRow key={call.id} call={call} />
      ))}
    </div>
  );
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const running = call.status === "running";
  const error = call.status === "error";
  const [open, setOpen] = useState(false);

  const hasResult = !!call.result && !running;
  // 只有较长的结果才值得单独做展开/收起(例如联网搜索)
  const expandable = hasResult && (call.result?.length ?? 0) > 48;

  const header = (
    <>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          running ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted",
        )}
      >
        <ToolIcon name={call.icon} width={15} height={15} />
      </span>

      <span className="min-w-0 flex-1 truncate text-muted">{call.label}</span>

      {/* short result preview inline (e.g. calculator) */}
      {hasResult && !expandable && (
        <span className="hidden max-w-[45%] shrink truncate font-mono text-xs text-faint sm:block">
          → {call.result}
        </span>
      )}

      <span className="shrink-0">
        {running ? (
          <SpinnerIcon width={15} height={15} className="text-accent" />
        ) : error ? (
          <CloseIcon width={15} height={15} className="text-red-500" />
        ) : (
          <CheckIcon width={15} height={15} className="text-accent" />
        )}
      </span>

      {expandable && (
        <ChevronDownIcon
          width={15}
          height={15}
          className={cn(
            "shrink-0 text-faint transition-transform",
            open && "rotate-180",
          )}
        />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-surface transition-colors",
        running
          ? "border-accent/40"
          : error
            ? "border-red-500/30"
            : "border-border",
      )}
    >
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-2 text-sm">
          {header}
        </div>
      )}

      {expandable && open && (
        <div className="border-t border-border px-3 py-2.5">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted">
            {call.result}
          </pre>
        </div>
      )}
    </div>
  );
}
