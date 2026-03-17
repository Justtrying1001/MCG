"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { computeRewards } from "@/lib/domain/contests/reward-distribution";

type CardSet = { id: string; code: string; displayName: string; isActive: boolean };
type RewardCapacityRow = {
  packDefinitionId: string;
  packCode: string | null;
  required: number;
  available: number;
  shortfall: number;
  verdict: "OK" | "INSUFFICIENT_SUPPLY" | "INVALID_REWARD_CONFIG" | "UNKNOWN_PACK" | "REWARD_POOL_MISSING";
};

type RewardCapacityCheck = {
  verdict: "OK" | "INSUFFICIENT_SUPPLY" | "INVALID_REWARD_CONFIG" | "UNKNOWN_PACK" | "REWARD_POOL_MISSING";
  isPublishable: boolean;
  rows: RewardCapacityRow[];
};

const BUILDER_STEPS = [
  { id: "identity", label: "Identity" },
  { id: "schedule", label: "Schedule" },
  { id: "entry", label: "Entry" },
  { id: "rewards", label: "Rewards" },
  { id: "rules", label: "Rules" },
  { id: "review", label: "Review" },
] as const;

export default function AdminContestBuilderPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [contestId, setContestId] = useState(params.get("contestId") ?? "");
  const [message, setMessage] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [rewardCapacityCheck, setRewardCapacityCheck] = useState<RewardCapacityCheck | null>(null);

  const [autoCode, setAutoCode] = useState(true);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [openAt, setOpenAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationHours, setDurationHours] = useState("24");

  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState("10");
  const [maxRosterSize, setMaxRosterSize] = useState("5");
  const [eligibilityMode, setEligibilityMode] = useState<"ANY" | "CARD_SET_ONLY">("ANY");
  const [cardSetId, setCardSetId] = useState("");

  const [rulesText, setRulesText] = useState("");
  const [participationNotes, setParticipationNotes] = useState("");
  const [optionalClarifications, setOptionalClarifications] = useState("");

  const [pointsPoolAmount, setPointsPoolAmount] = useState("0");
  const [packPoolAmount, setPackPoolAmount] = useState("0");
  const [rewardedTopPercent, setRewardedTopPercent] = useState("25");
  const [distributionProfile, setDistributionProfile] = useState<"balanced" | "top-heavy" | "very-top-heavy">("balanced");
  const [previewParticipants, setPreviewParticipants] = useState("100");
  const [uploadBusy, setUploadBusy] = useState(false);

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

      setCode(contest.code ?? "");
      setTitle(contest.title ?? "");
      setDescription(contest.description ?? "");
      setCoverImageUrl(typeof ruleConfig.coverImageUrl === "string" ? ruleConfig.coverImageUrl : "");
      setOpenAt(toInputDate(contest.openAt));
      setStartsAt(toInputDate(contest.liveAt));
      setDurationHours(String(getDurationHours(contest.liveAt, contest.endsAt) ?? 24));
      setEntryFeeEnabled(Boolean(rule?.entryFeeEnabled));
      setEntryFeeAmount(String(rule?.entryFeeAmount ?? 10));
      setMaxRosterSize(String(rule?.maxRosterSize ?? 5));
      setEligibilityMode(rule?.eligibilityMode === "CARD_SET_ONLY" ? "CARD_SET_ONLY" : "ANY");
      setCardSetId(rule?.cardSetId ?? "");
      setRulesText(typeof ruleConfig.rulesText === "string" ? ruleConfig.rulesText : "");
      const notes = typeof ruleConfig.infoNotes === "string" ? ruleConfig.infoNotes : "";
      const [participation = "", clarifications = ""] = notes.split("\n\n---\n\n");
      setParticipationNotes(participation);
      setOptionalClarifications(clarifications);

      const rewardConfig = ruleConfig?.rewardConfig;
      if (rewardConfig && typeof rewardConfig === "object") {
        setPointsPoolAmount(String((rewardConfig as any).pointsPool ?? 0));
        setPackPoolAmount(String((rewardConfig as any).packPool ?? 0));
        setRewardedTopPercent(String((rewardConfig as any).rewardedTopPercent ?? 25));
        setDistributionProfile(((rewardConfig as any).distributionProfile as "balanced" | "top-heavy" | "very-top-heavy") ?? "balanced");
      }

      setAutoCode(false);
    })();
  }, [contestId]);

  const endsAt = useMemo(() => {
    if (!startsAt) return "";
    const parsedDuration = Number(durationHours);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return "";
    return new Date(new Date(startsAt).getTime() + parsedDuration * 60 * 60 * 1000).toISOString();
  }, [durationHours, startsAt]);


  const payload = useMemo(() => {
    const parsedEntryFee = Number(entryFeeAmount);
    return {
      code: autoCode ? undefined : code.trim(),
      autoGenerateCode: autoCode,
      title: title.trim(),
      description: description.trim() || null,
      status: "DRAFT",
      openAt: toIso(openAt),
      liveAt: toIso(startsAt),
      lockAt: toIso(startsAt),
      endsAt: endsAt || null,
      teamSizeMode: "EXACT",
      maxRosterSize: Number(maxRosterSize) || 5,
      eligibilityMode,
      cardSetId: eligibilityMode === "CARD_SET_ONLY" ? (cardSetId || null) : null,
      entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: entryFeeEnabled && Number.isInteger(parsedEntryFee) ? parsedEntryFee : null,
      rewardConfig: {
        pointsPool: Number(pointsPoolAmount) || 0,
        packPool: Number(packPoolAmount) || 0,
        rewardedTopPercent: Number(rewardedTopPercent) || 0,
        distributionProfile,
      },
      rewardBundles: [],
      distributionRules: [],
      ruleConfig: {
        rulesText: rulesText.trim() || null,
        infoNotes: [participationNotes.trim(), optionalClarifications.trim()].filter(Boolean).join("\n\n---\n\n") || null,
        coverImageUrl: coverImageUrl.trim() || null,
      },
    };
  }, [autoCode, cardSetId, code, coverImageUrl, description, distributionProfile, eligibilityMode, endsAt, entryFeeAmount, entryFeeEnabled, maxRosterSize, openAt, optionalClarifications, packPoolAmount, participationNotes, pointsPoolAmount, rewardedTopPercent, rulesText, startsAt, title]);

  const issues = useMemo(() => {
    const arr: string[] = [];
    if (!autoCode && !payload.code) arr.push("Internal code is required when auto code is disabled.");
    if (!payload.title) arr.push("Contest name is required.");
    if (!payload.openAt) arr.push("Registration open date is required.");
    if (!payload.liveAt) arr.push("Contest start date is required.");
    if (!payload.endsAt) arr.push("Contest duration must define an end date.");
    if (payload.openAt && payload.liveAt && payload.openAt > payload.liveAt) arr.push("Registration open date must be before contest start.");
    if (payload.liveAt && payload.endsAt && payload.liveAt >= payload.endsAt) arr.push("Contest end must be after start.");
    if (entryFeeEnabled && (!Number.isInteger(payload.entryFeeAmount) || (payload.entryFeeAmount ?? 0) <= 0)) {
      arr.push("Entry fee amount must be a positive integer when enabled.");
    }
    if (eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId) arr.push("Select a card set when eligibility is restricted.");
    if (!Number.isInteger(payload.rewardConfig.pointsPool) || payload.rewardConfig.pointsPool < 0) arr.push("Points pool must be zero or a positive integer.");
    if (!Number.isInteger(payload.rewardConfig.packPool) || payload.rewardConfig.packPool < 0) arr.push("Pack pool must be zero or a positive integer.");
    if (payload.rewardConfig.pointsPool === 0 && payload.rewardConfig.packPool === 0) arr.push("Configure at least one reward pool (points or packs).");
    if (payload.rewardConfig.rewardedTopPercent < 1 || payload.rewardConfig.rewardedTopPercent > 100) arr.push("Rewarded top % must be between 1 and 100.");
    return [...new Set(arr)];
  }, [autoCode, eligibilityMode, entryFeeEnabled, payload]);

  const checklist = useMemo(() => {
    return [
      { label: "Contest name", done: Boolean(payload.title) },
      { label: "Schedule complete", done: Boolean(payload.openAt && payload.liveAt && payload.endsAt) },
      { label: "Entry rules valid", done: !(entryFeeEnabled && issues.some((issue) => issue.includes("Entry fee"))) },
      { label: "Rewards configured", done: payload.rewardConfig.pointsPool > 0 || payload.rewardConfig.packPool > 0 },
      { label: "No blocking issue", done: issues.length === 0 },
    ];
  }, [entryFeeEnabled, issues, payload]);

  const generatedPreview = useMemo(() => {
    const participantsCount = Math.max(0, Math.floor(Number(previewParticipants) || 0));
    const ranking = Array.from({ length: participantsCount }, (_, index) => `rank-${index + 1}`);
    const rows = computeRewards({ participantsCount, ranking, config: payload.rewardConfig });
    return {
      participantsCount,
      rows,
      totalPoints: rows.reduce((sum, row) => sum + row.pointsReward, 0),
      totalPacks: rows.reduce((sum, row) => sum + row.packsReward, 0),
    };
  }, [payload.rewardConfig, previewParticipants]);

  const formatApiError = (body: unknown, fallback: string) => {
    const raw = body as { error?: string; issues?: Array<{ message?: string }> } | null;
    const apiIssues = Array.isArray(raw?.issues) ? raw.issues : [];
    if (apiIssues.length > 0) {
      return `${raw?.error ?? fallback} — ${apiIssues.map((issue) => issue.message ?? "Invalid field").join("; ")}`;
    }
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
    if (!code && parsed?.contest?.code) setCode(parsed.contest.code);
    setMessage("Draft saved.");
    return parsed?.contest?.id ?? contestId;
  };

  const launch = async () => {
    let effectiveContestId = contestId;
    if (!effectiveContestId) {
      const createdId = await saveDraft();
      if (!createdId) return;
      effectiveContestId = createdId;
    }

    const validationResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/validate`, { method: "POST" });
    const validation = (await validationResponse.json().catch(() => null)) as unknown;
    const parsedValidation = validation as { blocking?: boolean; rewardPackCapacity?: RewardCapacityCheck } | null;

    if (!validationResponse.ok || parsedValidation?.blocking) {
      setMessage(formatApiError(validation, "Backend validation failed"));
      return;
    }

    setRewardCapacityCheck(parsedValidation?.rewardPackCapacity ?? null);

    const publishResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/publish`, { method: "POST" });
    const publish = (await publishResponse.json().catch(() => null)) as unknown;
    if (!publishResponse.ok) {
      setMessage(formatApiError(publish, "Publish failed"));
      return;
    }

    setPublishSuccess(true);
    setMessage("Contest published successfully. Redirecting to Contest Library…");
    window.setTimeout(() => {
      router.push("/admin/contests?published=1");
    }, 1200);
  };

  const uploadCoverImage = async (file: File | null) => {
    if (!file) return;
    setUploadBusy(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/internal/uploads/contest-cover", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !body?.url) {
        setMessage(body?.error ?? "Image upload failed");
        return;
      }

      setCoverImageUrl(body.url);
      setMessage("Cover image uploaded.");
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="admin-v2-page contest-builder-v2-page">
      <section className="contest-builder-v2-header">
        <div>
          <p className="contest-builder-v2-eyebrow">Contest Builder</p>
          <h1 className="admin-title">{contestId ? "Edit contest" : "Create contest"}</h1>
          <p className="admin-subtitle">Guided flow to configure identity, timing, entry rules, rewards and publication in one clear workspace.</p>
        </div>
        <Link href="/admin/contests" className="admin-v2-link-chip">← Back to Contest Library</Link>
      </section>

      <nav className="contest-builder-v2-stepper" aria-label="Contest builder steps">
        {BUILDER_STEPS.map((step) => (
          <a key={step.id} href={`#${step.id}`} className="contest-builder-v2-step-pill">{step.label}</a>
        ))}
      </nav>

      {publishSuccess ? (
        <div className="admin-callout success">
          <p className="contest-inline-note"><strong>Contest published successfully.</strong> It is now visible in Contest Library and ready for user-facing surfaces.</p>
        </div>
      ) : null}

      <section className="contest-builder-v2-layout">
        <div className="contest-builder-v2-main">
          <section id="identity" className="admin-panel contest-builder-v2-section">
            <header>
              <h2 className="admin-section-title">1. Identity</h2>
              <p className="contest-inline-note">Define how the contest is recognized by admins and players.</p>
            </header>
            <label className="contest-inline-note"><input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} /> Auto-generate internal code</label>
            <div className="admin-field-grid">
              <input className="input" disabled={autoCode} placeholder="CONTEST-APR26" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <input className="input" placeholder="Contest name" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <textarea className="input" placeholder="Description shown in admin and contest cards" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="contest-builder-v2-upload-wrap">
              <input
                className="input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploadBusy}
                onChange={(e) => void uploadCoverImage(e.target.files?.[0] ?? null)}
              />
              <input className="input" placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
              {coverImageUrl ? <img src={coverImageUrl} alt="Contest cover preview" className="contest-builder-v2-cover-preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }} /> : null}
            </div>
          </section>

          <section id="schedule" className="admin-panel contest-builder-v2-section">
            <header>
              <h2 className="admin-section-title">2. Schedule</h2>
              <p className="contest-inline-note">Contest timing follows business lifecycle and controls player actions.</p>
            </header>

            <div className="contest-builder-v2-schedule-grid">
              <article className="contest-builder-v2-schedule-card">
                <p className="contest-builder-v2-schedule-title">Registration opens</p>
                <p className="contest-inline-note">Players can register and edit lineup.</p>
                <input className="input" type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
              </article>

              <article className="contest-builder-v2-schedule-card">
                <p className="contest-builder-v2-schedule-title">Contest starts / Team lock</p>
                <p className="contest-inline-note">Lineups lock and contest starts immediately.</p>
                <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </article>

              <article className="contest-builder-v2-schedule-card">
                <p className="contest-builder-v2-schedule-title">Duration</p>
                <p className="contest-inline-note">Defines how long the contest runs.</p>
                <input className="input" type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
              </article>

              <article className="contest-builder-v2-schedule-card is-result">
                <p className="contest-builder-v2-schedule-title">Contest ends (auto-calculated)</p>
                <p className="contest-inline-note">Derived from start + duration.</p>
                <p className="contest-builder-v2-end-value">{endsAt ? new Date(endsAt).toLocaleString() : "—"}</p>
              </article>
            </div>
          </section>

          <section id="entry" className="admin-panel contest-builder-v2-section">
            <header>
              <h2 className="admin-section-title">3. Entry Rules</h2>
              <p className="contest-inline-note">Set participation economy, lineup size and eligibility restrictions.</p>
            </header>

            <div className="contest-builder-v2-entry-grid">
              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Entry fee</p>
                <label className="contest-inline-note"><input type="checkbox" checked={entryFeeEnabled} onChange={(e) => setEntryFeeEnabled(e.target.checked)} /> Enable entry fee</label>
                <input className="input" type="number" min={1} disabled={!entryFeeEnabled} value={entryFeeAmount} onChange={(e) => setEntryFeeAmount(e.target.value)} />
                <p className="contest-inline-note">Currency: POINTS</p>
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Team size</p>
                <select className="input" value={maxRosterSize} onChange={(e) => setMaxRosterSize(e.target.value)}>
                  <option value="3">3 cards</option>
                  <option value="5">5 cards</option>
                  <option value="7">7 cards</option>
                </select>
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Eligibility</p>
                <select className="input" value={eligibilityMode} onChange={(e) => setEligibilityMode(e.target.value as "ANY" | "CARD_SET_ONLY") }>
                  <option value="ANY">Any eligible card</option>
                  <option value="CARD_SET_ONLY">Specific card set only</option>
                </select>
                {eligibilityMode === "CARD_SET_ONLY" ? (
                  <select className="input" value={cardSetId} onChange={(e) => setCardSetId(e.target.value)}>
                    <option value="">Select card set</option>
                    {cardSets.map((set) => <option key={set.id} value={set.id}>{set.displayName} ({set.code})</option>)}
                  </select>
                ) : null}
              </article>
            </div>
          </section>

          <section id="rewards" className="admin-panel contest-builder-v2-section">
            <header>
              <h2 className="admin-section-title">4. Rewards</h2>
              <p className="contest-inline-note">Configure cumulative reward layers: points pool, rank packs and bonus points.</p>
            </header>

            <div className="contest-builder-v2-entry-grid">
              <article className="contest-builder-v2-entry-card">
              <p className="contest-builder-v2-schedule-title">Points pool</p>
                <input className="input" type="number" min={0} value={pointsPoolAmount} onChange={(e) => setPointsPoolAmount(e.target.value)} placeholder="Total points" />
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Pack pool</p>
                <input className="input" type="number" min={0} value={packPoolAmount} onChange={(e) => setPackPoolAmount(e.target.value)} placeholder="Total packs" />
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Rewarded top %</p>
                <input className="input" type="number" min={1} max={100} value={rewardedTopPercent} onChange={(e) => setRewardedTopPercent(e.target.value)} placeholder="1-100" />
                <select className="input" value={distributionProfile} onChange={(e) => setDistributionProfile(e.target.value as "balanced" | "top-heavy" | "very-top-heavy") }>
                  <option value="balanced">Balanced</option>
                  <option value="top-heavy">Top-heavy</option>
                  <option value="very-top-heavy">Very top-heavy</option>
                </select>
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Distribution preview field size</p>
                <input className="input" type="number" min={0} value={previewParticipants} onChange={(e) => setPreviewParticipants(e.target.value)} />
                <p className="contest-inline-note">Used only for previewing exact rank-by-rank payouts.</p>
              </article>
            </div>

            <div className="admin-callout" style={{ marginTop: 12 }}>
              <p className="contest-inline-note"><strong>Generated distribution preview</strong></p>
              <p className="contest-inline-note">Participants: {generatedPreview.participantsCount} · Winners: {generatedPreview.rows.length}</p>
              {generatedPreview.participantsCount < 2 ? (
                <p className="contest-inline-note">At least 2 participants are required for top-% reward distribution.</p>
              ) : null}
              <p className="contest-inline-note">Total points: {generatedPreview.totalPoints.toLocaleString()} · Total packs: {generatedPreview.totalPacks.toLocaleString()}</p>
              <div style={{ display: "grid", gap: 4, maxHeight: 220, overflow: "auto", marginTop: 8 }}>
                {generatedPreview.rows.slice(0, 50).map((row) => (
                  <p key={row.rank} className="contest-inline-note">
                    Rank #{row.rank} → {row.packsReward} pack{row.packsReward > 1 ? "s" : ""} + {row.pointsReward.toLocaleString()} pts
                  </p>
                ))}
                {generatedPreview.rows.length > 50 ? <p className="contest-inline-note">…and {generatedPreview.rows.length - 50} more ranks.</p> : null}
              </div>
            </div>
          </section>

          <section id="rules" className="admin-panel contest-builder-v2-section">
            <header>
              <h2 className="admin-section-title">5. Rules & Info</h2>
              <p className="contest-inline-note">Improve player-facing clarity with explicit rules and participation notes.</p>
            </header>
            <textarea className="input" placeholder="Rules shown to players" value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
            <textarea className="input" placeholder="Participation notes (entry, lock, restrictions)" value={participationNotes} onChange={(e) => setParticipationNotes(e.target.value)} />
            <textarea className="input" placeholder="Optional clarifications (scoring quirks, FAQ hints)" value={optionalClarifications} onChange={(e) => setOptionalClarifications(e.target.value)} />
          </section>

          <section id="review" className="admin-panel contest-builder-v2-section contest-builder-v2-review">
            <header>
              <h2 className="admin-section-title">6. Review & Publish</h2>
              <p className="contest-inline-note">Final validation before making contest visible to users.</p>
            </header>

            <div className="contest-builder-v2-review-grid">
              <div className="admin-callout">
                <p className="contest-inline-note"><strong>Name:</strong> {payload.title || "—"}</p>
                <p className="contest-inline-note"><strong>Schedule:</strong> Open {payload.openAt || "—"} · Start/Lock {payload.liveAt || "—"} · End {payload.endsAt || "—"}</p>
                <p className="contest-inline-note"><strong>Entry:</strong> Team size {payload.maxRosterSize} · Entry fee {entryFeeEnabled ? `${payload.entryFeeAmount ?? 0} POINTS` : "Disabled"}</p>
                <p className="contest-inline-note"><strong>Rewards model:</strong> Simple pool</p>
              </div>

              {issues.length > 0 ? (
                <div className="admin-callout danger">
                  <p className="contest-inline-note"><strong>Blocking issues</strong></p>
                  {issues.map((issue) => <p key={issue} className="contest-inline-note">• {issue}</p>)}
                </div>
              ) : (
                <div className="admin-callout">
                  <p className="contest-inline-note"><strong>Ready to publish</strong> — no blocking issue detected.</p>
                </div>
              )}
            </div>

            {rewardCapacityCheck ? (
              <div className="admin-callout">
                <p className="contest-inline-note"><strong>Reward capacity:</strong> {rewardCapacityCheck.verdict}</p>
                {rewardCapacityCheck.rows.map((row) => <p key={row.packDefinitionId} className="contest-inline-note">{row.packCode ?? row.packDefinitionId}: required {row.required}, available {row.available}</p>)}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="contest-builder-v2-summary">
          <div className="contest-builder-v2-summary-card">
            <h3>Live summary</h3>
            <p className="contest-inline-note"><strong>Contest:</strong> {payload.title || "Untitled"}</p>
            <p className="contest-inline-note"><strong>Open:</strong> {payload.openAt ? new Date(payload.openAt).toLocaleString() : "—"}</p>
            <p className="contest-inline-note"><strong>Start:</strong> {payload.liveAt ? new Date(payload.liveAt).toLocaleString() : "—"}</p>
            <p className="contest-inline-note"><strong>End:</strong> {payload.endsAt ? new Date(payload.endsAt).toLocaleString() : "—"}</p>
            <p className="contest-inline-note"><strong>Team size:</strong> {payload.maxRosterSize}</p>
            <p className="contest-inline-note"><strong>Entry fee:</strong> {entryFeeEnabled ? `${payload.entryFeeAmount ?? 0} POINTS` : "Disabled"}</p>
            <p className="contest-inline-note"><strong>Rewards model:</strong> Simple pool</p>
          </div>

          <div className="contest-builder-v2-summary-card">
            <h3>Validation checklist</h3>
            {checklist.map((item) => (
              <p key={item.label} className="contest-inline-note">{item.done ? "✓" : "•"} {item.label}</p>
            ))}
            {issues.length > 0 ? <p className="contest-error">{issues.length} blocking issue(s)</p> : <p className="contest-inline-note">No blocking issue</p>}
          </div>

          <div className="contest-builder-v2-summary-card">
            <h3>Actions</h3>
            {message ? <p className="contest-inline-note">{message}</p> : <p className="contest-inline-note">Save draft any time, then publish when checklist is green.</p>}
            <div className="contest-builder-v2-actions">
              <Button variant="ghost" disabled={issues.length > 0} onClick={() => void saveDraft()}>Save draft</Button>
              <Button onClick={() => void launch()} disabled={publishSuccess || issues.length > 0}>Publish contest</Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

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

function getDurationHours(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null;
  const delta = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (delta <= 0) return null;
  return Math.round(delta / 3600000);
}
