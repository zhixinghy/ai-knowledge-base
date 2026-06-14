"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, EyeIcon, EyeOffIcon, Logo } from "../icons";
import { api, ApiError } from "@/lib/api";
import type { AuthUser } from "./auth-context";

type Mode = "login" | "register";

type XY = { x: number; y: number };

const PUPIL = "#071a18"; // 瞳孔深色,落在深青背景上也清晰

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// 角色画布尺寸(面板局部坐标系,角色都贴在 bottom)
const BOX_W = 160;
const BOX_H = 170;

// 各角色「眼睛簇中心」在画布里的固定坐标 —— 视线方向据此用纯数学算,
// 不再每帧读 getBoundingClientRect,避免读到动画中途值造成的抖动与强制回流
const EYE = {
  teal: { x: 62, y: 61 },
  purple: { x: 104, y: 87 },
  orange: { x: 45, y: 142 },
  yellow: { x: 135, y: 116 },
} as const;

// 由「鼠标相对画布坐标 rel」算出视线/瞳孔偏移(限制在 max 半径内)
function gaze(eye: XY, rel: XY, max: number): XY {
  const dx = rel.x - eye.x;
  const dy = rel.y - eye.y;
  const dist = Math.min(Math.hypot(dx, dy), max);
  const a = Math.atan2(dy, dx);
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
}

// ── 眼球(带眼白):look 为瞳孔偏移 ──
function EyeBall({
  size = 12,
  isBlinking = false,
  look,
}: {
  size?: number;
  isBlinking?: boolean;
  look: XY;
}) {
  return (
    <div
      className="shrink-0 rounded-full bg-white flex items-center justify-center"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        transition: "height 0.12s ease",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: Math.round(size * 0.48),
            height: Math.round(size * 0.48),
            background: PUPIL,
            transform: `translate(${look.x}px, ${look.y}px)`,
            transition: "transform 0.08s ease-out",
          }}
        />
      )}
    </div>
  );
}

// ── 纯瞳孔(无眼白):前排两个角色用 ──
function Pupil({ size = 10, look }: { size?: number; look: XY }) {
  return (
    <div
      className="shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: PUPIL,
          transform: `translate(${look.x}px, ${look.y}px)`,
          transition: "transform 0.08s ease-out",
        }}
      />
    </div>
  );
}

// 随机眨眼:返回一个 boolean state,组件卸载即停
function useBlink(delay = 0) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let mounted = true;
    function loop() {
      const t = setTimeout(
        () => {
          if (!mounted) return;
          setBlink(true);
          setTimeout(() => {
            if (!mounted) return;
            setBlink(false);
            loop();
          }, 150);
        },
        Math.random() * 4000 + 2500,
      );
      return t;
    }
    const start = setTimeout(loop, delay);
    return () => {
      mounted = false;
      clearTimeout(start);
    };
  }, [delay]);
  return blink;
}

// 跟随指针(鼠标 + 触摸):返回指针相对某画布容器的坐标,
// 桌面端听 mousemove、移动端听 touchmove/touchstart,统一封装。
// 容器隐藏(如移动端面板未显示)时拿不到位置就忽略,坐标保持默认(画布中心)。
function usePointerInBox(
  ref: React.RefObject<HTMLElement | null>,
  fallback: XY,
) {
  const [rel, setRel] = useState<XY>(fallback);
  useEffect(() => {
    const update = (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRel({ x: clientX - r.left, y: clientY - r.top });
    };
    const onMouse = (e: MouseEvent) => update(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) update(t.clientX, t.clientY);
    };
    window.addEventListener("mousemove", onMouse);
    // passive:不阻止滚动,仅读取手指位置
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
    };
    // fallback 仅用作初始值,故不进依赖;ref 恒定
  }, [ref]);
  return rel;
}

