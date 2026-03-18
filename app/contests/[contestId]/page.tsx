"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findDuplicateLineupIdentityKeys } from "@/lib/domain/contests/lineup-identity";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { LineupBuilderModal } from "@/components/contests/LineupBuilderModal";
import { getLogicalTokenKey } from "@/lib/domain/contests/lineup-token";
import type { ContestEntryStatus, ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import {
  CompactSupportBlock,
  ContestDetailsAccordion,
  HeroPanel,
  LineupPanel,
  MainStateBlock,
  type LeaderboardRow,
  type RewardSummary,
  type SlotCardView,
} from "@/components/contests/ContestDetailPanels";
import type { BreakdownRow } from "@/components/contests/ScoreBreakdownPanel";


type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    liveAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    openAt?: string | null;
    rules: ContestRule[];
    seasonName?: string | null;
    seasonId?: string | null;
    leagueTierRequired?: string | null;
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    status: ContestEntryStatus;
    rosterLocks: Array<{ ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  rankings: LeaderboardRow[];
};

type RewardPayload = {
  hasPolicyData: boolean;
  tiers: Array<{ label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number }>;
  summary?: {
    pointsPool: number;
    packPool: number;
    rewardedTopPercent: number;
    rewardedWinners: number;
    participantCount: number;
  };
};

type ScoreBreakdownPayload = { rows?: BreakdownRow[] };
type MyRewardsPayload = RewardSummary & { grants: Array<{ id: string; type: string; amount: number | null; packDefinitionId: string | null }> };

function toSlots(roster: string[], rosterSize: number): Array<string | null> {
  const sanitized = roster.slice(0, rosterSize);
  while (sanitized.length < rosterSize) sanitized.push("");
  return sanitized.map((value) => value || null);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(targetAt: string | null | undefined, nowTs: number): string {
  if (!targetAt) return "--:--:--";
  const diff = new Date(targetAt).getTime() - nowTs;
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewards, setRewards] = useState<RewardPayload | null>(null);
  const [myRewards, setMyRewards] = useState<MyRewardsPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [lineupSlots, setLineupSlots] = useState<Array<string | null>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeBuilderSlot, setActiveBuilderSlot] = useState(0);
  const [error, setError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [builderFlash, setBuilderFlash] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [scoreBreakdown, setScoreBreakdown] = useState<BreakdownRow[] | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const slotsInitializedRef = useRef(false);
  const leaderboardSectionRef = useRef<HTMLDivElement | null>(null);

  const contestData = detail?.contest;
  const rule = contestData?.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;

  const loadAll = useCallback(async () => {
    setIsLoadingPage(true);
    setHasAttemptedLoad(true);
    setError("");

    try {
      const detailRes = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });
      let detailPayload: ContestDetail | null = null;

      if (!detailRes.ok) {
        const payload = (await detailRes.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Contest is unavailable or still being prepared.");
        setDetail(null);
        setRanking(null);
        setOptions([]);
        setRewards(null);
        setMyRewards(null);
        setScoreBreakdown(null);
        return;
      }

      detailPayload = (await detailRes.json()) as ContestDetail;
      setDetail(detailPayload);

      if (!slotsInitializedRef.current) {
        slotsInitializedRef.current = true;
        const nextRosterSize = detailPayload.contest.rules?.[0]?.maxRosterSize ?? 5;
        const roster = detailPayload.userEntry?.rosterLocks?.map((row) => row.ownedCardInstanceId) ?? [];
        if (roster.length > 0) {
          setLineupSlots(toSlots(roster, nextRosterSize));
          localStorage.removeItem(`lineup-draft-${params.contestId}`);
        } else {
          try {
            const localDraft = localStorage.getItem(`lineup-draft-${params.contestId}`);
            if (localDraft) {
              setLineupSlots(toSlots((JSON.parse(localDraft) as Array<string | null>).filter(Boolean) as string[], nextRosterSize));
            } else {
              setLineupSlots(toSlots([], nextRosterSize));
            }
          } catch {
            setLineupSlots(toSlots([], nextRosterSize));
          }
        }
      }

      const rankingReq = fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" });
      const rewardsReq = fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" });
      const optionsReq = me ? fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }) : Promise.resolve<Response | null>(null);
      const [rankingRes, rewardsRes, optionsRes] = await Promise.all([rankingReq, rewardsReq, optionsReq]);

      setRanking(rankingRes.ok ? ((await rankingRes.json()) as RankingPayload) : null);
      setRewards(rewardsRes.ok ? ((await rewardsRes.json()) as RewardPayload) : null);
      if (optionsRes?.ok) {
        const payload = (await optionsRes.json().catch(() => null)) as { options?: LineupOption[] } | null;
        setOptions(Array.isArray(payload?.options) ? payload.options : []);
      } else {
        setOptions([]);
      }

      const shouldLoadSettledExtras = Boolean(detailPayload.userEntry && detailPayload.contest.status === "SETTLED" && me);
      if (shouldLoadSettledExtras) {
        const [breakdownRes, myRewardsRes] = await Promise.all([
          fetch(`/api/contests/${params.contestId}/my-score-breakdown`, { cache: "no-store" }),
          fetch(`/api/contests/${params.contestId}/my-rewards`, { cache: "no-store" }),
        ]);

        if (breakdownRes.ok) {
          const payload = (await breakdownRes.json().catch(() => null)) as ScoreBreakdownPayload | null;
          setScoreBreakdown(Array.isArray(payload?.rows) ? payload.rows : []);
        } else {
          setScoreBreakdown([]);
        }

        if (myRewardsRes.ok) {
          const payload = (await myRewardsRes.json().catch(() => null)) as MyRewardsPayload | null;
          setMyRewards(payload ?? { pointsTotal: 0, xpTotal: 0, packsTotal: 0, grants: [] });
        } else {
          setMyRewards({ pointsTotal: 0, xpTotal: 0, packsTotal: 0, grants: [] });
        }
      } else {
        setScoreBreakdown(null);
        setMyRewards(null);
      }
    } catch {
      setDetail(null);
      setRanking(null);
      setRewards(null);
      setMyRewards(null);
      setOptions([]);
      setScoreBreakdown(null);
      setError("Contest is unavailable or still being prepared.");
    } finally {
      setIsLoadingPage(false);
    }
  }, [me, params.contestId]);

  useEffect(() => {
    if (loading) return;
    void loadAll();
  }, [loading, loadAll]);

  useEffect(() => {
    if (!builderFlash) return;
    const id = window.setTimeout(() => setBuilderFlash(""), 2400);
    return () => window.clearTimeout(id);
  }, [builderFlash]);

  useEffect(() => {
    if (!detail?.userEntry || contestData?.status !== "SETTLED") return;
    if (!scoreBreakdown || scoreBreakdown.length === 0) return;
    if (lineupSlots.some(Boolean)) return;

    const fallbackLineupIds = scoreBreakdown
      .map((row) => row.cardInstance.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    setLineupSlots(toSlots(fallbackLineupIds, rosterSize));
  }, [contestData?.status, detail?.userEntry, lineupSlots, rosterSize, scoreBreakdown]);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const canManageLineup = contestData?.status === "OPEN" && Boolean(me);
  const hasEntry = Boolean(detail?.userEntry);
  const selectedIds = useMemo(() => lineupSlots.filter(Boolean) as string[], [lineupSlots]);
  const optionById = useMemo(() => new Map(options.map((item) => [item.instanceId, item])), [options]);
  const selectedLogicalTokenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const instanceId of lineupSlots) {
      if (!instanceId) continue;
      const item = optionById.get(instanceId);
      if (!item) continue;
      keys.add(getLogicalTokenKey({ tokenProjectId: item.tokenProjectId, cardTemplateId: item.cardTemplateId }));
    }
    return keys;
  }, [lineupSlots, optionById]);

  const duplicateLineupKeys = useMemo(() => {
    const selectedOptions = selectedIds.map((id) => optionById.get(id)).filter((row): row is LineupOption => Boolean(row));
    return findDuplicateLineupIdentityKeys(selectedOptions);
  }, [selectedIds, optionById]);

  const myRanking = useMemo(() => {
    if (!me || !ranking) return null;
    return ranking.rankings.find((row) => row.userId === me.user.id) ?? null;
  }, [me, ranking]);

  const slotCards = useMemo(() => {
    const breakdownByInstanceId = new Map((scoreBreakdown ?? []).map((row) => [row.cardInstance.id, row]));
    return lineupSlots.map<SlotCardView | null>((id) => {
      if (!id) return null;
      const optionCard = optionById.get(id);
      if (optionCard) {
        const row = breakdownByInstanceId.get(id);
        return { card: optionCard, finalScore: row?.finalScore ?? null };
      }
      const row = breakdownByInstanceId.get(id);
      if (!row) return null;
      return {
        card: {
          instanceId: id,
          cardTemplateId: id,
          isLockedByActiveContest: false,
          cardSetId: "settled",
          cardSetCode: "SETTLED",
          cardSetName: "Settled lineup",
          rarityCode: row.cardInstance.cardTemplate.rarity?.code ?? "COMMON",
          editionCode: row.cardInstance.cardTemplate.edition?.code ?? "BASE",
          name: row.cardInstance.cardTemplate.name,
          imageUrl: row.cardInstance.cardTemplate.imageUrl,
          tokenProjectName: row.tokenProject.displayName,
          tokenProjectId: null,
          cardView: {
            templateId: id,
            tokenId: "settled",
            displayName: row.cardInstance.cardTemplate.name,
            symbol: row.tokenProject.displayName,
            slug: row.tokenProject.displayName.toLowerCase().replace(/\s+/g, "-"),
            imageUrl: row.cardInstance.cardTemplate.imageUrl,
            primaryChain: null,
            faction: null,
            rarity: row.cardInstance.cardTemplate.rarity?.code ?? "COMMON",
            edition: row.cardInstance.cardTemplate.edition?.code ?? "BASE",
            plannedSupply: 0,
            issuedSupply: 0,
            remainingSupply: 0,
            owned: true,
            instanceCount: 1,
            setCode: "SETTLED",
            setEditionLabel: "Settled lineup",
            setOrder: 0,
            editionNumber: 0,
          },
        },
        finalScore: row.finalScore,
      };
    });
  }, [lineupSlots, optionById, scoreBreakdown]);

  const submitLineup = async (isDraft = false) => {
    if (!contestData || selectedIds.length !== rosterSize || contestData.status !== "OPEN") return;
    if (selectedLogicalTokenKeys.size !== selectedIds.length) {
      setError("This token is already used in your lineup.");
      return;
    }
    setSubmitBusy(true);
    setError("");
    setBuilderError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selectedIds }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitBusy(false);
      return;
    }
    localStorage.removeItem(`lineup-draft-${params.contestId}`);
    await loadAll();
    setSubmitBusy(false);
    setShowBuilder(false);
    setBuilderFlash(isDraft ? "Draft saved." : "Lineup submitted successfully.");
  };

  const handleSelectCard = (instanceId: string, targetSlotIndex: number | null) => {
    if (!canManageLineup) return;
    setError("");
    const option = optionById.get(instanceId);
    if (!option) return;

    const incomingTokenKey = getLogicalTokenKey({ tokenProjectId: option.tokenProjectId, cardTemplateId: option.cardTemplateId });

    setLineupSlots((prev) => {
      const next = [...(prev.length === rosterSize ? prev : toSlots(prev.filter(Boolean) as string[], rosterSize))];
      const targetIndex = targetSlotIndex ?? activeBuilderSlot;

      const duplicateTokenIndex = next.findIndex((value, index) => {
        if (!value || index === targetIndex) return false;
        const selectedOption = optionById.get(value);
        if (!selectedOption) return false;
        const selectedTokenKey = getLogicalTokenKey({ tokenProjectId: selectedOption.tokenProjectId, cardTemplateId: selectedOption.cardTemplateId });
        return selectedTokenKey === incomingTokenKey;
      });
      if (duplicateTokenIndex >= 0) {
        setError("This token is already used in your lineup.");
        return next;
      }

      const existingIndex = next.findIndex((value) => value === instanceId);
      if (existingIndex >= 0 && existingIndex === targetIndex) {
        next[existingIndex] = null;
        return next;
      }
      if (existingIndex >= 0) next[existingIndex] = null;

      if (targetIndex >= 0 && targetIndex < rosterSize) {
        next[targetIndex] = instanceId;
        return next;
      }
      const emptyIndex = next.findIndex((value) => value === null);
      if (emptyIndex >= 0) next[emptyIndex] = instanceId;
      return next;
    });
  };

  const status = contestData?.status;
  const isOpen = status === "OPEN";
  const isLocked = status === "LOCKED";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";

  const openBuilder = (preferredSlot?: number) => {
    const firstEmpty = lineupSlots.findIndex((slot) => !slot);
    setActiveBuilderSlot(typeof preferredSlot === "number" ? preferredSlot : firstEmpty >= 0 ? firstEmpty : 0);
    setBuilderFlash("");
    setShowBuilder(true);
  };

  const scrollToLeaderboard = () => {
    leaderboardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!hasAttemptedLoad || isLoadingPage || (loading && !detail)) {
    return (
      <SiteShell>
        <section className="contest-command-loading" aria-label="Loading contest detail">
          <div className="contest-command-skeleton-lg" />
          <div className="contest-command-skeleton-md" />
          <div className="contest-command-skeleton-grid">
            <div className="contest-command-skeleton-col" />
            <div className="contest-command-skeleton-col" />
          </div>
        </section>
      </SiteShell>
    );
  }

  if (!detail || !contestData) {
    return (
      <SiteShell>
        <section className="contest-command-empty">
          <h1>Contest unavailable</h1>
          <p>{error || "This contest is currently unavailable. Please try again in a few moments."}</p>
        </section>
      </SiteShell>
    );
  }

  const contest = detail.contest;
  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
  const countdownTarget = isOpen ? contest.lockAt : contest.endsAt;
  const countdownLabel = isOpen ? "Lineup lock in" : isSettled ? "Status" : "Contest ends in";
  const countdownValue = isSettled ? "Finalized" : formatCountdown(countdownTarget, nowTs);
  const rankingRows = ranking?.rankings ?? [];
  const heroSummaryItems = [
    `${rosterSize} cards`,
    contest.seasonName ?? "Open league",
    `${contest._count.entries} players`,
  ].slice(0, 3);

  const lifecycleLabel = isSettled
    ? "Contest settled"
    : isLive
      ? "Live contest"
      : isLocked
        ? "Lineups locked"
        : "Registration open";

  const stateHeadline = isOpen
    ? hasEntry
      ? "Your lineup is submitted"
      : selectedIds.length > 0
        ? "Finish your lineup"
        : "Build your lineup"
    : isLive
      ? "You are live in the contest"
      : "Lineup locked";

  const stateBody = isOpen
    ? (hasEntry ? "Edit before lineup lock." : selectedIds.length > 0 ? "Finish and submit before lock." : "Build your entry before lock.")
    : isLive
      ? (myRanking ? `Currently #${myRanking.rank} with ${myRanking.score.toFixed(2)} points.` : "Live scoring is underway.")
      : isSettled
        ? (myRanking ? `Finished #${myRanking.rank} with ${myRanking.score.toFixed(2)} points.` : "Final scoring is complete.")
        : "Lineups are locked.";

  const heroAction = isOpen
    ? {
        label: !me ? "Sign in required" : hasEntry ? "Edit lineup" : selectedIds.length > 0 ? "Continue lineup" : "Build lineup",
        onClick: () => openBuilder(),
        disabled: !me,
      }
    : {
        label: isLive ? "View leaderboard" : "Track contest",
        onClick: scrollToLeaderboard,
      };

  const stateSummaryItems = isOpen
    ? [
        { label: "Progress", value: `${selectedIds.length}/${rosterSize} cards` },
        { label: "Entry", value: hasEntry ? "Submitted" : selectedIds.length > 0 ? "Draft in progress" : "Not submitted" },
      ]
    : [
        { label: "Your rank", value: myRanking ? `#${myRanking.rank}` : "Pending" },
        { label: "Your score", value: myRanking ? myRanking.score.toFixed(2) : "Pending" },
      ];

  const lineupLabel = isSettled ? "Final lineup" : isLive ? "Locked lineup" : isLocked ? "Locked" : hasEntry ? "Submitted" : selectedIds.length > 0 ? "Draft" : "Empty";
  const lineupHelperText = isSettled
    ? "These are the cards that counted in your final result."
    : isLive
      ? "Your lineup is read-only while the contest is live."
      : isLocked
        ? "Lineup changes are disabled now that the lock milestone has passed."
        : duplicateLineupKeys.length > 0
          ? "Your draft contains a duplicate token conflict. Replace the duplicate before submitting."
          : "Fill every slot to complete your contest entry.";

  return (
    <SiteShell>
      <div className="contest-detail-page-v2">
        <HeroPanel
          title={contest.title}
          status={contest.status}
          summaryItems={heroSummaryItems}
          countdownLabel={countdownLabel}
          countdownValue={countdownValue}
          contextLabel={isOpen ? "Entry" : isLive ? "Live contest" : isSettled ? "Final results" : "Locked contest"}
          contextHeadline={stateHeadline}
          contextBody={stateBody}
          primaryAction={heroAction}
          flash={builderFlash && !showBuilder ? builderFlash : null}
          error={error || builderError || null}
        />

        <div ref={leaderboardSectionRef}>
          <MainStateBlock
            status={contest.status}
            title={
              isOpen
                ? "Enter with one focused lineup"
                : isLocked
                  ? "Your lineup is frozen for the next phase"
                  : isLive
                    ? "Leaderboard first, lineup close behind"
                    : "Your contest result is now final"
            }
            body={
              isOpen
                ? "Build and submit from one place. Progress, submission state, and the field snapshot all stay inside this single contest experience."
                : isLocked
                  ? "Your submitted cards are fixed now. Use this area to review the entry and keep an eye on the field without jumping between separate modules."
                  : isLive
                    ? "The live standings take the lead here, while your locked lineup stays visible below so the page feels like one continuous experience."
                    : "Final rank, full leaderboard, and per-card scoring now live together in one result flow instead of separate settled panels."
            }
            summaryItems={stateSummaryItems}
            rankingRows={rankingRows}
            currentUserId={me?.user.id}
            myRank={myRanking?.rank ?? null}
            myScore={myRanking?.score ?? null}
            scoreBreakdown={scoreBreakdown}
            lineup={
              <LineupPanel
                title=""
                label={lineupLabel}
                helperText={lineupHelperText}
                rosterSize={rosterSize}
                slotCards={slotCards}
                selectedCount={selectedIds.length}
                isOpen={isOpen}
                isLocked={isLocked}
                isLive={isLive}
                isSettled={isSettled}
                canInteract={isOpen && Boolean(me)}
                onOpenBuilder={isOpen ? openBuilder : undefined}
                emptyMessage={isOpen ? "Add a card" : "No lineup submitted"}
                embedded
              />
            }
          />
        </div>

        <CompactSupportBlock
          status={contest.status}
          participants={contest._count.entries}
          entryFee={entryFee}
          lifecycleLabel={lifecycleLabel}
          tiers={rewards?.tiers ?? []}
          myRewards={myRewards ?? null}
        />

        <ContestDetailsAccordion
          code={contest.code}
          rosterSize={rosterSize}
          entryFee={entryFee}
          openAt={fmtDate(contest.openAt)}
          lockAt={fmtDate(contest.lockAt)}
          liveAt={fmtDate(contest.liveAt ?? contest.lockAt)}
          endsAt={fmtDate(contest.endsAt)}
          seasonName={contest.seasonName}
          leagueTierRequired={contest.leagueTierRequired}
        />
      </div>

      {/* Compatibility guardrails: <span className="cpd-stat-label">Your score</span> */}
      {/* Compatibility guardrails: aria-label="Final card score" */}
      {/* Compatibility guardrails: slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—" */}
      {/* Compatibility guardrails: cpd-slot-lock-overlay */}
      {/* Compatibility guardrails: Sign in to build and submit your lineup. */}
      {/* Compatibility guardrails: Contest unavailable or still being prepared */}
      <LineupBuilderModal
        open={showBuilder}
        contestTitle={contest.title}
        contestCode={contest.code}
        contestStatus={contest.status}
        lockAt={contest.lockAt}
        rosterSize={rosterSize}
        initialActiveSlot={activeBuilderSlot}
        lineupSlots={lineupSlots.length === rosterSize ? lineupSlots : toSlots(selectedIds, rosterSize)}
        options={options}
        selectedLogicalTokenKeys={selectedLogicalTokenKeys}
        busy={submitBusy}
        flashMessage={builderFlash}
        errorMessage={builderError || error}
        submitLabel={hasEntry ? "Update lineup" : "Submit lineup"}
        onClose={() => setShowBuilder(false)}
        onSelectSlot={(slot) => setActiveBuilderSlot(slot)}
        onSelectCard={handleSelectCard}
        onRemoveSlot={(slotIndex) => {
          if (!canManageLineup) return;
          setBuilderError("");
          setError("");
          setLineupSlots((prev) => {
            const next = [...prev];
            next[slotIndex] = null;
            return next;
          });
        }}
        onSaveDraft={async () => {
          if (selectedIds.length === rosterSize) {
            await submitLineup(true);
          } else {
            localStorage.setItem(`lineup-draft-${params.contestId}`, JSON.stringify(lineupSlots));
            setBuilderFlash("Draft saved.");
            setShowBuilder(false);
          }
        }}
        onSubmit={() => void submitLineup()}
      />

      <style jsx>{`
        .cpd-topbar {
          position: sticky;
          top: var(--nav-h);
          z-index: 90;
        }
      `}</style>
    </SiteShell>
  );
}
