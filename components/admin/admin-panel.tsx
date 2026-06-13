"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { TrashIcon } from "../icons";

interface AdminUser {
  id: string;
  username: string;
  role: "user" | "admin";
  createdAt: number;
}

interface AdminData {
  count: number;
  users: AdminUser[];
  docCounts: Record<string, number>;
}

const QUOTA_PRESETS = [1, 3, 5, 7];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPanel() {
  const { user: me } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [savingQuota, setSavingQuota] = useState(false);

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]);
    if (u?.users) setData(u);
    if (typeof s?.anonQuota === "number") setQuota(s.anonQuota);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveQuota(n: number) {
    if (savingQuota || n === quota) return;
    setSavingQuota(true);
    const prev = quota;
    setQuota(n); // 乐观更新
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonQuota: n }),
    });
    if (!res.ok) setQuota(prev); // 失败回滚
    setSavingQuota(false);
  }

  async function removeUser(id: string) {
    setConfirmingId(null);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok && data) {
      setData({
        ...data,
        count: data.count - 1,
        users: data.users.filter((u) => u.id !== id),
      });
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          管理设置
        </h1>
        <p className="mt-1 text-sm text-faint">仅管理员可见</p>

        {/* 试用额度 */}
        <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">匿名试用额度</h2>
          <p className="mt-1 text-xs text-faint">
            未登录访客可用 chat / 上传的总次数,用尽后弹登录框。改动即时对新访客生效。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {QUOTA_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={savingQuota}
                onClick={() => void saveQuota(n)}
                className={`h-9 w-12 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
                  quota === n
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-1 text-xs text-faint">
              {quota === null ? "" : `当前:${quota} 次`}
            </span>
          </div>
        </section>

        {/* 用户管理 */}
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">注册用户</h2>
            <span className="font-mono text-xs text-faint">
              共 {data?.count ?? 0} 人
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-faint">加载中…</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-faint">
                    <th className="pb-2 font-medium">用户名</th>
                    <th className="pb-2 font-medium">类型</th>
                    <th className="pb-2 font-medium">注册时间</th>
                    <th className="pb-2 text-right font-medium">文档</th>
                    <th className="pb-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((u) => {
                    const isSelf = u.id === me?.userId;
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-2.5 font-medium">{u.username}</td>
                        <td className="py-2.5">
                          {u.role === "admin" ? (
                            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                              管理员
                            </span>
                          ) : (
                            <span className="text-muted">普通</span>
                          )}
                        </td>
                        <td className="py-2.5 font-mono text-xs text-faint">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-muted">
                          {data.docCounts[u.id] ?? 0}
                        </td>
                        <td className="py-2.5 text-right">
                          {isSelf ? (
                            <span className="text-xs text-faint">—</span>
                          ) : confirmingId === u.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void removeUser(u.id)}
                                className="text-xs font-medium text-red-500 hover:underline"
                              >
                                确认删除
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="text-xs text-faint hover:text-text"
                              >
                                取消
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label="删除用户"
                              onClick={() => setConfirmingId(u.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-red-500/10 hover:text-red-500"
                            >
                              <TrashIcon width={15} height={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-faint">
                删除用户会一并删除其上传的全部文档,不可恢复。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
