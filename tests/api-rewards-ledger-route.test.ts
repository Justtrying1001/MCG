import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, prismaMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  prismaMock: {
    rewardLedgerEntry: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/rewards/ledger/route";

describe("GET /api/rewards/ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized requests", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns only current user ledger entries in descending order", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    prismaMock.rewardLedgerEntry.findMany.mockResolvedValue([
      {
        id: "l2",
        entryType: "DEBIT",
        amount: 500,
        reasonType: "PACK_OPEN",
        reasonRef: null,
        metadata: null,
        createdAt: new Date("2026-03-01T12:00:00.000Z"),
      },
      {
        id: "l1",
        entryType: "CREDIT",
        amount: 500,
        reasonType: "WELCOME_REWARD",
        reasonRef: null,
        metadata: null,
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.rewardLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        orderBy: [{ createdAt: "desc" }],
      })
    );
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].id).toBe("l2");
    expect(body.entries[0].createdAt).toBe("2026-03-01T12:00:00.000Z");
  });
});
