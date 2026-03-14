import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookiesGetMock,
  getSessionUserMock,
} = vi.hoisted(() => ({
  cookiesGetMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: cookiesGetMock,
  }),
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  getSessionCookieName: vi.fn(() => "mcg_session"),
  getSessionMaxAgeSeconds: vi.fn(() => 2_592_000),
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/domain/rewards/onboarding", () => ({
  upsertUserFromXProfileWithWelcome: vi.fn(),
}));

vi.mock("@/lib/x-oauth", () => ({
  exchangeXAccessToken: vi.fn(),
  fetchXProfile: vi.fn(),
}));

import { GET } from "@/app/api/auth/x/callback/route";

describe("/api/auth/x/callback state mismatch handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to home without auth error when session already exists", async () => {
    cookiesGetMock.mockImplementation((name: string) => {
      if (name === "mcg_x_request_token") return undefined;
      if (name === "mcg_x_request_token_secret") return undefined;
      return undefined;
    });
    getSessionUserMock.mockResolvedValue({ id: "user_1" });

    const response = await GET(new Request("https://example.com/api/auth/x/callback?oauth_token=t1&oauth_verifier=v1"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("keeps x_oauth_state error when no valid session exists", async () => {
    cookiesGetMock.mockImplementation(() => undefined);
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/auth/x/callback?oauth_token=t1&oauth_verifier=v1"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/?auth_error=x_oauth_state");
  });
});
