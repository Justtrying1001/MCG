import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  safeLogAdminActionMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/admin-ops", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-ops")>("@/lib/admin-ops");
  return {
    ...actual,
    safeLogAdminAction: safeLogAdminActionMock,
  };
});

import { GET, POST } from "@/app/api/internal/admin/reset-users/route";

describe("/api/internal/admin/reset-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENABLE_USER_RESET = "true";
  });


  it("returns auth error for standard unauthenticated user", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(new Request("http://localhost/api/internal/admin/reset-users", { method: "POST" }) as any);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
  });

  it("returns 403 for insufficient role", async () => {
    requireInternalAdminAccessMock.mockReturnValue({
      ok: true,
      mode: "session",
      actor: {
        type: "admin_user",
        id: "admin:ops",
        label: "ops",
        username: "ops",
        authMode: "session",
        role: "ADMIN_OPS",
      },
    });

    const response = await POST(new Request("http://localhost/api/internal/admin/reset-users", { method: "POST" }) as any);
    expect(response.status).toBe(403);
  });

  it("resets user data and keeps operation summary", async () => {
    requireInternalAdminAccessMock.mockReturnValue({
      ok: true,
      mode: "session",
      actor: {
        type: "admin_user",
        id: "admin:supervisor",
        label: "supervisor",
        username: "supervisor",
        authMode: "session",
        role: "ADMIN_SUPERVISOR",
      },
    });

    const tx = {
      userInvite: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      user: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
      rewardPackSupply: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => callback(tx));

    const response = await POST(new Request("http://localhost/api/internal/admin/reset-users", { method: "POST" }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedUsers).toBe(4);
    expect(body.deletedInvites).toBe(2);
    expect(body.resetRewardPackSupplyRows).toBe(3);
    expect(tx.user.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.userInvite.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.rewardPackSupply.updateMany).toHaveBeenCalledWith({ data: { distributed: 0 } });
    expect(safeLogAdminActionMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: "RESET_USERS",
      module: "admin.resetUsers",
      status: "EXECUTED",
      effectSummary: expect.objectContaining({ deletedUsers: 4 }),
    }));
  });

  it("returns 405 for non-POST method", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
