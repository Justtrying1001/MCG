"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
type NoticeTone = "neutral" | "success" | "danger" | "warn";

type ApiErrorPayload = {
  error?: string;
  issues?: Array<{ message?: string; path?: Array<string | number> }>;
  blocking?: boolean;
  contest?: { id: string };
};

type AsyncActionState = "idle" | "saving" | "validating" | "publishing";

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 1, label: "Basics", hint: "Code, title, description" },
  { id: 2, label: "Schedule", hint: "Open, lock, end timing" },
  { id: 3, label: "Entry", hint: "Entry fee settings" },
  { id: 4, label: "Team & eligibility", hint: "Roster and card constraints" },
  { id: 5, label: "Reward distribution", hint: "Build reward rules" },
  { id: 6, label: "Review & publish", hint: "Validate and publish" },
];

const DEFAULT_REWARD_RULES: RewardRuleDraft[] = [
  createRewardRuleDraft({
    id: "seed-rank-1",
    label: "Winner bonus",
    rewardType: "POINTS",
    amount: 1000,
    distributionType: "FIXED_RANKS",
    distributionValue: 1,
  }),
  createRewardRuleDraft({
    id: "seed-top-10",
    label: "Top 10 booster",
    rewardType: "PACK",
    amount: 2,
    packDefinitionId: "",
    distributionType: "TOP_N",
    distributionValue: 10,
  }),
  createRewardRuleDraft({
    id: "seed-top-25",
    label: "Top 25% XP",
    rewardType: "XP",
    amount: 100,
    distributionType: "TOP_PERCENT",
    distributionValue: 25,
  }),
];

