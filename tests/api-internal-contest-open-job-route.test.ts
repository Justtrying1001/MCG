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

import { POST } from "@/app/api/internal/jobs/contest-open/route";

describe("contest-open job route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyQStashSignatureMock.mockResolvedValue(true);
    reconcileContestLifecycleByTimeMock.mockResolvedValue({
      contestId: "c1",
      initialStatus: "OPEN",
      finalStatus: "LIVE",
      steps: [{ from: "OPEN", to: "LIVE", reason: "OPEN_PHASE_ENDED" }],
    });
  });

  it("reconciles lifecycle instead of issuing an OPEN no-op transition", async () => {
    const request = new Request("http://localhost/api/internal/jobs/contest-open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "upstash-signature": "sig",
      },
      body: JSON.stringify({ contestId: "c1" }),
    }) as any;

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(reconcileContestLifecycleByTimeMock).toHaveBeenCalledWith("c1");
    expect(json.ok).toBe(true);
    expect(json.result.finalStatus).toBe("LIVE");
  });
});
