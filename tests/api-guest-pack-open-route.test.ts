import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/guest/pack/open/route";

describe("POST /api/guest/pack/open", () => {
  it("returns MVP payload and updates guest mvpCollection", async () => {
    const response = await POST(
      new Request("http://localhost/api/guest/pack/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            points: 1500,
            packsOpened: 0,
            openingsCount: 0,
            mvpCollection: [],
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(Array.isArray(body.pulledCardsMvp)).toBe(true);
    expect(body.pulledCardsMvp).toHaveLength(5);
    expect(body.state.points).toBe(1000);
    expect(body.state.packsOpened).toBe(1);
    expect(body.state.openingsCount).toBe(1);
    expect(Array.isArray(body.state.mvpCollection)).toBe(true);
    expect(body.state.mvpCollection.length).toBeGreaterThan(0);
  });
});
