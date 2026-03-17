import { useEffect, useMemo, useState } from "react";

import { computeRewards } from "@/lib/domain/contests/reward-distribution";

import type { CardSet, ContestFormState, ContestWizardStep, ContestWizardStepId, RewardCapacityCheck } from "./types";

export const WIZARD_STEPS: ContestWizardStep[] = [
  { id: "identity", title: "Identity / Contest info" },
  { id: "schedule", title: "Schedule" },
  { id: "entry-rules", title: "Entry & Rules" },
  { id: "rewards", title: "Rewards" },
  { id: "review", title: "Review" },
];

const INITIAL_FORM: ContestFormState = {
  code: "",
  title: "",
  description: "",
  coverImageUrl: "",
  openAt: "",
  lockAt: "",
  durationValue: "24",
  durationUnit: "HOURS",
  entryFeeEnabled: false,
  entryFeeAmount: "10",
  maxRosterSize: "5",
  eligibilityMode: "ANY",
  cardSetId: "",
  rulesText: "",
  participationNotes: "",
  optionalClarifications: "",
  pointsPoolAmount: "0",
  packPoolAmount: "0",
  rewardedTopPercent: "25",
  distributionProfile: "balanced",
  previewParticipants: "100",
};

function toInputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}


export function generateContestCodeFromTitle(title: string) {
  return title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useContestWizard(initialContestId: string) {
  const [contestId, setContestId] = useState(initialContestId);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ContestFormState>(INITIAL_FORM);
  const [message, setMessage] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [rewardCapacityCheck, setRewardCapacityCheck] = useState<RewardCapacityCheck | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const derivedSchedule = useMemo(() => {
    const lockDate = form.lockAt ? new Date(form.lockAt) : null;
    const parsedValue = Number(form.durationValue);
    const unitHours = form.durationUnit === "DAYS" ? 24 : 1;
    const durationHours = Number.isFinite(parsedValue) ? parsedValue * unitHours : 0;
    const hasValidDuration = Number.isFinite(durationHours) && durationHours > 0;

    if (!lockDate || Number.isNaN(lockDate.getTime()) || !hasValidDuration) {
      return { liveAtIso: null as string | null, endsAtIso: null as string | null, endAtInput: "", durationHours: hasValidDuration ? durationHours : null as number | null };
    }

    const endsAtDate = new Date(lockDate.getTime() + durationHours * 3600000);
    const tz = endsAtDate.getTimezoneOffset() * 60000;
    return {
      liveAtIso: lockDate.toISOString(),
      endsAtIso: endsAtDate.toISOString(),
      endAtInput: new Date(endsAtDate.getTime() - tz).toISOString().slice(0, 16),
      durationHours,
    };
  }, [form.durationUnit, form.durationValue, form.lockAt]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/internal/card-sets", { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { cardSets: CardSet[] };
      setCardSets(payload.cardSets ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!contestId) return;
    void (async () => {
      const res = await fetch(`/api/internal/contest-configs/${contestId}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { contest: any };
      const contest = payload.contest;
      const rule = contest.rules?.[0];
      const ruleConfig = rule?.config ?? {};
      const rewardConfig = ruleConfig?.rewardConfig;
      const notes = typeof ruleConfig.infoNotes === "string" ? ruleConfig.infoNotes : "";
      const [participation = "", clarifications = ""] = notes.split("\n\n---\n\n");

      const startDate = contest.lockAt ? new Date(contest.lockAt) : (contest.liveAt ? new Date(contest.liveAt) : null);
      const endDate = contest.endsAt ? new Date(contest.endsAt) : null;
      const totalHours = startDate && endDate && endDate > startDate
        ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 3600000))
        : 24;
      const asDays = totalHours % 24 === 0;

      setForm((prev) => ({
        ...prev,
        code: contest.code ?? "",
        title: contest.title ?? "",
        description: contest.description ?? "",
        coverImageUrl: typeof ruleConfig.coverImageUrl === "string" ? ruleConfig.coverImageUrl : "",
        openAt: toInputDate(contest.openAt),
        lockAt: toInputDate(contest.lockAt),
        durationValue: String(asDays ? totalHours / 24 : totalHours),
        durationUnit: asDays ? "DAYS" : "HOURS",
        entryFeeEnabled: Boolean(rule?.entryFeeEnabled),
        entryFeeAmount: String(rule?.entryFeeAmount ?? 10),
        maxRosterSize: String(rule?.maxRosterSize ?? 5),
        eligibilityMode: rule?.eligibilityMode === "CARD_SET_ONLY" ? "CARD_SET_ONLY" : "ANY",
        cardSetId: rule?.cardSetId ?? "",
        rulesText: typeof ruleConfig.rulesText === "string" ? ruleConfig.rulesText : "",
        participationNotes: participation,
        optionalClarifications: clarifications,
        pointsPoolAmount: String((rewardConfig as any)?.pointsPool ?? 0),
        packPoolAmount: String((rewardConfig as any)?.packPool ?? 0),
        rewardedTopPercent: String((rewardConfig as any)?.rewardedTopPercent ?? 25),
        distributionProfile: ((rewardConfig as any)?.distributionProfile as ContestFormState["distributionProfile"]) ?? "balanced",
      }));
    })();
  }, [contestId]);


  useEffect(() => {
    const generatedCode = generateContestCodeFromTitle(form.title);
    setForm((prev) => (prev.code === generatedCode ? prev : { ...prev, code: generatedCode }));
  }, [form.title]);

  const payload = useMemo(() => {
    const parsedEntryFee = Number(form.entryFeeAmount);
    const parsedRosterSize = Number(form.maxRosterSize);
    const normalizedCode = generateContestCodeFromTitle(form.title) || form.code.trim().toUpperCase();
    return {
      code: normalizedCode,
      autoGenerateCode: false,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: "DRAFT",
      openAt: toIso(form.openAt),
      liveAt: derivedSchedule.liveAtIso,
      lockAt: toIso(form.lockAt),
      endsAt: derivedSchedule.endsAtIso,
      teamSizeMode: "EXACT",
      maxRosterSize: Number.isInteger(parsedRosterSize) ? parsedRosterSize : 0,
      eligibilityMode: form.eligibilityMode,
      cardSetId: form.eligibilityMode === "CARD_SET_ONLY" ? (form.cardSetId || null) : null,
      entryFeeEnabled: form.entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: form.entryFeeEnabled && Number.isInteger(parsedEntryFee) ? parsedEntryFee : null,
      rewardConfig: {
        pointsPool: Number(form.pointsPoolAmount) || 0,
        packPool: Number(form.packPoolAmount) || 0,
        rewardedTopPercent: Number(form.rewardedTopPercent) || 0,
        distributionProfile: form.distributionProfile,
      },
      rewardBundles: [],
      distributionRules: [],
      ruleConfig: {
        rulesText: form.rulesText.trim() || null,
        infoNotes: [form.participationNotes.trim(), form.optionalClarifications.trim()].filter(Boolean).join("\n\n---\n\n") || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
      },
    };
  }, [derivedSchedule.endsAtIso, derivedSchedule.liveAtIso, form]);

  const allIssues = useMemo(() => {
    const arr: string[] = [];
    if (!payload.code) arr.push("Contest code is required.");
    if (payload.code && !/^[A-Z0-9-]+$/.test(payload.code)) arr.push("Contest code must use only uppercase letters, numbers, and dashes.");
    if (!payload.title) arr.push("Contest name is required.");
    if (!payload.openAt) arr.push("Registration open date is required.");
    if (!payload.lockAt) arr.push("Lineup lock date is required.");
    if (!form.durationValue.trim()) arr.push("Contest duration is required.");
    if (!Number.isFinite(Number(form.durationValue)) || Number(form.durationValue) <= 0) arr.push("Contest duration must be a positive number.");
    if (!payload.liveAt) arr.push("Contest start (lineup lock) is required.");
    if (!payload.endsAt) arr.push("Contest end date is required (derived from lock + duration).");
    if (payload.openAt && payload.lockAt && payload.openAt >= payload.lockAt) arr.push("Lineup lock must be after registration open date.");
    if (payload.lockAt && payload.liveAt && payload.lockAt !== payload.liveAt) arr.push("Contest start is automatically aligned with lineup lock.");
    if (payload.liveAt && payload.endsAt && payload.liveAt >= payload.endsAt) arr.push("Contest end date must be after contest start.");
    if (!Number.isInteger(payload.maxRosterSize) || payload.maxRosterSize <= 0) arr.push("Roster size must be a positive integer.");
    if (form.entryFeeEnabled && (!Number.isInteger(payload.entryFeeAmount) || (payload.entryFeeAmount ?? 0) <= 0)) {
      arr.push("Entry fee amount must be a positive integer when enabled.");
    }
    if (form.eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId) arr.push("Select a card set when eligibility is restricted.");
    if (!Number.isInteger(payload.rewardConfig.pointsPool) || payload.rewardConfig.pointsPool < 0) arr.push("Points pool must be zero or a positive integer.");
    if (!Number.isInteger(payload.rewardConfig.packPool) || payload.rewardConfig.packPool < 0) arr.push("Pack pool must be zero or a positive integer.");
    if (payload.rewardConfig.pointsPool === 0 && payload.rewardConfig.packPool === 0) arr.push("Configure at least one reward pool (points or packs).");
    if (payload.rewardConfig.rewardedTopPercent < 1 || payload.rewardConfig.rewardedTopPercent > 100) arr.push("Rewarded top % must be between 1 and 100.");
    return [...new Set(arr)];
  }, [form.durationValue, form.eligibilityMode, form.entryFeeEnabled, payload]);

  const issuesByStep = useMemo(() => ({
    identity: allIssues.filter((issue) => issue.includes("code") || issue.includes("name") || issue.includes("title")),
    schedule: allIssues.filter((issue) => issue.includes("date") || issue.includes("end") || issue.includes("start") || issue.includes("lock") || issue.includes("duration")),
    "entry-rules": allIssues.filter((issue) => issue.includes("Entry fee") || issue.includes("card set") || issue.includes("Roster size") || issue.includes("eligibility")),
    rewards: allIssues.filter((issue) => issue.includes("pool") || issue.includes("Rewarded top")),
    review: allIssues,
  }), [allIssues]);

  const generatedPreview = useMemo(() => {
    const participantsCount = Math.max(0, Math.floor(Number(form.previewParticipants) || 0));
    const ranking = Array.from({ length: participantsCount }, (_, index) => `rank-${index + 1}`);
    const rows = computeRewards({ participantsCount, ranking, config: payload.rewardConfig });
    return {
      participantsCount,
      rows,
      totalPoints: rows.reduce((sum, row) => sum + row.pointsReward, 0),
      totalPacks: rows.reduce((sum, row) => sum + row.packsReward, 0),
    };
  }, [form.previewParticipants, payload.rewardConfig]);

  const checklist = useMemo(() => [
    { label: "Identity complete", done: Boolean(payload.title && payload.code) },
    { label: "Schedule complete", done: Boolean(payload.openAt && payload.lockAt && payload.liveAt && payload.endsAt) },
    { label: "Entry & rules valid", done: !allIssues.some((issue) => issue.includes("Entry fee") || issue.includes("card set") || issue.includes("Roster size") || issue.includes("eligibility")) },
    { label: "Rewards configured", done: payload.rewardConfig.pointsPool > 0 || payload.rewardConfig.packPool > 0 },
    { label: "No blocking issue", done: allIssues.length === 0 },
  ], [allIssues, payload]);

  const formatApiError = (body: unknown, fallback: string) => {
    const raw = body as { error?: string; issues?: Array<{ message?: string }> } | null;
    const apiIssues = Array.isArray(raw?.issues) ? raw.issues : [];
    if (apiIssues.length > 0) return `${raw?.error ?? fallback} — ${apiIssues.map((issue) => issue.message ?? "Invalid field").join("; ")}`;
    return raw?.error ?? fallback;
  };

  const saveDraft = async () => {
    const response = await fetch(contestId ? `/api/internal/contest-configs/${contestId}` : "/api/internal/contest-configs", {
      method: contestId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      setMessage(formatApiError(body, "Draft save failed"));
      return null;
    }

    const parsed = body as { contest?: { id?: string; code?: string } };
    if (!contestId && parsed?.contest?.id) setContestId(parsed.contest.id);
    if ((!form.code || !form.code.trim()) && parsed?.contest?.code) {
      setForm((prev) => ({ ...prev, code: parsed.contest?.code ?? prev.code }));
    }
    setMessage("Draft saved.");
    return parsed?.contest?.id ?? contestId;
  };

  const publishContest = async () => {
    let effectiveContestId = contestId;
    if (!effectiveContestId) {
      const createdId = await saveDraft();
      if (!createdId) return false;
      effectiveContestId = createdId;
    }

    const validationResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/validate`, { method: "POST" });
    const validation = (await validationResponse.json().catch(() => null)) as unknown;
    const parsedValidation = validation as { blocking?: boolean; rewardPackCapacity?: RewardCapacityCheck } | null;
    if (!validationResponse.ok || parsedValidation?.blocking) {
      setMessage(formatApiError(validation, "Backend validation failed"));
      return false;
    }

    setRewardCapacityCheck(parsedValidation?.rewardPackCapacity ?? null);

    const publishResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/publish`, { method: "POST" });
    const publish = (await publishResponse.json().catch(() => null)) as unknown;
    if (!publishResponse.ok) {
      setMessage(formatApiError(publish, "Publish failed"));
      return false;
    }

    setPublishSuccess(true);
    setMessage("Contest published successfully. Redirecting to Contest Library…");
    return true;
  };

  const uploadCoverImage = async (file: File | null) => {
    if (!file) return;
    setUploadBusy(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/internal/uploads/contest-cover", { method: "POST", body: formData });
      const body = (await response.json().catch(() => null)) as { url?: string; error?: string; detail?: string; warning?: string } | null;
      if (!response.ok || !body?.url) {
        const detail = body?.detail ? ` (${body.detail})` : "";
        setMessage(body?.error ? `${body.error}${detail}` : `Image upload failed (HTTP ${response.status})`);
        return;
      }
      setForm((prev) => ({ ...prev, coverImageUrl: body.url! }));
      setMessage(body.warning ?? "Cover image uploaded.");
    } finally {
      setUploadBusy(false);
    }
  };

  const setField = <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const currentStep = WIZARD_STEPS[stepIndex];
  const currentStepIssues = issuesByStep[currentStep.id as ContestWizardStepId] ?? [];

  return {
    contestId,
    stepIndex,
    setStepIndex,
    currentStep,
    cardSets,
    form,
    setField,
    payload,
    computedDurationHours: derivedSchedule.durationHours,
    computedEndAtInput: derivedSchedule.endAtInput,
    generatedPreview,
    allIssues,
    issuesByStep,
    currentStepIssues,
    checklist,
    message,
    setMessage,
    publishSuccess,
    rewardCapacityCheck,
    uploadBusy,
    saveDraft,
    publishContest,
    uploadCoverImage,
  };
}
