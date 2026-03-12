import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  claimIdempotencyKeyMock,
  safeLogAdminActionMock,
  createContestDraftMock,
  validateContestDraftMock,
  publishContestMock,
  generateSettlementPlanMock,
  previewSettlementPlanMock,
  executeSettlementPlanMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  createContestDraftMock: vi.fn(),
  validateContestDraftMock: vi.fn(),
  publishContestMock: vi.fn(),
  generateSettlementPlanMock: vi.fn(),
  previewSettlementPlanMock: vi.fn(),
  executeSettlementPlanMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_FINANCE_OPS: "ADMIN_FINANCE_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
  claimIdempotencyKey: claimIdempotencyKeyMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));
vi.mock("@/lib/domain/contests/config-runtime", () => ({
  createContestDraft: createContestDraftMock,
  validateContestDraft: validateContestDraftMock,
  publishContest: publishContestMock,
}));
vi.mock("@/lib/domain/contests/settlement-plan-runtime", () => ({
  generateSettlementPlan: generateSettlementPlanMock,
  previewSettlementPlan: previewSettlementPlanMock,
  executeSettlementPlan: executeSettlementPlanMock,
}));

import { POST as CREATE } from "@/app/api/internal/contest-configs/route";
import { POST as VALIDATE } from "@/app/api/internal/contest-configs/[contestId]/validate/route";
import { POST as PUBLISH } from "@/app/api/internal/contest-configs/[contestId]/publish/route";
import { POST as GENERATE_PLAN } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/generate/route";
import { GET as PREVIEW_PLAN } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/[planId]/preview/route";
import { POST as EXECUTE_PLAN } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/[planId]/execute/route";

describe("admin contest main flow contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: true });
    safeLogAdminActionMock.mockResolvedValue(undefined);
  });

  it("supports create -> validate -> publish -> generate/preview/execute plan sequence", async () => {
    createContestDraftMock.mockResolvedValue({ contest: { id: "c1" } });
    validateContestDraftMock.mockResolvedValue({ contestId: "c1", blocking: false, issues: [] });
    publishContestMock.mockResolvedValue({ contest: { id: "c1", configPublishedAt: "2026-03-12T00:00:00.000Z" } });
    generateSettlementPlanMock.mockResolvedValue({ planId: "sp1", contestId: "c1", status: "DRAFT" });
    previewSettlementPlanMock.mockResolvedValue({ planId: "sp1", contestId: "c1", totals: { usersCount: 12 }, rows: [] });
    executeSettlementPlanMock.mockResolvedValue({ executed: true, contestId: "c1", planId: "sp1", settlementId: "s1" });

    const createResponse = await CREATE(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "W1", title: "Week 1" }),
    }) as any);
    expect(createResponse.status).toBe(201);

    const validateResponse = await VALIDATE(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(validateResponse.status).toBe(200);

    const publishResponse = await PUBLISH(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(publishResponse.status).toBe(200);

    const generateResponse = await GENERATE_PLAN(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(generateResponse.status).toBe(200);

    const previewResponse = await PREVIEW_PLAN(new Request("http://localhost") as any, { params: { contestId: "c1", planId: "sp1" } });
    expect(previewResponse.status).toBe(200);

    const executeResponse = await EXECUTE_PLAN(new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "idem-1" },
    }) as any, { params: { contestId: "c1", planId: "sp1" } });
    expect(executeResponse.status).toBe(200);
  });
});
