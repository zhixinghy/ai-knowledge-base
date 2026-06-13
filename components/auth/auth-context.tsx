"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthModal } from "./auth-modal";

export interface AuthUser {
  userId: string;
  username: string;
  role: "user" | "admin";
}

type ModalMode = "login" | "register";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  openAuthModal: (mode?: ModalMode) => void;
  closeAuthModal: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user ?? null);
    } catch {
      // 忽略 —— 保留现有登录态
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openAuthModal = useCallback((mode: ModalMode = "login") => {
    setModal(mode);
  }, []);
  const closeAuthModal = useCallback(() => setModal(null), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // 登录/退出后文档可见性变化,由 DocumentsProvider 监听 user 变化自行重新拉取。
  const onSuccess = useCallback(async () => {
    setModal(null);
    await refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, openAuthModal, closeAuthModal, logout }}
    >
      {children}
      {modal && (
        <AuthModal
          initialMode={modal}
          onClose={closeAuthModal}
          onSuccess={onSuccess}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
