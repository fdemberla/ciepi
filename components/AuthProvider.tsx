"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

// When using Next.js basePath config, we need to tell SessionProvider
// where to find the auth API routes
// With basePath="/ciepi" in next.config.ts, the auth routes are at:
// /ciepi/api/auth/*
const nextAuthBasePath = "/ciepi/api/auth";

console.log("🔍 [AuthProvider] SessionProvider basePath:", nextAuthBasePath);
console.log(
  "🔍 [AuthProvider] This means auth callbacks will be at:",
  `${nextAuthBasePath}/callback/azure-ad`
);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath={nextAuthBasePath}>{children}</SessionProvider>
  );
}
