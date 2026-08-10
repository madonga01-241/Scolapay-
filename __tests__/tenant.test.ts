import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role } from "@prisma/client";

// On mocke next-auth pour contrôler la session retournée dans chaque test,
// sans dépendre d'une vraie base de données.
const getServerSessionMock = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import {
  requireTenantContext,
  requireRole,
  assertParentOwnsResource,
  TenantAccessError,
} from "@/lib/tenant";

describe("requireTenantContext", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
  });

  it("rejette un utilisateur non authentifié", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await expect(requireTenantContext()).rejects.toThrow(TenantAccessError);
  });

  it("rejette un SUPER_ADMIN (pas de school scope)", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: Role.SUPER_ADMIN, schoolId: null },
    });
    await expect(requireTenantContext()).rejects.toThrow(
      "requiert un compte rattaché à une école"
    );
  });

  it("rejette un utilisateur sans schoolId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: Role.PARENT, schoolId: null },
    });
    await expect(requireTenantContext()).rejects.toThrow(
      "non rattaché à une école"
    );
  });

  it("retourne le contexte pour un utilisateur valide", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: Role.ACCOUNTANT, schoolId: "school-A" },
    });
    const ctx = await requireTenantContext();
    expect(ctx).toEqual({
      userId: "u1",
      role: Role.ACCOUNTANT,
      schoolId: "school-A",
    });
  });
});

describe("requireRole", () => {
  const ctx = { userId: "u1", role: Role.ACCOUNTANT, schoolId: "school-A" };

  it("laisse passer un rôle autorisé", () => {
    expect(() => requireRole(ctx, [Role.ACCOUNTANT, Role.SCHOOL_ADMIN])).not.toThrow();
  });

  it("bloque un rôle non autorisé", () => {
    expect(() => requireRole(ctx, [Role.SCHOOL_ADMIN])).toThrow(TenantAccessError);
  });
});

describe("assertParentOwnsResource", () => {
  it("laisse passer les non-parents (admin/comptable) sans vérification", () => {
    const ctx = { userId: "admin-1", role: Role.SCHOOL_ADMIN, schoolId: "s1" };
    expect(() => assertParentOwnsResource(ctx, "parent-user-1")).not.toThrow();
  });

  it("laisse passer un parent qui consulte sa propre ressource", () => {
    const ctx = { userId: "parent-1", role: Role.PARENT, schoolId: "s1" };
    expect(() => assertParentOwnsResource(ctx, "parent-1")).not.toThrow();
  });

  it("empêche un parent d'accéder à une ressource d'un autre parent", () => {
    const ctx = { userId: "parent-1", role: Role.PARENT, schoolId: "s1" };
    expect(() => assertParentOwnsResource(ctx, "parent-2")).toThrow(
      TenantAccessError
    );
  });
});
