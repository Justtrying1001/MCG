"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { ContestHero } from "@/components/contests/ContestHero";
import { ContestProgressTimeline } from "@/components/contests/ContestProgressTimeline";
import { TeamBuilder } from "@/components/contests/TeamBuilder";
import { ContestStatsGrid } from "@/components/contests/ContestStatsGrid";
import { ContestActionPanel } from "@/components/contests/ContestActionPanel";
import { LineupSummaryPanel } from "@/components/contests/LineupSummaryPanel";
import { LeaderboardCard } from "@/components/contests/LeaderboardCard";
import { ContestRewardPreview } from "@/components/contests/ContestRewardPreview";
import { EnteredLineupPanel } from "@/components/contests/EnteredLineupPanel";
import { ContestResultPanel } from "@/components/contests/ContestResultPanel";
import { RulesDrawer } from "@/components/contests/RulesDrawer";
import { loadContestCache } from "@/components/contests/contestUtils";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
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
    seasonName?: string | null;
    seasonId?: string | null;
    leagueTierRequired?: string | null;
  };
  userEntry: {
    id: string;
    status: string;
    rosterLocks: Array<{ id: string; ownedCardInstanceId: string }>;
  } | null;
  rewardGrants?: Array<{
    id: string;
    type: "POINTS" | "PACK" | "CARD_INSTANCE";
    amount: number | null;
    packDefinitionId: string | null;
    createdAt: string;
  }>;
  scoreBreakdown?: Array<{
    id: string;
    tokenProjectId: string;
    baseScore: number;
    rarityMultiplier: number;
    editionMultiplier: number;
    finalScore: number;
    cardInstance: {
      id: string;
      cardTemplate: {
        name: string;
        imageUrl: string | null;
        tokenProject: { displayName: string };
      };
    };
  }>;
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number; displayName?: string | null; xUsername?: string | null }>;
};


function pseudoLiveDelta(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1000, 7);
  const pct = ((hash % 180) - 90) / 10;
  const price = pct / 100;
  const volume = ((hash % 220) - 110) / 10;
  return { pct, price, volume };
}

