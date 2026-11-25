import { describe, it, expect, afterEach, vi } from "vitest";
import {
  isValidEmail,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  maskEmail,
  sanitizeNewsletterHtml,
  slateNodesToHtml,
} from "@/lib/newsletter";

describe("newsletter helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates email addresses properly", () => {
    expect(isValidEmail("usuario@inadeh.edu.pa")).toBe(true);
    expect(isValidEmail("  TEST@example.com ")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("creates and verifies HMAC unsubscribe tokens", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-123");
    const token = createUnsubscribeToken(42, "Persona@Inadeh.edu.pa");
    const verified = verifyUnsubscribeToken(token);
    expect(verified).toEqual({ id: 42, email: "persona@inadeh.edu.pa" });

    // Tampered token must fail
    expect(verifyUnsubscribeToken(`${token}x`)).toBeNull();
    expect(verifyUnsubscribeToken("malformed")).toBeNull();
  });

  it("masks email addresses for display", () => {
    expect(maskEmail("fernando@inadeh.edu.pa")).toBe("fe***@inadeh.edu.pa");
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });

  it("sanitizes dangerous HTML tags and attributes", () => {
    const dirty =
      '<p onclick="alert(1)">Hola</p><script>evil()</script><a href="javascript:void(0)">link</a>';
    const clean = sanitizeNewsletterHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<p>Hola</p>");
  });

  it("serializes Slate nodes to safe HTML", () => {
    const nodes = [
      { type: "heading-one", children: [{ text: "Novedades" }] },
      { type: "paragraph", children: [{ text: "Hola ", bold: true }, { text: "<script>" }] },
    ];
    const html = slateNodesToHtml(nodes);
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>Hola </strong>");
    expect(html).toContain("&lt;script&gt;");
  });
});
