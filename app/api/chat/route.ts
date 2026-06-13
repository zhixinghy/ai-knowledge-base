import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { embedQuery } from "@/lib/embedding";
import { search } from "@/lib/vectorstore";
import { agentTools } from "@/lib/tools";
import type { ChatMode, Source } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  docs: "你是 Cortex 的文档助手,用简洁、准确的中文回答用户的问题。回答有条理,必要时分点。不要编造不确定的信息。",
  support:
    "你是 Cortex 的在线客服,语气友好、专业、耐心。用简洁的中文解答用户疑问,主动给出可执行的下一步建议。",
  tools:
    "你是 Cortex 的智能助手,可以调用工具来完成任务:涉及算术计算时用 calculator,涉及实时/最新信息(汇率、新闻、近期数据)时用 web_search。需要时先调用工具,再综合工具结果用简洁的中文给出最终答案;不要编造工具能查到的数据。",
};

// modes that should ground answers in the knowledge base (RAG)
const RAG_MODES: ReadonlySet<ChatMode> = new Set(["docs", "support"]);

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim();
    }
  }
  return "";
}

function buildContext(sources: Source[]): string {
  const blocks = sources
    .map(
      (s, i) =>
        `[资料${i + 1}]《${s.docName}》第 ${s.page} 页:\n${s.snippet}`,
    )
    .join("\n\n");
  return (
    "\n\n下面是从知识库检索到的相关资料。请优先依据这些资料回答,保持简洁;" +
    "若资料不足以回答,请如实说明,不要编造。\n\n" +
    blocks
  );
}

export async function POST(req: Request) {
  const { messages, mode = "docs" } = (await req.json()) as {
    messages: UIMessage[];
    mode?: ChatMode;
  };

  let system = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.docs;
  let sources: Source[] = [];

  // --- read path: retrieve relevant chunks ---
  if (RAG_MODES.has(mode)) {
    const query = lastUserText(messages);
    if (query) {
      try {
        const vector = await embedQuery(query);
        // docs mode → user's library; support mode → support library
        const collection = mode === "support" ? "support" : "docs";
        sources = await search(vector, 5, collection);
      } catch (err) {
        console.error("[/api/chat] retrieval failed", err);
      }
      if (sources.length > 0) {
        system += buildContext(sources);
      } else {
        system +=
          "\n\n(知识库中暂无与该问题相关的内容。请如实告知用户知识库未覆盖,可基于常识简要回答。)";
      }
    }
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // send citations first so the UI can attach them to this message
      if (sources.length > 0) {
        writer.write({ type: "data-sources", id: "sources", data: sources });
      }
      const useTools = mode === "tools";
      const result = streamText({
        model: deepseek("deepseek-chat"),
        system,
        messages: await convertToModelMessages(messages),
        ...(useTools
          ? { tools: agentTools, stopWhen: stepCountIs(5) }
          : {}),
      });
      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      console.error("[/api/chat]", error);
      return error instanceof Error ? error.message : "生成失败,请稍后重试";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
