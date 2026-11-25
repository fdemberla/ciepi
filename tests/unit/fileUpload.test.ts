import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises and path to prevent actual disk writes
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

import {
  ArchivoNoValidoError,
  MAX_DOCUMENTO_BYTES,
  MAX_IMAGEN_BYTES,
  firmaCoincide,
  saveFile,
  validarArchivoBasico,
  EXTENSIONES_IMAGEN,
} from "@/lib/fileUpload";

/** Primeros bytes reales de cada tipo (lo que comprueba firmaCoincide). */
const FIRMAS: Record<string, number[]> = {
  jpg: [0xff, 0xd8, 0xff, 0xe0],
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: Array.from("GIF89a", (c) => c.charCodeAt(0)),
  webp: [...Array.from("RIFF", (c) => c.charCodeAt(0)), 0, 0, 0, 0, ...Array.from("WEBP", (c) => c.charCodeAt(0))],
  pdf: Array.from("%PDF-1.7", (c) => c.charCodeAt(0)),
  doc: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  docx: [0x50, 0x4b, 0x03, 0x04],
};

// Helper: archivo con la firma correcta para su extensión (o "data" si no hay firma).
function makeFile(name: string, content?: string | Uint8Array, type = "application/octet-stream"): File {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const body = content ?? (FIRMAS[ext] ? new Uint8Array([...FIRMAS[ext], 1, 2, 3]) : "data");
  return new File([body as BlobPart], name, { type });
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
      await expect(saveFile(file, "banners")).rejects.toThrow(ArchivoNoValidoError);
    });
  }

  it("banners solo acepta imágenes", async () => {
    await expect(saveFile(makeFile("programa.pdf"), "banners")).rejects.toThrow(ArchivoNoValidoError);
  });
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
    { ext: "png", folder: "attachments" as const },
  ];

  for (const { ext, folder } of allowedExtensions) {
    it(`accepts .${ext} files in ${folder}/`, async () => {
      const file = makeFile(`document.${ext}`);
      await expect(saveFile(file, folder)).resolves.toMatch(new RegExp(`^/${folder}/\\d+-document\\.${ext}$`));
    });
  }
});

describe("saveFile — contenido y tipo", () => {
  it("rechaza un archivo cuyo contenido no corresponde a la extensión", async () => {
    const file = makeFile("foto.jpg", "<?php echo 1; ?>");
    await expect(saveFile(file, "banners")).rejects.toThrow(/no corresponde/);
  });

  it("rechaza un MIME que no coincide con la extensión", async () => {
    const file = makeFile("foto.jpg", undefined, "text/html");
    await expect(saveFile(file, "banners")).rejects.toThrow(/no coincide/);
  });

  it("acepta el MIME correcto", async () => {
    const file = makeFile("foto.png", undefined, "image/png");
    await expect(saveFile(file, "banners")).resolves.toMatch(/\.png$/);
  });

  it("firmaCoincide reconoce cada tipo y rechaza contenido ajeno", () => {
    for (const [ext, bytes] of Object.entries(FIRMAS)) {
      expect(firmaCoincide(ext, new Uint8Array(bytes))).toBe(true);
    }
    expect(firmaCoincide("png", new Uint8Array(FIRMAS.jpg))).toBe(false);
    expect(firmaCoincide("pdf", new Uint8Array([]))).toBe(false);
  });
});

describe("límites de tamaño", () => {
  it("imágenes: máximo 10 MB", () => {
    expect(MAX_IMAGEN_BYTES).toBe(10 * 1024 * 1024);
    expect(() =>
      validarArchivoBasico({ name: "a.png", size: MAX_IMAGEN_BYTES, type: "image/png" }, EXTENSIONES_IMAGEN),
    ).not.toThrow();
    expect(() =>
      validarArchivoBasico({ name: "a.png", size: MAX_IMAGEN_BYTES + 1, type: "image/png" }, EXTENSIONES_IMAGEN),
    ).toThrow(/10 MB/);
  });

  it("documentos: máximo 20 MB", () => {
    expect(MAX_DOCUMENTO_BYTES).toBe(20 * 1024 * 1024);
    expect(() =>
      validarArchivoBasico({ name: "a.pdf", size: MAX_DOCUMENTO_BYTES, type: "application/pdf" }, ["pdf"]),
    ).not.toThrow();
    expect(() =>
      validarArchivoBasico({ name: "a.pdf", size: MAX_DOCUMENTO_BYTES + 1, type: "application/pdf" }, ["pdf"]),
    ).toThrow(/20 MB/);
  });

  it("saveFile rechaza un banner de más de 10 MB sin leerlo entero", async () => {
    const grande = new File([new Uint8Array(MAX_IMAGEN_BYTES + 1)], "banner.jpg", { type: "image/jpeg" });
    await expect(saveFile(grande, "banners")).rejects.toThrow(/demasiado grande/);
  });
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
