import { Pool, QueryResult } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl:
    process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err: Error) => {
  console.error("PostgreSQL pool error:", err);
});

export async function query(
  text: string,
  params?: unknown[]
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Ejecuta varias consultas en una transacción: si `fn` lanza un error se hace
 * ROLLBACK de todo. Usar para operaciones que deben guardarse completas o no
 * guardarse (p. ej. reemplazar el horario de un mentor).
 */
export async function withTransaction<T>(
  fn: (q: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn((text, params) => client.query(text, params));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
