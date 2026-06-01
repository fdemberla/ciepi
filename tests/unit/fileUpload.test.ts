import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises and path to prevent actual disk writes
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { saveFile } from "@/lib/fileUpload";

// Helper: create a minimal File-like object accepted by saveFile
function makeFile(name: string, content = "data", type = "application/octet-stream"): File {
  return new File([content], name, { type });
}

// ─── Extension Allowlist ──────────────────────────────────────────────────────

describe("saveFile — blocked extensions (allowlist enforcement)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const blockedExtensions = [
    "php",
    "phtml",
    "php5",
    "exe",
    "sh",
    "bat",
    "js",
    "ts",
    "py",
    "rb",
    "asp",
    "aspx",
    "cgi",
    "pl",
    "htaccess",
    "svg", // can contain XSS payloads
  ];

  for (const ext of blockedExtensions) {
    it(`rejects .${ext} files`, async () => {
      const file = makeFile(`malicious.${ext}`);
      await expect(saveFile(file, "banners")).rejects.toThrow();
    });
  }
});

describe("saveFile — allowed extensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const allowedExtensions = [
    { ext: "jpg", folder: "banners" as const },
    { ext: "jpeg", folder: "banners" as const },
    { ext: "png", folder: "banners" as const },
    { ext: "gif", folder: "banners" as const },
    { ext: "webp", folder: "banners" as const },
    { ext: "pdf", folder: "attachments" as const },
    { ext: "doc", folder: "attachments" as const },
    { ext: "docx", folder: "attachments" as const },
  ];

  for (const { ext, folder } of allowedExtensions) {
    it(`accepts .${ext} files in ${folder}/`, async () => {
      const file = makeFile(`document.${ext}`);
      await expect(saveFile(file, folder)).resolves.not.toThrow();
    });
  }
});

describe("saveFile — filename sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a path string for valid files", async () => {
    const file = makeFile("my photo.jpg");
    const result = await saveFile(file, "banners");
    expect(typeof result).toBe("string");
    expect(result).toMatch(/\.jpg$/);
  });

  it("returned path contains no directory traversal characters", async () => {
    const file = makeFile("../../../etc/passwd.jpg");
    const result = await saveFile(file, "banners");
    // The path should not allow traversal — the returned relative URL
    // should only contain safe characters
    expect(result).not.toContain("..");
  });

  it("returned path does not contain raw spaces", async () => {
    const file = makeFile("my evil file.jpg");
    const result = await saveFile(file, "banners");
    expect(result).not.toContain(" ");
  });
});
