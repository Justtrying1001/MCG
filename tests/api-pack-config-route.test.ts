import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSalePackRuntimeConfigMock, getSessionUserMock } = vi.hoisted(() => ({
  getSalePackRuntimeConfigMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/domain/acquisition/pack-config", () => ({
  getSalePackRuntimeConfig: getSalePackRuntimeConfigMock,
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));

import { GET } from "@/app/api/pack/config/route";

describe("GET /api/pack/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns runtime config payload using the current session user when available", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    getSalePackRuntimeConfigMock.mockResolvedValue({ exists: true, pack: null, slots: [], purchaseLimit: { enabled: true } });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purchaseLimit.enabled).toBe(true);
    expect(getSalePackRuntimeConfigMock).toHaveBeenCalledWith("u1");
  });
});
