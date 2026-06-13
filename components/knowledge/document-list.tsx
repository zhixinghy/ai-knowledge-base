"use client";

import { FileIcon, TrashIcon } from "../icons";
import { StatusBadge } from "./status-badge";
import type { KnowledgeDoc } from "@/lib/types";
import { formatBytes, relativeTime } from "@/lib/utils";

export function DocumentList({
  docs,
  onDelete,
  isAdmin = false,
}: {
  docs: KnowledgeDoc[];
  onDelete: (id: string) => void;
  /** 是否管理员;客服库文档只有管理员能删,普通用户不显示删除按钮 */
  isAdmin?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {docs.map((doc, i) => {
        const busy = doc.status === "parsing" || doc.status === "indexing";
        // 客服库(共享)仅管理员可删;自己的文档库可删
        const canDelete = doc.collection !== "support" || isAdmin;
        return (
          <div
            key={doc.id}
            className="group flex items-center gap-4 border-border bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2/60"
            style={{ borderTopWidth: i === 0 ? 0 : 1 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <FileIcon width={18} height={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {doc.name}
                </span>
                <span className="shrink-0">
                  <StatusBadge status={doc.status} />
                </span>
              </div>

              {busy ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative h-1 w-40 max-w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="indeterminate-bar absolute inset-y-0 rounded-full bg-accent" />
                  </div>
                  <span className="font-mono text-[11px] text-faint">
                    解析 + 向量化…
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-faint">
                  <span>{formatBytes(doc.size)}</span>
                  <span className="text-border-strong">·</span>
                  <span>{doc.chunks} 块</span>
                  <span className="text-border-strong">·</span>
                  <span>{doc.pages} 页</span>
                  <span className="text-border-strong">·</span>
                  <span>{relativeTime(doc.addedAt)}</span>
                </div>
              )}
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                aria-label={`删除 ${doc.name}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <TrashIcon width={16} height={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
