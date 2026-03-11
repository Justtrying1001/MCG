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
      pulledCards: [{ baseCardId: "base_doge" }],
      pulledCardsMvp: [],
    });

    const response = await POST();
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("Invalid MVP pack payload");
  });

  it("returns pack payload when MVP payload is valid", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    openSalePackMvpDbNativeMock.mockResolvedValue({
      pulledCards: [{ baseCardId: "base_doge" }],
      pulledCardsMvp: [{ templateId: "tpl_1", tokenId: "tok_doge" }],
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pulledCardsMvp[0].templateId).toBe("tpl_1");
  });
});
