import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  claimIdempotencyKeyMock,
  safeLogAdminActionMock,
  generateSettlementPlanMock,
  getSettlementPlanMock,
  previewSettlementPlanMock,
  executeSettlementPlanMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  generateSettlementPlanMock: vi.fn(),
  getSettlementPlanMock: vi.fn(),
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
vi.mock("@/lib/domain/contests/settlement-plan-runtime", () => ({
  generateSettlementPlan: generateSettlementPlanMock,
  getSettlementPlan: getSettlementPlanMock,
  previewSettlementPlan: previewSettlementPlanMock,
  executeSettlementPlan: executeSettlementPlanMock,
}));

import { POST as GENERATE } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/generate/route";
import { GET as GET_PLAN } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/[planId]/route";
import { GET as PREVIEW } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/[planId]/preview/route";
import { POST as EXECUTE } from "@/app/api/internal/contest-runs/[contestId]/settlement-plan/[planId]/execute/route";

describe("contest settlement plan internal routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: true });
    safeLogAdminActionMock.mockResolvedValue(undefined);
  });

  it("generates settlement plan", async () => {
    generateSettlementPlanMock.mockResolvedValue({ planId: "sp1", contestId: "c1", status: "DRAFT" });

    const response = await GENERATE(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.planId).toBe("sp1");
  });

  it("gets and previews settlement plan", async () => {
    getSettlementPlanMock.mockResolvedValue({ plan: { id: "sp1", contestId: "c1" } });
    previewSettlementPlanMock.mockResolvedValue({ planId: "sp1", contestId: "c1", rows: [] });

    const getResponse = await GET_PLAN(new Request("http://localhost") as any, { params: { contestId: "c1", planId: "sp1" } });
    const previewResponse = await PREVIEW(new Request("http://localhost") as any, { params: { contestId: "c1", planId: "sp1" } });

    expect(getResponse.status).toBe(200);
    expect(previewResponse.status).toBe(200);
  });

  it("requires idempotency key to execute", async () => {
    const response = await EXECUTE(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1", planId: "sp1" } });
    expect(response.status).toBe(400);
    expect(executeSettlementPlanMock).not.toHaveBeenCalled();
  });

  it("executes settlement plan with idempotency key", async () => {
    executeSettlementPlanMock.mockResolvedValue({ executed: true, contestId: "c1", planId: "sp1", settlementId: "s1" });

    const response = await EXECUTE(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "idem-1" } }) as any, {
      params: { contestId: "c1", planId: "sp1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.executed).toBe(true);
    expect(claimIdempotencyKeyMock).toHaveBeenCalled();
  });
});
