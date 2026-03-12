"use client";

import Link from "next/link";
import { useMemo, useReducer, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createRewardRuleDraft,
  describeRewardRule,
  rewardRuleReducer,
  toContestRewardPayload,
  type DistributionType,
  type RewardRuleDraft,
  type RewardType,
} from "@/lib/admin/contest-reward-builder";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 1, label: "Basics", hint: "Code, title, description" },
  { id: 2, label: "Schedule", hint: "Open, lock, end timing" },
  { id: 3, label: "Entry", hint: "Entry fee settings" },
  { id: 4, label: "Team & eligibility", hint: "Roster and card constraints" },
  { id: 5, label: "Reward distribution", hint: "Build reward rules" },
  { id: 6, label: "Review & Publish", hint: "Validate and publish" },
];

const DEFAULT_REWARD_RULES: RewardRuleDraft[] = [
  createRewardRuleDraft({ id: "seed-rank-1", label: "Winner bonus", rewardType: "POINTS", amount: 1000, distributionType: "FIXED_RANKS", distributionValue: 1 }),
  createRewardRuleDraft({ id: "seed-top-10", label: "Top 10 booster", rewardType: "PACK", amount: 2, packDefinitionId: "", distributionType: "TOP_N", distributionValue: 10 }),
  createRewardRuleDraft({ id: "seed-top-25", label: "Top 25% XP", rewardType: "XP", amount: 100, distributionType: "TOP_PERCENT", distributionValue: 25 }),
];

