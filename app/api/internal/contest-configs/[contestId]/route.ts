import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api-error";
import { getContestDraft, updateContestDraft } from "@/lib/domain/contests/config-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

const patchSchema = z.object({
  code: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  liveAt: z.string().nullable().optional(),
  lockAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  entryFeeEnabled: z.boolean().optional(),
  entryFeeCurrency: z.literal("POINTS").optional(),
  entryFeeAmount: z.number().int().nullable().optional(),
  teamSizeMode: z.literal("EXACT").optional(),
  teamSizeValue: z.number().int().optional(),
  eligibilityMode: z.enum(["ANY", "CARD_SET_ONLY"]).optional(),
  cardSetId: z.string().nullable().optional(),
  rewardBundles: z.array(z.object({
    name: z.string(),
    priority: z.number().int().optional(),
    components: z.array(z.object({
      type: z.enum(["POINTS", "PACK", "XP"]),
      pointsAmount: z.number().int().optional(),
      xpAmount: z.number().int().optional(),
      packDefinitionId: z.string().nullable().optional(),
      packQuantity: z.number().int().optional(),
    })),
  })).optional(),
  distributionRules: z.array(z.object({
    priority: z.number().int(),
    ruleType: z.enum(["FIXED_RANKS", "TOP_N", "TOP_PERCENT"]),
    bundleRef: z.string(),
    rankFrom: z.number().int().optional(),
    rankTo: z.number().int().optional(),
    topN: z.number().int().optional(),
    topPercent: z.number().optional(),
  })).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Patch payload cannot be empty" }).superRefine((value, ctx) => {
  const asDate = (raw: string | null | undefined) => {
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  if (value.liveAt && !asDate(value.liveAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["liveAt"], message: "Invalid liveAt datetime" });
  }
  if (value.lockAt && !asDate(value.lockAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lockAt"], message: "Invalid lockAt datetime" });
  }
  if (value.endsAt && !asDate(value.endsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Invalid endsAt datetime" });
  }
});

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await getContestDraft(params.contestId);
    return NextResponse.json({ ok: true, contest: result.contest });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot load contest draft");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const result = await updateContestDraft(params.contestId, parsed.data);
    return NextResponse.json({ ok: true, contest: result.contest });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot update contest draft");
  }
}
