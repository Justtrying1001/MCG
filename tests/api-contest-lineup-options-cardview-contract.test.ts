import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getContestDetailMvpMock, prismaMock, buildCanonicalCardViewOrThrowMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getContestDetailMvpMock: vi.fn(),
  prismaMock: {
    ownedCardInstance: { findMany: vi.fn() },
    rosterLock: { findMany: vi.fn() },
  },
  buildCanonicalCardViewOrThrowMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({ ContestRuntimeError: class ContestRuntimeError extends Error { status = 500; }, getContestDetailMvp: getContestDetailMvpMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/cards/canonical-card-builder", () => ({
  buildCanonicalCardViewOrThrow: buildCanonicalCardViewOrThrowMock,
}));

import { GET } from "@/app/api/contests/[contestId]/lineup-options/route";

function makeInstance(overrides?: Record<string, unknown>) {
  return {
    id: "i1",
    cardTemplateId: "t1",
    cardTemplate: {
      cardSetId: "s1",
      cardSet: { code: "S1", displayName: "Set 1" },
      rarity: { code: "COMMON" },
      edition: { code: "BASE" },
      tokenProject: { id: "tp1", slug: "doge", displayName: "Dogecoin" },
      name: "DOGE",
      imageUrl: null,
      plannedSupply: 100,
      issuedSupply: 20,
    },
    ...overrides,
  };
}

function baseCardView() {
  return {
    templateId: "t1",
    tokenId: "tok_doge",
    displayName: "Dogecoin",
    symbol: "DOGE",
    slug: "doge",
    imageUrl: null,
    primaryChain: null,
    faction: null,
    rarity: "COMMON",
    edition: "BASE",
    plannedSupply: 100,
    issuedSupply: 20,
    remainingSupply: 80,
    owned: true,
    instanceCount: 1,
    cardText: "Flavor",
    cardNumber: "S01-001",
    setCode: "GENESIS",
    setEditionLabel: "Edition 1",
  };
}

describe("lineup-options canonical cardView contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    getContestDetailMvpMock.mockResolvedValue({ contest: { rules: [{ cardSetId: null }] } });
    prismaMock.rosterLock.findMany.mockResolvedValue([]);
    buildCanonicalCardViewOrThrowMock.mockReturnValue(baseCardView());
  });

  it("returns complete cardView on happy path", async () => {
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([makeInstance()]);

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.options[0].cardView).toMatchObject({
      templateId: "t1",
      displayName: "Dogecoin",
      symbol: "DOGE",
      rarity: "COMMON",
      edition: "BASE",
      cardText: "Flavor",
      cardNumber: "S01-001",
      setCode: "GENESIS",
      setEditionLabel: "Edition 1",
      plannedSupply: 100,
      issuedSupply: 20,
      remainingSupply: 80,
    });
  });

  it("fails when imageUrl field is missing in cardView", async () => {
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([makeInstance()]);
    const invalid = { ...baseCardView() } as Record<string, unknown>;
    delete invalid.imageUrl;
    buildCanonicalCardViewOrThrowMock.mockImplementation(() => { throw new Error("imageUrl field is required"); });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain("imageUrl field is required");
  });

  it("fails when rarity code is missing from contest template", async () => {
    const invalid = makeInstance();
    (invalid.cardTemplate as any).rarity = null;
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([invalid]);

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain("rarity.code");
  });

  it("fails when canonical text/number/set/supply fields are invalid", async () => {
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([makeInstance({
      cardTemplate: {
        ...makeInstance().cardTemplate,
        plannedSupply: Number.NaN,
      },
    })]);

    const responseA = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payloadA = await responseA.json();
    expect(responseA.status).toBe(500);
    expect(payloadA.error).toContain("plannedSupply");

    prismaMock.ownedCardInstance.findMany.mockResolvedValue([makeInstance()]);
    buildCanonicalCardViewOrThrowMock.mockImplementation(() => { throw new Error("cardText is required; cardNumber is required; setCode is required"); });

    const responseB = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payloadB = await responseB.json();
    expect(responseB.status).toBe(500);
    expect(payloadB.error).toContain("cardText is required");
    expect(payloadB.error).toContain("cardNumber is required");
    expect(payloadB.error).toContain("setCode is required");
  });

  it("fails entire payload when one card is invalid in mixed lineup", async () => {
    const second = makeInstance({ id: "i2", cardTemplateId: "t2", cardTemplate: { ...makeInstance().cardTemplate, tokenProject: { id: "tp2", slug: "pepe", displayName: "Pepe" } } });
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([makeInstance(), second]);
    buildCanonicalCardViewOrThrowMock
      .mockReturnValueOnce(baseCardView())
      .mockImplementationOnce(() => { throw new Error("rarity is required"); });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain("template=t2");
    expect(payload.error).toContain("rarity is required");
  });
});