export default function AdminContestCreatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [contestId, setContestId] = useState("");
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [actionState, setActionState] = useState<AsyncActionState>("idle");

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

  const isBusy = actionState !== "idle";

  const payload = useMemo(() => {
    const entryFee = Number(entryFeeAmount);
    const teamSize = Number(teamSizeValue);
    const rewardPayload = toContestRewardPayload(rules);

    return {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || null,
      status: "DRAFT" as const,
      startsAt: startsAt || null,
      lockAt: lockAt || null,
      endsAt: endsAt || null,
      teamSizeMode: "EXACT" as const,
      teamSizeValue: Number.isInteger(teamSize) ? teamSize : 5,
      eligibilityMode,
      cardSetId: eligibilityMode === "CARD_SET_ONLY" ? cardSetId.trim() || null : null,
      entryFeeEnabled,
      entryFeeCurrency: "POINTS" as const,
      entryFeeAmount: entryFeeEnabled && Number.isInteger(entryFee) ? entryFee : null,
      rewardBundles: rewardPayload.rewardBundles,
      distributionRules: rewardPayload.distributionRules,
    };
  }, [
    cardSetId,
    code,
    description,
    eligibilityMode,
    endsAt,
    entryFeeAmount,
    entryFeeEnabled,
    lockAt,
    rules,
    startsAt,
    teamSizeValue,
    title,
  ]);

  const previewLines = useMemo(() => rules.map((rule) => describeRewardRule(rule)), [rules]);

  const blockingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!payload.code) issues.push("Contest code is required.");
    if (!payload.title) issues.push("Contest title is required.");
    if (!payload.startsAt || !payload.lockAt || !payload.endsAt) {
      issues.push("Schedule requires start, lock and end timestamps.");
    }
    if (payload.rewardBundles.length === 0) issues.push("Add at least one valid reward rule.");
    if (eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId) {
      issues.push("cardSetId is required when eligibility is card-set only.");
    }
    if (payload.entryFeeEnabled && (!Number.isInteger(payload.entryFeeAmount) || (payload.entryFeeAmount ?? 0) <= 0)) {
      issues.push("Entry fee must be a positive integer when enabled.");
    }
    return issues;
  }, [eligibilityMode, payload]);

  const stepHasBlockingIssues = useMemo(() => {
    switch (step) {
      case 1:
        return !payload.code || !payload.title;
      case 2:
        return !payload.startsAt || !payload.lockAt || !payload.endsAt;
      case 3:
        return payload.entryFeeEnabled && (!Number.isInteger(payload.entryFeeAmount) || (payload.entryFeeAmount ?? 0) <= 0);
      case 4:
        return payload.eligibilityMode === "CARD_SET_ONLY" && !payload.cardSetId;
      case 5:
        return payload.rewardBundles.length === 0;
      case 6:
        return blockingIssues.length > 0;
      default:
        return false;
    }
  }, [blockingIssues.length, payload, step]);

  const updateRule = (id: string, patch: Partial<RewardRuleDraft>) => {
    dispatchRules({ type: "update", id, patch });
  };

  const consumeApiError = (body: ApiErrorPayload | null, fallback: string) => {
    if (!body) return fallback;

    const issueText = (body.issues ?? [])
      .map((issue) => {
        const path = issue.path?.join(".") ?? "payload";
        return issue.message ? `${path}: ${issue.message}` : path;
      })
      .join(" · ");

    if (body.error && issueText) return `${body.error} — ${issueText}`;
    return body.error ?? (issueText || fallback);
  };

  const postContestConfig = async () => {
    const route = contestId ? `/api/internal/contest-configs/${contestId}` : "/api/internal/contest-configs";
    const method = contestId ? "PATCH" : "POST";

    const response = await fetch(route, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    if (!response.ok) {
      throw new Error(consumeApiError(body, "Cannot save contest draft"));
    }

    const nextContestId = body?.contest?.id ?? contestId;
    if (nextContestId) setContestId(nextContestId);
    return nextContestId;
  };

  const requestValidation = async (targetContestId: string) => {
    const response = await fetch(`/api/internal/contest-configs/${targetContestId}/validate`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(consumeApiError(body, "Validation failed"));
    }

    if (body?.blocking) {
      const issues = (body.issues ?? [])
        .map((issue) => issue.message)
        .filter((value): value is string => Boolean(value))
        .join("; ");
      throw new Error(`Validation blocked: ${issues || "Resolve server-side issues and retry."}`);
    }
  };

  const requestPublish = async (targetContestId: string) => {
    const response = await fetch(`/api/internal/contest-configs/${targetContestId}/publish`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(consumeApiError(body, "Publish failed"));
    }

    const publishedId = body?.contest?.id ?? targetContestId;
    setNotice({ tone: "success", message: "Contest published successfully. Redirecting to contest detail…" });
    router.push(`/admin/contests/${publishedId}`);
    router.refresh();
  };

  const runAction = async (state: Exclude<AsyncActionState, "idle">, action: () => Promise<void>) => {
    if (isBusy) return;
    setNotice(null);
    setActionState(state);

    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setNotice({ tone: "danger", message });
    } finally {
      setActionState("idle");
    }
  };

  const saveDraft = async () => {
    await runAction("saving", async () => {
      await postContestConfig();
      setNotice({ tone: "success", message: "Draft saved." });
    });
  };

  const validateDraft = async () => {
    if (!contestId) {
      setNotice({ tone: "warn", message: "Save draft first before running validation." });
      return;
    }

    await runAction("validating", async () => {
      await requestValidation(contestId);
      setNotice({ tone: "success", message: "Draft validation passed." });
    });
  };

  const publishDraft = async () => {
    if (!contestId) {
      setNotice({ tone: "warn", message: "Save draft first before publishing." });
      return;
    }

    await runAction("publishing", async () => {
      await requestValidation(contestId);
      await requestPublish(contestId);
    });
  };

  const createAndPublish = async () => {
    if (blockingIssues.length > 0) {
      setStep(6);
      setNotice({ tone: "danger", message: "Cannot continue: resolve blocking issues in the review step." });
      return;
    }

    await runAction("publishing", async () => {
      const createdId = await postContestConfig();
      if (!createdId) {
        throw new Error("Draft save succeeded but no contest id was returned.");
      }
      await requestValidation(createdId);
      await requestPublish(createdId);
    });
  };

  const primaryActionLabel = contestId ? "Validate & publish draft" : "Create draft, validate & publish";
  const statusRole = notice?.tone === "danger" ? "alert" : "status";

  return (
    <div className="admin-page">
      <header className="admin-panel contest-create-hero">
        <div>
          <h1 className="admin-title">Contest creation control center</h1>
          <p className="admin-subtitle">
            Configure draft settings, validate reward policy integrity, then publish with explicit operational feedback.
          </p>
        </div>
        <div className="admin-actions-row">
          <Link className="btn btn-ghost" href="/admin/contests">
            Back to contests
          </Link>
          <Button type="button" onClick={() => void createAndPublish()} disabled={isBusy || blockingIssues.length > 0}>
            {actionState === "publishing" ? "Publishing…" : primaryActionLabel}
          </Button>
        </div>
      </header>

      {notice ? (
        <section
          className={`admin-callout contest-status-callout ${notice.tone === "danger" ? "danger" : ""} ${notice.tone === "warn" ? "warn" : ""}`}
          role={statusRole}
          aria-live={notice.tone === "danger" ? "assertive" : "polite"}
        >
          <p className="contest-inline-note">
            <strong>Status:</strong> {notice.message}
          </p>
        </section>
      ) : null}

      <section className="admin-split contest-wizard-layout">
        <div className="contest-wizard-main">
          <div className="contest-stepper-grid" aria-label="Contest creation steps">
            {STEPS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`contest-step-chip ${step === item.id ? "is-active" : ""}`}
                onClick={() => setStep(item.id)}
                aria-current={step === item.id ? "step" : undefined}
              >
                <span className="contest-step-number">{item.id}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            ))}
          </div>

          <section className="admin-panel" aria-labelledby="contest-step-title">
            <h2 className="admin-section-title" id="contest-step-title">
              {STEPS.find((item) => item.id === step)?.label}
            </h2>

            {step === 1 ? (
              <div className="admin-section-stack">
                <div className="admin-field-grid">
                  <div>
                    <label htmlFor="contest-code" className="contest-inline-note">
                      Contest code
                    </label>
                    <input
                      id="contest-code"
                      className="input"
                      placeholder="WEEKLY_042"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="contest-title" className="contest-inline-note">
                      Contest title
                    </label>
                    <input
                      id="contest-title"
                      className="input"
                      placeholder="Weekly Meme Clash"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contest-description" className="contest-inline-note">
                    Description
                  </label>
                  <textarea
                    id="contest-description"
                    className="input"
                    rows={3}
                    placeholder="What makes this contest special?"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="admin-field-grid">
                <div>
                  <label htmlFor="contest-starts-at" className="contest-inline-note">
                    Entries open at
                  </label>
                  <input
                    id="contest-starts-at"
                    className="input"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="contest-lock-at" className="contest-inline-note">
                    Entries lock at
                  </label>
                  <input
                    id="contest-lock-at"
                    className="input"
                    type="datetime-local"
                    value={lockAt}
                    onChange={(event) => setLockAt(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="contest-ends-at" className="contest-inline-note">
                    Contest ends at
                  </label>
                  <input
                    id="contest-ends-at"
                    className="input"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="admin-section-stack">
                <label htmlFor="entry-fee-enabled" className="contest-inline-note contest-check-row">
                  <input
                    id="entry-fee-enabled"
                    type="checkbox"
                    checked={entryFeeEnabled}
                    onChange={(event) => setEntryFeeEnabled(event.target.checked)}
                  />
                  Enable entry fee in points
                </label>
                <div className="contest-mini-field">
                  <label htmlFor="entry-fee-amount" className="contest-inline-note">
                    Entry fee amount
                  </label>
                  <input
                    id="entry-fee-amount"
                    className="input"
                    type="number"
                    min={0}
                    value={entryFeeAmount}
                    onChange={(event) => setEntryFeeAmount(event.target.value)}
                    disabled={!entryFeeEnabled}
                  />
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="admin-field-grid">
                <div>
                  <label htmlFor="contest-team-size" className="contest-inline-note">
                    Team size
                  </label>
                  <select
                    id="contest-team-size"
                    className="input"
                    value={teamSizeValue}
                    onChange={(event) => setTeamSizeValue(event.target.value)}
                  >
                    <option value="3">3 players</option>
                    <option value="5">5 players</option>
                    <option value="7">7 players</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contest-eligibility-mode" className="contest-inline-note">
                    Eligibility mode
                  </label>
                  <select
                    id="contest-eligibility-mode"
                    className="input"
                    value={eligibilityMode}
                    onChange={(event) => setEligibilityMode(event.target.value as "ANY" | "CARD_SET_ONLY")}
                  >
                    <option value="ANY">Any cards allowed</option>
                    <option value="CARD_SET_ONLY">Restrict to one card set</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contest-card-set-id" className="contest-inline-note">
                    Card set id
                  </label>
                  <input
                    id="contest-card-set-id"
                    className="input"
                    placeholder="cardSetId"
                    value={cardSetId}
                    onChange={(event) => setCardSetId(event.target.value)}
                    disabled={eligibilityMode !== "CARD_SET_ONLY"}
                  />
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="admin-section-stack">
                <p className="contest-inline-note">
                  Build multiple reward rules. A participant may match multiple rules (stackable intent).
                </p>
                {rules.map((rule) => (
                  <article key={rule.id} className="contest-reward-rule-card" data-testid="reward-rule-card">
                    <div className="admin-actions-row contest-rule-toolbar">
                      <input
                        className="input"
                        placeholder="Rule label (optional)"
                        value={rule.label}
                        onChange={(event) => updateRule(rule.id, { label: event.target.value })}
                        aria-label="Rule label"
                      />
                      <div className="admin-actions-row">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => dispatchRules({ type: "move", id: rule.id, direction: "up" })}
                        >
                          Up
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => dispatchRules({ type: "move", id: rule.id, direction: "down" })}
                        >
                          Down
                        </Button>
                        <Button variant="ghost" type="button" onClick={() => dispatchRules({ type: "remove", id: rule.id })}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="admin-field-grid">
                      <div>
                        <label className="contest-inline-note">Reward type</label>
                        <select
                          className="input"
                          value={rule.rewardType}
                          onChange={(event) => updateRule(rule.id, { rewardType: event.target.value as RewardType })}
                        >
                          <option value="POINTS">Points</option>
                          <option value="XP">XP</option>
                          <option value="PACK">Pack</option>
                        </select>
                      </div>
                      <div>
                        <label className="contest-inline-note">
                          {rule.rewardType === "PACK" ? "Packs per recipient" : "Amount per recipient"}
                        </label>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={rule.amount}
                          onChange={(event) => updateRule(rule.id, { amount: Number(event.target.value) || 0 })}
                        />
                      </div>
                      {rule.rewardType === "PACK" ? (
                        <div>
                          <label className="contest-inline-note">Pack definition id</label>
                          <input
                            className="input"
                            placeholder="starter-pack-v2"
                            value={rule.packDefinitionId}
                            onChange={(event) => updateRule(rule.id, { packDefinitionId: event.target.value })}
                          />
                        </div>
                      ) : null}
                      <div>
                        <label className="contest-inline-note">Distribution mode</label>
                        <select
                          className="input"
                          value={rule.distributionType}
                          onChange={(event) =>
                            updateRule(rule.id, { distributionType: event.target.value as DistributionType })
                          }
                        >
                          <option value="FIXED_RANKS">Fixed rank</option>
                          <option value="TOP_N">Top N</option>
                          <option value="TOP_PERCENT">Top percent</option>
                        </select>
                      </div>
                      <div>
                        <label className="contest-inline-note">
                          {rule.distributionType === "TOP_PERCENT" ? "Percent value" : "Target value"}
                        </label>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={rule.distributionType === "TOP_PERCENT" ? 100 : undefined}
                          value={rule.distributionValue}
                          onChange={(event) => updateRule(rule.id, { distributionValue: Number(event.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <p className="contest-inline-note">
                      <strong>Preview:</strong> {describeRewardRule(rule)}
                    </p>
                  </article>
                ))}

                <div className="admin-actions-row">
                  <Button type="button" onClick={() => dispatchRules({ type: "add" })}>
                    Add reward rule
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="admin-section-stack">
                <div className="admin-callout">
                  <p className="contest-inline-note">
                    <strong>Basics:</strong> {payload.code || "—"} · {payload.title || "—"}
                  </p>
                  <p className="contest-inline-note">
                    <strong>Timing:</strong> {payload.startsAt || "—"} / {payload.lockAt || "—"} / {payload.endsAt || "—"}
                  </p>
                  <p className="contest-inline-note">
                    <strong>Entry:</strong> {payload.entryFeeEnabled ? `${payload.entryFeeAmount} POINTS` : "No entry fee"}
                  </p>
                  <p className="contest-inline-note">
                    <strong>Team & eligibility:</strong> EXACT {payload.teamSizeValue} · {payload.eligibilityMode}
                    {payload.cardSetId ? ` (${payload.cardSetId})` : ""}
                  </p>
                </div>
                <div className="admin-callout">
                  <p className="contest-inline-note">
                    <strong>Rewards summary</strong>
                  </p>
                  {previewLines.map((line, index) => (
                    <p className="contest-inline-note" key={`review-line-${index}`}>
                      • {line}
                    </p>
                  ))}
                </div>
                {blockingIssues.length > 0 ? (
                  <div className="admin-callout danger" role="alert" aria-live="assertive">
                    <p className="contest-inline-note">
                      <strong>Blocking issues</strong>
                    </p>
                    {blockingIssues.map((issue) => (
                      <p className="contest-inline-note" key={issue}>
                        • {issue}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="admin-callout">
                    <p className="contest-inline-note">
                      <strong>Ready to publish</strong>
                    </p>
                    <p className="contest-inline-note">No blocking issues detected by client-side review.</p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="contest-wizard-footer">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setStep((value) => Math.max(1, value - 1) as Step)}
                disabled={step === 1 || isBusy}
              >
                Back
              </Button>
              <Button variant="ghost" type="button" onClick={() => void saveDraft()} disabled={isBusy}>
                {actionState === "saving" ? "Saving draft…" : "Save draft"}
              </Button>
              {step < 6 ? (
                <Button
                  type="button"
                  onClick={() => setStep((value) => Math.min(6, value + 1) as Step)}
                  disabled={isBusy}
                >
                  Continue to {STEPS.find((item) => item.id === (Math.min(6, step + 1) as Step))?.label}
                </Button>
              ) : (
                <Button type="button" onClick={() => void createAndPublish()} disabled={isBusy || blockingIssues.length > 0}>
                  {actionState === "publishing" ? "Publishing…" : primaryActionLabel}
                </Button>
              )}
            </div>
          </section>
        </div>

        <aside className="contest-wizard-summary" aria-label="Contest summary and actions">
          <h3 className="admin-section-title">Contest summary</h3>
          <p className="contest-inline-note">
            <strong>Code:</strong> {payload.code || "—"}
          </p>
          <p className="contest-inline-note">
            <strong>Title:</strong> {payload.title || "—"}
          </p>
          <p className="contest-inline-note">
            <strong>Rules:</strong> {rules.length} drafted · {payload.rewardBundles.length} valid
          </p>
          <div className="admin-callout">
            <p className="contest-inline-note">
              <strong>Human-readable reward preview</strong>
            </p>
            {previewLines.map((line, index) => (
              <p className="contest-inline-note" key={`summary-line-${index}`}>
                • {line}
              </p>
            ))}
          </div>
          {contestId ? <span className="admin-badge neutral">contestId={contestId}</span> : null}
          <div className="admin-actions-row contest-summary-actions">
            <Button variant="ghost" type="button" onClick={() => void validateDraft()} disabled={isBusy || !contestId}>
              {actionState === "validating" ? "Validating…" : "Validate draft"}
            </Button>
            <Button type="button" onClick={() => void publishDraft()} disabled={isBusy || !contestId || blockingIssues.length > 0}>
              {actionState === "publishing" ? "Publishing…" : "Publish draft"}
            </Button>
          </div>
          {stepHasBlockingIssues ? (
            <p className="contest-inline-note contest-inline-warning">
              This step has blocking issues. Review highlighted requirements before publishing.
            </p>
          ) : null}
          {blockingIssues.length > 0 ? (
            <p className="contest-inline-note">Resolve {blockingIssues.length} blocking issue(s) to enable publish actions.</p>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
