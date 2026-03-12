import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  createContestDraftMock,
  getContestDraftMock,
  updateContestDraftMock,
  validateContestDraftMock,
  publishContestMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  createContestDraftMock: vi.fn(),
  getContestDraftMock: vi.fn(),
  updateContestDraftMock: vi.fn(),
  validateContestDraftMock: vi.fn(),
  publishContestMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/contests/config-runtime", () => ({
  createContestDraft: createContestDraftMock,
  getContestDraft: getContestDraftMock,
  updateContestDraft: updateContestDraftMock,
  validateContestDraft: validateContestDraftMock,
  publishContest: publishContestMock,
}));

import { GET, PATCH } from "@/app/api/internal/contest-configs/[contestId]/route";
import { POST as CREATE } from "@/app/api/internal/contest-configs/route";
import { POST as VALIDATE } from "@/app/api/internal/contest-configs/[contestId]/validate/route";
import { POST as PUBLISH } from "@/app/api/internal/contest-configs/[contestId]/publish/route";

describe("contest config internal routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
  });

  it("creates draft", async () => {
    createContestDraftMock.mockResolvedValue({ contest: { id: "c1" } });
    const response = await CREATE(new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "C1", title: "Week 1" }) }) as any);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.contest.id).toBe("c1");
  });

  it("returns 400 on invalid create payload", async () => {
    const response = await CREATE(new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "", title: "" }) }) as any);
    expect(response.status).toBe(400);
    expect(createContestDraftMock).not.toHaveBeenCalled();
  });

  it("gets and patches draft", async () => {
    getContestDraftMock.mockResolvedValue({ contest: { id: "c1" } });
    updateContestDraftMock.mockResolvedValue({ contest: { id: "c1", title: "Updated" } });

    const getResponse = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    expect(getResponse.status).toBe(200);

    const patchResponse = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "Updated" }) }) as any, { params: { contestId: "c1" } });
    const body = await patchResponse.json();
    expect(patchResponse.status).toBe(200);
    expect(body.contest.title).toBe("Updated");
  });

  it("returns 400 on empty patch payload", async () => {
    const patchResponse = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({}) }) as any, { params: { contestId: "c1" } });
    expect(patchResponse.status).toBe(400);
    expect(updateContestDraftMock).not.toHaveBeenCalled();
  });

  it("validates and publishes draft", async () => {
    validateContestDraftMock.mockResolvedValue({ contestId: "c1", blocking: false, issues: [] });
    publishContestMock.mockResolvedValue({ contest: { id: "c1", configPublishedAt: "2026-03-01T00:00:00.000Z" } });

    const validateResponse = await VALIDATE(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(validateResponse.status).toBe(200);

    const publishResponse = await PUBLISH(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const body = await publishResponse.json();
    expect(publishResponse.status).toBe(200);
    expect(body.contest.id).toBe("c1");
  });
});
