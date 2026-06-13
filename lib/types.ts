// Domain model — kept close to what the RAG/Agent backend will return,
// so swapping mock data for real API responses later is a drop-in change.

export type ChatMode = "docs" | "support" | "tools";

/** Which knowledge base a document belongs to. */
export type Collection = "docs" | "support";

export interface ModeConfig {
  id: ChatMode;
  label: string;
  tagline: string;
  /** suggested prompts shown on the empty state */
  suggestions: string[];
}

export type DocStatus = "parsing" | "indexing" | "ready" | "failed";

export interface KnowledgeDoc {
  id: string;
  /** which knowledge base this doc lives in */
  collection: Collection;
  name: string;
  /** bytes */
  size: number;
  pages: number;
  /** number of chunks stored in the vector store */
  chunks: number;
  status: DocStatus;
  /** 0–100, only meaningful while parsing/indexing */
  progress?: number;
  addedAt: number;
}

/** A retrieved chunk used to ground an answer (the "出处"). */
export interface Source {
  docId: string;
  docName: string;
  page: number;
  /** cosine similarity 0–1 */
  score: number;
  snippet: string;
}

export type ToolStatus = "running" | "done" | "error";

/** A single Agent tool invocation, visualized inline. */
export interface ToolCall {
  id: string;
  name: string;
  /** human-readable label, e.g. "查询「2026 最新汇率」" */
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
  /** assistant only */
  sources?: Source[];
  toolCalls?: ToolCall[];
  /** true while the assistant message is still streaming */
  streaming?: boolean;
}
