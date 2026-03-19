import Link from "next/link";
import { memo } from "react";
import { Surface } from "@/components/ui/Surface";
import { ContestCountdown } from "@/components/contests/ContestCountdown";
import type { ContestListItem, ContestRule } from "@/components/contests/types";
import { getPhaseLabel, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";

function getContestCoverImage(rule?: ContestRule) {
  const image = rule?.config?.coverImageUrl?.trim();
  return image && image.length > 0 ? image : null;
}

function getEntryFeeLabel(rule?: ContestRule) {
  return rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
}

function getRewardHighlight(contest: ContestListItem, rosterSize: number) {
  const rewardConfig = contest.rules[0]?.config?.rewardConfig;
  const topPercent = rewardConfig?.rewardedTopPercent ?? 25;
  const pointsPool = rewardConfig?.pointsPool;
  const packPool = rewardConfig?.packPool;
  const fallbackPoints = contest.rewardPreview?.amount ?? Math.max(100, rosterSize * 40);

  if (pointsPool || packPool) {
    const rewards: string[] = [];
    rewards.push(`${pointsPool ?? fallbackPoints} pts`);
    if ((packPool ?? 0) > 0) rewards.push(`${packPool} Pack${packPool === 1 ? "" : "s"}`);
    return `Top ${topPercent}% → ${rewards.join(" + ")}`;
  }

  return contest.rewardPreview?.label ?? `Top ${topPercent}% → ${fallbackPoints} pts`;
}

function getFallbackToken(contest: ContestListItem) {
  return (contest.seasonName ?? contest.code ?? "MCG").slice(0, 3).toUpperCase();
}

function getHeroEyebrow(contest: ContestListItem) {
  if (contest.status === "OPEN") return contest.seasonName ?? "Open contest";
  if (contest.status === "LOCKED" || contest.status === "LIVE") return "Contest in progress";
  if (contest.status === "SETTLED") return "Final results";
  return contest.seasonName ?? "Meme Card Game";
}

function ContestTileComponent({ contest }: { contest: ContestListItem }) {
  const rule = contest.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const coverImageUrl = getContestCoverImage(rule);
  const entryFee = getEntryFeeLabel(rule);
  const rewardHighlight = getRewardHighlight(contest, rosterSize);
  const fallbackToken = getFallbackToken(contest);
  const heroEyebrow = getHeroEyebrow(contest);

  return (
    <Surface as="article" className={`contest-grid-card contest-grid-card-premium tone-${contest.status.toLowerCase()}`} variant="raised">
      <div
        className={`contest-grid-card-hero${coverImageUrl ? " has-image" : " is-fallback"}`}
        style={coverImageUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 8, 16, 0.12) 0%, rgba(5, 8, 16, 0.28) 38%, rgba(5, 8, 16, 0.88) 100%), url(${coverImageUrl})` } : undefined}
      >
        <div className="contest-grid-card-hero-top">
          <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
        </div>

        <div className="contest-grid-card-hero-copy" aria-hidden={Boolean(coverImageUrl)}>
          <p>{heroEyebrow}</p>
          {!coverImageUrl ? (
            <div className="contest-grid-card-fallback-mark" aria-hidden>
              <span>{fallbackToken}</span>
              <small>{contest.seasonName ?? "Meme Card Game"}</small>
            </div>
          ) : null}
        </div>
      </div>

      <div className="contest-grid-card-body">
        <div className="contest-grid-card-title-block">
          <p className="contest-grid-card-subtitle">{contest.code}</p>
          <h3 className="contest-grid-card-title">{contest.title}</h3>
        </div>

        <div className="contest-grid-card-meta" aria-label="Contest quick facts">
          <ContestCountdown status={contest.status} lockAt={contest.lockAt} endsAt={contest.endsAt} />
          <span>👥 {contest._count.entries}</span>
          <span>🎟 {entryFee}</span>
        </div>

        <div className="contest-grid-card-reward" aria-label="Reward highlight">
          <span className="contest-grid-card-reward-label">🏆 Reward</span>
          <strong>{rewardHighlight}</strong>
        </div>

        <div className="contest-grid-card-footer">
          <Link href={`/contests/${contest.id}`} className="mcg-btn primary contest-grid-card-cta" aria-label={`Open contest ${contest.title}`}>
            {getPrimaryCtaLabel(contest.status)}
          </Link>
        </div>
      </div>
    </Surface>
  );
}

export const ContestTile = memo(ContestTileComponent);
