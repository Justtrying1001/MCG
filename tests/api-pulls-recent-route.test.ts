import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, prismaMock, buildCanonicalCardViewOrThrowMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  prismaMock: {
    ownedCardInstance: { findMany: vi.fn() },
  },
  buildCanonicalCardViewOrThrowMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/cards/canonical-card-builder", () => ({
  buildCanonicalCardViewOrThrow: buildCanonicalCardViewOrThrowMock,
}));

import { GET } from "@/app/api/pulls/recent/route";

describe("/api/pulls/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enriched recent pulls with card view data", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([
      {
        id: "inst_1",
        acquiredAt: new Date("2026-03-17T10:00:00.000Z"),
        user: { displayName: "Alice", xUsername: "alice_x" },
        cardTemplate: {
          id: "tpl_1",
          plannedSupply: 100,
          issuedSupply: 12,
          rarity: { code: "EPIC" },
          edition: { code: "BASE" },
          tokenProject: { slug: "bitcoin" },
        },
      },
    ]);
    buildCanonicalCardViewOrThrowMock.mockReturnValue({ displayName: "Bitcoin", rarity: "EPIC", setEditionLabel: "Edition 1" });

    const response = await GET(new Request("http://localhost:3000/api/pulls/recent?limit=12"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ownedCardInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 12, orderBy: [{ acquiredAt: "desc" }] })
    );
    expect(body.pulls).toHaveLength(1);
    expect(body.pulls[0]).toMatchObject({
      id: "inst_1",
      playerName: "Alice",
      card: { displayName: "Bitcoin" },
    });
  });

  it("fails explicitly when canonical template dependencies are missing", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([
      {
        id: "inst_1",
        acquiredAt: new Date("2026-03-17T10:00:00.000Z"),
        user: { displayName: "Alice", xUsername: "alice_x" },
        cardTemplate: {
          id: "tpl_1",
          plannedSupply: 100,
          issuedSupply: 12,
          rarity: null,
          edition: { code: "BASE" },
          tokenProject: { slug: "bitcoin" },
        },
      },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/pulls/recent?limit=12"));
    expect(response.status).toBe(500);
  });

  it("returns 401 when session is missing", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/pulls/recent"));

    expect(response.status).toBe(401);
  });
});
