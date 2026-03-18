import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyQStashSignatureMock,
  reconcileContestLifecycleByTimeMock,
} = vi.hoisted(() => ({
  verifyQStashSignatureMock: vi.fn(),
  reconcileContestLifecycleByTimeMock: vi.fn(),
}));

vi.mock("@/lib/qstash-verify", () => ({
  verifyQStashSignature: verifyQStashSignatureMock,
}));

vi.mock("@/lib/domain/contests/lifecycle-reconciliation", () => ({
  reconcileContestLifecycleByTime: reconcileContestLifecycleByTimeMock,
}));

import { POST } from "@/app/api/internal/jobs/contest-live/route";

describe("contest-live job route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyQStashSignatureMock.mockResolvedValue(true);
    reconcileContestLifecycleByTimeMock.mockResolvedValue({
      contestId: "c1",
      initialStatus: "LOCKED",
      finalStatus: "LIVE",
      steps: [{ from: "LOCKED", to: "LIVE", reason: "STARTS_AT_REACHED" }],
    });
  });

  it("parses the raw QStash body and reconciles the contest lifecycle", async () => {
    const rawBody = JSON.stringify({ contestId: "c1" });
    const request = new Request("http://localhost/api/internal/jobs/contest-live", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "upstash-signature": "sig",
      },
      body: rawBody,
    }) as any;

    const response = await POST(request);
    const json = await response.json();

    expect(verifyQStashSignatureMock).toHaveBeenCalledWith("sig", rawBody);
    expect(reconcileContestLifecycleByTimeMock).toHaveBeenCalledWith("c1");
    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      contestId: "c1",
      result: expect.objectContaining({ finalStatus: "LIVE" }),
    });
  });
});
