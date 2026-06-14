"use client";

import { useEffect, useState } from "react";
import type { ChatMode } from "@/lib/types";

export interface AnalyticsData {
  total: number;
  daily: { date: string; count: number }[];
  byMode: { mode: ChatMode; count: number }[];
  hitRate: { hit: number; miss: number };
  topDocs: { name: string; count: number }[];
  blindSpots: { query: string; count: number }[];
  topQueries: { query: string; count: number }[];
}

const MODE_LABEL: Record<ChatMode, string> = {
  docs: "文档问答",
  support: "在线客服",
  tools: "工具增强",
};

// 与主题协调的分类色板:主色 teal + 几个区分度高、明暗主题都清晰的颜色。
const PALETTE = ["var(--accent)", "#6366f1", "#f59e0b", "#ec4899", "#94a3b8"];

// ---- 通用图元(纯 SVG / CSS,零依赖)----

interface Seg {
  label: string;
  value: number;
  color: string;
}

function Donut({ data, size = 132 }: { data: Seg[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
            />
          ) : (
            data.map((d, i) => {
              const len = (d.value / total) * c;
              const seg = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return seg;
            })
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold">{total}</span>
        <span className="text-[11px] text-faint">次</span>
      </div>
    </div>
  );
}

function Legend({ data }: { data: Seg[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="flex-1 space-y-2 text-sm">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: d.color }}
          />
          <span className="flex-1 truncate text-muted">{d.label}</span>
          <span className="font-mono text-xs text-faint">
            {d.value}
            {total > 0 && ` · ${Math.round((d.value / total) * 100)}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BarList({
  items,
  empty,
}: {
  items: { label: string; count: number }[];
  empty: string;
}) {
  if (items.length === 0)
    return <p className="mt-3 text-xs text-faint">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="mt-3 space-y-2">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-muted">{it.label}</span>
            <span className="shrink-0 font-mono text-xs text-faint">
              {it.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(it.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-4 flex h-28 items-end gap-1.5">
      {data.map((d) => (
        <div
          key={d.date}
          className="group relative flex-1"
          style={{ height: "100%" }}
        >
          <div className="flex h-full items-end">
            <div
              className="w-full rounded-t bg-accent/70 transition-colors group-hover:bg-accent"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
            />
          </div>
          {/* 悬浮提示 */}
          <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-text px-1.5 py-0.5 text-[10px] text-bg opacity-0 transition-opacity group-hover:opacity-100">
            {d.date.slice(5)} · {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function QueryList({
  items,
  empty,
  accentMiss,
}: {
  items: { query: string; count: number }[];
  empty: string;
  accentMiss?: boolean;
}) {
  if (items.length === 0)
    return <p className="mt-3 text-xs text-faint">{empty}</p>;
  return (
    <ol className="mt-3 space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-baseline gap-2 text-sm">
          <span className="w-4 shrink-0 font-mono text-xs text-faint">
            {i + 1}
          </span>
          <span className="flex-1 truncate text-muted" title={it.query}>
            {it.query}
          </span>
          <span
            className={`shrink-0 font-mono text-xs ${
              accentMiss ? "text-red-500" : "text-faint"
            }`}
          >
            ×{it.count}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      {children}
    </section>
  );
}

// ---- 主面板 ----

export function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">使用分析</h2>
        <p className="mt-4 text-sm text-faint">加载中…</p>
      </section>
    );

  if (!data || data.total === 0)
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">使用分析</h2>
        <p className="mt-3 text-sm text-faint">
          暂无数据。用户开始提问后,这里会出现活跃度、场景分布、知识库命中率等统计。
        </p>
      </section>
    );

  return <AnalyticsView data={data} />;
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const modeSegs: Seg[] = data.byMode.map((m, i) => ({
    label: MODE_LABEL[m.mode] ?? m.mode,
    value: m.count,
    color: PALETTE[i % PALETTE.length],
  }));

  const hitSegs: Seg[] = [
    { label: "命中知识库", value: data.hitRate.hit, color: "var(--accent)" },
    { label: "未命中", value: data.hitRate.miss, color: "#94a3b8" },
  ];
  const ragTotal = data.hitRate.hit + data.hitRate.miss;
  const hitPct =
    ragTotal > 0 ? Math.round((data.hitRate.hit / ragTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold">使用分析</h2>
        <span className="font-mono text-xs text-faint">
          近 90 天 · 共 {data.total} 次提问
        </span>
      </div>

      {/* 提问量趋势 */}
      <Card title="提问量趋势" hint="近 14 天每日提问数">
        <DailyBars data={data.daily} />
      </Card>

      {/* 场景分布 + 命中率,两个环形饼 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="场景分布" hint="用户主要在用哪个场景">
          <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
            <Donut data={modeSegs} />
            <Legend data={modeSegs} />
          </div>
        </Card>
        <Card title="知识库命中率" hint={`检索问答中有 ${hitPct}% 命中了知识库`}>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
            <Donut data={hitSegs} />
            <Legend data={hitSegs} />
          </div>
        </Card>
      </div>

      {/* 热门文档 */}
      <Card title="热门引用文档 Top 8" hint="被检索命中最多的文档,代表最有价值的资料">
        <BarList
          items={data.topDocs.map((d) => ({ label: d.name, count: d.count }))}
          empty="还没有文档被检索命中。"
        />
      </Card>

      {/* 知识盲区 + 高频提问 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          title="🔥 知识盲区"
          hint="用户问了、但知识库答不上的问题 —— 该补这些资料"
        >
          <QueryList
            items={data.blindSpots}
            empty="很好,暂无未命中的提问。"
            accentMiss
          />
        </Card>
        <Card title="高频提问 Top 10" hint="用户最常问什么">
          <QueryList items={data.topQueries} empty="暂无提问记录。" />
        </Card>
      </div>
    </div>
  );
}
