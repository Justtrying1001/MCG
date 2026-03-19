import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import type { ContestListItem, ContestRule } from "@/components/contests/types";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import { getPhaseLabel, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";

function getContestCoverImage(rule?: ContestRule) {
  const image = rule?.config?.coverImageUrl?.trim();
  return image && image.length > 0 ? image : null;
}

function getEntryFeeLabel(rule?: ContestRule) {
  return rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
}

function getRewardHighlight(contest: ContestListItem, rosterSize: number) {
  const topPercent = contest.rules[0]?.config?.rewardConfig?.rewardedTopPercent ?? 25;
  const pointsPool = contest.rules[0]?.config?.rewardConfig?.pointsPool;
  const packPool = contest.rules[0]?.config?.rewardConfig?.packPool;
  const fallbackPoints = Math.max(100, rosterSize * 40);

  const rewards: string[] = [];
  rewards.push(`${pointsPool ?? fallbackPoints} pts`);
  if ((packPool ?? 0) > 0) rewards.push(`${packPool} Pack${packPool === 1 ? "" : "s"}`);

  return `Top ${topPercent}% → ${rewards.join(" + ")}`;
}

function getFallbackToken(contest: ContestListItem) {
  return (contest.seasonName ?? contest.code ?? "MCG").slice(0, 3).toUpperCase();
}

export function ContestTile({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const rule = contest.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const countDown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);
  const coverImageUrl = getContestCoverImage(rule);
  const entryFee = getEntryFeeLabel(rule);
  const rewardHighlight = getRewardHighlight(contest, rosterSize);
  const metaItems = [`⏱ ${countDown}`, `👥 ${contest._count.entries}`, `🎟 ${entryFee}`];
  const fallbackToken = getFallbackToken(contest);

  return (
    <Surface as="article" className="contest-grid-card contest-grid-card-premium" variant="raised">
      <div
        className={`contest-grid-card-hero${coverImageUrl ? " has-image" : " is-fallback"}`}
        style={coverImageUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 8, 16, 0.12) 0%, rgba(5, 8, 16, 0.28) 38%, rgba(5, 8, 16, 0.88) 100%), url(${coverImageUrl})` } : undefined}
      >
        <div className="contest-grid-card-hero-top">
          <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
        </div>

        {!coverImageUrl ? (
          <div className="contest-grid-card-fallback-mark" aria-hidden>
            <span>{fallbackToken}</span>
            <small>{contest.seasonName ?? "Meme Card Game"}</small>
          </div>
        ) : null}
      </div>

      <div className="contest-grid-card-body">
        <div className="contest-grid-card-title-block">
          <h3 className="contest-grid-card-title">{contest.title}</h3>
          <p className="contest-grid-card-subtitle">{contest.code}</p>
        </div>

        <p className="contest-grid-card-meta" aria-label="Contest quick facts">
          {metaItems.join(" • ")}
        </p>

        <div className="contest-grid-card-reward" aria-label="Reward highlight">
          <span className="contest-grid-card-reward-label">🏆 Reward</span>
          <strong>{rewardHighlight}</strong>
        </div>

        <div className="contest-grid-card-footer">
          <Link href={`/contests/${contest.id}`} className="mcg-btn primary contest-grid-card-cta">
            {getPrimaryCtaLabel(contest.status)}
          </Link>
        </div>
      </div>
    </Surface>
  );
}
