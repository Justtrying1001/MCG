import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, searchUsersForAdminMvpMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  searchUsersForAdminMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/users/search", () => ({ searchUsersForAdminMvp: searchUsersForAdminMvpMock }));

import { GET } from "@/app/api/internal/users/search/route";

describe("GET /api/internal/users/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin auth", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/users/search?q=a") } as any);
    expect(response.status).toBe(403);
  });

  it("returns mapped users", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    searchUsersForAdminMvpMock.mockResolvedValue([
      {
        id: "u1",
        xUserId: "x1",
        xUsername: "alice",
        displayName: "Alice",
        points: 1200,
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/users/search?q=alice&limit=5") } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(searchUsersForAdminMvpMock).toHaveBeenCalledWith("alice", 5);
    expect(body.users[0].createdAt).toBe("2026-03-01T10:00:00.000Z");
  });
});
