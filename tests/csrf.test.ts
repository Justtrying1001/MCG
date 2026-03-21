import { describe, expect, it } from "vitest";

import { enforceSameOrigin } from "@/lib/csrf";

describe("enforceSameOrigin", () => {
  it("allows matching origin headers", () => {
    const result = enforceSameOrigin(new Request("http://localhost:3000/api/me/handle", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }));

    expect(result).toBeNull();
  });

  it("rejects cross-site origin headers", async () => {
    const result = enforceSameOrigin(new Request("http://localhost:3000/api/me/handle", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }));

    expect(result?.status).toBe(403);
    await expect(result?.json()).resolves.toMatchObject({ ok: false, error: "Cross-site request blocked" });
  });

  it("rejects requests without origin or referer", async () => {
    const result = enforceSameOrigin(new Request("http://localhost:3000/api/me/handle", { method: "POST" }));

    expect(result?.status).toBe(403);
    await expect(result?.json()).resolves.toMatchObject({ ok: false, error: "Missing same-origin header" });
  });
});
