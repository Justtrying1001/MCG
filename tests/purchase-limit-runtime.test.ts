import { beforeEach, describe, expect, it, vi } from "vitest";

const { runtimeConfigFindUniqueMock, runtimeConfigUpsertMock, packOpeningEventFindManyMock } = vi.hoisted(() => ({
  runtimeConfigFindUniqueMock: vi.fn(),
  runtimeConfigUpsertMock: vi.fn(),
  packOpeningEventFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    runtimeConfig: {
      findUnique: runtimeConfigFindUniqueMock,
      upsert: runtimeConfigUpsertMock,
    },
    packOpeningEvent: {
      findMany: packOpeningEventFindManyMock,
    },
  },
}));

import {
  PackPurchaseLimitExceededError,
  assertPackPurchaseAllowed,
  getPackPurchaseLimitStatus,
  updatePackPurchaseLimitConfig,
} from "@/lib/domain/acquisition/purchase-limit";

const NOW = new Date("2026-03-19T12:00:00.000Z");

describe("pack purchase limit runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeConfigFindUniqueMock.mockResolvedValue({
      key: "pack_purchase_limit",
      value: { enabled: true, maxPurchasesPer24h: 5 },
    });
    runtimeConfigUpsertMock.mockImplementation(async ({ create, update }: any) => ({
      key: "pack_purchase_limit",
      value: update?.value ?? create?.value,
    }));
  });

  it("allows purchase under limit", async () => {
    packOpeningEventFindManyMock.mockResolvedValue([
      { openedAt: new Date("2026-03-19T01:00:00.000Z") },
      { openedAt: new Date("2026-03-19T04:00:00.000Z") },
    ]);

    const status = await getPackPurchaseLimitStatus({ userId: "u1", now: NOW });
    expect(status.isBlocked).toBe(false);
    expect(status.used).toBe(2);
    expect(status.remainingPurchases).toBe(3);
  });

  it("allows purchase exactly at edge before final purchase", async () => {
    packOpeningEventFindManyMock.mockResolvedValue([
      { openedAt: new Date("2026-03-19T01:00:00.000Z") },
      { openedAt: new Date("2026-03-19T02:00:00.000Z") },
      { openedAt: new Date("2026-03-19T03:00:00.000Z") },
      { openedAt: new Date("2026-03-19T04:00:00.000Z") },
    ]);

    await expect(assertPackPurchaseAllowed({ userId: "u1", now: NOW, tx: { runtimeConfig: { findUnique: runtimeConfigFindUniqueMock }, packOpeningEvent: { findMany: packOpeningEventFindManyMock } } as any })).resolves.toMatchObject({
      used: 4,
      remainingPurchases: 1,
      isBlocked: false,
    });
  });

  it("blocks purchase over limit with cooldown info", async () => {
    packOpeningEventFindManyMock.mockResolvedValue([
      { openedAt: new Date("2026-03-18T13:30:00.000Z") },
      { openedAt: new Date("2026-03-18T14:00:00.000Z") },
      { openedAt: new Date("2026-03-18T15:00:00.000Z") },
      { openedAt: new Date("2026-03-18T16:00:00.000Z") },
      { openedAt: new Date("2026-03-18T17:00:00.000Z") },
    ]);

    await expect(assertPackPurchaseAllowed({ userId: "u1", now: NOW, tx: { runtimeConfig: { findUnique: runtimeConfigFindUniqueMock }, packOpeningEvent: { findMany: packOpeningEventFindManyMock } } as any })).rejects.toBeInstanceOf(PackPurchaseLimitExceededError);
    const status = await getPackPurchaseLimitStatus({ userId: "u1", now: NOW });
    expect(status.isBlocked).toBe(true);
    expect(status.resetAt).toBe("2026-03-19T13:30:00.000Z");
    expect(status.cooldownSeconds).toBe(5400);
  });

  it("allows purchase again after 24 hours", async () => {
    packOpeningEventFindManyMock.mockResolvedValue([]);

    const status = await getPackPurchaseLimitStatus({ userId: "u1", now: NOW });
    expect(status.isBlocked).toBe(false);
    expect(status.remainingPurchases).toBe(5);
  });

  it("reward, contest, and admin-granted packs do not count because only SALE opening events are queried", async () => {
    packOpeningEventFindManyMock.mockResolvedValue([]);
    await getPackPurchaseLimitStatus({ userId: "u1", now: NOW });

    expect(packOpeningEventFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        packDefinition: { source: "SALE" },
      }),
    }));
  });

  it("admin can disable the limit", async () => {
    runtimeConfigFindUniqueMock.mockResolvedValue({
      key: "pack_purchase_limit",
      value: { enabled: false, maxPurchasesPer24h: 5 },
    });
    packOpeningEventFindManyMock.mockResolvedValue(new Array(9).fill(null).map((_, i) => ({ openedAt: new Date(`2026-03-19T0${i}:00:00.000Z`) })));

    const status = await getPackPurchaseLimitStatus({ userId: "u1", now: NOW });
    expect(status.enabled).toBe(false);
    expect(status.isBlocked).toBe(false);
    expect(status.limit).toBeNull();
  });

  it("admin can change limit without redeploy", async () => {
    const updated = await updatePackPurchaseLimitConfig({ enabled: true, maxPurchasesPer24h: 7 });
    expect(updated.maxPurchasesPer24h).toBe(7);
    expect(runtimeConfigUpsertMock).toHaveBeenCalled();
  });
});
