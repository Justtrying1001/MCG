"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import { ContestStatusBadge } from "@/components/contests/ContestStatusBadge";
import { EnteredLineupPanel } from "@/components/contests/EnteredLineupPanel";
import { LeaderboardCard } from "@/components/contests/LeaderboardCard";
import { ContestRewardPreview } from "@/components/contests/ContestRewardPreview";
import { EligibleCardsPanel } from "@/components/contests/EligibleCardsPanel";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { loadContestCache } from "@/components/contests/contestUtils";
import { useSession } from "@/components/useSession";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import type { MvpCollectionItem } from "@/types/cards";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    liveAt: string | null;
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
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number; user: { displayName: string; xUsername: string } }>;
};

type RewardTier = { label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number };
type RewardPreviewPayload = { hasPolicyData: boolean; tiers: RewardTier[] };

type DetailTab = "overview" | "entry" | "leaderboard" | "rewards" | "rules";

function formatDateLabel(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function mapGuestCollectionToOptions(collection: MvpCollectionItem[]): LineupOption[] {
  const list: LineupOption[] = [];
  for (const row of collection) {
    const total = Math.max(1, row.instanceCount);
    for (let i = 0; i < total; i += 1) {
      list.push({
        instanceId: `guest-${row.templateId}-${i + 1}`,
        cardTemplateId: row.templateId,
        isLockedInOtherContest: false,
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

function getUserStatus(status: ContestStatus, hasEntry: boolean, selectedCount: number) {
  if (status === "SETTLED") return "Results available";
  if (status === "LIVE") return hasEntry ? "Contest live" : "Contest live (no team)";
  if (status === "LOCKED") return hasEntry ? "Team locked" : "No team selected";
  if (hasEntry) return "Team submitted";
  if (selectedCount > 0) return "Team drafted";
  return "No team selected";
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[] | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");
  const [builderMessage, setBuilderMessage] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const loadAll = useCallback(async () => {
    const [detailRes, rankingRes, optionsRes, rewardPreviewRes] = await Promise.all([
      fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" }),
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
        setSelected(detailPayload.userEntry.rosterLocks.map((row) => row.ownedCardInstanceId));
      }
    }

    if (rankingRes.ok) {
      const rankingPayload = (await rankingRes.json()) as RankingPayload;
      setRanking(rankingPayload);
    } else {
      setRanking({ rankings: [] });
    }

    if (rewardPreviewRes.ok) {
      const preview = (await rewardPreviewRes.json()) as RewardPreviewPayload;
      setRewardTiers(preview.tiers ?? []);
    } else {
      setRewardTiers([]);
    }

    if (optionsRes.ok) {
      const optionsPayload = (await optionsRes.json()) as { options: LineupOption[] };
      setOptions(optionsPayload.options ?? []);
    } else if (me?.mode === "guest") {
      setOptions(mapGuestCollectionToOptions(me.mvpCollection));
    }
  }, [me, params.contestId]);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("tab");
    if (qp === "overview" || qp === "entry" || qp === "leaderboard" || qp === "rewards" || qp === "rules") {
      setActiveTab(qp);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    setError("");
    void loadAll();
  }, [loadAll, loading]);

  const isGuest = !loading && me?.mode === "guest";

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const hasEntry = Boolean(detail?.userEntry);

  const filteredOptions = useMemo(
    () => (rule?.cardSetId ? options.filter((item) => item.cardSetId === rule.cardSetId) : options),
    [options, rule?.cardSetId],
  );

  const selectedCards = useMemo(
    () => Array.from({ length: maxRosterSize }).map((_, index) => filteredOptions.find((item) => item.instanceId === selected[index]) ?? null),
    [filteredOptions, maxRosterSize, selected],
  );

  const userStatus = detail ? getUserStatus(detail.contest.status, hasEntry, selected.filter(Boolean).length) : "";
  const myRankingRow = ranking?.rankings?.find((row) => row.userId === me?.user.id) ?? null;
  const canManageLineup = detail?.contest.status === "OPEN" && !isGuest;
  const filled = selectedCards.filter(Boolean).length;

  const openBuilder = () => {
    if (isGuest) return;
    setBuilderMessage("");
    setIsBuilderOpen(true);
    setActiveTab("entry");
  };

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    setActiveSlot(null);
  };

  const toggle = (instanceId: string) => {
    if (!canManageLineup) return;
    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const alreadyIn = next.indexOf(instanceId);
        if (alreadyIn >= 0) next.splice(alreadyIn, 1);
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
    if (!canManageLineup || filled !== maxRosterSize) return;
    setSubmitState("saving");
    setBuilderMessage("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setBuilderMessage(payload?.error ?? "Contest entry failed");
      setSubmitState("idle");
      return;
    }

    setBuilderMessage("Lineup saved and submitted successfully.");
    setSubmitState("idle");
    closeBuilder();
    await loadAll();
  };

  if (!detail) {
    return (
      <SiteShell>
        <section className="contest-detail-skeleton" aria-label="Loading contest detail">
          <div className="contest-detail-skeleton-hero" />
          <div className="contest-detail-skeleton-main" />
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {error ? <EmptyState title="Contest detail notice" description={error} /> : null}

      <Surface className="contest-detail-v4-hero" variant="highlight">
        <div className="contest-detail-v4-headline">
          <p className="mcg-eyebrow">{detail.contest.seasonName ?? "MCG Contest"}</p>
          <h1>{detail.contest.title}</h1>
          <p className="contest-inline-note">Code: {detail.contest.code} · League: {detail.contest.leagueTierRequired ?? "OPEN"}</p>
        </div>

        <div className="contest-detail-v4-hero-meta">
          <ContestStatusBadge status={detail.contest.status} />
          <div><span>Lock</span><strong>{formatDateLabel(detail.contest.lockAt)}</strong></div>
          <div><span>Live</span><strong>{formatDateLabel(detail.contest.liveAt)}</strong></div>
          <div><span>End</span><strong>{formatDateLabel(detail.contest.endsAt)}</strong></div>
          <div><span>Players</span><strong>{detail.contest._count.entries}</strong></div>
          <div><span>Lineup</span><strong>{maxRosterSize} cards</strong></div>
          <div><span>Rewards</span><strong>{rewardTiers?.length ? `${rewardTiers.length} tiers` : "Ranked drops + points"}</strong></div>
        </div>

        <div className="contest-detail-v4-status">
          <p className="mcg-eyebrow">Your status</p>
          <h3>{userStatus}</h3>
          <p className="contest-inline-note">{hasEntry ? "You already have an entry for this contest." : "No submitted entry yet."}</p>
          {detail.contest.status === "OPEN" ? (
            <button className="btn btn-primary contest-detail-v4-cta" onClick={openBuilder}>{hasEntry ? "Edit lineup" : "Build lineup"}</button>
          ) : (
            <button className="btn btn-primary contest-detail-v4-cta" onClick={() => setActiveTab("leaderboard")}>Track ranking</button>
          )}
        </div>
      </Surface>

      {builderMessage ? <p className="contest-inline-note contest-builder-inline-success">{builderMessage}</p> : null}

      <nav className="contest-detail-v4-tabs" aria-label="Contest details sections">
        {[
          ["overview", "Overview"],
          ["entry", "My Entry"],
          ["leaderboard", "Leaderboard"],
          ["rewards", "Rewards"],
          ["rules", "Rules"],
        ].map(([key, label]) => (
          <button key={key} className={`contest-tab-pill${activeTab === key ? " is-active" : ""}`} onClick={() => setActiveTab(key as DetailTab)}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="contest-detail-v4-grid">
          <Surface className="contest-detail-v4-panel" variant="raised">
            <p className="mcg-eyebrow">Contest summary</p>
            <h3>What happens now</h3>
            <ul className="contest-detail-v4-list">
              <li>Registration window: {detail.contest.status === "OPEN" ? "active" : "closed"}.</li>
              <li>Lineup lock: {formatDateLabel(detail.contest.lockAt)}.</li>
              <li>Contest live start: {formatDateLabel(detail.contest.liveAt)}.</li>
              <li>Final snapshot: {formatDateLabel(detail.contest.endsAt)}.</li>
            </ul>
          </Surface>
          <ContestRewardPreview rosterSize={maxRosterSize} entries={detail.contest._count.entries} tiers={rewardTiers} />
        </section>
      ) : null}

      {activeTab === "entry" ? (
        <section className="contest-detail-v4-grid">
          {!hasEntry ? (
            <Surface className="contest-detail-v4-panel" variant="raised">
              <p className="mcg-eyebrow">My entry</p>
              <h3>No team selected</h3>
              <p className="contest-inline-note">Create your lineup in the focused modal builder.</p>
              {detail.contest.status === "OPEN" ? <button className="btn btn-primary" onClick={openBuilder}>Build lineup</button> : null}
            </Surface>
          ) : (
            <EnteredLineupPanel selectedCards={selectedCards} />
          )}
        </section>
      ) : null}

      {activeTab === "leaderboard" ? (
        <section className="contest-detail-v4-grid">
          {detail.contest.status === "OPEN" || detail.contest.status === "LOCKED" ? (
            <Surface className="contest-detail-v4-panel" variant="raised">
              <p className="mcg-eyebrow">Leaderboard</p>
              <h3>Contest not started yet</h3>
              <p className="contest-inline-note">Rankings unlock after the contest goes live and scoring data is ready.</p>
            </Surface>
          ) : ranking?.rankings?.length ? (
            <>
              <LeaderboardCard rankings={ranking.rankings} currentUserId={me?.user.id} />
              {myRankingRow ? (
                <Surface className="contest-detail-v4-panel" variant="highlight">
                  <p className="mcg-eyebrow">Your placement</p>
                  <h3>#{myRankingRow.rank}</h3>
                  <p className="contest-inline-note">Current score: {myRankingRow.score.toFixed(2)}.</p>
                </Surface>
              ) : null}
            </>
          ) : (
            <Surface className="contest-detail-v4-panel" variant="raised">
              <p className="mcg-eyebrow">Leaderboard</p>
              <h3>Ranking pending</h3>
              <p className="contest-inline-note">Scoring is being finalized. Check back shortly.</p>
            </Surface>
          )}
        </section>
      ) : null}

      {activeTab === "rewards" ? (
        <section className="contest-detail-v4-grid">
          <ContestRewardPreview rosterSize={maxRosterSize} entries={detail.contest._count.entries} tiers={rewardTiers} />
        </section>
      ) : null}

      {activeTab === "rules" ? (
        <section className="contest-detail-v4-grid">
          <Surface className="contest-detail-v4-panel" variant="raised">
            <p className="mcg-eyebrow">Lineup rules</p>
            <ul className="contest-detail-v4-list">
              <li>Lineup size: exactly {maxRosterSize} cards.</li>
              <li>Eligibility: {rule?.cardSetId ? "restricted to the contest card set" : "all owned cards allowed"}.</li>
              <li>Edits are only available while contest state is OPEN.</li>
              <li>At LOCKED status, lineup changes are disabled.</li>
            </ul>
          </Surface>
        </section>
      ) : null}

      {isBuilderOpen ? (
        <div className="contest-modal-overlay contest-lineup-overlay" role="presentation" onClick={closeBuilder}>
          <div className="contest-modal contest-lineup-modal" role="dialog" aria-modal="true" aria-label="Build lineup" onClick={(event) => event.stopPropagation()}>
            <div className="contest-lineup-modal-head">
              <div>
                <p className="mcg-eyebrow">Lineup builder</p>
                <h2>{detail.contest.title}</h2>
                <p className="contest-inline-note">{filled}/{maxRosterSize} slots filled</p>
              </div>
              <button className="admin-v2-link-chip" onClick={closeBuilder}>Close</button>
            </div>

            <div className="contest-lineup-modal-layout">
              <section className="contest-builder-v4-slots">
                <p className="mcg-eyebrow">Selected lineup slots</p>
                <div className="contest-lineup-grid-v2 tcg-layout">
                  {Array.from({ length: maxRosterSize }).map((_, index) => (
                    <LineupSlot
                      key={index}
                      index={index}
                      card={selectedCards[index]}
                      canEdit={canManageLineup}
                      isActive={activeSlot === index}
                      onRemove={() => removeFromSlot(index)}
                      onOpenPicker={() => setActiveSlot(index)}
                    />
                  ))}
                </div>
              </section>

              <section className="contest-builder-v4-pool">
                <EligibleCardsPanel
                  options={filteredOptions}
                  selectedIds={selected}
                  activeSlot={activeSlot}
                  canManage={canManageLineup}
                  onAssign={(instanceId) => {
                    toggle(instanceId);
                    if (activeSlot !== null) setActiveSlot(null);
                  }}
                />
              </section>
            </div>

            <footer className="contest-lineup-modal-footer">
              <p className="contest-inline-note">Validation: {filled}/{maxRosterSize} slots filled.</p>
              <button className="btn btn-primary" onClick={() => void submitEntry()} disabled={!canManageLineup || filled !== maxRosterSize || submitState === "saving"}>
                {submitState === "saving" ? "Saving lineup…" : hasEntry ? "Save lineup" : "Submit lineup"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
