"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  createRewardRuleDraft,
  describeRewardRule,
  toContestRewardPayload,
  type RewardRuleDraft,
} from "@/lib/admin/contest-reward-builder";

type CardSet = { id: string; code: string; displayName: string; isActive: boolean };
type RewardPackDefinition = { id: string; code: string; source: "SALE" | "REWARD"; plannedPackCount: number | null };

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
  const [rewardPackDefinitions, setRewardPackDefinitions] = useState<RewardPackDefinition[]>([]);
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

  const [pointsPoolEnabled, setPointsPoolEnabled] = useState(true);
  const [pointsPoolTopPercent, setPointsPoolTopPercent] = useState("25");
  const [pointsPoolAmount, setPointsPoolAmount] = useState("15000");

  const [packDefinitionId, setPackDefinitionId] = useState("");
  const [rank1PackQty, setRank1PackQty] = useState("3");
  const [rank2PackQty, setRank2PackQty] = useState("2");
  const [rank3PackQty, setRank3PackQty] = useState("1");

  const [bonusTopN, setBonusTopN] = useState("10");
  const [bonusPoints, setBonusPoints] = useState("500");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/internal/card-sets", { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { cardSets: CardSet[] };
      setCardSets(payload.cardSets ?? []);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/internal/pack-definitions", { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { packDefinitions: RewardPackDefinition[] };
      setRewardPackDefinitions(payload.packDefinitions ?? []);
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

      const distributionRules = contest.rewardPolicy?.distributionRules ?? [];
      const bundles = contest.rewardPolicy?.bundles ?? [];
      const bundleById = new Map(bundles.map((bundle: any) => [bundle.id, bundle]));

      const poolRule = distributionRules.find((item: any) => item.ruleType === "POINTS_POOL_TOP_PERCENT");
      if (poolRule) {
        setPointsPoolEnabled(true);
        setPointsPoolTopPercent(String(Math.floor(poolRule.topPercent ?? 25)));
        setPointsPoolAmount(String(Math.floor(poolRule.poolAmount ?? 15000)));
      }

      const packRows: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      for (const distRule of distributionRules) {
        if (distRule.ruleType !== "FIXED_RANKS" || distRule.rankFrom !== distRule.rankTo) continue;
        const bundle = bundleById.get(distRule.bundleId);
        const packComponent = bundle?.components?.find((component: any) => component.type === "PACK");
        if (!packComponent) continue;
        if ([1, 2, 3].includes(distRule.rankFrom)) {
          packRows[distRule.rankFrom] = packComponent.packQuantity ?? 0;
          if (!packDefinitionId) setPackDefinitionId(packComponent.packDefinitionId ?? "");
        }
      }

      if (packRows[1] > 0) setRank1PackQty(String(packRows[1]));
      if (packRows[2] > 0) setRank2PackQty(String(packRows[2]));
      if (packRows[3] > 0) setRank3PackQty(String(packRows[3]));

      const bonusRule = distributionRules.find((item: any) => item.ruleType === "TOP_N" && item.topN);
      if (bonusRule) {
        const bundle = bundleById.get(bonusRule.bundleId);
        const pointsComponent = bundle?.components?.find((component: any) => component.type === "POINTS");
        if (pointsComponent?.pointsAmount) {
          setBonusTopN(String(bonusRule.topN));
          setBonusPoints(String(pointsComponent.pointsAmount));
        }
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

  const rewardDraftRules = useMemo<RewardRuleDraft[]>(() => {
    const generated: RewardRuleDraft[] = [];

    const poolPercent = Number(pointsPoolTopPercent);
    const poolAmount = Number(pointsPoolAmount);
    if (pointsPoolEnabled && Number.isFinite(poolPercent) && Number.isFinite(poolAmount) && poolPercent > 0 && poolAmount > 0) {
      generated.push(createRewardRuleDraft({
        id: "pool-top-percent",
        label: "Points pool",
        rewardType: "POINTS",
        mode: "POOL",
        distributionType: "TOP_PERCENT",
        distributionValue: Math.floor(poolPercent),
        poolAmount: Math.floor(poolAmount),
      }));
    }

    const packRanks = [
      { rank: 1, qty: Number(rank1PackQty) },
      { rank: 2, qty: Number(rank2PackQty) },
      { rank: 3, qty: Number(rank3PackQty) },
    ];

    for (const row of packRanks) {
      if (!packDefinitionId || !Number.isFinite(row.qty) || row.qty <= 0) continue;
      generated.push(createRewardRuleDraft({
        id: `pack-rank-${row.rank}`,
        label: `Rank ${row.rank} packs`,
        rewardType: "PACK",
        mode: "FIXED",
        amount: Math.floor(row.qty),
        packDefinitionId,
        distributionType: "FIXED_RANKS",
        distributionValue: row.rank,
      }));
    }

    const bonusN = Number(bonusTopN);
    const bonus = Number(bonusPoints);
    if (Number.isFinite(bonusN) && Number.isFinite(bonus) && bonusN > 0 && bonus > 0) {
      generated.push(createRewardRuleDraft({
        id: "bonus-top-n",
        label: `Top ${Math.floor(bonusN)} bonus`,
        rewardType: "POINTS",
        mode: "FIXED",
        amount: Math.floor(bonus),
        distributionType: "TOP_N",
        distributionValue: Math.floor(bonusN),
      }));
    }

    return generated;
  }, [bonusPoints, bonusTopN, packDefinitionId, pointsPoolAmount, pointsPoolEnabled, pointsPoolTopPercent, rank1PackQty, rank2PackQty, rank3PackQty]);

  const rewardPayload = useMemo(() => toContestRewardPayload(rewardDraftRules), [rewardDraftRules]);

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
      rewardBundles: rewardPayload.rewardBundles,
      distributionRules: rewardPayload.distributionRules,
      ruleConfig: {
        rulesText: rulesText.trim() || null,
        infoNotes: [participationNotes.trim(), optionalClarifications.trim()].filter(Boolean).join("\n\n---\n\n") || null,
        coverImageUrl: coverImageUrl.trim() || null,
      },
    };
  }, [autoCode, cardSetId, code, coverImageUrl, description, eligibilityMode, endsAt, entryFeeAmount, entryFeeEnabled, maxRosterSize, openAt, optionalClarifications, participationNotes, rewardPayload.distributionRules, rewardPayload.rewardBundles, rulesText, startsAt, title]);

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
    if (payload.rewardBundles.length === 0) arr.push("Add at least one valid reward rule.");
    for (const invalidRule of rewardPayload.invalidRules) arr.push(invalidRule.message);
    return [...new Set(arr)];
  }, [autoCode, eligibilityMode, entryFeeEnabled, payload, rewardPayload.invalidRules]);

  const checklist = useMemo(() => {
    return [
      { label: "Contest name", done: Boolean(payload.title) },
      { label: "Schedule complete", done: Boolean(payload.openAt && payload.liveAt && payload.endsAt) },
      { label: "Entry rules valid", done: !(entryFeeEnabled && issues.some((issue) => issue.includes("Entry fee"))) },
      { label: "Rewards configured", done: payload.rewardBundles.length > 0 },
      { label: "No blocking issue", done: issues.length === 0 },
    ];
  }, [entryFeeEnabled, issues, payload]);

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
            <input className="input" placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
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
                <p className="contest-builder-v2-schedule-title">Points Pool</p>
                <label className="contest-inline-note"><input type="checkbox" checked={pointsPoolEnabled} onChange={(e) => setPointsPoolEnabled(e.target.checked)} /> Enable points pool</label>
                <input className="input" type="number" min={1} disabled={!pointsPoolEnabled} value={pointsPoolTopPercent} onChange={(e) => setPointsPoolTopPercent(e.target.value)} placeholder="Top % to share" />
                <input className="input" type="number" min={1} disabled={!pointsPoolEnabled} value={pointsPoolAmount} onChange={(e) => setPointsPoolAmount(e.target.value)} placeholder="Pool amount" />
                <p className="contest-inline-note">Top % winners share the pool. Remainder points are assigned from best rank downward.</p>
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Pack Rewards (Top 1/2/3)</p>
                <select className="input" value={packDefinitionId} onChange={(e) => setPackDefinitionId(e.target.value)}>
                  <option value="">Select reward pack</option>
                  {rewardPackDefinitions.map((pack) => <option key={pack.id} value={pack.id}>{pack.code}</option>)}
                </select>
                <input className="input" type="number" min={0} value={rank1PackQty} onChange={(e) => setRank1PackQty(e.target.value)} placeholder="Rank 1 packs" />
                <input className="input" type="number" min={0} value={rank2PackQty} onChange={(e) => setRank2PackQty(e.target.value)} placeholder="Rank 2 packs" />
                <input className="input" type="number" min={0} value={rank3PackQty} onChange={(e) => setRank3PackQty(e.target.value)} placeholder="Rank 3 packs" />
              </article>

              <article className="contest-builder-v2-entry-card">
                <p className="contest-builder-v2-schedule-title">Points Bonus</p>
                <input className="input" type="number" min={1} value={bonusTopN} onChange={(e) => setBonusTopN(e.target.value)} placeholder="Top N" />
                <input className="input" type="number" min={1} value={bonusPoints} onChange={(e) => setBonusPoints(e.target.value)} placeholder="Bonus points per winner" />
                <p className="contest-inline-note">Each qualifying rank receives the same bonus points.</p>
              </article>
            </div>

            {rewardPayload.invalidRules.length > 0 ? (
              <div className="admin-callout danger">
                <p className="contest-inline-note"><strong>Reward configuration issues</strong></p>
                {rewardPayload.invalidRules.map((rule) => <p key={rule.id} className="contest-inline-note">• {rule.message}</p>)}
              </div>
            ) : null}

            <div className="admin-callout">
              <p className="contest-inline-note"><strong>Generated rules preview</strong></p>
              {rewardDraftRules.length === 0
                ? <p className="contest-inline-note">No generated reward rule yet.</p>
                : rewardDraftRules.map((rule) => <p key={rule.id} className="contest-inline-note">• {describeRewardRule(rule)}</p>)}
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
                <p className="contest-inline-note"><strong>Rewards rules:</strong> {payload.rewardBundles.length}</p>
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
            <p className="contest-inline-note"><strong>Rewards rules:</strong> {payload.rewardBundles.length}</p>
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
