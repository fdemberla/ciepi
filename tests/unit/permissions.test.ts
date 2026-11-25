import { describe, it, expect } from "vitest";
import {
  Role,
  BlogState,
  canCreateBlog,
  canEditBlog,
  canDeleteBlog,
} from "@/lib/permissions";

// Las transiciones de estado del blog (por rol, autoría y estado) se prueban en
// tests/unit/estadosBlog.test.ts contra lib/estados/blog.ts.

// ─── Role Enum Sanity Check ──────────────────────────────────────────────────
// NOTE: The enum labels are historically reversed from DB semantics.
// Role 1 is the most-privileged role (called "Super Administrador" in the UI
// and all route guards). Role.ADMIN = 1 is the most-privileged, not SUPER_ADMIN.
// Do not rename until all raw-number guards are also updated.
describe("Role enum values (IMPORTANT: labels are inverted from DB semantics)", () => {
  it("Role.ADMIN should equal 1 — this is the MOST privileged role in all route guards", () => {
    expect(Role.ADMIN).toBe(1);
  });

  it("Role.SUPER_ADMIN should equal 2 — NOTE: this is LESS privileged than Role.ADMIN despite the name", () => {
    expect(Role.SUPER_ADMIN).toBe(2);
  });

  it("Role.CIEPI should equal 3", () => {
    expect(Role.CIEPI).toBe(3);
  });

  it("Role.RELACIONES_PUBLICAS should equal 4", () => {
    expect(Role.RELACIONES_PUBLICAS).toBe(4);
  });
});

// ─── BlogState Enum ──────────────────────────────────────────────────────────
describe("BlogState enum values", () => {
  it("maps correctly", () => {
    expect(BlogState.BORRADOR).toBe(1);
    expect(BlogState.EN_REVISION_CIEPI).toBe(2);
    expect(BlogState.RECHAZADO_CIEPI).toBe(3);
    expect(BlogState.EN_REVISION_RP).toBe(4);
    expect(BlogState.RECHAZADO_RP).toBe(5);
    expect(BlogState.PUBLICADO).toBe(6);
  });
});

// ─── Create / Edit / Delete Guards ───────────────────────────────────────────
describe("canCreateBlog", () => {
  it("CIEPI can create", () => expect(canCreateBlog(Role.CIEPI)).toBe(true));
  it("ADMIN can create", () => expect(canCreateBlog(Role.ADMIN)).toBe(true));
  it("RELACIONES_PUBLICAS cannot create", () =>
    expect(canCreateBlog(Role.RELACIONES_PUBLICAS)).toBe(false));
});

describe("canEditBlog", () => {
  it("CIEPI can edit", () => expect(canEditBlog(Role.CIEPI)).toBe(true));
  it("RELACIONES_PUBLICAS cannot edit", () =>
    expect(canEditBlog(Role.RELACIONES_PUBLICAS)).toBe(false));
});

describe("canDeleteBlog", () => {
  it("ADMIN (role 1) can delete", () => expect(canDeleteBlog(Role.ADMIN)).toBe(true));
  it("CIEPI cannot delete", () => expect(canDeleteBlog(Role.CIEPI)).toBe(false));
  it("RELACIONES_PUBLICAS cannot delete", () =>
    expect(canDeleteBlog(Role.RELACIONES_PUBLICAS)).toBe(false));
});
