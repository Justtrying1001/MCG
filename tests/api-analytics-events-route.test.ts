import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  return {
    ...actual,
    AnalyticsEventType: {
      PAGE_VIEW: "PAGE_VIEW",
      CLICK_OPEN_PACK: "CLICK_OPEN_PACK",
      LOGIN: "LOGIN",
      PACK_OPEN: "PACK_OPEN",
    },
  };
});

const { getSessionUserMock, recordInternalEventMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  recordInternalEventMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/analytics/events", () => ({
  recordInternalEvent: recordInternalEventMock,
}));

import { POST } from "@/app/api/analytics/events/route";

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("rejects events without a visitorId", async () => {
    const request = new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PAGE_VIEW" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing visitorId");
    expect(recordInternalEventMock).not.toHaveBeenCalled();
  });

  it("records the visitorId from the request body", async () => {
    const request = new Request("http://localhost/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PAGE_VIEW", visitorId: "visitor-1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(recordInternalEventMock).toHaveBeenCalledWith({
      type: "PAGE_VIEW",
      visitorId: "visitor-1",
      userId: "user-1",
      isGuest: false,
    });
  });
});
