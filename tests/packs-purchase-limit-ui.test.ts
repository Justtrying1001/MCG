import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("packs purchase-limit UX", () => {
  it("renders purchase-limit status and no browser alerts on the packs page", () => {
    const source = readFileSync("app/packs/page.tsx", "utf8");
    expect(source).toContain("purchaseLimit={purchaseLimit}");
    expect(source).toContain("statusNotice={saleNotice}");
    expect(source).not.toContain("alert(");
  });

  it("shows usage, remaining, cooldown, and blocked CTA copy in the featured pack panel", () => {
    const source = readFileSync("components/packs/FeaturedPackStage.tsx", "utf8");
    expect(source).toContain("packs purchased");
    expect(source).toContain('purchase${purchaseLimit.remainingPurchases === 1 ? "" : "s"} remaining');
    expect(source).toContain("Daily purchase cap reached");
    expect(source).toContain("Daily cap reached");
  });

  it("keeps the purchase-cap admin controls visible from admin navigation", () => {
    const source = readFileSync("lib/admin/navigation.ts", "utf8");
    expect(source).toContain('/admin/supply');
    expect(source).toContain('Pack settings');
  });
});
