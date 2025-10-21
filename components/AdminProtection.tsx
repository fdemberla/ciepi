"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AdminProtectionProps {
  children: React.ReactNode;
}

export default function AdminProtection({ children }: AdminProtectionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/admin/login");
      return;
    }

    if (session?.user && !(session.user as { isAdmin?: boolean }).isAdmin) {
      router.push("/admin/unauthorized");
      return;
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (
    status === "unauthenticated" ||
    !session?.user ||
    !(session.user as { isAdmin?: boolean }).isAdmin
  ) {
    return null;
  }

  return <>{children}</>;
}
