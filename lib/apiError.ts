/**
 * Returns a safe error detail string.
 * In production, never expose raw error messages to clients (schema/stack leak risk).
 */
export function safeErrorDetail(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : "Unknown error";
  }
  return undefined;
}
