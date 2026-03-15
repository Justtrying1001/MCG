import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api-error";
import { createContestDraft, generateUniqueContestCode } from "@/lib/domain/contests/config-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

const createSchema = z.object({
  code: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().min(1).optional()),
  autoGenerateCode: z.boolean().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  liveAt: z.string().nullable().optional(),
  lockAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  entryFeeEnabled: z.boolean().optional(),
  entryFeeCurrency: z.literal("POINTS").optional(),
  entryFeeAmount: z.number().int().nullable().optional(),
  teamSizeMode: z.literal("EXACT").optional(),
  maxRosterSize: z.number().int().optional(),
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
}).superRefine((value, ctx) => {
  const asDate = (raw: string | null | undefined) => {
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const liveAt = asDate(value.liveAt);
  const lockAt = asDate(value.lockAt);
  const endsAt = asDate(value.endsAt);

  if (!value.autoGenerateCode && !value.code?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["code"], message: "code is required when autoGenerateCode is false" });
  }
  if (value.liveAt && !liveAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["liveAt"], message: "Invalid liveAt datetime" });
  }
  if (value.lockAt && !lockAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lockAt"], message: "Invalid lockAt datetime" });
  }
  if (value.endsAt && !endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Invalid endsAt datetime" });
  }
});

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const code = parsed.data.autoGenerateCode
      ? await generateUniqueContestCode(parsed.data.title)
      : parsed.data.code!.trim();

    const result = await createContestDraft({ ...parsed.data, code });
    return NextResponse.json({ ok: true, contest: result.contest }, { status: 201 });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot create contest draft");
  }
}
