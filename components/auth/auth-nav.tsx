"use client";

import { useAuth } from "./auth-context";
import { UserMenu } from "./user-menu";
import { LoginButton } from "./login-button";

/** 首页头部右侧的登录/用户入口。 */
export function AuthNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-9 w-24 rounded-full bg-surface-2/60" />;
  }

  if (!user) {
    return <LoginButton />;
  }

  return <UserMenu direction="down" align="right" />;
}