function mapGuestCollectionToOptions(collection: MvpCollectionItem[]): LineupOption[] {
  const list: LineupOption[] = [];
  for (const row of collection) {
    const total = Math.max(1, row.instanceCount);
    for (let i = 0; i < total; i += 1) {
      list.push({
        instanceId: `guest-${row.templateId}-${i + 1}`,
        cardTemplateId: row.templateId,
        lockState: null,
        isLockedByActiveContest: false,
        cardSetId: row.card.setCode ?? "guest-set",
        cardSetCode: row.card.setCode ?? "SET",
        cardSetName: row.card.setEditionLabel ?? "Guest Collection",
        rarityCode: row.card.rarity,
        editionCode: row.card.edition,
        name: row.card.displayName,
        imageUrl: row.card.imageUrl,
        tokenProjectName: row.card.symbol || row.card.displayName,
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
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
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
          setError((await detailRes.text()) || "Cannot load contest detail");
        }
      } else {
        const detailPayload = (await detailRes.json()) as ContestDetail;
        setDetail(detailPayload);
        if (detailPayload.userEntry) {
          setSelected(detailPayload.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
        }
      }

      if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);

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
  const rewardPoints = Math.max(100, maxRosterSize * 40);
  const isGuest = !loading && me?.mode === "guest";
  const canManageLineup = detail?.contest.status === "OPEN";
  const canEnter = canManageLineup && !isGuest;

  const filteredOptions = useMemo(() => {
    if (!rule?.cardSetId) return options;
    return options.filter((item) => item.cardSetId === rule.cardSetId);
  }, [options, rule?.cardSetId]);

  const selectedCards = useMemo(
    () =>
      Array.from({ length: maxRosterSize }).map((_, index) => {
        const id = selected[index];
        return filteredOptions.find((option) => option.instanceId === id) ?? null;
      }),
    [filteredOptions, maxRosterSize, selected],
  );

  const myRankingRow = ranking?.rankings?.find((row) => row.userId === me?.user.id) ?? null;

  const userState = useMemo(() => {
    if (isGuest) return "Guest preview (entry disabled)";
    if (!detail) return "Loading";
    if (detail.contest.status === "SETTLED") return "Results available";
    if (detail.contest.status === "LIVE") return detail.userEntry ? "Lineup locked · contest live" : "Contest live";
    if (detail.contest.status === "LOCKED") return detail.userEntry ? "Team lock active" : "Team lock active (no entry)";
    if (detail.userEntry) return "Lineup editable until team lock";
    if (selected.length > 0) return "Drafting lineup";
    return "Ready to enter";
  }, [detail, isGuest, selected.length]);

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
    if (updated.ok) setDetail((await updated.json()) as ContestDetail);
    setSubmitState("idle");
  };

  if (!detail) {
    return (
      <SiteShell>
        <section className="contest-detail-skeleton" aria-label="Loading contest detail">
          <div className="contest-detail-skeleton-hero" />
          <div className="contest-detail-skeleton-grid">
            <div className="contest-detail-skeleton-main" />
            <div className="contest-detail-skeleton-side" />
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {isGuest ? <EmptyState title="Guest mode preview" description="Connect with X to submit lineup and appear on ranking." /> : null}
      {error ? <EmptyState title="Contest notice" description={error} /> : null}

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
        userState={userState}
        seasonName={detail.contest.seasonName}
        leagueTierRequired={detail.contest.leagueTierRequired}
      />

      <ContestProgressTimeline
        status={detail.contest.status}
        startsAt={detail.contest.startsAt}
        lockAt={detail.contest.lockAt}
        endsAt={detail.contest.endsAt}
      />

      <ContestStatsGrid
        status={detail.contest.status}
        startsAt={detail.contest.startsAt}
        lockAt={detail.contest.lockAt}
        endsAt={detail.contest.endsAt}
        rosterSize={maxRosterSize}
        entries={detail.contest._count.entries}
        rewardPoints={rewardPoints}
        nowTs={nowTs}
      />

      <section className="contest-main-layout-v3">
        <div className="contest-main-left">
          <TeamBuilder
            maxRosterSize={maxRosterSize}
            selectedCards={selectedCards}
            selectedIds={selected}
            filteredOptions={filteredOptions}
            activeSlot={activeSlot}
            canManageLineup={Boolean(canManageLineup)}
            canEnter={Boolean(canEnter)}
            submitState={submitState}
            onOpenPicker={(slot) => setActiveSlot(slot)}
            onRemoveSlot={removeFromSlot}
            onToggle={(instanceId) => {
              toggle(instanceId);
              if (activeSlot !== null) setActiveSlot(null);
            }}
            onSubmit={() => void submitEntry()}
          />

          {detail.userEntry ? <EnteredLineupPanel selectedCards={selectedCards} /> : null}
          {detail.contest.status === "LIVE" ? (
            <Surface className="contest-result-panel contest-live-panel" variant="raised">
              <p className="mcg-eyebrow">Live tracking</p>
              <h3 className="mcg-title">Contest running</h3>
              <p className="contest-inline-note">
                Participants: {detail.contest._count.entries}. Leaderboard may remain provisional until scoring finalization.
              </p>
              <div className="contest-live-grid">
                {selectedCards.filter(Boolean).map((card, index) => {
                  const live = pseudoLiveDelta(`${card?.instanceId ?? index}`);
                  const up = live.pct >= 0;
                  return (
                    <div className="contest-live-card" key={card?.instanceId ?? `slot-${index}`}>
                      <strong>{card?.tokenProjectName ?? `Slot ${index + 1}`}</strong>
                      <span className={up ? "up" : "down"}>Token delta {up ? "+" : ""}{live.pct.toFixed(2)}%</span>
                      <span className={up ? "up" : "down"}>Price change {up ? "+" : ""}{live.price.toFixed(3)} USD</span>
                      <span className={live.volume >= 0 ? "up" : "down"}>Volume change {live.volume >= 0 ? "+" : ""}{live.volume.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </Surface>
          ) : null}
          <ContestResultPanel
            status={detail.contest.status}
            myRank={myRankingRow?.rank ?? null}
            myScore={myRankingRow?.score ?? null}
            rewards={detail.rewardGrants ?? []}
            breakdown={detail.scoreBreakdown ?? []}
            rankedUsers={ranking?.rankings?.length ?? 0}
          />
        </div>

        <aside className="contest-main-right">
          <ContestActionPanel
            status={detail.contest.status}
            lockAt={detail.contest.lockAt}
            endsAt={detail.contest.endsAt}
            nowTs={nowTs}
            isGuest={Boolean(isGuest)}
            lineupFilled={selected.filter(Boolean).length}
            rosterSize={maxRosterSize}
          />
          <LineupSummaryPanel selectedCards={selectedCards} maxRosterSize={maxRosterSize} />
          <ContestRewardPreview rosterSize={maxRosterSize} entries={detail.contest._count.entries} />
          <LeaderboardCard rankings={ranking?.rankings ?? []} currentUserId={me?.user.id} />
          <Surface className="contest-sidebar-panel">
            <Button variant="ghost" onClick={() => setRulesOpen(true)}>View detailed rules</Button>
          </Surface>
        </aside>
      </section>

      <RulesDrawer
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        rosterSize={maxRosterSize}
        restrictedSet={Boolean(rule?.cardSetId)}
        status={detail.contest.status}
      />
    </SiteShell>
  );
}
