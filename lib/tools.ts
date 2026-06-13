import { tool } from "ai";
import { z } from "zod";
import { isDev } from "./utils";

/** Evaluate a basic arithmetic expression safely (digits/operators only). */
function safeEval(expr: string): number {
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) {
    throw new Error("表达式包含非法字符,只支持数字与 + - * / ( ) %");
  }
  // charset is restricted to math symbols above, so this cannot run code
  const value = Function(`"use strict"; return (${expr});`)() as unknown;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("计算结果无效");
  }
  return value;
}

const calculator = tool({
  description:
    "计算一个数学表达式。当用户的问题涉及算术(加减乘除、百分比、括号)时使用。",
  inputSchema: z.object({
    expression: z
      .string()
      .describe("要计算的算术表达式,例如 1280 * 7.2 或 (99+1)/4"),
  }),
  execute: async ({ expression }) => {
    const result = safeEval(expression);
    return `${expression} = ${result}`;
  },
});

const webSearch = tool({
  description:
    "联网搜索实时信息。当问题涉及最新动态、当前数据(如汇率、新闻、近期事件)等知识库和模型自身无法提供的内容时使用。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      // don't leak internal config (env var name) to the model/user in prod
      const reason = isDev
        ? "(联网搜索未配置:缺少 TAVILY_API_KEY)"
        : "(联网搜索暂不可用)";
      return `${reason}。请基于已有知识回答,并向用户说明当前无法获取实时信息。`;
    }
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 5,
          search_depth: "basic",
          include_answer: true,
        }),
      });
      if (!res.ok) throw new Error(`搜索服务返回 ${res.status}`);
      const data = (await res.json()) as {
        answer?: string;
        results?: Array<{ title: string; url: string; content: string }>;
      };
      const lines: string[] = [];
      if (data.answer) lines.push(`摘要:${data.answer}`);
      (data.results ?? []).slice(0, 5).forEach((r, i) => {
        lines.push(`[${i + 1}] ${r.title}\n${r.content}\n来源:${r.url}`);
      });
      return lines.join("\n\n") || "未找到相关结果。";
    } catch (err) {
      return `搜索失败:${err instanceof Error ? err.message : "未知错误"}`;
    }
  },
});

/** Tools available to the "工具增强" (tools) chat mode. */
export const agentTools = {
  calculator,
  web_search: webSearch,
};