export default function AdminContestCreatePage() {
  const [step, setStep] = useState<Step>(1);
  const [contestId, setContestId] = useState("");
  const [message, setMessage] = useState("");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startsAt, setStartsAt] = useState("");
  const [lockAt, setLockAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState("0");

  const [teamSizeValue, setTeamSizeValue] = useState("5");
  const [eligibilityMode, setEligibilityMode] = useState<"ANY" | "CARD_SET_ONLY">("ANY");
  const [cardSetId, setCardSetId] = useState("");

  const [rules, dispatchRules] = useReducer(rewardRuleReducer, DEFAULT_REWARD_RULES);

  const payload = useMemo(() => {
    const entryFee = Number(entryFeeAmount);
    const teamSize = Number(teamSizeValue);
    const rewardPayload = toContestRewardPayload(rules);

    return {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || null,
      status: "DRAFT",
      startsAt: startsAt || null,
      lockAt: lockAt || null,
      endsAt: endsAt || null,
      teamSizeMode: "EXACT",
      teamSizeValue: Number.isInteger(teamSize) ? teamSize : 5,
      eligibilityMode,
      cardSetId: eligibilityMode === "CARD_SET_ONLY" ? cardSetId.trim() || null : null,
      entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: entryFeeEnabled && Number.isInteger(entryFee) ? entryFee : null,
      rewardBundles: rewardPayload.rewardBundles,
      distributionRules: rewardPayload.distributionRules,
    };
  }, [cardSetId, code, description, eligibilityMode, endsAt, entryFeeAmount, entryFeeEnabled, lockAt, rules, startsAt, teamSizeValue, title]);

  const previewLines = useMemo(() => rules.map((rule) => describeRewardRule(rule)), [rules]);

  const blockingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!payload.code) issues.push("Contest code is required.");
    if (!payload.title) issues.push("Contest title is required.");
    if (!payload.startsAt || !payload.lockAt || !payload.endsAt) issues.push("Schedule requires start, lock and end timestamps.");
    if (payload.rewardBundles.length === 0) issues.push("Add at least one valid reward rule.");
    if (eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId) issues.push("cardSetId is required when eligibility is card-set only.");
    return issues;
  }, [eligibilityMode, payload]);

  const updateRule = (id: string, patch: Partial<RewardRuleDraft>) => dispatchRules({ type: "update", id, patch });

  const saveDraft = async () => {
    setMessage("");
    const route = contestId ? `/api/internal/contest-configs/${contestId}` : "/api/internal/contest-configs";
    const method = contestId ? "PATCH" : "POST";

    const response = await fetch(route, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as { contest?: { id: string }; error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error ?? "Cannot save contest draft");
      return;
    }

    if (!contestId && body?.contest?.id) setContestId(body.contest.id);
    setMessage("Draft saved.");
  };

  const validateDraft = async () => {
    if (!contestId) return setMessage("Save draft first.");
    const response = await fetch(`/api/internal/contest-configs/${contestId}/validate`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { blocking?: boolean; issues?: Array<{ message: string }>; error?: string } | null;
    if (!response.ok) return setMessage(body?.error ?? "Validation failed");
    if (body?.blocking) return setMessage(`Validation blocked: ${(body.issues ?? []).map((issue) => issue.message).join("; ")}`);
    setMessage("Validation passed.");
  };

  const publishDraft = async () => {
    if (!contestId) return setMessage("Save draft first.");
    const response = await fetch(`/api/internal/contest-configs/${contestId}/publish`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return setMessage(body?.error ?? "Publish failed");
    setMessage("Contest published.");
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Create Contest</h1>
          <p className="admin-subtitle">Based on the target architecture: guided setup with reward distribution builder and clear review before publish.</p>
        </div>
        <div className="admin-actions-row">
          <span className="admin-badge success">Canonical flow</span>
          <Link href="/admin/contests" className="admin-badge neutral">Back to contest catalog</Link>
        </div>
      </section>

      <section className="admin-panel">
        <p className="contest-inline-note">Create draft → Validate policy → Publish → Run contest → Generate settlement plan</p>
      </section>

      <section className="admin-panel contest-wizard-layout">
        <div className="contest-wizard-main">
          <div className="contest-stepper-grid">
            {STEPS.map((item) => (
              <button key={item.id} type="button" className={`contest-step-chip ${step === item.id ? "is-active" : ""}`} onClick={() => setStep(item.id)}>
                <span className="contest-step-number">{item.id}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="admin-panel">
            <h2 className="admin-section-title">{STEPS.find((item) => item.id === step)?.label}</h2>

            {step === 1 ? (
              <div className="admin-section-stack">
                <div className="admin-field-grid">
                  <div>
                    <label className="contest-inline-note">Contest code</label>
                    <input className="input" placeholder="WEEKLY_042" value={code} onChange={(event) => setCode(event.target.value)} />
                  </div>
                  <div>
                    <label className="contest-inline-note">Contest title</label>
                    <input className="input" placeholder="Weekly Meme Clash" value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="contest-inline-note">Description</label>
                  <textarea className="input" rows={3} placeholder="What makes this contest special?" value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="admin-field-grid">
                <div>
                  <label className="contest-inline-note">Entries open at</label>
                  <input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                </div>
                <div>
                  <label className="contest-inline-note">Entries lock at</label>
                  <input className="input" type="datetime-local" value={lockAt} onChange={(event) => setLockAt(event.target.value)} />
                </div>
                <div>
                  <label className="contest-inline-note">Contest ends at</label>
                  <input className="input" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="admin-section-stack">
                <label className="contest-inline-note" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input type="checkbox" checked={entryFeeEnabled} onChange={(event) => setEntryFeeEnabled(event.target.checked)} />
                  Enable entry fee in points
                </label>
                <div style={{ maxWidth: "300px" }}>
                  <label className="contest-inline-note">Entry fee amount</label>
                  <input className="input" type="number" min={0} value={entryFeeAmount} onChange={(event) => setEntryFeeAmount(event.target.value)} disabled={!entryFeeEnabled} />
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="admin-field-grid">
                <div>
                  <label className="contest-inline-note">Team size</label>
                  <select className="input" value={teamSizeValue} onChange={(event) => setTeamSizeValue(event.target.value)}>
                    <option value="3">3 players</option>
                    <option value="5">5 players</option>
                    <option value="7">7 players</option>
                  </select>
                </div>
                <div>
                  <label className="contest-inline-note">Eligibility mode</label>
                  <select className="input" value={eligibilityMode} onChange={(event) => setEligibilityMode(event.target.value as "ANY" | "CARD_SET_ONLY")}>
                    <option value="ANY">Any cards allowed</option>
                    <option value="CARD_SET_ONLY">Restrict to one card set</option>
                  </select>
                </div>
                <div>
                  <label className="contest-inline-note">Card set id</label>
                  <input className="input" placeholder="cardSetId" value={cardSetId} onChange={(event) => setCardSetId(event.target.value)} disabled={eligibilityMode !== "CARD_SET_ONLY"} />
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="admin-section-stack">
                <p className="contest-inline-note">Build multiple reward rules. A participant may match multiple rules (stackable intent).</p>
                {rules.map((rule) => (
                  <article key={rule.id} className="contest-reward-rule-card" data-testid="reward-rule-card">
                    <div className="admin-actions-row" style={{ justifyContent: "space-between" }}>
                      <input className="input" style={{ maxWidth: "280px" }} placeholder="Rule label (optional)" value={rule.label} onChange={(event) => updateRule(rule.id, { label: event.target.value })} />
                      <div className="admin-actions-row">
                        <Button variant="ghost" onClick={() => dispatchRules({ type: "move", id: rule.id, direction: "up" })}>Up</Button>
                        <Button variant="ghost" onClick={() => dispatchRules({ type: "move", id: rule.id, direction: "down" })}>Down</Button>
                        <Button variant="ghost" onClick={() => dispatchRules({ type: "remove", id: rule.id })}>Delete</Button>
                      </div>
                    </div>
                    <div className="admin-field-grid">
                      <div>
                        <label className="contest-inline-note">Reward type</label>
                        <select className="input" value={rule.rewardType} onChange={(event) => updateRule(rule.id, { rewardType: event.target.value as RewardType })}>
                          <option value="POINTS">Points</option>
                          <option value="XP">XP</option>
                          <option value="PACK">Pack</option>
                        </select>
                      </div>
                      <div>
                        <label className="contest-inline-note">{rule.rewardType === "PACK" ? "Packs per recipient" : "Amount per recipient"}</label>
                        <input className="input" type="number" min={1} value={rule.amount} onChange={(event) => updateRule(rule.id, { amount: Number(event.target.value) || 0 })} />
                      </div>
                      {rule.rewardType === "PACK" ? (
                        <div>
                          <label className="contest-inline-note">Pack definition id</label>
                          <input className="input" placeholder="starter-pack-v2" value={rule.packDefinitionId} onChange={(event) => updateRule(rule.id, { packDefinitionId: event.target.value })} />
                        </div>
                      ) : null}
                      <div>
                        <label className="contest-inline-note">Distribution mode</label>
                        <select className="input" value={rule.distributionType} onChange={(event) => updateRule(rule.id, { distributionType: event.target.value as DistributionType })}>
                          <option value="FIXED_RANKS">Fixed rank</option>
                          <option value="TOP_N">Top N</option>
                          <option value="TOP_PERCENT">Top percent</option>
                        </select>
                      </div>
                      <div>
                        <label className="contest-inline-note">{rule.distributionType === "TOP_PERCENT" ? "Percent value" : "Target value"}</label>
                        <input className="input" type="number" min={1} max={rule.distributionType === "TOP_PERCENT" ? 100 : undefined} value={rule.distributionValue} onChange={(event) => updateRule(rule.id, { distributionValue: Number(event.target.value) || 0 })} />
                      </div>
                    </div>
                    <p className="contest-inline-note"><strong>Preview:</strong> {describeRewardRule(rule)}</p>
                  </article>
                ))}

                <div className="admin-actions-row">
                  <Button onClick={() => dispatchRules({ type: "add" })}>Add reward rule</Button>
                </div>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="admin-section-stack">
                <div className="admin-callout">
                  <p className="contest-inline-note"><strong>Basics:</strong> {payload.code || "—"} · {payload.title || "—"}</p>
                  <p className="contest-inline-note"><strong>Timing:</strong> {payload.startsAt || "—"} / {payload.lockAt || "—"} / {payload.endsAt || "—"}</p>
                  <p className="contest-inline-note"><strong>Entry:</strong> {payload.entryFeeEnabled ? `${payload.entryFeeAmount} POINTS` : "No entry fee"}</p>
                  <p className="contest-inline-note"><strong>Team & eligibility:</strong> EXACT {payload.teamSizeValue} · {payload.eligibilityMode}{payload.cardSetId ? ` (${payload.cardSetId})` : ""}</p>
                </div>
                <div className="admin-callout">
                  <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Rewards summary</p>
                  {previewLines.map((line, index) => <p className="contest-inline-note" key={`review-line-${index}`}>• {line}</p>)}
                </div>
                {blockingIssues.length > 0 ? (
                  <div className="admin-callout danger">
                    <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Blocking issues</p>
                    {blockingIssues.map((issue) => <p className="contest-inline-note" key={issue}>• {issue}</p>)}
                  </div>
                ) : (
                  <div className="admin-callout">
                    <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Ready for validate/publish</p>
                    <p className="contest-inline-note">No blocking issues detected by client-side review.</p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="contest-wizard-footer">
              <Button variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1) as Step)} disabled={step === 1}>Back</Button>
              <Button variant="ghost" onClick={() => void saveDraft()}>Save draft</Button>
              <Button onClick={() => setStep((value) => Math.min(6, value + 1) as Step)} disabled={step === 6}>Continue</Button>
            </div>
          </div>
        </div>

        <aside className="contest-wizard-summary">
          <h3 className="admin-section-title">Contest summary</h3>
          <p className="contest-inline-note"><strong>Code:</strong> {payload.code || "—"}</p>
          <p className="contest-inline-note"><strong>Title:</strong> {payload.title || "—"}</p>
          <p className="contest-inline-note"><strong>Rules:</strong> {rules.length} drafted · {payload.rewardBundles.length} valid</p>
          <div className="admin-callout">
            <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Human-readable reward preview</p>
            {previewLines.map((line, index) => <p className="contest-inline-note" key={`summary-line-${index}`}>• {line}</p>)}
          </div>
          {contestId ? <span className="admin-badge neutral">contestId={contestId}</span> : null}
          <div className="admin-actions-row">
            <Button variant="ghost" onClick={() => void validateDraft()} disabled={!contestId}>Validate draft</Button>
            <Button onClick={() => void publishDraft()} disabled={!contestId || blockingIssues.length > 0}>Publish contest</Button>
          </div>
          {message ? <p className="contest-inline-note">{message}</p> : null}
        </aside>
      </section>
    </div>
  );
}
