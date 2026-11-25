import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Role } from "@/lib/permissions";

const mockQuery = vi.fn();
const txQuery = vi.fn();
const mockSession = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (q: typeof txQuery) => unknown) => fn(txQuery),
}));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: () => mockSession() }));

import { GET, PUT } from "@/app/api/admin/inscripciones/[id]/route";

function put(body: unknown, id = "10") {
  const req = new NextRequest(`http://localhost/api/admin/inscripciones/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return PUT(req, { params: Promise.resolve({ id }) });
}

function sesion(rolId: number, adminId = 5) {
  mockSession.mockResolvedValue({ user: { isAdmin: true, adminId, rolId, email: "admin@example.com" } });
  // requireArea lee el rol de la BD (usuario activo).
  mockQuery.mockImplementation(async (sql: string) =>
    /FROM ciepi\.usuarios_administradores/.test(sql) ? { rows: [{ rol_id: rolId }] } : { rows: [] }
  );
}

describe("PUT /api/admin/inscripciones/[id]", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    txQuery.mockReset();
    mockSession.mockReset();
  });

  it("403 si el rol en la BD ya no permite gestionar aunque el JWT diga CIEPI", async () => {
    sesion(Role.CIEPI);
    mockQuery.mockResolvedValue({ rows: [{ rol_id: Role.RELACIONES_PUBLICAS }] });
    const res = await put({ estado_inscripcion: 3, estado_actual: 1 });
    expect(res.status).toBe(403);
    expect(txQuery).not.toHaveBeenCalled();
  });

  it("401 sin sesión de administrador", async () => {
    mockSession.mockResolvedValue(null);
    const res = await put({ estado_inscripcion: 3, estado_actual: 1 });
    expect(res.status).toBe(401);
  });

  it("403 para Relaciones Públicas (solo lectura) sin tocar la BD", async () => {
    sesion(Role.RELACIONES_PUBLICAS);
    const res = await put({ estado_inscripcion: 3, estado_actual: 1 });
    expect(res.status).toBe(403);
    expect(txQuery).not.toHaveBeenCalled();
    // Solo la lectura del rol en la BD; nada más.
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("400 si falta estado_actual", async () => {
    sesion(Role.CIEPI);
    const res = await put({ estado_inscripcion: 3 });
    expect(res.status).toBe(400);
    expect(txQuery).not.toHaveBeenCalled();
  });

  it("400 al rechazar sin motivo", async () => {
    sesion(Role.CIEPI);
    const res = await put({ estado_inscripcion: 2, estado_actual: 1 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/motivo/i);
  });

  it("403 si CIEPI intenta un override", async () => {
    sesion(Role.CIEPI);
    const res = await put({ estado_inscripcion: 6, estado_actual: 2, motivo: "x" });
    expect(res.status).toBe(403);
    expect(txQuery).not.toHaveBeenCalled();
  });

  it("400 para una transición fuera del mapa", async () => {
    sesion(Role.ADMIN);
    const res = await put({ estado_inscripcion: 5, estado_actual: 1 });
    expect(res.status).toBe(400);
  });

  it("matricula con UPDATE condicionado, historial y devuelve las nuevas transiciones", async () => {
    sesion(Role.CIEPI, 5);
    txQuery
      .mockResolvedValueOnce({ rows: [{ id: 10, estado_inscripcion: 3 }] }) // UPDATE condicionado
      .mockResolvedValueOnce({ rows: [] }) // INSERT historial
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            estado_inscripcion: 3,
            fecha_ultima_actualizacion: "2026-11-25T10:00:00",
            estado_nombre: "Matriculado",
            estado_descripcion: "desc",
          },
        ],
      });

    const res = await put({ estado_inscripcion: 3, estado_actual: 1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.estado).toEqual({ id: 3, nombre: "Matriculado", descripcion: "desc" });
    expect(json.data.transiciones.map((t: { a: number }) => t.a).sort()).toEqual([4, 5]);

    const [sqlUpdate, paramsUpdate] = txQuery.mock.calls[0];
    expect(sqlUpdate).toMatch(/WHERE id = \$2 AND estado_inscripcion = \$3/);
    expect(paramsUpdate).toEqual([3, 10, 1]);

    const [sqlHist, paramsHist] = txQuery.mock.calls[1];
    expect(sqlHist).toMatch(/INSERT INTO ciepi\.estado_historial/);
    expect(paramsHist.slice(0, 7)).toEqual(["inscripcion", "10", "1", "3", "matricular", "admin", 5]);
  });

  it("guarda el motivo y marca el override de administrador", async () => {
    sesion(Role.SUPER_ADMIN, 9);
    txQuery
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 10, estado_nombre: "Matriculado", estado_descripcion: "" }] });

    const res = await put({ estado_inscripcion: 3, estado_actual: 4, motivo: "  Se reincorpora  " });
    expect(res.status).toBe(200);
    const paramsHist = txQuery.mock.calls[1][1];
    expect(paramsHist[4]).toBe("reincorporar");
    expect(paramsHist[8]).toBe("Se reincorpora");
    expect(paramsHist[9]).toBe(true);
  });

  it("409 si el estado cambió entretanto (carrera)", async () => {
    sesion(Role.ADMIN);
    txQuery
      .mockResolvedValueOnce({ rows: [] }) // UPDATE no afecta filas
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // la inscripción existe

    const res = await put({ estado_inscripcion: 2, estado_actual: 1, motivo: "duplicada" });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("CONFLICTO_ESTADO");
    expect(json.error).toMatch(/cambió/);
    // No se escribe historial.
    expect(txQuery).toHaveBeenCalledTimes(2);
  });

  it("404 si la inscripción no existe", async () => {
    sesion(Role.ADMIN);
    txQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const res = await put({ estado_inscripcion: 3, estado_actual: 1 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/inscripciones/[id]", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSession.mockReset();
  });

  it("Relaciones Públicas ve el historial pero sin transiciones", async () => {
    sesion(Role.RELACIONES_PUBLICAS);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM ciepi.inscripciones i")) {
        return {
          rows: [{ id: 10, estado_inscripcion: 3, estado_nombre: "Matriculado", estado_descripcion: "" }],
        };
      }
      if (sql.includes("estado_historial")) {
        return { rows: [{ id: 1, estado_de: "1", estado_a: "3", accion: "matricular", motivo: null }] };
      }
      return {
        rows: [
          { id: 1, nombre: "Nueva inscripción" },
          { id: 3, nombre: "Matriculado" },
        ],
      };
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/inscripciones/10"), {
      params: Promise.resolve({ id: "10" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.puede_gestionar).toBe(false);
    expect(json.data.transiciones).toEqual([]);
    expect(json.data.historial[0]).toMatchObject({
      estado_de_nombre: "Nueva inscripción",
      estado_a_nombre: "Matriculado",
    });
  });
});
