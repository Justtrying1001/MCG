import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  safeLogAdminActionMock,
  grantManualPointsMvpMock,
  listRecentManualGrantsMvpMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  grantManualPointsMvpMock: vi.fn(),
  listRecentManualGrantsMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_FINANCE_OPS: "ADMIN_FINANCE_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));
vi.mock("@/lib/domain/rewards/manual-grants", () => ({
  ManualGrantError: class ManualGrantError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  grantManualPointsMvp: grantManualPointsMvpMock,
  listRecentManualGrantsMvp: listRecentManualGrantsMvpMock,
}));

import { GET, POST } from "@/app/api/internal/rewards/manual-grant/route";

describe("/api/internal/rewards/manual-grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRoleMock.mockImplementation((auth: any) => auth);
    safeLogAdminActionMock.mockResolvedValue(undefined);
  });

  it("returns 403 when admin auth missing", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(new Request("http://localhost/api/internal/rewards/manual-grant", { method: "POST" }) as any);
    expect(response.status).toBe(403);
  });

  it("creates manual grant and includes admin mode", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a", label: "alice", role: "ADMIN_FINANCE_OPS" } });
    grantManualPointsMvpMock.mockResolvedValue({
      applied: true,
      user: { id: "u1", points: 900 },
      entry: { id: "led1", amount: 500, createdAt: new Date("2026-03-01T10:00:00.000Z") },
    });

    const response = await POST(new Request("http://localhost/api/internal/rewards/manual-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", amount: 500, reasonLabel: "community-event", idempotencyKey: "manual:123" }),
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(grantManualPointsMvpMock).toHaveBeenCalledWith(expect.objectContaining({ grantedByAdmin: "alice" }));
    expect(body.entry.createdAt).toBe("2026-03-01T10:00:00.000Z");
  });

  it("returns recent grants", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "service-key:svc", label: "service-key:svc", role: "ADMIN_FINANCE_OPS" } });
    listRecentManualGrantsMvpMock.mockResolvedValue([
      {
        id: "led1",
        userId: "u1",
        user: { id: "u1", displayName: "A", xUsername: "a" },
        amount: 500,
        reasonRef: "community-event",
        metadata: { reasonLabel: "community-event" },
        idempotencyKey: "manual:123",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/internal/rewards/manual-grant") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.grants).toHaveLength(1);
    expect(body.grants[0].createdAt).toBe("2026-03-01T10:00:00.000Z");
  });
});
