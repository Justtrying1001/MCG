import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  createAdminArtifactMock,
  safeLogAdminActionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  createAdminArtifactMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  prismaMock: {
    contest: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  createAdminArtifact: createAdminArtifactMock,
  requireAdminRole: requireAdminRoleMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));

import { POST } from "@/app/api/internal/contest-runs/[contestId]/transitions/validate/route";

describe("/api/internal/contest-runs/:contestId/transitions/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    createAdminArtifactMock.mockResolvedValue({ id: "artifact_1" });
    safeLogAdminActionMock.mockResolvedValue(undefined);
  });

  it("allows LIVE -> SETTLED validation for zero-entry contests without rankings", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: "LIVE",
      _count: { entries: 0, rankings: 0, settlements: 0 },
    });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPhase: "SETTLED", reasonCode: "LIFECYCLE_CONTROL" }),
    }) as any, { params: { contestId: "c1" } });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.blocking).toBe(false);
    expect(body.issues).toEqual([]);
  });

  it("keeps blocking LIVE -> SETTLED when entrants exist but rankings are missing", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: "LIVE",
      _count: { entries: 3, rankings: 0, settlements: 0 },
    });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPhase: "SETTLED", reasonCode: "LIFECYCLE_CONTROL" }),
    }) as any, { params: { contestId: "c1" } });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.blocking).toBe(true);
    expect(body.issues).toEqual([
      expect.objectContaining({
        code: "CONTEST_TRANSITION_PREREQUISITE_FAILED",
        severity: "ERROR",
      }),
    ]);
  });
});
