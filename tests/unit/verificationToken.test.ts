import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import {
  markTokenAsUsed,
  checkTokenStatus,
  getTokenInfo,
} from "@/lib/verificationToken";

describe("verificationToken hash consistency", () => {
  const rawToken = "a".repeat(64);
  const expectedHash = createHash("sha256").update(rawToken).digest("hex");

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("markTokenAsUsed queries with sha256 hash", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const ok = await markTokenAsUsed(rawToken, "127.0.0.1");
    expect(ok).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE token = $1"),
      [expectedHash, "127.0.0.1"],
    );
  });

  it("checkTokenStatus queries with sha256 hash", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ usado: false, fecha_expiracion: new Date(Date.now() + 60000) }],
    });
    const status = await checkTokenStatus(rawToken);
    expect(status.exists).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE token = $1"),
      [expectedHash],
    );
  });

  it("getTokenInfo queries with sha256 hash", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const info = await getTokenInfo(rawToken);
    expect(info).toEqual({ id: 1 });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE v.token = $1"),
      [expectedHash],
    );
  });
});
