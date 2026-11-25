import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { query } from "@/lib/db";
import { withBasePath } from "@/lib/basePath";


// Function to check if user is in admin table
async function getUserAdminData(email: string) {
  try {
    const result = await query(
      "SELECT id, correo, nombre, apellido, rol_id, activo FROM ciepi.usuarios_administradores WHERE correo = $1 AND activo = true",
      [email]
    );

    if (result.rows.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "✅ [Auth] User found in admin table:",
          email,
          "- rol_id:",
          result.rows[0].rol_id
        );
      }
      return result.rows[0];
    }

    if (process.env.NODE_ENV === "development") {
      console.log("❌ [Auth] User NOT found in admin table:", email);
    }
    return null;
  } catch (error) {
    console.error("❌ [Auth] Error checking admin user:", error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      ...AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
        tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
        authorization: {
          params: {
            scope: "openid profile email offline_access",
          },
        },
      }),
      // Override the automatically generated URLs to include /api/auth
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
    } as unknown as NextAuthOptions["providers"][number],
  ],
  session: { strategy: "jwt" },
  // Add debug logging to see what URLs NextAuth is using
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ user }) {
      // Check if user is in admin table BEFORE allowing sign in
      if (user.email) {
        const adminUser = await getUserAdminData(user.email);
        if (!adminUser) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "🚫 [Auth] Sign-in BLOCKED - User not found in usuarios_administradores table:",
              user.email
            );
          }
          // Return false to block the sign-in
          return false;
        }
        if (process.env.NODE_ENV === "development") {
          console.log(
            "✅ [Auth] Sign-in ALLOWED - User found in admin table:",
            user.email
          );
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      if (profile) {
        token.name = profile.name ?? token.name;
        token.email = profile.email ?? token.email;
      }

      // Check if user is in admin table on first login
      if (account && token.email) {
        const adminUser = await getUserAdminData(token.email as string);
        if (adminUser) {
          // User is in the admin table, so isAdmin = true (always)
          token.isAdmin = true;
          token.adminId = adminUser.id;
          token.rolId = adminUser.rol_id; // Store rol_id for role-based permissions
        } else {
          // User is NOT in the admin table, so isAdmin = false
          token.isAdmin = false;
          token.adminId = undefined;
          token.rolId = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user ??= {};
      session.user.name = token.name ?? session.user.name;
      session.user.email = token.email ?? session.user.email;
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;

      // Add admin status to session
      // If user is in usuarios_administradores table, isAdmin = true
      session.user.isAdmin = token.isAdmin ?? false;
      session.user.adminId = token.adminId as number | undefined;
      session.user.rolId = token.rolId as number | undefined;

      return session;
    },
    async redirect({ url, baseUrl }) {
      // After successful login, redirect to admin capacitaciones
      // If the URL is the callback URL or signin URL, redirect to capacitaciones
      if (
        url.startsWith(`${baseUrl}/api/auth/callback/`) ||
        url.startsWith(`${baseUrl}/api/auth/signin/`) ||
        url === baseUrl
      ) {
        const redirectTo = withBasePath("/admin/capacitaciones");
        return redirectTo;
      }

      // Otherwise, use the URL as-is (respects callbackUrl parameter)
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },
  },
  pages: {
    signIn: withBasePath("/admin/login"),
    error: withBasePath("/admin/login"), // Redirect to login on error
  },
};
