import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

// This route handles Azure AD callbacks that come to the wrong path
// Azure is sending callbacks to /ciepi/callback/azure-ad
// but NextAuth expects /ciepi/api/auth/callback/azure-ad
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get all query parameters
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const session_state = searchParams.get("session_state");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  console.log("🔄 [Callback Redirect] Received callback at wrong path");
  console.log("  - Original path:", request.nextUrl.pathname);
  console.log("  - Code present:", !!code);
  console.log("  - State present:", !!state);
  console.log("  - Error:", error);

  // Build the correct callback URL
  const correctPath = "/ciepi/api/auth/callback/azure-ad";
  const params = new URLSearchParams();

  if (code) params.set("code", code);
  if (state) params.set("state", state);
  if (session_state) params.set("session_state", session_state);
  if (error) params.set("error", error);
  if (error_description) params.set("error_description", error_description);

  const redirectUrl = `${correctPath}?${params.toString()}`;

  console.log("  - Redirecting to:", redirectUrl);

  redirect(redirectUrl);
}
