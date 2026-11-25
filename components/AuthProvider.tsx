"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { withBasePath } from "@/lib/basePath";

const nextAuthBasePath = withBasePath("/api/auth");

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath={nextAuthBasePath}>{children}</SessionProvider>
  );
}
