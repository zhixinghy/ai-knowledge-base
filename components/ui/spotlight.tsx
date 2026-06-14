"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  /** 光斑直径(px),默认 360。固定尺寸,不随容器缩放 —— 区别于「大光束」版的关键。 */
  size?: number;
  /** 径向渐变中心色,默认纯白(与参考一致)。想跟主题走可传 var(--accent)。 */
  color?: string;
};

/**
 * 跟随鼠标的柔光光斑(纯 CSS,无 framer-motion 依赖)。
 * - 自动挂到父元素:监听父元素的鼠标移动,悬停淡入、移出淡出。
 * - 固定直径,体积可控 —— 不像「大光束」那样随容器变大。
 * - 性能关键:位置直接写 DOM 的 transform(配 rAF),不走 React state,
 *   否则每次 mousemove 都会让整个 banner(含 Spline 机器人)重渲染 → 卡顿。
 * - 平滑跟随交给 CSS transition 模拟弹簧。
 */
export function Spotlight({
  className,
  size = 360,
  color = "rgba(255,255,255,0.5)",
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!parent.style.position) parent.style.position = "relative";
    parent.style.overflow = "hidden";

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = parent.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
      });
    };
    const onEnter = () => (el.style.opacity = "1");
    const onLeave = () => (el.style.opacity = "0");

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseenter", onEnter);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseenter", onEnter);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, [size]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-0 top-0 z-1 rounded-full opacity-0 blur-2xl transition-[transform,opacity] duration-200 ease-out",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
        willChange: "transform, opacity",
      }}
    />
  );
}
