import { withAuth } from "next-auth/middleware";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}` : "";

const withBasePath = (pathname: string) => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${basePath}${normalizedPath}`;
};

const loginPath = withBasePath("/admin/login");
const loginPathWithSlash = loginPath.endsWith("/")
  ? loginPath
  : `${loginPath}/`;

export default withAuth(function middleware() {}, {
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;

      // Allow access to login page
      if (pathname === loginPath || pathname === loginPathWithSlash) {
        return true;
      }

      // For admin routes, require token AND admin status
      // isAdmin = true only if user is in usuarios_administradores table
      if (
        pathname.startsWith(withBasePath("/admin")) ||
        pathname.startsWith(withBasePath("/api/admin"))
      ) {
        const isAuthorized = !!token && token.isAdmin === true;

        if (!isAuthorized) {
          console.log(
            "❌ [Middleware] Access denied - user is not in usuarios_administradores table"
          );
        } else {
          console.log(
            "✅ [Middleware] Access granted - user is admin (rol_id:",
            token.rolId ?? "N/A",
            ")"
          );
        }

        return isAuthorized;
      }

      // For other routes, just require token
      return !!token;
    },
  },
  pages: {
    signIn: "/ciepi/admin/login",
  },
});

// Next.js requires matcher to be statically analyzable at compile time
// We hardcode the basePath here to match next.config.ts
export const config = {
  matcher: ["/ciepi/admin/:path*", "/ciepi/api/admin/:path*"],
};
