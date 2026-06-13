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
import type { KnowledgeDoc } from "@/lib/types";

interface DocumentsContextValue {
  docs: KnowledgeDoc[];
  loading: boolean;
  setDocs: Dispatch<SetStateAction<KnowledgeDoc[]>>;
  refresh: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

/**
 * Single source of truth for the knowledge-base document list, shared by the
 * sidebar and the knowledge page so any change (upload / delete) shows up
 * everywhere instantly. Lives in the workspace shell so it survives navigation.
 */
export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch {
      // ignore — keep whatever we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
