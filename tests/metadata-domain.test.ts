import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("metadata domain configuration", () => {
  it("declares canonical metadata on the root layout", () => {
    const source = readRepoFile("app/layout.tsx");

    expect(source).toContain('metadataBase: getCanonicalSiteUrl()');
    expect(source).toContain('canonical: "/"');
    expect(source).toContain('url: "/"');
  });

  it("wires robots and sitemap through the canonical site origin helper", () => {
    const robotsSource = readRepoFile("app/robots.ts");
    const sitemapSource = readRepoFile("app/sitemap.ts");

    expect(robotsSource).toContain('import { getCanonicalSiteOrigin } from "@/lib/site-url"');
    expect(robotsSource).toContain('sitemap: `${siteUrl}/sitemap.xml`');
    expect(robotsSource).toContain('host: siteUrl');

    expect(sitemapSource).toContain('import { getCanonicalSiteOrigin } from "@/lib/site-url"');
    expect(sitemapSource).toContain('url: `${siteUrl}${route}`');
    expect(sitemapSource).toContain('"/collection"');
    expect(sitemapSource).toContain('"/contests"');
  });
});
