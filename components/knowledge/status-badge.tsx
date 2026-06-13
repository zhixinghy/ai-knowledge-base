import { CheckIcon, SpinnerIcon } from "../icons";
import type { DocStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP: Record<
  DocStatus,
  { label: string; className: string; spin?: boolean; check?: boolean }
> = {
  parsing: {
    label: "解析中",
    className: "bg-accent-soft text-accent",
    spin: true,
  },
  indexing: {
    label: "索引中",
    className: "bg-accent-soft text-accent",
    spin: true,
  },
  ready: {
    label: "已索引",
    className: "bg-accent-soft text-accent",
    check: true,
  },
  failed: {
    label: "失败",
    className: "bg-red-500/10 text-red-500",
  },
};

export function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        cfg.className,
      )}
    >
      {cfg.spin && <SpinnerIcon width={11} height={11} />}
      {cfg.check && <CheckIcon width={11} height={11} />}
      {cfg.label}
    </span>
  );
}
