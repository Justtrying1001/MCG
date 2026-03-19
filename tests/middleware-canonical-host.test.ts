import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { shouldEnforceCanonicalHost } from "@/middleware";

function buildRequest(host: string, headers: Record<string, string> = {}) {
  return {
    headers: new Headers({
      "x-forwarded-host": host,
      ...headers,
    }),
    nextUrl: new URL(`https://${host}/`),
  } as NextRequest;
}

describe("canonical host middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("enforces the canonical host on production when the request host differs", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.example.com";
    delete process.env.VERCEL_ENV;

    expect(shouldEnforceCanonicalHost(buildRequest("staging.example.com"))).toBe(true);
  });

  it("does not enforce the canonical host on Vercel preview deployments", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.example.com";
    process.env.VERCEL_ENV = "preview";

    expect(shouldEnforceCanonicalHost(buildRequest("my-branch-git-feature-team.vercel.app"))).toBe(false);
  });

  it("does not enforce the canonical host when Vercel marks the deployment url header", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.example.com";
    delete process.env.VERCEL_ENV;

    expect(
      shouldEnforceCanonicalHost(
        buildRequest("my-branch-git-feature-team.vercel.app", {
          "x-vercel-deployment-url": "my-branch-git-feature-team.vercel.app",
        }),
      ),
    ).toBe(false);
  });
});
