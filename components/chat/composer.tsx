"use client";

import { useEffect, useRef } from "react";
import { SendIcon } from "../icons";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm transition-colors focus-within:border-border-strong">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "输入问题…"}
        className="max-h-50 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-text placeholder:text-faint focus:outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        aria-label="发送"
        className={cn(
          "mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          canSend
            ? "bg-accent text-accent-fg hover:bg-accent-hover"
            : "bg-surface-2 text-faint",
        )}
      >
        <SendIcon width={18} height={18} />
      </button>
    </div>
  );
}
