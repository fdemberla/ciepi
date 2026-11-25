import { withBasePath } from "@/lib/basePath";

/**
 * Utilidades para la Integración con el Hub Centralizado de Validación Biométrica
 * INADEH / Tribunal Electoral de Panamá (OAuth 2.0 + PKCE - RFC 7636)
 */

export interface BiometriaResult {
  valido: boolean;
  estado:
    | "APROBADO"
    | "APROBADO_CON_OTP"
    | "RECHAZADO"
    | "REVISION_MANUAL_SOLICITADA"
    | string;
  cedula: string;
  id_auditoria: string;
  score_similitud?: number;
  liveness_score?: number;
  access_token?: string;
  metodo_autenticacion?: string;
  timestamp?: string;
}

export const BIOMETRIA_STORAGE_KEYS = {
  VERIFIER: "ciepi_pkce_verifier",
  STATE: "ciepi_oauth_state",
  CAPACITACION_ID: "ciepi_bio_capacitacion_id",
  CEDULA: "ciepi_bio_cedula",
  RETURN_URL: "ciepi_bio_return_url",
  RESULT: "ciepi_biometria_result",
} as const;

/**
 * Codifica un buffer binario en formato Base64URL sin padding (RFC 7636).
 */
export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Genera el code_verifier criptográficamente seguro y su code_challenge (S256).
 */
export async function generatePKCE(): Promise<{
  code_verifier: string;
  code_challenge: string;
  state: string;
}> {
  if (typeof window === "undefined" || !window.crypto) {
    throw new Error("PKCE sólo puede generarse en el entorno del navegador");
  }

  // 1. code_verifier: 32 bytes aleatorios (aprox 43 caracteres Base64URL)
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  const code_verifier = base64UrlEncode(randomBytes);

  // 2. code_challenge = Base64URL(SHA-256(code_verifier))
  const encoder = new TextEncoder();
  const data = encoder.encode(code_verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const code_challenge = base64UrlEncode(digest);

  // 3. state único para protección CSRF
  const stateBytes = new Uint8Array(16);
  window.crypto.getRandomValues(stateBytes);
  const state = "ciepi_" + base64UrlEncode(stateBytes);

  return { code_verifier, code_challenge, state };
}

/**
 * Obtiene la URL configurada del Hub Biométrico
 */
export function getBiometriaHubUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BIOMETRIA_HUB_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
}

/**
 * Obtiene el client_id configurado para CIEPI
 */
export function isBiometriaEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BIOMETRIA_ENABLED === "true";
}

export function getBiometriaClientId(): string {
  return process.env.NEXT_PUBLIC_BIOMETRIA_CLIENT_ID || "ciepi";
}

/**
 * Obtiene la URL de redirección (callback) configurada para CIEPI
 */
export function getBiometriaRedirectUri(): string {
  if (process.env.NEXT_PUBLIC_BIOMETRIA_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_BIOMETRIA_REDIRECT_URI;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${withBasePath("/biometria/callback/")}`;
  }
  return `http://localhost:3000${withBasePath("/biometria/callback/")}`;
}

/**
 * Inicia el flujo de autenticación biométrica redirigiendo al Hub
 */
export async function iniciarValidacionBiometrica(options: {
  capacitacionId: string;
  cedula?: string;
  returnUrl?: string;
}): Promise<void> {
  const { capacitacionId, cedula, returnUrl } = options;

  const { code_verifier, code_challenge, state } = await generatePKCE();

  // Guardar en sessionStorage para validación en el callback
  sessionStorage.setItem(BIOMETRIA_STORAGE_KEYS.VERIFIER, code_verifier);
  sessionStorage.setItem(BIOMETRIA_STORAGE_KEYS.STATE, state);
  sessionStorage.setItem(
    BIOMETRIA_STORAGE_KEYS.CAPACITACION_ID,
    capacitacionId
  );
  if (returnUrl) {
    sessionStorage.setItem(BIOMETRIA_STORAGE_KEYS.RETURN_URL, returnUrl);
  }

  const hubUrl = getBiometriaHubUrl();
  const clientId = getBiometriaClientId();
  const redirectUri = getBiometriaRedirectUri();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: code_challenge,
    code_challenge_method: "S256",
    state: state,
  });

  if (cedula && cedula.trim()) {
    sessionStorage.setItem(BIOMETRIA_STORAGE_KEYS.CEDULA, cedula.trim());
    params.set("cedula", cedula.trim());
  }

  const authUrl = `${hubUrl}/oauth/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

/**
 * Obtiene el resultado de validación biométrica almacenado en sessionStorage
 */
export function getStoredBiometriaResult(): BiometriaResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BIOMETRIA_STORAGE_KEYS.RESULT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BiometriaResult;
  } catch {
    return null;
  }
}

/**
 * Guarda el resultado biométrico en sessionStorage
 */
export function saveBiometriaResult(result: BiometriaResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    BIOMETRIA_STORAGE_KEYS.RESULT,
    JSON.stringify(result)
  );
}

/**
 * Limpia el resultado biométrico de sessionStorage
 */
export function clearBiometriaResult(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.RESULT);
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.VERIFIER);
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.STATE);
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.CAPACITACION_ID);
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.CEDULA);
  sessionStorage.removeItem(BIOMETRIA_STORAGE_KEYS.RETURN_URL);
}
