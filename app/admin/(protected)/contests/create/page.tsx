"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { createRewardRuleDraft, describeRewardRule, rewardRuleReducer, toContestRewardPayload, type DistributionType, type RewardRuleDraft, type RewardType } from "@/lib/admin/contest-reward-builder";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
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

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 1, label: "Infos contest", hint: "Code, titre, description" },
  { id: 2, label: "Schedule", hint: "Open / lock / end" },
  { id: 3, label: "Entry", hint: "Frais d'entrée" },
  { id: 4, label: "Team & Eligibility", hint: "Roster + card set" },
  { id: 5, label: "Rewards", hint: "Règles de récompenses" },
  { id: 6, label: "Review / Launch", hint: "Validation finale" },
];

const DEFAULT_REWARD_RULES: RewardRuleDraft[] = [createRewardRuleDraft({ id: "seed-r1", label: "Winner", rewardType: "POINTS", amount: 1000, distributionType: "FIXED_RANKS", distributionValue: 1 })];

export default function AdminContestCreatePage() {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [contestId, setContestId] = useState(params.get("contestId") ?? "");
  const [message, setMessage] = useState("");
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [rewardCapacityCheck, setRewardCapacityCheck] = useState<RewardCapacityCheck | null>(null);

  const [autoCode, setAutoCode] = useState(true);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [lockAt, setLockAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState("10");
  const [teamSizeValue, setTeamSizeValue] = useState("5");
  const [eligibilityMode, setEligibilityMode] = useState<"ANY" | "CARD_SET_ONLY">("ANY");
  const [cardSetId, setCardSetId] = useState("");
  const [rules, dispatchRules] = useReducer(rewardRuleReducer, DEFAULT_REWARD_RULES);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/internal/card-sets", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as { cardSets: CardSet[] };
        setCardSets(payload.cardSets ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    if (!contestId) return;
    void (async () => {
      const res = await fetch(`/api/internal/contest-configs/${contestId}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as any;
      const contest = payload.contest;
      setCode(contest.code ?? "");
      setTitle(contest.title ?? "");
      setDescription(contest.description ?? "");
      setStartsAt(toInputDate(contest.startsAt));
      setLockAt(toInputDate(contest.lockAt));
      setEndsAt(toInputDate(contest.endsAt));
      const rule = contest.rules?.[0];
      setEntryFeeEnabled(Boolean(rule?.entryFeeEnabled));
      setEntryFeeAmount(String(rule?.entryFeeAmount ?? 10));
      setTeamSizeValue(String(rule?.teamSizeValue ?? 5));
      setEligibilityMode(rule?.eligibilityMode === "CARD_SET_ONLY" ? "CARD_SET_ONLY" : "ANY");
      setCardSetId(rule?.cardSetId ?? "");
      setAutoCode(false);
    })();
  }, [contestId]);

  const payload = useMemo(() => {
    const rewardPayload = toContestRewardPayload(rules);
    const normalizedCode = code.trim();
    const parsedEntryFee = Number(entryFeeAmount);
    return {
      code: autoCode ? undefined : normalizedCode,
      autoGenerateCode: autoCode,
      title: title.trim(),
      description: description.trim() || null,
      status: "DRAFT",
      startsAt: toIso(startsAt),
      lockAt: toIso(lockAt),
      endsAt: toIso(endsAt),
      teamSizeMode: "EXACT",
      teamSizeValue: Number(teamSizeValue) || 5,
      eligibilityMode,
      cardSetId: eligibilityMode === "CARD_SET_ONLY" ? (cardSetId || null) : null,
      entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: entryFeeEnabled && Number.isInteger(parsedEntryFee) ? parsedEntryFee : null,
      rewardBundles: rewardPayload.rewardBundles,
      distributionRules: rewardPayload.distributionRules,
    };
  }, [autoCode, cardSetId, code, description, eligibilityMode, endsAt, entryFeeAmount, entryFeeEnabled, lockAt, rules, startsAt, teamSizeValue, title]);

  const issues = useMemo(() => {
    const arr: string[] = [];
    if (!autoCode && !payload.code) arr.push("Le code est requis en mode manuel.");
    if (!payload.title) arr.push("Le titre est requis.");
    if (!payload.startsAt || !payload.lockAt || !payload.endsAt) arr.push("Le schedule complet est requis.");
    if (payload.startsAt && payload.lockAt && payload.startsAt >= payload.lockAt) arr.push("openAt doit être avant lockAt.");
    if (payload.lockAt && payload.endsAt && payload.lockAt > payload.endsAt) arr.push("lockAt doit être <= endAt.");
    if (entryFeeEnabled && (!Number.isInteger(payload.entryFeeAmount) || (payload.entryFeeAmount ?? 0) <= 0)) {
      arr.push("entryFeeAmount doit être un entier positif quand les frais sont activés.");
    }
    if (eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId) arr.push("Sélectionner un card set.");
    if (payload.rewardBundles.length === 0) arr.push("Ajouter au moins une règle reward valide.");
    return arr;
  }, [autoCode, eligibilityMode, entryFeeEnabled, payload]);

  const formatApiError = (body: any, fallback: string) => {
    const issues = Array.isArray(body?.issues) ? body.issues : [];
    if (issues.length > 0) {
      const detail = issues
        .map((issue: { path?: Array<string | number>; message?: string }) => `${(issue.path ?? []).join(".") || "payload"}: ${issue.message ?? "invalid"}`)
        .join(" | ");
      return `${body?.error ?? fallback} — ${detail}`;
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
      setMessage(formatApiError(body, "Échec save draft"));
      return null;
    }
    if (!contestId && body?.contest?.id) setContestId(body.contest.id);
    if (!code && body?.contest?.code) setCode(body.contest.code);
    setMessage("Draft sauvegardé.");
    return body?.contest?.id ?? contestId;
  };

  const runBackendValidation = async (effectiveContestId: string) => {
    const response = await fetch(`/api/internal/contest-configs/${effectiveContestId}/validate`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as any;
    if (!response.ok) {
      setMessage(formatApiError(body, "Échec validation backend"));
      return { ok: false as const, blocking: true };
    }

    const capacity = body?.rewardPackCapacity as RewardCapacityCheck | undefined;
    setRewardCapacityCheck(capacity ?? null);

    if (body?.blocking) {
      const blockingIssues = Array.isArray(body?.issues)
        ? body.issues.filter((issue: { severity?: string }) => issue?.severity === "ERROR")
        : [];
      const detail = blockingIssues.map((issue: { message?: string }) => issue.message).filter(Boolean).join("; ");
      setMessage(detail ? `Validation bloquante: ${detail}` : "Validation bloquante");
      return { ok: false as const, blocking: true };
    }

    return { ok: true as const, blocking: false };
  };

  const launch = async () => {
    let effectiveContestId = contestId;
    if (!effectiveContestId) {
      const createdId = await saveDraft();
      if (!createdId) return;
      effectiveContestId = createdId;
    }

    const validation = await runBackendValidation(effectiveContestId);
    if (!validation.ok) return;

    const response = await fetch(`/api/internal/contest-configs/${effectiveContestId}/publish`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as any;
    if (!response.ok) return setMessage(formatApiError(body, "Échec publish"));
    setMessage("Contest publié avec succès.");
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div><h1 className="admin-title">{contestId ? "Edit Contest" : "Create Contest"}</h1><p className="admin-subtitle">Wizard produit propre avec actions métier réelles.</p></div>
        <Link href="/admin/contests" className="contest-inline-note">← Retour liste contest</Link>
      </section>

      <section className="contest-wizard-layout">
        <div className="contest-wizard-main">
          <div className="contest-wizard-stepper">{STEPS.map((s) => <button key={s.id} type="button" className={`contest-step-pill${step === s.id ? " active" : ""}`} onClick={() => setStep(s.id)}><span>{s.id}.</span> {s.label}</button>)}</div>
          <div className="admin-panel">
            <h2 className="admin-section-title">{STEPS.find((s) => s.id === step)?.label}</h2>
            <p className="contest-inline-note">{STEPS.find((s) => s.id === step)?.hint}</p>

            {step === 1 && <div className="admin-section-stack"><div className="admin-actions-row"><label><input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} /> Générer automatiquement le code</label></div><input className="input" disabled={autoCode} placeholder="CONTEST-MAR25" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /><input className="input" placeholder="Contest title" value={title} onChange={(e) => setTitle(e.target.value)} /><textarea className="input" placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} /></div>}

            {step === 2 && <div className="admin-field-grid"><div><label className="contest-inline-note">openAt</label><input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div><div><label className="contest-inline-note">lockAt</label><input className="input" type="datetime-local" value={lockAt} onChange={(e) => setLockAt(e.target.value)} /></div><div><label className="contest-inline-note">endAt</label><input className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div></div>}

            {step === 3 && <div className="admin-field-grid"><label><input type="checkbox" checked={entryFeeEnabled} onChange={(e) => setEntryFeeEnabled(e.target.checked)} /> Entry fee enabled</label><input className="input" type="number" min={1} disabled={!entryFeeEnabled} value={entryFeeAmount} onChange={(e) => setEntryFeeAmount(e.target.value)} /></div>}

            {step === 4 && <div className="admin-field-grid"><select className="input" value={teamSizeValue} onChange={(e) => setTeamSizeValue(e.target.value)}><option value="3">3</option><option value="5">5</option><option value="7">7</option></select><select className="input" value={eligibilityMode} onChange={(e) => setEligibilityMode(e.target.value as any)}><option value="ANY">Any set</option><option value="CARD_SET_ONLY">Card set only</option></select>{eligibilityMode === "CARD_SET_ONLY" ? cardSets.length > 0 ? <select className="input" value={cardSetId} onChange={(e) => setCardSetId(e.target.value)}><option value="">Select card set</option>{cardSets.map((set) => <option key={set.id} value={set.id}>{set.displayName} ({set.code})</option>)}</select> : <p className="contest-error">Aucun card set disponible.</p> : null}</div>}

            {step === 5 && <div className="admin-section-stack">{rules.map((rule) => <article key={rule.id} className="contest-reward-rule-card"><input className="input" value={rule.label} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { label: e.target.value } })} /><div className="admin-field-grid"><select className="input" value={rule.rewardType} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { rewardType: e.target.value as RewardType } })}><option value="POINTS">Points</option><option value="XP">XP</option><option value="PACK">Pack</option></select><input className="input" type="number" min={1} value={rule.amount} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { amount: Number(e.target.value) } })} /><select className="input" value={rule.distributionType} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { distributionType: e.target.value as DistributionType } })}><option value="FIXED_RANKS">Fixed ranks</option><option value="TOP_N">Top N</option><option value="TOP_PERCENT">Top percent</option></select><input className="input" type="number" min={1} value={rule.distributionValue} onChange={(e) => dispatchRules({ type: "update", id: rule.id, patch: { distributionValue: Number(e.target.value) } })} /></div><p className="contest-inline-note">{describeRewardRule(rule)}</p></article>)}<Button onClick={() => dispatchRules({ type: "add" })}>Ajouter une règle</Button></div>}

            {step === 6 && <div className="admin-section-stack"><div className="admin-callout"><p className="contest-inline-note"><strong>Contest:</strong> {payload.code || "[auto]"} · {payload.title || "—"}</p><p className="contest-inline-note"><strong>Schedule:</strong> {payload.startsAt || "—"} / {payload.lockAt || "—"} / {payload.endsAt || "—"}</p><p className="contest-inline-note"><strong>Eligibility:</strong> {payload.eligibilityMode} {payload.cardSetId ? `(${payload.cardSetId})` : ""}</p></div>{issues.length > 0 ? <div className="admin-callout danger">{issues.map((issue) => <p key={issue} className="contest-inline-note">• {issue}</p>)}</div> : <div className="admin-callout"><p className="contest-inline-note">Aucun blocage détecté. Ready to launch.</p></div>}<div className={`admin-callout ${rewardCapacityCheck && !rewardCapacityCheck.isPublishable ? "danger" : ""}`}><p className="contest-inline-note"><strong>Reward pack capacity check</strong></p>{rewardCapacityCheck ? <><p className="contest-inline-note">Status: {rewardCapacityCheck.isPublishable ? "Ready to publish" : "Insufficient reward supply"} ({rewardCapacityCheck.verdict})</p>{rewardCapacityCheck.rows.length === 0 ? <p className="contest-inline-note">No pack rewards in this contest.</p> : rewardCapacityCheck.rows.map((row) => <p key={row.packDefinitionId} className="contest-inline-note">• {row.packCode ?? row.packDefinitionId}: required {row.required} / available {row.available} / missing {row.shortfall} ({row.verdict})</p>)}</> : <p className="contest-inline-note">Run launch (or save draft then launch) to compute backend capacity check.</p>}</div></div>}

            <div className="contest-wizard-footer">
              <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}>Back</Button>
              <Button variant="ghost" onClick={() => void saveDraft()}>Save draft</Button>
              {step < 6 ? <Button onClick={() => setStep((s) => Math.min(6, s + 1) as Step)}>Continue</Button> : <Button onClick={() => void launch()} disabled={issues.length > 0}>Launch contest</Button>}
            </div>
          </div>
        </div>

        <aside className="contest-wizard-summary">
          <h3 className="admin-section-title">Résumé</h3>
          <p className="contest-inline-note">Code: {payload.code || "auto"}</p>
          <p className="contest-inline-note">Titre: {payload.title || "—"}</p>
          <p className="contest-inline-note">Rules valides: {payload.rewardBundles.length}</p>
          {contestId ? <span className="admin-badge neutral">contestId={contestId}</span> : null}
          {message ? <p className="contest-inline-note">{message}</p> : null}
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
