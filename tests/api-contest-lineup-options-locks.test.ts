import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getContestDetailMvpMock, prismaMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getContestDetailMvpMock: vi.fn(),
  prismaMock: {
    ownedCardInstance: { findMany: vi.fn() },
    rosterLock: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({ ContestRuntimeError: class ContestRuntimeError extends Error { status = 400; }, getContestDetailMvp: getContestDetailMvpMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/contests/[contestId]/lineup-options/route";

describe("lineup options lock derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    getContestDetailMvpMock.mockResolvedValue({ contest: { rules: [{ cardSetId: null }] } });
  });

  it("exposes isLockedByActiveContest from active roster locks", async () => {
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([
      {
        id: "i1",
        cardTemplateId: "t1",
        lockState: "CONTEST:c2:ENTRY:e2",
        cardTemplate: {
          cardSetId: "s1",
          cardSet: { code: "S1", displayName: "Set 1" },
          rarity: { code: "COMMON" },
          edition: { code: "BASE" },
          tokenProject: { displayName: "Dogecoin" },
          name: "DOGE",
          imageUrl: null,
        },
      },
      {
        id: "i2",
        cardTemplateId: "t2",
        lockState: "CONTEST:c1:ENTRY:e1",
        cardTemplate: {
          cardSetId: "s1",
          cardSet: { code: "S1", displayName: "Set 1" },
          rarity: { code: "COMMON" },
          edition: { code: "BASE" },
          tokenProject: { displayName: "Pepe" },
          name: "PEPE",
          imageUrl: null,
        },
      },
    ]);
    prismaMock.rosterLock.findMany.mockResolvedValue([
      { ownedCardInstanceId: "i1", contestEntry: { contestId: "c2" } },
      { ownedCardInstanceId: "i2", contestEntry: { contestId: "c1" } },
    ]);

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.options).toHaveLength(2);
    expect(payload.options[0].instanceId).toBe("i1");
    expect(payload.options[0].isLockedByActiveContest).toBe(true);
    expect(payload.options[1].instanceId).toBe("i2");
    expect(payload.options[1].isLockedByActiveContest).toBe(false);
  });
});
