import { afterEach, describe, expect, it } from "vitest";
import { getCanonicalSiteOrigin, getCanonicalSiteUrl, getSiteOrigin } from "@/lib/site-url";

describe("site url resolution", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalVercelBranchUrl = process.env.VERCEL_BRANCH_URL;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
    if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = originalVercelUrl;
    if (originalVercelBranchUrl === undefined) delete process.env.VERCEL_BRANCH_URL;
    else process.env.VERCEL_BRANCH_URL = originalVercelBranchUrl;
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("uses the production root domain as canonical origin on production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.memecardgame.com";

    expect(getCanonicalSiteOrigin()).toBe("https://memecardgame.com");
    expect(getSiteOrigin()).toBe("https://memecardgame.com");
  });

  it("uses the preview deployment url on Vercel preview", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.VERCEL_BRANCH_URL;
    process.env.VERCEL_URL = "mcg-git-feature-team.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "https://memecardgame.com";

    expect(getSiteOrigin()).toBe("https://mcg-git-feature-team.vercel.app");
    expect(getCanonicalSiteUrl().host).toBe("mcg-git-feature-team.vercel.app");
  });

  it("falls back to localhost during local development", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getSiteOrigin()).toBe("http://localhost:3000");
    expect(getCanonicalSiteOrigin()).toBe("http://localhost:3000");
  });
});
