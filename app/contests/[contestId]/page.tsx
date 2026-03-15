"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import { ContestStatusBadge } from "@/components/contests/ContestStatusBadge";
import { EnteredLineupPanel } from "@/components/contests/EnteredLineupPanel";
import { LeaderboardCard } from "@/components/contests/LeaderboardCard";
import { ContestRewardPreview } from "@/components/contests/ContestRewardPreview";
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

type CtaConfig = { label: string; href?: string; tab?: DetailTab };

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

function getPrimaryCta(args: { status: ContestStatus; hasEntry: boolean; isGuest: boolean; contestId: string }): CtaConfig {
  if (args.isGuest) return { label: "Connect with X to enter" };
  if (args.status === "SETTLED") return { label: "View results", tab: "leaderboard" };
  if (args.status === "LIVE") return { label: "Track contest", tab: "leaderboard" };
  if (args.status === "LOCKED") return { label: "View my team", tab: "entry" };
  if (args.hasEntry) return { label: "Edit lineup", href: `/contests/${args.contestId}/lineup` };
  return { label: "Build lineup", href: `/contests/${args.contestId}/lineup` };
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[] | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("tab");
    if (qp === "overview" || qp === "entry" || qp === "leaderboard" || qp === "rewards" || qp === "rules") {
      setActiveTab(qp);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    void (async () => {
      setError("");
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
          setSelected(detailPayload.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
        }
      }

      if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);
      if (rewardPreviewRes.ok) {
        const rp = (await rewardPreviewRes.json()) as RewardPreviewPayload;
        if (rp.hasPolicyData) setRewardTiers(rp.tiers);
      }
      if (optionsRes.ok) {
        const payload = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(payload.options ?? []);
      } else if (me?.mode === "guest") {
        setOptions(mapGuestCollectionToOptions(me.mvpCollection));
      }
    })();
  }, [loading, me, params.contestId]);

  const isGuest = !loading && me?.mode === "guest";

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

  const rule = detail.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const filteredOptions = rule?.cardSetId ? options.filter((item) => item.cardSetId === rule.cardSetId) : options;
  const selectedCards = Array.from({ length: maxRosterSize }).map((_, index) => {
    const id = selected[index];
    return filteredOptions.find((option) => option.instanceId === id) ?? null;
  });
  const hasEntry = Boolean(detail.userEntry);
  const userStatus = getUserStatus(detail.contest.status, hasEntry, selected.length);
  const primaryCta = getPrimaryCta({ status: detail.contest.status, hasEntry, isGuest: Boolean(isGuest), contestId: detail.contest.id });
  const myRankingRow = ranking?.rankings?.find((row) => row.userId === me?.user.id) ?? null;

  return (
    <SiteShell>
      {isGuest ? <EmptyState title="Guest mode preview" description="Connect with X to submit lineup and appear on ranking." /> : null}
      {error ? <EmptyState title="Contest notice" description={error} /> : null}

      <Surface className="contest-detail-v4-hero" variant="raised">
        <div className="contest-detail-v4-main">
          <div className="contest-detail-v4-head">
            <p className="mcg-eyebrow">Contest {detail.contest.code}</p>
            <ContestStatusBadge status={detail.contest.status} />
          </div>
          <h1>{detail.contest.title}</h1>
          <p className="contest-detail-v4-desc">
            {detail.contest.seasonName
              ? `${detail.contest.seasonName} showdown. Draft your strongest ${maxRosterSize}-card lineup and compete for ranked rewards.`
              : `Draft your strongest ${maxRosterSize}-card lineup and compete for ranked rewards.`}
          </p>
          <div className="contest-detail-v4-metrics">
            <div><span>Registration</span><strong>{detail.contest.status === "OPEN" ? "Open now" : "Closed"}</strong></div>
            <div><span>Team lock / start</span><strong>{formatDateLabel(detail.contest.lockAt ?? detail.contest.liveAt)}</strong></div>
            <div><span>Contest end</span><strong>{formatDateLabel(detail.contest.endsAt)}</strong></div>
            <div><span>Entry fee</span><strong>See rules</strong></div>
            <div><span>Lineup size</span><strong>{maxRosterSize} cards</strong></div>
            <div><span>Rewards</span><strong>{rewardTiers?.length ? `${rewardTiers.length} tiers` : "Ranked drops + points"}</strong></div>
          </div>
        </div>
        <div className="contest-detail-v4-status">
          <p className="mcg-eyebrow">Your status</p>
          <h3>{userStatus}</h3>
          <p className="contest-inline-note">{hasEntry ? "You already have an entry for this contest." : "No submitted entry yet."}</p>
          {primaryCta.href ? (
            <Link href={primaryCta.href} className="btn btn-primary contest-detail-v4-cta">{primaryCta.label}</Link>
          ) : (
            <button className="btn btn-primary contest-detail-v4-cta" onClick={() => primaryCta.tab && setActiveTab(primaryCta.tab)}>{primaryCta.label}</button>
          )}
        </div>
      </Surface>

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
            <p className="contest-inline-note">Status: {detail.contest.status}. Participants: {detail.contest._count.entries}. League: {detail.contest.leagueTierRequired ?? "OPEN"}.</p>
            <ul className="contest-detail-v4-list">
              <li>Registration window: {detail.contest.status === "OPEN" ? "active" : "closed"}.</li>
              <li>Lineup lock: {formatDateLabel(detail.contest.lockAt)}.</li>
              <li>Contest live start: {formatDateLabel(detail.contest.liveAt)}.</li>
              <li>Final snapshot: {formatDateLabel(detail.contest.endsAt)}.</li>
            </ul>
          </Surface>
          <Surface className="contest-detail-v4-panel" variant="raised">
            <p className="mcg-eyebrow">Action</p>
            <h3>{primaryCta.label}</h3>
            <p className="contest-inline-note">Use this action as your next step for this contest state.</p>
            {primaryCta.href ? <Link href={primaryCta.href} className="btn btn-primary">{primaryCta.label}</Link> : null}
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
              <p className="contest-inline-note">Create your lineup in the focused builder experience.</p>
              {detail.contest.status === "OPEN" ? <Link href={`/contests/${detail.contest.id}/lineup`} className="btn btn-primary">Build lineup</Link> : null}
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
          <Surface className="contest-detail-v4-panel" variant="raised">
            <p className="mcg-eyebrow">Reward structure</p>
            <h3>By rank / tier</h3>
            <p className="contest-inline-note">Entry fees and payout logic are enforced by backend policy. This tab surfaces the user-facing reward tiers.</p>
          </Surface>
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
          <Surface className="contest-detail-v4-panel" variant="raised">
            <p className="mcg-eyebrow">Timing + scoring notes</p>
            <ul className="contest-detail-v4-list">
              <li>Team lock / start: {formatDateLabel(detail.contest.lockAt ?? detail.contest.liveAt)}.</li>
              <li>Contest end snapshot: {formatDateLabel(detail.contest.endsAt)}.</li>
              <li>Scoring breakdown and final rankings appear after settlement.</li>
            </ul>
          </Surface>
        </section>
      ) : null}
    </SiteShell>
  );
}
