"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { createRewardRuleDraft, describeRewardRule, rewardRuleReducer, toContestRewardPayload, type DistributionType, type RewardRuleDraft, type RewardType } from "@/lib/admin/contest-reward-builder";

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

const DEFAULT_REWARD_RULES: RewardRuleDraft[] = [
  createRewardRuleDraft({ id: "seed-r1", label: "Rank 1", rewardType: "POINTS", amount: 1000, distributionType: "FIXED_RANKS", distributionValue: 1 }),
  createRewardRuleDraft({ id: "seed-r2", label: "Rank 2", rewardType: "POINTS", amount: 500, distributionType: "FIXED_RANKS", distributionValue: 2 }),
  createRewardRuleDraft({ id: "seed-r3", label: "Rank 3", rewardType: "POINTS", amount: 250, distributionType: "FIXED_RANKS", distributionValue: 3 }),
];

export default function AdminContestBuilderPage() {
  const params = useSearchParams();
  const [contestId, setContestId] = useState(params.get("contestId") ?? "");
  const [message, setMessage] = useState("");
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
  const [infoNotes, setInfoNotes] = useState("");

  const [rules, dispatchRules] = useReducer(rewardRuleReducer, DEFAULT_REWARD_RULES);

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
      const payload = (await res.json()) as any;
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
      setInfoNotes(typeof ruleConfig.infoNotes === "string" ? ruleConfig.infoNotes : "");
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
    const rewardPayload = toContestRewardPayload(rules);
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
        infoNotes: infoNotes.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
      },
    };
  }, [autoCode, cardSetId, code, coverImageUrl, description, eligibilityMode, endsAt, entryFeeAmount, entryFeeEnabled, infoNotes, maxRosterSize, openAt, rules, rulesText, startsAt, title]);

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
    return arr;
  }, [autoCode, eligibilityMode, entryFeeEnabled, payload]);

  const formatApiError = (body: any, fallback: string) => {
    const apiIssues = Array.isArray(body?.issues) ? body.issues : [];
    if (apiIssues.length > 0) {
      return `${body?.error ?? fallback} — ${apiIssues.map((issue: { message?: string }) => issue.message).join("; ")}`;
    }
    return body?.error ?? fallback;
  };

  const saveDraft = async () => {
    const response = await fetch(contestId ? `/api/internal/contest-configs/${contestId}` : "/api/internal/contest-configs", {
      method: contestId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as any;
    if (!response.ok) {
      setMessage(formatApiError(body, "Draft save failed"));
      return null;
    }

    if (!contestId && body?.contest?.id) setContestId(body.contest.id);
    if (!code && body?.contest?.code) setCode(body.contest.code);
    setMessage("Draft saved.");
    return body?.contest?.id ?? contestId;
  };

  const launch = async () => {
    let effectiveContestId = contestId;
    if (!effectiveContestId) {
      const createdId = await saveDraft();
      if (!createdId) return;
      effectiveContestId = createdId;
    }

    const validationResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/validate`, { method: "POST" });
    const validation = (await validationResponse.json().catch(() => null)) as any;
    if (!validationResponse.ok || validation?.blocking) {
      setMessage(formatApiError(validation, "Backend validation failed"));
      return;
    }

    setRewardCapacityCheck((validation?.rewardPackCapacity ?? null) as RewardCapacityCheck | null);

    const publishResponse = await fetch(`/api/internal/contest-configs/${effectiveContestId}/publish`, { method: "POST" });
    const publish = (await publishResponse.json().catch(() => null)) as any;
    if (!publishResponse.ok) {
      setMessage(formatApiError(publish, "Publish failed"));
      return;
    }

    setMessage("Contest published successfully.");
  };

  return (
    <div className="admin-page admin-v2-page contest-builder-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">{contestId ? "Contest Builder · Edit" : "Contest Builder · Create"}</h1>
          <p className="admin-subtitle">Simple product flow: Identity → Schedule → Entry Rules → Rewards → Rules & Info → Review & Publish.</p>
        </div>
        <Link href="/admin/contests" className="contest-inline-note">← Back to Contest Library</Link>
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">1. Identity</h2>
        <div className="admin-actions-row"><label><input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} /> Auto-generate internal code</label></div>
        <div className="admin-field-grid">
          <input className="input" disabled={autoCode} placeholder="CONTEST-APR26" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <input className="input" placeholder="Contest name" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <textarea className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input" placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">2. Schedule</h2>
        <p className="contest-inline-note">Open = players can register/update their team. Start = team lock + contest starts immediately.</p>
        <div className="admin-field-grid">
          <div><label className="contest-inline-note">Registration opens</label><input className="input" type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} /></div>
          <div><label className="contest-inline-note">Contest starts (team lock)</label><input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
          <div><label className="contest-inline-note">Duration (hours)</label><input className="input" type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} /></div>
        </div>
        <p className="contest-inline-note"><strong>Contest ends:</strong> {endsAt ? new Date(endsAt).toLocaleString() : "—"}</p>
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">3. Entry Rules</h2>
        <div className="admin-field-grid">
          <label><input type="checkbox" checked={entryFeeEnabled} onChange={(e) => setEntryFeeEnabled(e.target.checked)} /> Entry fee enabled</label>
          <input className="input" type="number" min={1} disabled={!entryFeeEnabled} value={entryFeeAmount} onChange={(e) => setEntryFeeAmount(e.target.value)} />
          <select className="input" value={maxRosterSize} onChange={(e) => setMaxRosterSize(e.target.value)}><option value="3">3 cards</option><option value="5">5 cards</option><option value="7">7 cards</option></select>
          <select className="input" value={eligibilityMode} onChange={(e) => setEligibilityMode(e.target.value as "ANY" | "CARD_SET_ONLY")}><option value="ANY">Any eligible card</option><option value="CARD_SET_ONLY">Specific card set only</option></select>
          {eligibilityMode === "CARD_SET_ONLY" ? <select className="input" value={cardSetId} onChange={(e) => setCardSetId(e.target.value)}><option value="">Select card set</option>{cardSets.map((set) => <option key={set.id} value={set.id}>{set.displayName} ({set.code})</option>)}</select> : null}
        </div>
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">4. Rewards</h2>
        {rules.map((rule) => (
          <article key={rule.id} className="contest-reward-rule-card">
            <input className="input" value={rule.label} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { label: e.target.value } })} />
            <div className="admin-field-grid">
              <select className="input" value={rule.rewardType} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { rewardType: e.target.value as RewardType } })}><option value="POINTS">Points</option><option value="XP">XP</option><option value="PACK">Pack</option></select>
              <input className="input" type="number" min={1} value={rule.amount} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { amount: Number(e.target.value) } })} />
              <select className="input" value={rule.distributionType} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { distributionType: e.target.value as DistributionType } })}><option value="FIXED_RANKS">Exact rank</option><option value="TOP_N">Top N</option><option value="TOP_PERCENT">Top %</option></select>
              <input className="input" type="number" min={1} value={rule.distributionValue} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { distributionValue: Number(e.target.value) } })} />
            </div>
            <p className="contest-inline-note">{describeRewardRule(rule)}</p>
          </article>
        ))}
        <Button onClick={() => dispatchRules({ type: "add" })}>Add reward rule</Button>
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">5. Rules & Info</h2>
        <textarea className="input" placeholder="Rules text shown to players" value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
        <textarea className="input" placeholder="Participation notes / useful info" value={infoNotes} onChange={(e) => setInfoNotes(e.target.value)} />
      </section>

      <section className="admin-panel admin-section-stack">
        <h2 className="admin-section-title">6. Review & Publish</h2>
        <div className="admin-callout">
          <p className="contest-inline-note"><strong>Name:</strong> {payload.title || "—"}</p>
          <p className="contest-inline-note"><strong>Schedule:</strong> Open {payload.openAt || "—"} · Start/Lock {payload.liveAt || "—"} · End {payload.endsAt || "—"}</p>
          <p className="contest-inline-note"><strong>Entry:</strong> Team size {payload.maxRosterSize} · Entry fee {entryFeeEnabled ? `${payload.entryFeeAmount ?? 0} POINTS` : "Disabled"}</p>
          <p className="contest-inline-note"><strong>Rewards rules:</strong> {payload.rewardBundles.length}</p>
        </div>

        {issues.length > 0 ? <div className="admin-callout danger">{issues.map((issue) => <p key={issue} className="contest-inline-note">• {issue}</p>)}</div> : <div className="admin-callout"><p className="contest-inline-note">No blocking issue detected.</p></div>}

        {rewardCapacityCheck ? (
          <div className="admin-callout">
            <p className="contest-inline-note"><strong>Reward capacity:</strong> {rewardCapacityCheck.verdict}</p>
            {rewardCapacityCheck.rows.map((row) => <p key={row.packDefinitionId} className="contest-inline-note">{row.packCode ?? row.packDefinitionId}: required {row.required}, available {row.available}</p>)}
          </div>
        ) : null}

        {message ? <p className="contest-inline-note">{message}</p> : null}

        <div className="contest-wizard-footer">
          <Button variant="ghost" onClick={() => void saveDraft()}>Save draft</Button>
          <Button onClick={() => void launch()} disabled={issues.length > 0}>Publish contest</Button>
        </div>
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
