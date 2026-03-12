import { describe, expect, it, vi } from "vitest";

const { getAdminSessionFromCookiesMock, redirectMock } = vi.hoisted(() => ({
  getAdminSessionFromCookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminSessionFromCookies: getAdminSessionFromCookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import AdminProtectedLayout from "@/app/admin/(protected)/layout";

describe("admin protected layout", () => {
  it("redirects to login when no session", () => {
    getAdminSessionFromCookiesMock.mockReturnValue(null);
    redirectMock.mockImplementation(() => { throw new Error("redirect"); });

    expect(() => AdminProtectedLayout({ children: null })).toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });

  it("renders shell when session exists", () => {
    getAdminSessionFromCookiesMock.mockReturnValue({ username: "alice" });

    const tree = AdminProtectedLayout({ children: "ok" });
    expect(tree).toBeTruthy();
  });
});
