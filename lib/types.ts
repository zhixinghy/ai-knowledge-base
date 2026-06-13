// 领域模型 —— 尽量贴近 RAG/Agent 后端将来返回的结构,
// 这样以后把 mock 数据换成真实 API 响应时可以无缝替换。

export type ChatMode = "docs" | "support" | "tools";

/** 文档所属的知识库。 */
export type Collection = "docs" | "support";

export interface ModeConfig {
  id: ChatMode;
  label: string;
  tagline: string;
  /** 空状态时展示的建议提问 */
  suggestions: string[];
}

export type DocStatus = "parsing" | "indexing" | "ready" | "failed";

export interface KnowledgeDoc {
  id: string;
  /** 该文档所在的知识库 */
  collection: Collection;
  name: string;
  /** 字节数 */
  size: number;
  pages: number;
  /** 存入向量库的分块数量 */
  chunks: number;
  status: DocStatus;
  /** 0–100,仅在解析/索引过程中有意义 */
  progress?: number;
  addedAt: number;
}

/** 用于支撑答案的检索分块(即「出处」)。 */
export interface Source {
  docId: string;
  docName: string;
  page: number;
  /** 余弦相似度 0–1 */
  score: number;
  snippet: string;
}

export type ToolStatus = "running" | "done" | "error";

/** 单次 Agent 工具调用,内联可视化展示。 */
export interface ToolCall {
  id: string;
  name: string;
  /** 人类可读的标签,如「查询『2026 最新汇率』」 */
  label: string;
  icon: "search" | "calculator" | "database" | "globe";
  status: ToolStatus;
  result?: string;
}

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** 仅 assistant 消息有 */
  sources?: Source[];
  toolCalls?: ToolCall[];
  /** assistant 消息仍在流式输出时为 true */
  streaming?: boolean;
}
