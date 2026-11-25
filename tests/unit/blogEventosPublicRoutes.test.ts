import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Role } from "@/lib/permissions";

const mockQuery = vi.fn();
const mockSession = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: () => mockSession() }));

import { GET as getBlogs } from "@/app/api/blog/route";
import { GET as getEventos } from "@/app/api/eventos/route";
import { POST as crearEvento } from "@/app/api/admin/eventos/route";
import { PUT as editarEvento, DELETE as borrarEvento } from "@/app/api/admin/eventos/[id]/route";

const req = (url: string) => new NextRequest(`http://localhost${url}`);

beforeEach(() => {
  mockQuery.mockReset();
  mockSession.mockReset();
});

describe("GET /api/blog", () => {
  beforeEach(() => {
    mockQuery.mockImplementation((sql: string) =>
      sql.includes("COUNT(*)")
        ? Promise.resolve({ rows: [{ total: "3" }] })
        : Promise.resolve({ rows: [] })
    );
  });

  it("busca en palabras_clave JSONB con jsonb_array_elements_text (no unnest)", async () => {
    const res = await getBlogs(req("/api/blog?search=innovación"));
    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls.find(([s]) => !s.includes("COUNT(*)"))!;
    expect(sql).toContain("jsonb_array_elements_text");
    expect(sql).not.toContain("unnest");
    expect(params[0]).toBe("%innovación%");
  });

  it("escapa los comodines de LIKE en la búsqueda", async () => {
    await getBlogs(req("/api/blog?search=" + encodeURIComponent("100%_a\\b")));
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe("%100\\%\\_a\\\\b%");
  });

  it("acota page y limit (NaN, negativos y enormes)", async () => {
    let res = await getBlogs(req("/api/blog?page=abc&limit=abc"));
    let body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pagination).toMatchObject({ page: 1, limit: 12 });

    res = await getBlogs(req("/api/blog?page=-5&limit=1000000"));
    body = await res.json();
    expect(body.pagination).toMatchObject({ page: 1, limit: 50 });
    const [, params] = mockQuery.mock.calls.findLast(([s]) => !s.includes("COUNT(*)"))!;
    expect(params.slice(-2)).toEqual([50, 0]);
  });

  it("no expone el mensaje interno del error", async () => {
    mockQuery.mockRejectedValue(new Error('relation "ciepi.blogs" does not exist'));
    const res = await getBlogs(req("/api/blog"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("relation");
  });
});

describe("GET /api/eventos", () => {
  it("filtra por estado en SQL (antes del LIMIT) y devuelve estado calculado y conteos", async () => {
    mockQuery.mockImplementation((sql: string) =>
      sql.includes("GROUP BY")
        ? Promise.resolve({
            rows: [
              { estado: "proximo", total: 2 },
              { estado: "finalizado", total: 5 },
            ],
          })
        : Promise.resolve({
            rows: [{ id: 1, nombre: "X", fecha_inicio: "2999-01-01T14:00:00Z", fecha_fin: null }],
          })
    );
    const res = await getEventos(req("/api/eventos?estado=futuro&limit=abc&offset=-3"));
    const body = await res.json();
    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls.find(([s]) => !s.includes("GROUP BY"))!;
    expect(sql).toMatch(/WHERE[\s\S]*= \$1[\s\S]*LIMIT \$2 OFFSET \$3/);
    expect(params).toEqual(["proximo", 100, 0]);
    expect(body.data[0].estado).toBe("proximo");
    expect(body.conteos).toEqual({ todos: 7, proximo: 2, en_curso: 0, finalizado: 5 });
    expect(body.total).toBe(2);
  });

  it("400 con un estado desconocido", async () => {
    const res = await getEventos(req("/api/eventos?estado=borrador"));
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

function formEvento(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

function sesion(rolId: number) {
  mockSession.mockResolvedValue({ user: { isAdmin: true, adminId: 5, rolId } });
  // requireArea lee el rol desde la BD
  mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ rol_id: rolId }] }));
}

describe("admin /api/admin/eventos", () => {
  it("POST 401 sin sesión", async () => {
    mockSession.mockResolvedValue(null);
    const res = await crearEvento(
      new NextRequest("http://localhost/api/admin/eventos", {
        method: "POST",
        body: formEvento({ nombre: "X", fecha_inicio: "2026-12-10T09:00" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST 403 si el administrador ya no está activo en la BD", async () => {
    mockSession.mockResolvedValue({ user: { isAdmin: true, adminId: 5, rolId: Role.ADMIN } });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await crearEvento(
      new NextRequest("http://localhost/api/admin/eventos", {
        method: "POST",
        body: formEvento({ nombre: "X", fecha_inicio: "2026-12-10T09:00" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("POST 400 si fecha_fin es anterior a fecha_inicio", async () => {
    sesion(Role.ADMIN);
    const res = await crearEvento(
      new NextRequest("http://localhost/api/admin/eventos", {
        method: "POST",
        body: formEvento({
          nombre: "X",
          fecha_inicio: "2026-12-12T09:00",
          fecha_fin: "2026-12-10T08:00",
        }),
      })
    );
    expect(res.status).toBe(400);
    // Solo la consulta del rol: no se insertó nada
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("POST guarda las fechas en UTC interpretándolas como hora de Panamá", async () => {
    sesion(Role.ADMIN);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7 }] });
    const res = await crearEvento(
      new NextRequest("http://localhost/api/admin/eventos", {
        method: "POST",
        body: formEvento({
          nombre: "X",
          fecha_inicio: "2026-12-10T09:00",
          fecha_fin: "2026-12-10T17:00",
        }),
      })
    );
    expect(res.status).toBe(201);
    const [, values] = mockQuery.mock.calls[1];
    expect(values[2]).toBe("2026-12-10T14:00:00.000Z");
    expect(values[3]).toBe("2026-12-10T22:00:00.000Z");
  });

  it("PUT 400 si fecha_fin es anterior a fecha_inicio", async () => {
    sesion(Role.ADMIN);
    const res = await editarEvento(
      new NextRequest("http://localhost/api/admin/eventos/3", {
        method: "PUT",
        body: formEvento({
          nombre: "X",
          fecha_inicio: "2026-12-12T09:00",
          fecha_fin: "2026-12-10T08:00",
        }),
      }),
      { params: Promise.resolve({ id: "3" }) }
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 401 sin sesión", async () => {
    mockSession.mockResolvedValue(null);
    const res = await borrarEvento(
      new NextRequest("http://localhost/api/admin/eventos/3", { method: "DELETE" }),
      { params: Promise.resolve({ id: "3" }) }
    );
    expect(res.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
