"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadZone } from "./upload-zone";
import { DocumentList } from "./document-list";
import { ChatIcon, FileIcon, LibraryIcon } from "../icons";
import { useDocuments } from "../documents-context";
import { useAuth } from "../auth/auth-context";
import type { Collection, KnowledgeDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

let uploadCounter = 0;

const LIBRARIES: {
  id: Collection;
  label: string;
  icon: typeof FileIcon;
  hint: string;
}[] = [
  {
    id: "docs",
    label: "文档助手库",
    icon: FileIcon,
    hint: "你上传的文档,供「文档助手」模式检索作答。",
  },
  {
    id: "support",
    label: "客服库",
    icon: ChatIcon,
    hint: "预置的 FAQ / 政策等资料,供「客服」模式检索作答。",
  },
];

export function KnowledgeView() {
  const { docs, loading, setDocs } = useDocuments();
  const { user, openAuthModal } = useAuth();
  const [collection, setCollection] = useState<Collection>("docs");
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const onFiles = useCallback(
    (files: File[]) => {
      setError(null);
      void (async () => {
        for (const file of files) {
          const tempId = `up-${Date.now()}-${uploadCounter++}`;
          const temp: KnowledgeDoc = {
            id: tempId,
            collection,
            name: file.name,
            size: file.size,
            pages: 0,
            chunks: 0,
            status: "parsing",
            addedAt: Date.now(),
          };
          setDocs((prev) => [temp, ...prev]);

          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("collection", collection);
            const res = await fetch("/api/ingest", { method: "POST", body: fd });
            if (!res.ok) {
              const body = (await res.json().catch(() => null)) as
                | { error?: string }
                | null;
              // 试用额度用尽 → 弹登录/注册框
              if (res.status === 401) openAuthModal("register");
              throw new Error(body?.error || `HTTP ${res.status}`);
            }
            const doc = (await res.json()) as KnowledgeDoc;
            if (!aliveRef.current) return;
            setDocs((prev) => prev.map((d) => (d.id === tempId ? doc : d)));
          } catch (e) {
            if (!aliveRef.current) return;
            setError(
              `「${file.name}」入库失败:${e instanceof Error ? e.message : "未知错误"}`,
            );
            setDocs((prev) =>
              prev.map((d) => (d.id === tempId ? { ...d, status: "failed" } : d)),
            );
          }
        }
      })();
    },
    [collection, setDocs, openAuthModal],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const prev = docs;
      setDocs((cur) => cur.filter((d) => d.id !== id));
      try {
        const res = await fetch("/api/documents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setError("删除失败");
        setDocs(prev);
      }
    },
    [docs, setDocs],
  );

  const isAdmin = user?.role === "admin";
  // 客服库是公共库,仅管理员可上传/删除
  const canUpload = collection !== "support" || isAdmin;
  const active = LIBRARIES.find((l) => l.id === collection)!;
  const inCollection = docs.filter((d) => d.collection === collection);
  const ready = inCollection.filter((d) => d.status === "ready");
  const totalChunks = ready.reduce((s, d) => s + d.chunks, 0);
  const totalPages = ready.reduce((s, d) => s + d.pages, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            知识库
          </h1>
          <p className="mt-2 text-muted">
            分库管理:不同库供不同模式检索,互不干扰。
          </p>
        </header>

        {/* library switcher */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {LIBRARIES.map((lib) => {
            const isActive = lib.id === collection;
            const Icon = lib.icon;
            const count = docs.filter((d) => d.collection === lib.id).length;
            return (
              <button
                key={lib.id}
                type="button"
                onClick={() => setCollection(lib.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-text",
                )}
              >
                <Icon width={16} height={16} />
                {lib.label}
                <span className="font-mono text-xs text-faint">{count}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-faint">{active.hint}</p>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-5">
          <Stat value={inCollection.length} label="文档" />
          <Stat value={totalChunks} label="索引块" />
          <Stat value={totalPages} label="总页数" />
        </div>

        {canUpload ? (
          <div className="mt-6">
            <UploadZone onFiles={onFiles} />
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-border bg-surface-2/40 px-4 py-3 text-sm text-faint">
            客服库为公共知识库,仅管理员可维护。
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">
              {active.label}文档
              <span className="ml-2 font-mono text-faint">
                {inCollection.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <LoadingDocs />
          ) : inCollection.length > 0 ? (
            <DocumentList
              docs={inCollection}
              onDelete={onDelete}
              isAdmin={isAdmin}
            />
          ) : (
            <EmptyDocs />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-2xl font-semibold tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function LoadingDocs() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyDocs() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-faint">
        <LibraryIcon />
      </div>
      <p className="mt-4 text-sm text-muted">这个库还没有文档,上传一份 PDF 试试</p>
    </div>
  );
}
