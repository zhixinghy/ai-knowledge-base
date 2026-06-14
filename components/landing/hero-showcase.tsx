"use client";

import Link from "next/link";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { ArrowRightIcon, LibraryIcon } from "@/components/icons";

/**
 * 首页 hero —— 一整块深色 banner。
 * - 左侧文案 + CTA,右侧 3D 机器人,共处同一张黑卡(参照 SplineSceneBasic 布局)。
 * - banner 固定深色:机器人是深色调模型,跟随明暗主题反而违和,亮色模式下也保持黑底。
 * - 全设备挂载 Spline;SplineScene 本身懒加载 + Suspense,带自己的 loading 占位。
 * - 场景文件本地自托管(/spline/robot.splinecode),不请求境外 CDN。
 * - Spotlight:跟随鼠标的小光斑,尺寸固定、体积可控(纯 CSS,无 framer-motion)。
 */
export function HeroShowcase() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/96 shadow-2xl shadow-black/40">
      <Spotlight size={420} />

      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* 左:文案 + CTA */}
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8 sm:p-10">
          <div className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/70 backdrop-blur">
            {/* 呼吸指示灯:ping 层 + 实心层叠加 */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            企业知识库智能助手 · RAG + Agent
          </div>

          <h1
            className="animate-fade-up mt-7 max-w-xl bg-linear-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold leading-tight tracking-tight text-transparent md:text-5xl"
            style={{ animationDelay: "70ms" }}
          >
            把你的文档,
            <br />
            <span className="whitespace-nowrap">变成一个<span className="text-accent"> 会答会查 </span>的助手。</span>
          </h1>

          <p
            className="animate-fade-up mt-4 max-w-lg leading-relaxed text-neutral-300"
            style={{ animationDelay: "140ms" }}
          >
            上传 PDF,自动解析、切块、向量化并持久化索引。提问时实时检索相关内容,
            <span className="text-white">逐句标注出处</span>
            ,必要时还能调用联网搜索与计算工具。
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              <LibraryIcon width={16} height={16} />
              管理知识库
            </Link>
          </div>

        </div>

        {/* 右:3D 机器人 */}
        <div className="relative h-72 w-full sm:h-96 lg:h-auto lg:min-h-136 lg:flex-1">
          <SplineScene
            scene="/spline/robot.splinecode"
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
