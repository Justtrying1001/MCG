import Link from "next/link";
import type {
  ContestListItem,
  ContestRule,
  ContestStatus,
} from "@/components/contests/types";
import {
  buildContestBonusRewardSummary,
  parseContestBonusRewards,
} from "@/components/contests/bonusRewards";
import {
  getContestStateMessaging,
  getPhaseLabel,
} from "@/components/contests/contestLifecycle";
import {
  formatCountdown,
  formatDate,
  getTargetDate,
} from "@/components/contests/contestUtils";
import { Chip } from "@/components/ui/Chip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";

type ContestCardGroup = "active" | "upcoming" | "completed";

function getEntryLabel(rule?: ContestRule) {
  if (!rule?.entryFeeEnabled) return "Free entry";
  return `${rule.entryFeeAmount ?? 0} pts entry`;
}

function getRewardHighlight(contest: ContestListItem, rosterSize: number) {
  const rewardConfig = contest.rules[0]?.config?.rewardConfig;
  const topPercent = rewardConfig?.rewardedTopPercent ?? 25;
  const pointsPool = rewardConfig?.pointsPool;
  const packPool = rewardConfig?.packPool;
  const fallbackPoints =
    contest.rewardPreview?.amount ?? Math.max(100, rosterSize * 40);

  if (pointsPool || packPool) {
    const rewards: string[] = [];
    rewards.push(`${pointsPool ?? fallbackPoints} pts`);
    if ((packPool ?? 0) > 0)
      rewards.push(`${packPool} pack${packPool === 1 ? "" : "s"}`);
    return `Top ${topPercent}% · ${rewards.join(" + ")}`;
  }

  return (
    contest.rewardPreview?.label ?? `Top ${topPercent}% · ${fallbackPoints} pts`
  );
}

function toBadgeTone(status: ContestStatus) {
  if (status === "OPEN") return "open";
  if (status === "LIVE") return "live";
  if (status === "LOCKED") return "locked";
  return "settled";
}

function getGroupCta(group: ContestCardGroup, contest: ContestListItem) {
  if (group === "active") {
    return contest.userEntry ? "View" : "Enter";
  }

  if (group === "upcoming") {
    return contest.userEntry ? "Prepare" : "Register";
  }

  return "View results";
}

function getTimingLabel(
  group: ContestCardGroup,
  contest: ContestListItem,
  nowTs: number,
) {
  if (group === "upcoming") {
    return {
      label: "Starts",
      value: formatDate(contest.liveAt ?? contest.lockAt),
    };
  }

  if (group === "completed") {
    return {
      label: "Ended",
      value: formatDate(contest.endsAt),
    };
  }

  return {
    label: "Time left",
    value: formatCountdown(
      getTargetDate(contest.status, contest.lockAt, contest.endsAt),
      nowTs,
    ),
  };
}

function getContestTypeLabel(contest: ContestListItem) {
  return contest.seasonName ?? contest.code;
}

function getLeagueTierLabel(contest: ContestListItem) {
  return contest.leagueTierRequired ?? "OPEN";
}

export function ContestCard({
  contest,
  group,
  nowTs,
}: {
  contest: ContestListItem;
  group: ContestCardGroup;
  nowTs: number;
}) {
  const rule = contest.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const rewardHighlight = getRewardHighlight(contest, rosterSize);
  const timing = getTimingLabel(group, contest, nowTs);
  const stateMessaging = getContestStateMessaging(contest.status);
  const bonusSummary = buildContestBonusRewardSummary(
    parseContestBonusRewards(rule?.config?.bonusRewards),
  );
  const ctaLabel = getGroupCta(group, contest);

  return (
    <Surface
      as="article"
      variant="raised"
      className={`contest-lobby-card contest-lobby-card-${group} contest-lobby-card-${contest.status.toLowerCase()}`}
    >
      <div className="contest-lobby-card-accent-bar" aria-hidden="true" />
      <div className="contest-lobby-card-topline">
        <span className="contest-lobby-card-code">{contest.code}</span>
        <StatusBadge
          tone={toBadgeTone(contest.status)}
          label={getPhaseLabel(contest.status)}
        />
      </div>

      <div className="contest-lobby-card-head">
        <div>
          <p className="contest-lobby-card-kicker">
            {getContestTypeLabel(contest)}
          </p>
          <h3>{contest.title}</h3>
        </div>
        <div className="contest-lobby-card-timing">
          <span>{timing.label}</span>
          <strong>{timing.value}</strong>
        </div>
      </div>

      <p className="contest-lobby-card-copy">{stateMessaging.helper}</p>

      <div className="contest-lobby-card-chips" aria-label="Contest tags">
        <Chip label={getLeagueTierLabel(contest)} />
        <Chip label={getEntryLabel(rule)} />
        <Chip label={`${rosterSize} card lineup`} />
        <Chip label={`${contest._count.entries} players`} />
      </div>

      <div
        className="contest-lobby-card-grid"
        aria-label="Contest quick details"
      >
        <div className="contest-lobby-card-panel">
          <span>Type / tier</span>
          <strong>{getContestTypeLabel(contest)}</strong>
          <small>{getLeagueTierLabel(contest)} access</small>
        </div>
        <div className="contest-lobby-card-panel">
          <span>Entry</span>
          <strong>{getEntryLabel(rule)}</strong>
          <small>
            {contest.userEntry ? "Lineup on file" : "No lineup submitted yet"}
          </small>
        </div>
        <div className="contest-lobby-card-panel contest-lobby-card-panel-highlight">
          <span>Reward highlight</span>
          <strong>{rewardHighlight}</strong>
          <small>
            {bonusSummary
              ? `Bonus: ${bonusSummary}`
              : "Standard placement rewards"}
          </small>
        </div>
      </div>

      <div className="contest-lobby-card-footer">
        <div className="contest-lobby-card-status-copy">
          <span>Status</span>
          <strong>{stateMessaging.shortLabel}</strong>
        </div>

        <Link
          href={`/contests/${contest.id}`}
          className="mcg-btn primary contest-lobby-card-cta"
          aria-label={`${ctaLabel} ${contest.title}`}
        >
          {ctaLabel}
        </Link>
      </div>
    </Surface>
  );
}
