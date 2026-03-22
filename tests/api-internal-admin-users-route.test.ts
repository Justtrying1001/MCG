import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, listUsersForAdminBrowserMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  listUsersForAdminBrowserMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/users/browser", () => ({ listUsersForAdminBrowser: listUsersForAdminBrowserMock }));

import { GET } from "@/app/api/internal/admin/users/route";

describe("GET /api/internal/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin auth", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/admin/users") } as any);
    expect(response.status).toBe(403);
  });

  it("returns initial browser users without requiring query", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    listUsersForAdminBrowserMock.mockResolvedValue({
      total: 128,
      page: 1,
      limit: 25,
      users: [
        {
          id: "u1",
          displayName: "Alice",
          handle: "alice",
          points: 1200,
          packsOpened: 9,
          createdAt: new Date("2026-03-01T10:00:00.000Z"),
          userProgression: { level: 4, xp: 980 },
        },
      ],
    });

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/admin/users") } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listUsersForAdminBrowserMock).toHaveBeenCalledWith({ query: "", limit: 25, page: 1 });
    expect(body.total).toBe(128);
    expect(body.users[0]).toMatchObject({
      id: "u1",
      displayName: "Alice",
      handle: "alice",
      level: 4,
      xp: 980,
      createdAt: "2026-03-01T10:00:00.000Z",
    });
  });

  it("supports query and pagination", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    listUsersForAdminBrowserMock.mockResolvedValue({ total: 0, page: 2, limit: 10, users: [] });

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/admin/users?q=alice&page=2&limit=10") } as any);

    expect(response.status).toBe(200);
    expect(listUsersForAdminBrowserMock).toHaveBeenCalledWith({ query: "alice", limit: 10, page: 2 });
  });
});
