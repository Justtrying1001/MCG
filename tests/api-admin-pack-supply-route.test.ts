import { describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, getPackSupplySummaryMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  getPackSupplySummaryMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({
  requireInternalAdminAccess: requireInternalAdminAccessMock,
}));

vi.mock("@/lib/domain/rewards/pack-supply", () => ({
  getPackSupplySummary: getPackSupplySummaryMock,
}));

import { GET } from "@/app/api/admin/packs/supply/route";

describe("/api/admin/packs/supply", () => {
  it("rejects unauthorized requests", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET(new Request("http://localhost/api/admin/packs/supply") as any);

    expect(response.status).toBe(403);
  });

  it("returns supply summary for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true });
    getPackSupplySummaryMock.mockResolvedValue({
      sale: { total: 10000, distributed: 10, remaining: 9990 },
      reward: { total: 6000, distributed: 8, remaining: 5992 },
      total: { total: 16000, distributed: 18, remaining: 15982 },
      last_updated_at: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    });

    const response = await GET(new Request("http://localhost/api/admin/packs/supply") as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sale.total).toBe(10000);
    expect(payload.reward.total).toBe(6000);
    expect(payload.total.total).toBe(16000);
  });
});
