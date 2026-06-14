import { Fragment } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth/auth-nav";
import {
  ArrowRightIcon,
  ChatIcon,
  DatabaseIcon,
  FileIcon,
  GlobeIcon,
  Logo,
  SearchIcon,
  SparkleIcon,
} from "@/components/icons";
import { MODES } from "@/lib/mock-data";
import { HeroShowcase } from "@/components/landing/hero-showcase";

const MODE_ICONS = [FileIcon, ChatIcon, SparkleIcon] as const;

const STATS = [
  { value: "RAG", label: "检索增强生成" },
  { value: "Agent", label: "工具调用" },
  { value: "4", label: "场景 · 一套内核" },
];

const PIPELINE = [
  { icon: FileIcon, t: "入库", d: "上传 → 解析 → 切块" },
  { icon: DatabaseIcon, t: "索引", d: "向量化 → 持久化存储" },
  { icon: SearchIcon, t: "检索", d: "提问时召回相关片段" },
  { icon: GlobeIcon, t: "生成", d: "流式作答 + 出处" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 氛围层 */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div
        className="pointer-events-none absolute left-1/2 -top-48 h-136 w-136 -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--accent), transparent 70%)",
        }}
      />

      <div className="relative z-10">
        {/* ── Nav ── */}
        <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-serif text-xl font-semibold tracking-tight">
              Cortex
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AuthNav />
            <ThemeToggle />
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              进入工作台
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <div className="animate-fade-up">
            <HeroShowcase />
          </div>

          {/* Stats — 水平排列,点号分隔 */}
          <div
            className="animate-fade-up mt-4 flex flex-wrap items-center gap-x-1"
            style={{ animationDelay: "280ms" }}
          >
            {STATS.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && (
                  <span className="select-none px-2 text-border">·</span>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-lg font-semibold text-text">
                    {s.value}
                  </span>
                  <span className="text-xs text-faint">{s.label}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        {/* ── Section 01: 场景 ── */}
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6">
          {/* 编辑感节区头部:序号 + 标题 + 右侧说明 */}
          <div
            className="animate-fade-up mb-12 flex items-end justify-between gap-6 border-b border-border pb-6"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-end gap-4">
              <span className="mb-0.5 font-mono text-xs tracking-widest text-faint">
                01
              </span>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                一套架构,四种场景
              </h2>
            </div>
            <p className="hidden whitespace-nowrap text-right text-sm leading-relaxed text-muted sm:block">
              切换知识库、人设与工具开关,同一内核衍生出不同助手。
            </p>
          </div>

          {/* 非对称卡片网格:Featured 大卡(左 2/3) + 两张堆叠(右 1/3) */}
          <div
            className="grid animate-fade-up gap-4 lg:grid-cols-3"
            style={{ animationDelay: "120ms" }}
          >
            {/* Featured 卡 */}
            {MODES.slice(0, 1).map((mode) => (
              <div
                key={mode.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-accent/40 hover:bg-surface-2/40 lg:col-span-2"
              >
                <div className="mb-8 flex items-start justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <FileIcon />
                  </div>
                  <span className="font-mono text-5xl font-semibold leading-none text-border transition-colors group-hover:text-accent/25">
                    01
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{mode.label}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  {mode.tagline}
                </p>
                {/* 示例问题 pills */}
                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex flex-wrap gap-2">
                    {mode.suggestions.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* 两张小卡堆叠 */}
            <div className="flex flex-col gap-4">
              {MODES.slice(1).map((mode, i) => {
                const Icon = MODE_ICONS[i + 1] ?? FileIcon;
                return (
                  <div
                    key={mode.id}
                    className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40 hover:bg-surface-2/40"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <Icon />
                      </div>
                      <span className="font-mono text-2xl font-semibold leading-none text-border transition-colors group-hover:text-accent/25">
                        0{i + 2}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold">{mode.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {mode.tagline}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 02: 处理流程 ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6">
          {/* 节区头部 */}
          <div
            className="animate-fade-up mb-12 flex items-end justify-between gap-6 border-b border-border pb-6"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-end gap-4">
              <span className="mb-0.5 font-mono text-xs tracking-widest text-faint">
                02
              </span>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                处理流程
              </h2>
            </div>
            <p className="hidden max-w-[16rem] text-right text-sm leading-relaxed text-muted sm:block">
              文档入库到智能作答,四步全自动。
            </p>
          </div>

          {/* 横向四格流程展台 */}
          <div
            className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-surface"
            style={{ animationDelay: "120ms" }}
          >
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {PIPELINE.map((step, idx) => {
                const I = step.icon;
                return (
                  <div
                    key={step.t}
                    className="group relative p-8 transition-colors hover:bg-surface-2"
                  >
                    {/* 大序号作为视觉锚点 */}
                    <span className="mb-6 block font-mono text-5xl font-semibold leading-none text-border transition-colors group-hover:text-accent/20">
                      0{idx + 1}
                    </span>
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent transition-colors group-hover:border-accent/50">
                      <I width={18} height={18} />
                    </div>
                    <div className="text-sm font-semibold">{step.t}</div>
                    <div className="mt-1 text-sm text-muted">{step.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mx-auto max-w-6xl border-t border-border px-6 py-10 text-sm text-faint">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-serif font-semibold text-muted">
                Cortex
              </span>
              <span className="select-none text-border">·</span>
              <span>企业知识库智能助手</span>
            </div>
            <span className="font-mono text-xs tracking-wider">
              RAG + Agent · Next.js
            </span>
          </div>
          <p className="mt-6 text-center font-mono text-xs tracking-widest text-faint/60">
            by zhixinghy
          </p>
        </footer>
      </div>
    </div>
  );
}
