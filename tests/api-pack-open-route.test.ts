import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, openSalePackMvpDbNativeMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  openSalePackMvpDbNativeMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/acquisition/open-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/acquisition/open-pack")>("@/lib/domain/acquisition/open-pack");
  return {
    ...actual,
    openSalePackMvpDbNative: openSalePackMvpDbNativeMock,
  };
});

import { POST } from "@/app/api/pack/open/route";
import { PackPurchaseLimitExceededError } from "@/lib/domain/acquisition/purchase-limit";

describe("POST /api/pack/open", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("fails when MVP payload is missing", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    openSalePackMvpDbNativeMock.mockResolvedValue({
      pulledCardsMvp: [],
    });

    const response = await POST();
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("Invalid MVP pack payload");
  });

  it("returns structured cooldown payload when purchase limit is reached", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    openSalePackMvpDbNativeMock.mockRejectedValue(new PackPurchaseLimitExceededError({
      enabled: true,
      limit: 5,
      used: 5,
      remainingPurchases: 0,
      resetAt: "2026-03-19T18:00:00.000Z",
      cooldownSeconds: 3600,
      isBlocked: true,
      windowHours: 24,
    }));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("PACK_PURCHASE_LIMIT_REACHED");
    expect(body.error.purchaseLimit.cooldownSeconds).toBe(3600);
  });

  it("returns pack payload when MVP payload is valid", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    openSalePackMvpDbNativeMock.mockResolvedValue({
      pulledCardsMvp: [{ templateId: "tpl_1", tokenId: "tok_doge" }],
      purchaseLimit: { enabled: true, limit: 5, used: 1, remainingPurchases: 4, resetAt: null, cooldownSeconds: 0, isBlocked: false, windowHours: 24 },
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pulledCardsMvp[0].templateId).toBe("tpl_1");
  });
});
