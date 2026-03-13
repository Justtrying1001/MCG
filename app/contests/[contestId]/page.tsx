"use client";

import { useEffect, useMemo, useState } from "react";

import { CardSelectorModal } from "@/components/contests/CardSelectorModal";
import { ContestHero } from "@/components/contests/ContestHero";
import { ContestProgressTimeline } from "@/components/contests/ContestProgressTimeline";
import { ContestResultPanel } from "@/components/contests/ContestResultPanel";
import { EnteredLineupPanel } from "@/components/contests/EnteredLineupPanel";
import { LeaderboardCard } from "@/components/contests/LeaderboardCard";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { LineupSummaryPanel } from "@/components/contests/LineupSummaryPanel";
import { loadContestCache } from "@/components/contests/contestUtils";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";
import type { MvpCollectionItem } from "@/types/cards";

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

function mapGuestCollectionToOptions(collection: MvpCollectionItem[]): LineupOption[] {
  const list: LineupOption[] = [];
  for (const row of collection) {
    const total = Math.max(1, row.instanceCount);
    for (let i = 0; i < total; i += 1) {
      list.push({
        instanceId: `guest-${row.templateId}-${i + 1}`,
        cardTemplateId: row.templateId,
        lockState: null,
        cardSetId: row.card.setCode ?? "guest-set",
        cardSetCode: row.card.setCode ?? "SET",
        cardSetName: row.card.setEditionLabel ?? "Guest Collection",
        rarityCode: row.card.rarity,
        editionCode: row.card.edition,
        name: row.card.displayName,
      });
    }
  }
  return list;
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success">("idle");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;

    void (async () => {
      setError("");
      const [detailRes, rankingRes, optionsRes] = await Promise.all([
        fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      ]);

      if (!detailRes.ok) {
        const cached = loadContestCache().find((contest) => contest.id === params.contestId);
        if (cached) {
          setDetail({ contest: cached, userEntry: null });
          setRanking({ rankings: [] });
          setError("Showing cached contest data. Connect with X for live updates and rankings.");
        } else {
          const text = await detailRes.text();
          setError(text || "Cannot load contest detail");
        }
      } else {
        const detailPayload = (await detailRes.json()) as ContestDetail;
        setDetail(detailPayload);
        if (detailPayload.userEntry) {
          setSelected(detailPayload.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
        }
      }

      if (rankingRes.ok) {
        setRanking((await rankingRes.json()) as RankingPayload);
      }

      if (optionsRes.ok) {
        const lineupPayload = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(lineupPayload.options ?? []);
      } else if (me?.mode === "guest") {
        setOptions(mapGuestCollectionToOptions(me.mvpCollection));
      }
    })();
  }, [loading, me, params.contestId]);

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const isGuest = !loading && me?.mode === "guest";
  const canManageLineup = detail?.contest.status === "OPEN" && !detail?.userEntry;
  const canEnter = canManageLineup && !isGuest;

  const filteredOptions = useMemo(() => {
    if (!rule?.cardSetId) return options;
    return options.filter((item) => item.cardSetId === rule.cardSetId);
  }, [options, rule?.cardSetId]);

  const selectedCards = useMemo(() => {
    return Array.from({ length: maxRosterSize }).map((_, index) => {
      const id = selected[index];
      return filteredOptions.find((option) => option.instanceId === id) ?? null;
    });
  }, [filteredOptions, maxRosterSize, selected]);

  const myRankingRow = ranking?.rankings?.find((row) => row.userId === me?.user.id) ?? null;
  const filledSlots = selectedCards.filter(Boolean).length;
  const lineupProgressPct = Math.min(100, Math.round((filledSlots / Math.max(maxRosterSize, 1)) * 100));

  const toggle = (instanceId: string) => {
    if (!canManageLineup) return;

    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const existingIndex = next.indexOf(instanceId);
        if (existingIndex >= 0) next.splice(existingIndex, 1);
        next[activeSlot] = instanceId;
        return next.filter(Boolean).slice(0, maxRosterSize);
      }
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      if (prev.length >= maxRosterSize) return prev;
      return [...prev, instanceId];
    });
  };

  const removeFromSlot = (slot: number) => {
    if (!canManageLineup) return;
    setSelected((prev) => prev.filter((_, index) => index !== slot));
  };

  const submitEntry = async () => {
    if (!detail || !canEnter || selected.length !== maxRosterSize) return;

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
    setSubmitState("success");
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contest Command Center</h1>
          <p className="page-subtitle">Build your team, lock your entry, and track your contest performance end-to-end.</p>
        </div>
      </div>

      {isGuest ? (
        <div className="contest-guest-notice">Guest mode can open contest detail and build a lineup preview. Connect with X to submit participation.</div>
      ) : null}

      {!detail ? (
        <div className="empty-state"><p className="empty-state-title">{error || "Loading contest…"}</p></div>
      ) : (
        <div className="contest-dashboard premium-contest-dashboard">
          <ContestHero
            code={detail.contest.code}
            title={detail.contest.title}
            status={detail.contest.status}
            startsAt={detail.contest.startsAt}
            lockAt={detail.contest.lockAt}
            endsAt={detail.contest.endsAt}
            rosterSize={maxRosterSize}
            restrictedSet={Boolean(rule?.cardSetId)}
            entries={detail.contest._count.entries}
            nowTs={nowTs}
          />

          <ContestProgressTimeline status={detail.contest.status} />

          {myRankingRow ? (
            <section className="contest-kpi-row contest-kpi-row-strong">
              <div className="contest-kpi"><p>Your rank</p><strong>#{myRankingRow.rank}</strong></div>
              <div className="contest-kpi"><p>Your score</p><strong>{myRankingRow.score.toFixed(2)}</strong></div>
              <div className="contest-kpi"><p>Contest phase</p><strong>{detail.contest.status}</strong></div>
            </section>
          ) : null}

          {error ? <div className="contest-error">{error}</div> : null}

          <section className="contest-section selected-team-spotlight">
            <div>
              <p className="contest-code">Selected Team</p>
              <h3 className="contest-section-title">{detail.userEntry ? "Team locked for this contest" : "Build and lock your team"}</h3>
              <p className="contest-inline-note">
                {detail.userEntry
                  ? `Your lineup is submitted (${detail.userEntry.status}).`
                  : `Choose ${maxRosterSize} cards before lock to confirm your contest entry.`}
              </p>
            </div>
            <div className="selected-team-pill-row" aria-live="polite">
              <span className="selected-team-pill">Slots filled: {filledSlots}/{maxRosterSize}</span>
              <span className="selected-team-pill">Status: {detail.userEntry ? "Submitted" : canManageLineup ? "Ready to lock" : "Locked"}</span>
              <span className="selected-team-pill">Eligible cards: {filteredOptions.length}</span>
            </div>
          </section>

          <section className="contest-grid-2">
            <section className="contest-section contest-builder-panel">
              <h3 className="contest-section-title">Team builder</h3>
              {detail.userEntry ? (
                <p className="contest-inline-note">Lineup submitted ({detail.userEntry.status}). Editing is disabled.</p>
              ) : (
                <p className="contest-inline-note">Fill exactly {maxRosterSize} slots to validate your lineup.</p>
              )}

              <div className="lineup-progress-shell" aria-live="polite">
                <div className="lineup-progress-copy">
                  <p>Lineup completion</p>
                  <strong>{filledSlots}/{maxRosterSize}</strong>
                </div>
                <div className="lineup-progress-track"><span style={{ width: `${lineupProgressPct}%` }} /></div>
              </div>

              <div className="contest-selected-lineup premium-lineup-grid">
                {Array.from({ length: maxRosterSize }).map((_, index) => (
                  <LineupSlot
                    key={index}
                    index={index}
                    card={selectedCards[index]}
                    canEdit={Boolean(canManageLineup)}
                    onRemove={() => removeFromSlot(index)}
                    onOpenPicker={() => {
                      setActiveSlot(index);
                      setModalOpen(true);
                    }}
                  />
                ))}
              </div>

              {!detail.userEntry ? (
                <p className="contest-inline-note">Selected cards: {selectedCards.filter(Boolean).map((card) => card?.name).join(" · ") || "None yet"}</p>
              ) : null}

              {canManageLineup ? (
                <div className="eligible-strip" role="list" aria-label="Eligible cards preview">
                  {filteredOptions.slice(0, 8).map((item) => {
                    const selectedState = selected.includes(item.instanceId);
                    const lockedState = Boolean(item.lockState) && !selectedState;
                    return (
                      <button
                        key={item.instanceId}
                        type="button"
                        className={`eligible-pill${selectedState ? " selected" : ""}${lockedState ? " locked" : ""}`}
                        onClick={() => {
                          setActiveSlot(null);
                          void toggle(item.instanceId);
                        }}
                        disabled={lockedState || !canManageLineup}
                      >
                        <span>{item.name}</span>
                        <small>{lockedState ? "Locked" : item.rarityCode}</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="contest-action-row sticky-actions">
                {canManageLineup ? <Button type="button" variant="ghost" onClick={() => { setActiveSlot(null); setModalOpen(true); }}>Browse eligible cards</Button> : null}
                {canManageLineup ? (
                  <Button onClick={() => void submitEntry()} disabled={isGuest || submitState === "saving" || selected.length !== maxRosterSize} className={selected.length === maxRosterSize && !isGuest ? "lineup-cta-ready" : ""}>
                    {isGuest ? "Connect with X to participate" : submitState === "saving" ? "Submitting…" : submitState === "success" ? "Entry confirmed ✨" : "Confirm participation"}
                  </Button>
                ) : null}
              </div>
            </section>

            <LineupSummaryPanel selectedCards={selectedCards} maxRosterSize={maxRosterSize} />
          </section>

          {detail.userEntry ? <EnteredLineupPanel selectedCards={selectedCards} /> : null}

          <section className="contest-section">
            <h3 className="contest-section-title">Leaderboard</h3>
            <LeaderboardCard rankings={ranking?.rankings ?? []} currentUserId={me?.user.id} />
          </section>

          <ContestResultPanel status={detail.contest.status} myRank={myRankingRow?.rank ?? null} myScore={myRankingRow?.score ?? null} />

          <CardSelectorModal
            open={modalOpen}
            options={filteredOptions}
            selectedIds={selected}
            onToggle={toggle}
            onClose={() => setModalOpen(false)}
            canEnter={Boolean(canManageLineup)}
          />
        </div>
      )}
    </SiteShell>
  );
}
