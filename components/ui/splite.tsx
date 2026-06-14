"use client";

import { Suspense, lazy } from "react";
import { SpinnerIcon } from "../icons";

// 懒加载:Spline 运行时(WebGL,约 1–2MB)只在组件真正挂载时才下载,
// 不拖累首屏其余内容。
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  /** 场景文件地址。本项目用本地自托管的 /spline/*.splinecode,不走境外 CDN。 */
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <SpinnerIcon className="text-faint" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
