import { describe, expect, it, vi, beforeEach } from "vitest";

const { findTokenMasterBySlugMock, toMvpCardViewFromTokenMasterRowMock, prismaTransactionMock } = vi.hoisted(() => ({
  findTokenMasterBySlugMock: vi.fn(),
  toMvpCardViewFromTokenMasterRowMock: vi.fn((input: any) => ({
    templateId: input.templateId,
    tokenId: input.token?.tokenId ?? "tok",
    displayName: input.token?.displayName ?? "Token",
    symbol: input.token?.symbol ?? "SYM",
    slug: input.token?.slug ?? "slug",
    imageUrl: null,
    primaryChain: null,
    faction: null,
    rarity: input.rarityCode,
    edition: input.editionCode,
    plannedSupply: input.plannedSupply,
    issuedSupply: input.issuedSupply,
    remainingSupply: Math.max((input.plannedSupply ?? 0) - (input.issuedSupply ?? 0), 0),
    owned: true,
    instanceCount: input.instanceCount ?? 1,
  })),
  prismaTransactionMock: vi.fn(),
}));

vi.mock("@/lib/domain/cards/token-master", () => ({
  findTokenMasterBySlug: findTokenMasterBySlugMock,
  toMvpCardViewFromTokenMasterRow: toMvpCardViewFromTokenMasterRowMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}));

import { openSalePackMvpDbNative, PackOpenRuntimeError } from "@/lib/domain/acquisition/open-pack";

type InMemoryState = {
  user: { id: string; points: number; packsOpened: number };
  pack: { id: string; code: string; isActive: boolean; cardSetId: string; cardsPerPack: number; plannedPackCount: number; openedPackCount: number };
  templates: Array<{ id: string; plannedSupply: number; issuedSupply: number; tokenProject: { slug: string }; rarity?: { code: string }; edition?: { code: string } }>;
  openingEvents: Array<{ id: string; userId: string; packDefinitionId: string }>;
  ownedInstances: Array<{ id: string; userId: string; cardTemplateId: string; sourcePackOpeningEventId: string }>;
  ledgerEntries: Array<{ id: string; userId: string; entryType: string; amount: number; reasonType: string; idempotencyKey: string | null }>;
};

function createTx(state: InMemoryState) {
  return {
    packDefinition: {
      findUnique: vi.fn(async ({ where }: any) => (where.code === state.pack.code ? state.pack : null)),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id === state.pack.id && where.isActive === true && state.pack.openedPackCount < where.openedPackCount.lt) {
          state.pack.openedPackCount += data.openedPackCount.increment;
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    user: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id === state.user.id && state.user.points >= where.points.gte) {
          state.user.points -= data.points.decrement;
          return { count: 1 };
        }
        return { count: 0 };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        if (where.id === state.user.id) {
          state.user.packsOpened += data.packsOpened.increment;
          return state.user;
        }

        throw new Error("User not found");
      }),
    },
    rewardLedgerEntry: {
      findUnique: vi.fn(async ({ where }: any) => state.ledgerEntries.find((entry) => entry.idempotencyKey === where.idempotencyKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `led_${state.ledgerEntries.length + 1}`, ...data };
        state.ledgerEntries.push(created);
        return created;
      }),
    },
    packOpeningEvent: {
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `evt_${state.openingEvents.length + 1}`, ...data };
        state.openingEvents.push(created);
        return created;
      }),
    },
    cardTemplate: {
      findMany: vi.fn(async () => state.templates.map((t) => ({
        id: t.id,
        plannedSupply: t.plannedSupply,
        issuedSupply: t.issuedSupply,
        rarity: t.rarity ?? { code: "COMMON" },
        edition: t.edition ?? { code: "BASE" },
        tokenProject: t.tokenProject,
      }))),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const row = state.templates.find((t) => t.id === where.id);
        if (!row) return { count: 0 };
        if (row.issuedSupply < where.issuedSupply.lt) {
          row.issuedSupply += data.issuedSupply.increment;
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    ownedCardInstance: {
      create: vi.fn(async ({ data }: any) => {
        state.ownedInstances.push({ id: `oci_${state.ownedInstances.length + 1}`, ...data });
      }),
    },
  };
}

