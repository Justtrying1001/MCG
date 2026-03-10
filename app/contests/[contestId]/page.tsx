"use client";

import { useEffect, useMemo, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
};

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    startsAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    rules: ContestRule[];
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    status: string;
    rosterLocks: Array<{ id: string; ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number }>;
};

type LineupOption = {
  instanceId: string;
  cardTemplateId: string;
  lockState: string | null;
  cardSetId: string;
  cardSetCode: string;
  cardSetName: string;
  rarityCode: string;
  editionCode: string;
  baseCardId: string | null;
  name: string;
};

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving">("idle");

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;

    void (async () => {
      setError("");
      const [detailRes, rankingRes, optionsRes] = await Promise.all([
        fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      ]);

      if (!detailRes.ok) {
        const text = await detailRes.text();
        setError(text || "Cannot load contest detail");
        return;
      }

      const detailPayload = (await detailRes.json()) as ContestDetail;
      setDetail(detailPayload);

      if (rankingRes.ok) {
        setRanking((await rankingRes.json()) as RankingPayload);
      }

      if (optionsRes.ok) {
        const lineupPayload = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(lineupPayload.options ?? []);
      }

      if (detailPayload.userEntry) {
        setSelected(detailPayload.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
      }
    })();
  }, [loading, me, params.contestId]);

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const canEnter = detail?.contest.status === "OPEN" && !detail?.userEntry;
  const guestBlocked = !loading && me?.mode === "guest";

  const filteredOptions = useMemo(() => {
    if (!rule?.cardSetId) return options;
    return options.filter((item) => item.cardSetId === rule.cardSetId);
  }, [options, rule?.cardSetId]);

  const selectedCards = useMemo(
    () => filteredOptions.filter((option) => selected.includes(option.instanceId)),
    [filteredOptions, selected]
  );

  const toggle = (instanceId: string) => {
    if (!canEnter) return;

    setSelected((prev) => {
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      if (prev.length >= maxRosterSize) return prev;
      return [...prev, instanceId];
    });
  };

  const submitEntry = async () => {
    if (!detail || selected.length !== maxRosterSize) return;

    setSubmitState("saving");
    setError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitState("idle");
      return;
    }

    const updated = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });
    if (updated.ok) {
      setDetail((await updated.json()) as ContestDetail);
    }
    setSubmitState("idle");
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contest Detail</h1>
          <p className="page-subtitle">Read rules, lock an eligible lineup, and track leaderboard outcomes.</p>
        </div>
      </div>

      {guestBlocked ? (
        <div className="contest-guest-notice">Contests are account-only in MVP. Log in with X to enter using owned instances.</div>
      ) : null}

      {!detail ? (
        <div className="empty-state"><p className="empty-state-title">{error || "Loading contest…"}</p></div>
      ) : (
        <>
          <section className="contest-detail-card">
            <div className="contest-card-top">
              <p className="contest-code">{detail.contest.code}</p>
              <span className={`contest-status status-${detail.contest.status.toLowerCase()}`}>{detail.contest.status}</span>
            </div>
            <h2 className="contest-title">{detail.contest.title}</h2>
            <div className="contest-meta-grid">
              <ContestMeta label="Entries" value={String(detail.contest._count.entries)} />
              <ContestMeta label="Roster size" value={String(maxRosterSize)} />
              <ContestMeta label="Starts" value={formatDate(detail.contest.startsAt)} />
              <ContestMeta label="Lock" value={formatDate(detail.contest.lockAt)} />
              <ContestMeta label="Ends" value={formatDate(detail.contest.endsAt)} />
              <ContestMeta label="Set restriction" value={rule?.cardSetId ? "Restricted" : "Any set"} />
            </div>
          </section>

          <section className="contest-section">
            <h3 className="contest-section-title">Your Entry</h3>
            {detail.userEntry ? (
              <p className="contest-inline-note">Entry locked ({detail.userEntry.status}). You cannot change lineup in this MVP flow.</p>
            ) : (
              <p className="contest-inline-note">Select exactly {maxRosterSize} owned instances, then submit.</p>
            )}

            <div className="contest-selected-lineup">
              {Array.from({ length: maxRosterSize }).map((_, index) => {
                const card = selectedCards[index];
                return (
                  <div className="contest-slot" key={index}>
                    <span className="contest-slot-index">{index + 1}</span>
                    <span className="contest-slot-name">{card ? `${card.name} · ${card.rarityCode}/${card.editionCode}` : "Empty"}</span>
                  </div>
                );
              })}
            </div>

            {canEnter ? (
              <Button onClick={() => void submitEntry()} disabled={submitState === "saving" || selected.length !== maxRosterSize}>
                {submitState === "saving" ? "Submitting…" : "Submit Contest Entry"}
              </Button>
            ) : null}

            <div className="contest-option-grid">
              {filteredOptions.map((item) => {
                const isSelected = selected.includes(item.instanceId);
                const isLocked = Boolean(item.lockState) && !isSelected;
                return (
                  <button
                    key={item.instanceId}
                    className={`contest-option-card${isSelected ? " selected" : ""}`}
                    type="button"
                    onClick={() => toggle(item.instanceId)}
                    disabled={!canEnter || isLocked}
                  >
                    <p className="contest-option-name">{item.name}</p>
                    <p className="contest-option-meta">{item.rarityCode} · {item.editionCode}</p>
                    <p className="contest-option-meta">{item.cardSetCode}</p>
                    <p className="contest-option-instance">#{item.instanceId.slice(-8)}</p>
                    {isLocked ? <span className="contest-option-lock">Locked in another active contest</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="contest-section">
            <h3 className="contest-section-title">Leaderboard</h3>
            {ranking?.rankings?.length ? (
              <div className="contest-ranking-table">
                {ranking.rankings.map((row) => (
                  <div className="contest-ranking-row" key={row.id}>
                    <span>#{row.rank}</span>
                    <span>{row.userId === me?.user.id ? "You" : `${row.userId.slice(0, 8)}…`}</span>
                    <span>{row.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="contest-inline-note">Ranking is not available yet. Scores will appear once recorded.</p>
            )}
          </section>

          {error ? <div className="contest-error">{error}</div> : null}
        </>
      )}
    </SiteShell>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
