"use client";

import { ChatIcon, FileIcon, SparkleIcon } from "../icons";
import { MODES } from "@/lib/mock-data";
import type { ChatMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ChatMode, typeof FileIcon> = {
  docs: FileIcon,
  support: ChatIcon,
  tools: SparkleIcon,
};

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (m: ChatMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      {MODES.map((m) => {
        const active = m.id === mode;
        const Icon = ICONS[m.id];
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-text",
            )}
          >
            <Icon width={16} height={16} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
