import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth/auth-nav";
import {
  ArrowRightIcon,
  ChatIcon,
  DatabaseIcon,
  FileIcon,
  GlobeIcon,
  LibraryIcon,
  Logo,
  SearchIcon,
  SparkleIcon,
} from "@/components/icons";
import { MODES } from "@/lib/mock-data";

const MODE_ICONS = [FileIcon, ChatIcon, SparkleIcon] as const;

const STATS = [
  { value: "RAG", label: "检索增强生成" },
  { value: "Agent", label: "工具调用" },
  { value: "4", label: "场景 · 一套内核" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* atmosphere */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div
        className="pointer-events-none absolute left-1/2 -top-48 h-136 w-136 -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />

      <div className="relative z-10">
        {/* nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-serif text-xl font-semibold tracking-tight">
              Cortex
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/knowledge"
              className="hidden rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text sm:block"
            >
              知识库
            </Link>
            <AuthNav />
            <ThemeToggle className="mr-1" />
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              进入工作台
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </nav>
        </header>

        {/* hero */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-xs text-muted backdrop-blur"
            style={{ animationDelay: "0ms" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            企业知识库智能助手 · RAG + Agent
          </div>

          <h1
            className="animate-fade-up mt-7 max-w-3xl font-serif text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
            style={{ animationDelay: "70ms" }}
          >
            把你的文档,
            <br />
            变成一个
            <span className="text-accent"> 会答会查 </span>
            的助手。
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: "140ms" }}
          >
            上传 PDF,自动解析、切块、向量化并持久化索引。提问时实时检索相关内容,
            <span className="text-text">逐句标注出处</span>,必要时还能调用联网搜索与计算工具。
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "210ms" }}
          >
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              开始提问
              <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              <LibraryIcon width={16} height={16} />
              管理知识库
            </Link>
          </div>

          {/* stats */}
          <div
            className="animate-fade-up mt-16 flex flex-wrap gap-x-12 gap-y-6 border-t border-border pt-8"
            style={{ animationDelay: "280ms" }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-mono text-2xl font-semibold text-text">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* scenarios */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                一套架构,四种场景
              </h2>
              <p className="mt-2 text-muted">
                切换知识库、人设与工具开关,同一内核衍生出不同助手。
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((mode, i) => {
              const Icon = MODE_ICONS[i] ?? FileIcon;
              return (
                <div
                  key={mode.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon />
                  </div>
                  <h3 className="text-lg font-semibold">{mode.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {mode.tagline}
                  </p>
                </div>
              );
            })}

            {/* ingest pipeline card */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong lg:col-span-3">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: FileIcon, t: "入库", d: "上传 → 解析 → 切块" },
                  { icon: DatabaseIcon, t: "索引", d: "向量化 → 持久化存储" },
                  { icon: SearchIcon, t: "检索", d: "提问时召回相关片段" },
                  { icon: GlobeIcon, t: "生成", d: "流式作答 + 出处" },
                ].map((step, idx) => {
                  const I = step.icon;
                  return (
                    <div key={step.t} className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-accent">
                        <I width={18} height={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="font-mono text-xs text-faint">
                            0{idx + 1}
                          </span>
                          {step.t}
                        </div>
                        <div className="mt-0.5 text-sm text-muted">{step.d}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-faint">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-8">
            <span>Cortex · 企业知识库智能助手</span>
            <span className="font-mono">RAG + Agent · Next.js</span>
          </div>
          <p className="mt-4 text-center font-mono text-xs tracking-wider text-faint/70">
            by zhixinghy
          </p>
        </footer>
      </div>
    </div>
  );
}