function createState(overrides?: Partial<InMemoryState>): InMemoryState {
  return {
    user: { id: "u1", points: 500, packsOpened: 0 },
    pack: { id: "p1", code: "mvp_sale_pack", isActive: true, cardSetId: "set1", cardsPerPack: 5, plannedPackCount: 10, openedPackCount: 0 },
    templates: [
      { id: "t1", plannedSupply: 100, issuedSupply: 0, tokenProject: { slug: "dogecoin" } },
      { id: "t2", plannedSupply: 100, issuedSupply: 0, tokenProject: { slug: "shiba-inu" } },
      { id: "t3", plannedSupply: 100, issuedSupply: 0, tokenProject: { slug: "pepe" } },
    ],
    openingEvents: [],
    ownedInstances: [],
    ledgerEntries: [],
    ...overrides,
  };
}

describe("openSalePackMvpDbNative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findTokenMasterBySlugMock.mockImplementation((slug: string) => ({
      tokenId: `tok_${slug}`,
      displayName: slug,
      symbol: "SYM",
      slug,
      imageUrl: null,
      primaryChain: null,
      faction: null,
    }));
  });

  it("applies points debit, pack stock, event, instances, issued supply on successful open", async () => {
    const state = createState();
    prismaTransactionMock.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    const result = await openSalePackMvpDbNative({ userId: state.user.id, packCost: 100 });

    expect(result.pulledCardsMvp).toHaveLength(5);
    expect(state.user.points).toBe(400);
    expect(state.pack.openedPackCount).toBe(1);
    expect(state.openingEvents).toHaveLength(1);
    expect(state.ownedInstances).toHaveLength(5);
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.ledgerEntries[0].entryType).toBe("DEBIT");
    expect(state.ledgerEntries[0].reasonType).toBe("PACK_OPEN");
    expect(state.ledgerEntries[0].amount).toBe(100);
    const totalIssued = state.templates.reduce((sum, t) => sum + t.issuedSupply, 0);
    expect(totalIssued).toBe(5);
    expect(state.templates.every((t) => t.issuedSupply <= t.plannedSupply)).toBe(true);
  });

  it("fails atomically when user has insufficient points", async () => {
    const state = createState({ user: { id: "u1", points: 50, packsOpened: 0 } });
    prismaTransactionMock.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    await expect(openSalePackMvpDbNative({ userId: state.user.id, packCost: 100 })).rejects.toBeInstanceOf(PackOpenRuntimeError);

    expect(state.user.points).toBe(50);
    expect(state.pack.openedPackCount).toBe(0);
    expect(state.openingEvents).toHaveLength(0);
    expect(state.ownedInstances).toHaveLength(0);
    expect(state.templates.every((t) => t.issuedSupply === 0)).toBe(true);
  });

  it("keeps supply and pack invariants under parallel opens", async () => {
    const state = createState({
      user: { id: "u1", points: 1000, packsOpened: 0 },
      pack: { id: "p1", code: "mvp_sale_pack", isActive: true, cardSetId: "set1", cardsPerPack: 5, plannedPackCount: 2, openedPackCount: 0 },
      templates: [{ id: "t1", plannedSupply: 10, issuedSupply: 0, tokenProject: { slug: "dogecoin" } }],
    });

    prismaTransactionMock.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    const results = await Promise.allSettled([
      openSalePackMvpDbNative({ userId: state.user.id, packCost: 100 }),
      openSalePackMvpDbNative({ userId: state.user.id, packCost: 100 }),
      openSalePackMvpDbNative({ userId: state.user.id, packCost: 100 }),
    ]);

    const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
    expect(fulfilledCount).toBeLessThanOrEqual(2);
    expect(state.pack.openedPackCount).toBeLessThanOrEqual(state.pack.plannedPackCount);
    expect(state.templates[0].issuedSupply).toBeLessThanOrEqual(state.templates[0].plannedSupply);
  });
});