// ── 左侧装饰面板:四个几何角色 ──
function CharactersPanel({
  isTyping,
  showPeek,
}: {
  isTyping: boolean;
  showPeek: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  const rel = usePointerInBox(boxRef, { x: BOX_W / 2, y: BOX_H / 2 });
  const blink1 = useBlink(0);
  const blink2 = useBlink(1200);

  // 视线:密码可见时礼貌移开,紫色角色偷瞄;否则各自看鼠标
  const away: XY = { x: -3, y: -3.5 };
  const peek: XY = { x: 3, y: 3.5 };
  const tealLook = showPeek ? away : gaze(EYE.teal, rel, 3);
  const purpleLook = showPeek ? peek : gaze(EYE.purple, rel, 3);
  const orangeLook = showPeek ? away : gaze(EYE.orange, rel, 4);
  const yellowLook = showPeek ? away : gaze(EYE.yellow, rel, 4);

  // 身体只做 skewX(原点 bottom center,脚永远贴地);密码可见时统一站直
  const skewOf = (cx: number) =>
    showPeek ? 0 : clamp(-(rel.x - cx) / 42, -6, 6);
  // 脸部(眼睛簇)轻微平移,跟手更明显
  const faceOf = (e: XY) =>
    showPeek
      ? { x: 0, y: 0 }
      : {
          x: clamp((rel.x - e.x) / 14, -7, 7),
          y: clamp((rel.y - e.y) / 18, -4, 4),
        };

  const tealFace = faceOf(EYE.teal);
  const purpleFace = faceOf(EYE.purple);
  const orangeFace = faceOf(EYE.orange);
  const yellowFace = faceOf(EYE.yellow);

  // 身体过渡放慢、脸部跟手要快,分开设置
  const bodyTrans = "transform 0.3s ease, height 0.4s ease";
  const faceTrans = "left 0.12s ease-out, top 0.12s ease-out";

  return (
    <div
      ref={boxRef}
      className="relative mx-auto"
      style={{ width: BOX_W, height: BOX_H }}
    >
      {/* 角色1:后排高柱,accent 青 */}
      <div
        className="absolute bottom-0"
        style={{
          left: 28,
          width: 56,
          height: isTyping ? 156 : 142,
          background: "rgba(47,212,193,0.9)",
          borderRadius: "10px 10px 0 0",
          zIndex: 1,
          transformOrigin: "bottom center",
          transform: `skewX(${isTyping ? skewOf(56) - 3 : skewOf(56)}deg)`,
          transition: bodyTrans,
        }}
      >
        <div
          className="absolute flex gap-3"
          style={{
            left: 14 + tealFace.x,
            top: 26 + tealFace.y,
            transition: faceTrans,
          }}
        >
          <EyeBall size={14} isBlinking={blink1} look={tealLook} />
          <EyeBall size={14} isBlinking={blink1} look={tealLook} />
        </div>
      </div>

      {/* 角色2:中排,柔紫,会偷瞄 */}
      <div
        className="absolute bottom-0"
        style={{
          left: 80,
          width: 40,
          height: showPeek ? 122 : 106,
          background: "#8b7cf6",
          borderRadius: "8px 8px 0 0",
          zIndex: 2,
          transformOrigin: "bottom center",
          transform: `skewX(${isTyping ? skewOf(100) + 4 : skewOf(100)}deg)`,
          transition: bodyTrans,
        }}
      >
        <div
          className="absolute flex gap-2"
          style={{
            left: 9 + purpleFace.x,
            top: (showPeek ? 14 : 18) + purpleFace.y,
            transition: faceTrans,
          }}
        >
          <EyeBall size={11} isBlinking={blink2} look={purpleLook} />
          <EyeBall size={11} isBlinking={blink2} look={purpleLook} />
        </div>
      </div>

      {/* 角色3:前排半圆,暖橙(只有瞳孔) */}
      <div
        className="absolute bottom-0"
        style={{
          left: 2,
          width: 78,
          height: 62,
          background: "#f4a261",
          borderRadius: "39px 39px 0 0",
          zIndex: 3,
          transformOrigin: "bottom center",
          transform: `skewX(${skewOf(45)}deg)`,
          transition: bodyTrans,
        }}
      >
        <div
          className="absolute flex gap-4"
          style={{
            left: 26 + orangeFace.x,
            top: 30 + orangeFace.y,
            transition: faceTrans,
          }}
        >
          <Pupil size={9} look={orangeLook} />
          <Pupil size={9} look={orangeLook} />
        </div>
      </div>

      {/* 角色4:前排圆角,亮黄(瞳孔 + 嘴) */}
      <div
        className="absolute bottom-0"
        style={{
          left: 106,
          width: 48,
          height: 80,
          background: "#e9c46a",
          borderRadius: "24px 24px 0 0",
          zIndex: 4,
          transformOrigin: "bottom center",
          transform: `skewX(${skewOf(135)}deg)`,
          transition: bodyTrans,
        }}
      >
        <div
          className="absolute flex gap-3"
          style={{
            left: 14 + yellowFace.x,
            top: 22 + yellowFace.y,
            transition: faceTrans,
          }}
        >
          <Pupil size={9} look={yellowLook} />
          <Pupil size={9} look={yellowLook} />
        </div>
        {/* 嘴:一条短横线 */}
        <div
          className="absolute h-0.75 w-7 rounded-full"
          style={{
            background: PUPIL,
            left: 11 + yellowFace.x,
            top: 50 + yellowFace.y,
            transition: faceTrans,
          }}
        />
      </div>
    </div>
  );
}

// ── 主弹窗 ──
export function AuthModal({
  initialMode,
  onClose,
  onSuccess,
}: {
  initialMode: Mode;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unregistered, setUnregistered] = useState(false);
  const [pending, setPending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // 密码可见时让角色偷瞄
  const showPeek = showPassword && password.length > 0;

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setUnregistered(false);
    setConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setUnregistered(false);

    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setPending(true);
    try {
      await api.post<{ user: AuthUser }>(`/auth/${mode}`, {
        username: username.trim(),
        password,
      });
      await onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "NO_USER") setUnregistered(true);
        setError(err.message);
      } else {
        setError("网络异常,请稍后重试");
      }
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "login";
  const fieldClass =
    "w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:bg-surface";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="animate-scale-in relative flex max-h-[90vh] w-full max-w-155 flex-col overflow-hidden rounded-2xl shadow-2xl sm:flex-row">
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 sm:text-faint sm:hover:bg-surface-2 sm:hover:text-text"
        >
          <CloseIcon width={16} height={16} />
        </button>

        <div
          className="flex w-full shrink-0 flex-col overflow-hidden rounded-t-2xl sm:w-52 sm:rounded-l-2xl sm:rounded-tr-none"
          style={{
            background: "linear-gradient(#0d3330 0%, #071c1a 100%)",
            transform: "translateZ(0)",
          }}
        >
          <div className="px-5 pt-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-serif text-sm font-semibold text-white/80">
                Cortex
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/35">
              知识越用越多,
              <br />
              助手越问越准。
            </p>
          </div>

          {/* 动画角色:推到底部,站在面板地面上 */}
          <div className="mt-auto w-full">
            <CharactersPanel isTyping={isTyping} showPeek={showPeek} />
          </div>
        </div>

        {/* ── 右侧表单(超高可滚动) ── */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-surface px-6 pb-7 pt-8">
          {/* 标题 */}
          <div className="mb-6">
            <h2 className="font-serif text-lg font-semibold tracking-tight">
              {isLogin ? "欢迎回来" : "创建账号"}
            </h2>
            <p className="mt-1 text-xs text-faint">
              {isLogin
                ? "登录后继续使用 Cortex 知识库"
                : "注册后即可拥有专属知识库,不限次使用"}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">用户名</span>
              <input
                ref={firstFieldRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                autoComplete="username"
                placeholder="输入你的用户名"
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">密码</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="输入密码"
                  className={`${fieldClass} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-text"
                >
                  {showPassword ? (
                    <EyeOffIcon width={16} height={16} />
                  ) : (
                    <EyeIcon width={16} height={16} />
                  )}
                </button>
              </div>
            </label>

            {!isLogin && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">确认密码</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  className={fieldClass}
                />
              </label>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "请稍候…" : isLogin ? "登录" : "注册并登录"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-faint">
            {isLogin ? "还没有账号?" : "已有账号?"}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "register" : "login")}
              className="ml-1 font-medium text-accent hover:underline"
            >
              {isLogin ? "去注册" : "去登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
