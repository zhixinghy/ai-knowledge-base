"use client";

import { Suspense, lazy, useState } from "react";
import { cn } from "@/lib/utils";

// 懒加载:Spline 运行时(WebGL,约 1–2MB)只在组件真正挂载时才下载,
// 不拖累首屏其余内容。
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  /** 场景文件地址。本项目用本地自托管的 /spline/*.splinecode,不走境外 CDN。 */
  scene: string;
  className?: string;
  /**
   * 可选静态海报(public 下的相对路径,如 /spline/robot-poster.webp)。
   * 加载期先显示它,3D 就绪后淡出 —— 用户「秒看到机器人」,真正的 3D 在后台加载。
   * 不传则退化为品牌青光晕的柔和脉冲占位。
   */
  poster?: string;
}

/**
 * 3D 场景容器,带加载期占位 + 就绪淡入。
 * 占位层独立叠放,覆盖「运行时 JS 下载 → 场景解析」整个加载过程,
 * 直到 Spline 的 onLoad 触发(3D 真正画出来)才淡出 —— 避免中途露出空白/转圈。
 */
export function SplineScene({ scene, className, poster }: SplineSceneProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          ready ? "opacity-0" : "opacity-100",
        )}
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : (
          <PlaceholderGlow />
        )}
      </div>

      <Suspense fallback={null}>
        <Spline
          scene={scene}
          className="h-full w-full"
          onLoad={() => setReady(true)}
        />
      </Suspense>
    </div>
  );
}

function PlaceholderGlow() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-accent/15 blur-2xl" />
    </div>
  );
}
