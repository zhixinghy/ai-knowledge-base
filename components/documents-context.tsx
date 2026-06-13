"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAuth } from "./auth/auth-context";
import type { KnowledgeDoc } from "@/lib/types";

interface DocumentsContextValue {
  docs: KnowledgeDoc[];
  loading: boolean;
  setDocs: Dispatch<SetStateAction<KnowledgeDoc[]>>;
  refresh: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

/**
 * 知识库文档列表的唯一数据源,由侧边栏和知识库页面共享,这样任何改动
 *(上传 / 删除)都会立刻在各处生效。挂在 workspace 外壳上,因此跨页面导航时不丢失。
 */
export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  // 登录态变化(登录/退出)会改变可见文档,据此重新拉取
  useEffect(() => {
    void refresh();
  }, [refresh, user?.userId]);

  return (
    <DocumentsContext.Provider value={{ docs, loading, setDocs, refresh }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) {
    throw new Error("useDocuments 必须在 DocumentsProvider 内使用");
  }
  return ctx;
}
