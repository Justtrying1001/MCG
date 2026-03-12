"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 1, label: "Basics", hint: "Code, title, description" },
  { id: 2, label: "Timing", hint: "Open, lock, end" },
  { id: 3, label: "Entry", hint: "Entry fee policy" },
  { id: 4, label: "Team & Eligibility", hint: "Roster + card restrictions" },
  { id: 5, label: "Rewards", hint: "Bundles + distribution presets" },
  { id: 6, label: "Review & Publish", hint: "Validate then publish" },
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

  const [rank1Points, setRank1Points] = useState("1000");
  const [top10PackId, setTop10PackId] = useState("");
  const [top10PackQty, setTop10PackQty] = useState("1");
  const [top25Xp, setTop25Xp] = useState("100");

  const payload = useMemo(() => {
    const entryFee = Number(entryFeeAmount);
    const teamSize = Number(teamSizeValue);
    const packQty = Number(top10PackQty);
    const points = Number(rank1Points);
    const xp = Number(top25Xp);

    return {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || null,
      status: "DRAFT",
      startsAt: startsAt || null,
      lockAt: lockAt || null,
      endsAt: endsAt || null,
      teamSizeMode: "EXACT",
      teamSizeValue: teamSize,
      eligibilityMode,
      cardSetId: eligibilityMode === "CARD_SET_ONLY" ? cardSetId.trim() || null : null,
      entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: entryFeeEnabled ? entryFee : null,
      rewardBundles: [
        {
          name: "rank_1_bundle",
          priority: 1,
          components: [{ type: "POINTS", pointsAmount: points }],
        },
        {
          name: "top_10_pack_bundle",
          priority: 2,
          components: top10PackId.trim() ? [{ type: "PACK", packDefinitionId: top10PackId.trim(), packQuantity: packQty }] : [],
        },
        {
          name: "top_25_percent_xp",
          priority: 3,
          components: [{ type: "XP", xpAmount: xp }],
        },
      ].filter((bundle) => bundle.components.length > 0),
      distributionRules: [
        { priority: 1, ruleType: "FIXED_RANKS", bundleRef: "rank_1_bundle", rankFrom: 1, rankTo: 1 },
        ...(top10PackId.trim() ? [{ priority: 2, ruleType: "TOP_N", bundleRef: "top_10_pack_bundle", topN: 10 }] : []),
        { priority: 3, ruleType: "TOP_PERCENT", bundleRef: "top_25_percent_xp", topPercent: 25 },
      ],
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
    rank1Points,
    startsAt,
    teamSizeValue,
    title,
    top10PackId,
    top10PackQty,
    top25Xp,
  ]);

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

    if (!contestId && body?.contest?.id) {
      setContestId(body.contest.id);
    }

    setMessage("Draft saved.");
  };

  const validateDraft = async () => {
    if (!contestId) {
      setMessage("Save draft first.");
      return;
    }

    const response = await fetch(`/api/internal/contest-configs/${contestId}/validate`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { blocking?: boolean; issues?: Array<{ message: string }>; error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error ?? "Validation failed");
      return;
    }

    if (body?.blocking) {
      setMessage(`Validation blocked: ${(body.issues ?? []).map((issue) => issue.message).join("; ")}`);
      return;
    }

    setMessage("Validation passed.");
  };

  const publishDraft = async () => {
    if (!contestId) {
      setMessage("Save draft first.");
      return;
    }

    const response = await fetch(`/api/internal/contest-configs/${contestId}/publish`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error ?? "Publish failed");
      return;
    }

    setMessage("Contest published.");
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Contest Setup Wizard</h1>
          <p className="admin-subtitle">Product-first setup flow. Save draft early, validate frequently, publish only when review is clear.</p>
        </div>
        <Link href="/admin/contests" className="admin-badge neutral">Back to contest catalog</Link>
      </section>

      <section className="admin-callout warn">
        <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>MVP reward builder</p>
        <p className="contest-inline-note">This phase supports presets for rank 1 points, top N pack, and top % XP. Full flexible tier builder remains planned.</p>
      </section>

      <section className="admin-panel admin-section-stack">
        <p className="admin-section-title">Setup steps</p>
        <div className="admin-actions-row">
          {STEPS.map((item) => (
            <button key={item.id} type="button" className={`admin-badge ${item.id === step ? "success" : "neutral"}`} onClick={() => setStep(item.id)}>
              {item.id}. {item.label}
            </button>
          ))}
        </div>
        <p className="contest-inline-note">Current step: <strong>{STEPS.find((item) => item.id === step)?.label}</strong> — {STEPS.find((item) => item.id === step)?.hint}</p>
      </section>

      <section className="admin-panel admin-section-stack">
        {step === 1 ? (
          <div className="admin-field-grid">
            <input className="input" placeholder="Contest code (e.g. WEEKLY_42)" value={code} onChange={(event) => setCode(event.target.value)} />
            <input className="input" placeholder="Contest title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input className="input" placeholder="Short description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} style={{ gridColumn: "1 / -1" }} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="admin-field-grid">
            <div>
              <label className="contest-inline-note">Entry opens at</label>
              <input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </div>
            <div>
              <label className="contest-inline-note">Entry lock at</label>
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
              Enable entry fee (POINTS)
            </label>
            <div style={{ maxWidth: "260px" }}>
              <label className="contest-inline-note">Entry fee amount</label>
              <input className="input" type="number" min={0} value={entryFeeAmount} onChange={(event) => setEntryFeeAmount(event.target.value)} disabled={!entryFeeEnabled} />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="admin-field-grid">
            <div>
              <label className="contest-inline-note">Team size mode</label>
              <input className="input" value="EXACT" disabled />
            </div>
            <div>
              <label className="contest-inline-note">Team size (3 / 5 / 7)</label>
              <select className="input" value={teamSizeValue} onChange={(event) => setTeamSizeValue(event.target.value)}>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="7">7</option>
              </select>
            </div>
            <div>
              <label className="contest-inline-note">Eligibility mode</label>
              <select className="input" value={eligibilityMode} onChange={(event) => setEligibilityMode(event.target.value as "ANY" | "CARD_SET_ONLY")}>
                <option value="ANY">ANY cards</option>
                <option value="CARD_SET_ONLY">Card set only</option>
              </select>
            </div>
            <div>
              <label className="contest-inline-note">Card set id</label>
              <input className="input" placeholder="cardSetId" value={cardSetId} onChange={(event) => setCardSetId(event.target.value)} disabled={eligibilityMode !== "CARD_SET_ONLY"} />
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="admin-field-grid">
            <div>
              <label className="contest-inline-note">Rank #1 points</label>
              <input className="input" type="number" min={1} value={rank1Points} onChange={(event) => setRank1Points(event.target.value)} />
            </div>
            <div>
              <label className="contest-inline-note">Top 10 packDefinitionId (optional)</label>
              <input className="input" value={top10PackId} onChange={(event) => setTop10PackId(event.target.value)} />
            </div>
            <div>
              <label className="contest-inline-note">Top 10 pack quantity</label>
              <input className="input" type="number" min={1} value={top10PackQty} onChange={(event) => setTop10PackQty(event.target.value)} />
            </div>
            <div>
              <label className="contest-inline-note">Top 25% XP</label>
              <input className="input" type="number" min={1} value={top25Xp} onChange={(event) => setTop25Xp(event.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="admin-section-stack">
            <p className="contest-inline-note"><strong>Code:</strong> {payload.code || "—"}</p>
            <p className="contest-inline-note"><strong>Title:</strong> {payload.title || "—"}</p>
            <p className="contest-inline-note"><strong>Timing:</strong> {payload.startsAt || "—"} / {payload.lockAt || "—"} / {payload.endsAt || "—"}</p>
            <p className="contest-inline-note"><strong>Entry fee:</strong> {payload.entryFeeEnabled ? `${payload.entryFeeAmount} POINTS` : "disabled"}</p>
            <p className="contest-inline-note"><strong>Team:</strong> EXACT {payload.teamSizeValue}</p>
            <p className="contest-inline-note"><strong>Eligibility:</strong> {payload.eligibilityMode}{payload.cardSetId ? ` (${payload.cardSetId})` : ""}</p>
            <p className="contest-inline-note"><strong>Bundles:</strong> {payload.rewardBundles.length}</p>
            <p className="contest-inline-note"><strong>Distribution rules:</strong> {payload.distributionRules.length}</p>
          </div>
        ) : null}
      </section>

      <section className="admin-panel">
        <div className="admin-actions-row">
          <Button onClick={() => void saveDraft()}>Save draft</Button>
          <Button variant="ghost" onClick={() => void validateDraft()} disabled={!contestId}>Validate draft</Button>
          <Button onClick={() => void publishDraft()} disabled={!contestId}>Publish contest</Button>
          {contestId ? <span className="admin-badge neutral">contestId={contestId}</span> : null}
        </div>
        {message ? <p className="contest-inline-note">{message}</p> : null}
      </section>
    </div>
  );
}
