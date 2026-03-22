import Image from "next/image";
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
    return "Open";
  }

  if (group === "upcoming") {
    return contest.userEntry ? "Lineup" : "Register";
  }

  return "Open";
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

function getContestImage(contest: ContestListItem) {
  return contest.rules[0]?.config?.coverImageUrl ?? null;
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
  const contestImage = getContestImage(contest);
  const detailItems = [
    { label: "Start", value: timing.value },
    { label: "Entry", value: getEntryLabel(rule) },
    {
      label: "Players",
      value:
        contest._count.entries > 0
          ? `${contest._count.entries.toLocaleString()} joined`
          : "No entries yet",
    },
  ];

  return (
    <Surface
      as="article"
      variant="raised"
      className={`contest-lobby-card contest-lobby-card-${group} contest-lobby-card-${contest.status.toLowerCase()}`}
    >
      <div className="contest-lobby-card-media">
        {contestImage ? (
          <Image
            src={contestImage}
            alt={`${contest.title} cover`}
            className="contest-lobby-card-image"
            width={640}
            height={480}
            unoptimized
          />
        ) : (
          <div className="contest-lobby-card-image contest-lobby-card-image-fallback">
            <span>{contest.code}</span>
            <strong>{getContestTypeLabel(contest)}</strong>
          </div>
        )}
      </div>

      <div className="contest-lobby-card-body">
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
        </div>

        <p className="contest-lobby-card-copy">
          {timing.label}: {timing.value}
        </p>

        <div className="contest-lobby-card-meta-list" aria-label="Contest quick details">
          {detailItems.map((item) => (
            <div key={item.label} className="contest-lobby-card-meta-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="contest-lobby-card-panel contest-lobby-card-panel-highlight">
          <span>Reward</span>
          <strong>{rewardHighlight}</strong>
          <small>
            {bonusSummary
              ? `Bonus: ${bonusSummary}`
              : `${rosterSize}-card lineup · ${getLeagueTierLabel(contest)} tier`}
          </small>
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
      </div>
    </Surface>
  );
}
