"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Composer } from "./composer";
import { Message } from "./message";
import { ModeSwitcher } from "./mode-switcher";
import { Logo, SparkleIcon } from "../icons";
import { MODES } from "@/lib/mock-data";
import { useAuth } from "../auth/auth-context";
import type { ChatMessage, ChatMode, Source, ToolCall } from "@/lib/types";

/** 把一条 UIMessage 的文本片段拼成单个字符串用于渲染。 */
function textOf(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** 取出服务端以 `data-sources` 片段流式下发的检索出处。 */
function sourcesOf(m: UIMessage): Source[] | undefined {
  const part = m.parts.find((p) => p.type === "data-sources") as
    | { data?: Source[] }
    | undefined;
  return part?.data;
}

interface ToolPart {
  type: string;
  toolName?: string;
  toolCallId: string;
  state: string;
  input?: { expression?: string; query?: string };
  output?: unknown;
  errorText?: string;
}

const TOOL_META: Record<
  string,
  { icon: ToolCall["icon"]; label: (input: ToolPart["input"]) => string }
> = {
  calculator: {
    icon: "calculator",
    label: (i) => `计算:${i?.expression ?? ""}`,
  },
  web_search: { icon: "globe", label: (i) => `联网搜索:「${i?.query ?? ""}」` },
};

/** 把消息上的 AI SDK 工具片段映射成我们的可视化模型。 */
function toolCallsOf(m: UIMessage): ToolCall[] | undefined {
  const calls: ToolCall[] = [];
  for (const p of m.parts) {
    const isTool = p.type.startsWith("tool-");
    const isDynamic = p.type === "dynamic-tool";
    if (!isTool && !isDynamic) continue;
    const part = p as unknown as ToolPart;
    const name = isDynamic
      ? (part.toolName ?? "tool")
      : part.type.slice("tool-".length);
    const meta = TOOL_META[name];
    const status: ToolCall["status"] =
      part.state === "output-available"
        ? "done"
        : part.state === "output-error"
          ? "error"
          : "running";
    calls.push({
      id: part.toolCallId,
      name,
      label: meta ? meta.label(part.input) : name,
      icon: meta?.icon ?? "search",
      status,
      result:
        part.state === "output-available"
          ? String(part.output ?? "")
          : part.state === "output-error"
            ? part.errorText
            : undefined,
    });
  }
  return calls.length ? calls : undefined;
}

export function ChatView() {
  const [mode, setMode] = useState<ChatMode>("docs");
  const [input, setInput] = useState("");

  const savedMessages = useRef<Partial<Record<ChatMode, UIMessage[]>>>({});

  const { openAuthModal } = useAuth();

  const { messages, sendMessage, setMessages, stop, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // 试用额度用尽时后端回 401,这里拦下并弹出登录/注册框
      fetch: async (input, init) => {
        const res = await fetch(input as RequestInfo, init);
        if (res.status === 401) openAuthModal("register");
        return res;
      },
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  function handleModeChange(next: ChatMode) {
    if (next === mode) return;
    if (busy) void stop();
    savedMessages.current[mode] = messages;
    setMessages(savedMessages.current[next] ?? []);
    setInput("");
    setMode(next);
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text }, { body: { mode } });
  }

  const activeMode = MODES.find((m) => m.id === mode)!;
  const empty = messages.length === 0;

  // 把 AI SDK 消息映射成我们的渲染模型;等待时追加一个 pending 气泡
  const rendered: ChatMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m, i, arr) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: textOf(m),
      sources: m.role === "assistant" ? sourcesOf(m) : undefined,
      toolCalls: m.role === "assistant" ? toolCallsOf(m) : undefined,
      streaming:
        i === arr.length - 1 &&
        m.role === "assistant" &&
        status === "streaming",
    }));
  if (status === "submitted") {
    rendered.push({
      id: "pending",
      role: "assistant",
      content: "",
      streaming: true,
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* top bar: mode switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <ModeSwitcher mode={mode} onChange={handleModeChange} />
        <span className="hidden truncate text-xs text-faint md:block">
          {activeMode.tagline}
        </span>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <EmptyState
            mode={mode}
            onPick={(s) => {
              setInput("");
              void sendMessage({ text: s }, { body: { mode } });
            }}
          />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
            {rendered.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                出错了:
                {error.message ||
                  "请求失败,请检查 DeepSeek API Key 是否已配置。"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={busy}
            placeholder={`向「${activeMode.label}」提问…`}
          />
          <p className="mt-2 text-center text-[11px] text-faint">
            内容由 AI 生成,可能有误,请注意甄别
            <span className="mx-1.5 text-faint/50">·</span>
            <span className="font-mono text-faint/70">by zhixinghy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  mode,
  onPick,
}: {
  mode: ChatMode;
  onPick: (s: string) => void;
}) {
  const config = MODES.find((m) => m.id === mode)!;
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="animate-scale-in flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
        <Logo className="h-9 w-9" />
      </div>
      <h2 className="animate-fade-up mt-5 font-serif text-2xl font-semibold">
        {config.label}
      </h2>
      <p
        className="animate-fade-up mt-2 text-muted"
        style={{ animationDelay: "60ms" }}
      >
        {config.tagline}
      </p>

      <div
        className="animate-fade-up mt-8 grid w-full gap-2.5"
        style={{ animationDelay: "120ms" }}
      >
        {config.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-accent/50 hover:bg-surface-2"
          >
            <SparkleIcon
              width={16}
              height={16}
              className="shrink-0 text-faint transition-colors group-hover:text-accent"
            />
            <span className="text-text/90">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
