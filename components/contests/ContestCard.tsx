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
import { getPhaseLabel } from "@/components/contests/contestLifecycle";
import {
  formatCountdown,
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

function formatUtcTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

function formatCountdownShort(targetDate: string | null, nowTs: number) {
  if (!targetDate) return "Starts soon";
  const diffMs = new Date(targetDate).getTime() - nowTs;
  if (diffMs <= 0) return "Starting now";
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  return `Starts in ${hours}h ${minutes}m`;
}

function toBadgeTone(status: ContestStatus) {
  if (status === "OPEN") return "open";
  if (status === "LIVE") return "live";
  if (status === "LOCKED") return "locked";
  return "settled";
}

function getStatusChipLabel(status: ContestStatus) {
  return status === "OPEN" ? "OPEN" : "CLOSED";
}

function getGroupCta(group: ContestCardGroup, contest: ContestListItem) {
  if (group === "active") {
    return "Open";
  }

  if (group === "upcoming") {
    return contest.userEntry ? "Lineup" : "Enter battle";
  }

  return "Open";
}

function getTimingLabel(
  group: ContestCardGroup,
  contest: ContestListItem,
  nowTs: number,
) {
  if (group === "upcoming") {
    const startsAt = contest.liveAt ?? contest.lockAt;
    return {
      label: "Start",
      value: formatCountdownShort(startsAt, nowTs),
      secondary: formatUtcTimestamp(startsAt),
    };
  }

  if (group === "completed") {
    return {
      label: "Ended",
      value: formatUtcTimestamp(contest.endsAt),
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

function getLeagueTierLabel(contest: ContestListItem) {
  return contest.leagueTierRequired ?? "Open to all";
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
  const bonusSummary = buildContestBonusRewardSummary(
    parseContestBonusRewards(rule?.config?.bonusRewards),
  );
  const rewardMain = rewardHighlight.includes("·")
    ? rewardHighlight.split("·")[1]?.trim() ?? rewardHighlight
    : rewardHighlight;
  const rewardSecondary = rewardHighlight.includes("·")
    ? rewardHighlight.split("·")[0]?.trim() ?? null
    : bonusSummary ?? `Top rewards for ${rosterSize}-card lineups`;
  const timing = getTimingLabel(group, contest, nowTs);
  const ctaLabel = getGroupCta(group, contest);
  const contestImage = getContestImage(contest);
  const phaseLabel = getPhaseLabel(contest.status);
  const detailItems = [
    { label: timing.label, value: timing.value, secondary: timing.secondary },
    { label: "Entry", value: getEntryLabel(rule) },
    {
      label: "Players",
      value:
        contest._count.entries > 0
          ? `${contest._count.entries.toLocaleString()} players`
          : "No players yet",
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
            width={720}
            height={720}
            unoptimized
          />
        ) : (
          <div className="contest-lobby-card-image contest-lobby-card-image-fallback">
            <div className="contest-lobby-card-image-fallback-copy">
              <span className="contest-lobby-card-code">{contest.code}</span>
              <strong>{contest.title}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="contest-lobby-card-body">
        <div className="contest-lobby-card-head">
          <h3>{contest.title}</h3>
          <StatusBadge
            tone={toBadgeTone(contest.status)}
            label={getStatusChipLabel(contest.status)}
          />
        </div>

        <div className="contest-lobby-card-meta-list" aria-label="Battle quick details">
          {detailItems.map((item) => (
            <div key={item.label} className="contest-lobby-card-meta-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.secondary ? (
                <small className="contest-lobby-card-meta-secondary">
                  {item.secondary}
                </small>
              ) : null}
            </div>
          ))}
        </div>

        <div
          className="contest-lobby-card-reward"
          aria-label={`Reward summary for ${contest.title}`}
        >
          <span className="contest-lobby-card-reward-label">Reward</span>
          <div className="contest-lobby-card-reward-copy">
            <strong>{rewardMain}</strong>
            <small>{rewardSecondary}</small>
          </div>
        </div>

        <div className="contest-lobby-card-footer">
          <div className="contest-lobby-card-status-copy">
            <span>{phaseLabel}</span>
            <strong>
              {bonusSummary
                ? `Bonus: ${bonusSummary}`
                : `${rosterSize}-card lineup · ${getLeagueTierLabel(contest)} tier`}
            </strong>
          </div>

          <div className="contest-lobby-card-actions">
            <Link
              href={`/contests/${contest.id}`}
              className="mcg-btn primary contest-lobby-card-cta"
              aria-label={`${ctaLabel} ${contest.title}`}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </Surface>
  );
}
