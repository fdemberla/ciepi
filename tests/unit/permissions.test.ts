import { describe, it, expect } from "vitest";
import {
  Role,
  BlogState,
  getAllowedStatesForRole,
  canChangeToState,
  canCreateBlog,
  canEditBlog,
  canDeleteBlog,
} from "@/lib/permissions";

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

// ─── RELACIONES_PUBLICAS Fix ─────────────────────────────────────────────────
describe("getAllowedStatesForRole — RELACIONES_PUBLICAS (role 4)", () => {
  const states = getAllowedStatesForRole(Role.RELACIONES_PUBLICAS);

  it("returns exactly [5, 6] (RECHAZADO_RP + PUBLICADO)", () => {
    expect(states).toHaveLength(2);
    expect(states).toContain(BlogState.RECHAZADO_RP);
    expect(states).toContain(BlogState.PUBLICADO);
  });

  it("does NOT allow BORRADOR (state 1)", () => {
    expect(states).not.toContain(BlogState.BORRADOR);
  });

  it("does NOT allow EN_REVISION_CIEPI (state 2)", () => {
    expect(states).not.toContain(BlogState.EN_REVISION_CIEPI);
  });

  it("does NOT allow RECHAZADO_CIEPI (state 3)", () => {
    expect(states).not.toContain(BlogState.RECHAZADO_CIEPI);
  });

  it("does NOT allow EN_REVISION_RP (state 4)", () => {
    expect(states).not.toContain(BlogState.EN_REVISION_RP);
  });

  it("canChangeToState(4, BORRADOR) returns false", () => {
    expect(canChangeToState(Role.RELACIONES_PUBLICAS, BlogState.BORRADOR)).toBe(false);
  });

  it("canChangeToState(4, RECHAZADO_CIEPI) returns false", () => {
    expect(canChangeToState(Role.RELACIONES_PUBLICAS, BlogState.RECHAZADO_CIEPI)).toBe(false);
  });

  it("canChangeToState(4, RECHAZADO_RP) returns true", () => {
    expect(canChangeToState(Role.RELACIONES_PUBLICAS, BlogState.RECHAZADO_RP)).toBe(true);
  });

  it("canChangeToState(4, PUBLICADO) returns true", () => {
    expect(canChangeToState(Role.RELACIONES_PUBLICAS, BlogState.PUBLICADO)).toBe(true);
  });
});

// ─── CIEPI ──────────────────────────────────────────────────────────────────
describe("getAllowedStatesForRole — CIEPI (role 3)", () => {
  const states = getAllowedStatesForRole(Role.CIEPI);

  it("returns exactly [1, 2, 3, 4]", () => {
    expect(states).toHaveLength(4);
    expect(states).toContain(BlogState.BORRADOR);
    expect(states).toContain(BlogState.EN_REVISION_CIEPI);
    expect(states).toContain(BlogState.RECHAZADO_CIEPI);
    expect(states).toContain(BlogState.EN_REVISION_RP);
  });

  it("cannot publish directly (PUBLICADO)", () => {
    expect(states).not.toContain(BlogState.PUBLICADO);
  });
});

// ─── ADMIN (most privileged) ─────────────────────────────────────────────────
describe("getAllowedStatesForRole — ADMIN (role 1, most privileged)", () => {
  const states = getAllowedStatesForRole(Role.ADMIN);

  it("returns all 6 states", () => {
    expect(states).toHaveLength(6);
  });
});

// ─── Unknown Role ────────────────────────────────────────────────────────────
describe("getAllowedStatesForRole — unknown role", () => {
  it("returns empty array for role 99", () => {
    expect(getAllowedStatesForRole(99)).toHaveLength(0);
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
