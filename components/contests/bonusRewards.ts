export type ContestBonusReward = {
  id?: string;
  targetRank: number;
  rewardType: "SOL" | "CUSTOM" | "MANUAL_PAYOUT";
  amount: string;
  note: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseContestBonusRewards(value: unknown): ContestBonusReward[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const raw = row as Record<string, unknown>;
    const rewardType = raw.rewardType;
    if (rewardType !== "SOL" && rewardType !== "CUSTOM" && rewardType !== "MANUAL_PAYOUT") return [];

    const rankValue = Number(raw.targetRank);
    const targetRank = Number.isInteger(rankValue) ? rankValue : Number.parseInt(normalizeText(raw.targetRank), 10);
    if (!Number.isInteger(targetRank) || targetRank <= 0) return [];

    return [{
      id: normalizeText(raw.id) || undefined,
      targetRank,
      rewardType,
      amount: normalizeText(raw.amount),
      note: normalizeText(raw.note),
    } satisfies ContestBonusReward];
  }).sort((a, b) => a.targetRank - b.targetRank || a.rewardType.localeCompare(b.rewardType));
}

export function formatContestPlacement(rank: number) {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th place`;
  const mod10 = rank % 10;
  if (mod10 === 1) return `${rank}st place`;
  if (mod10 === 2) return `${rank}nd place`;
  if (mod10 === 3) return `${rank}rd place`;
  return `${rank}th place`;
}

export function formatContestBonusRewardValue(reward: ContestBonusReward) {
  const amount = reward.amount.trim();
  const note = reward.note.trim();

  if (reward.rewardType === "SOL") {
    if (amount) return `${amount} SOL`;
    return note || "SOL bonus";
  }

  if (reward.rewardType === "CUSTOM") {
    return note || amount || "Custom reward";
  }

  return note || amount || "Manual payout";
}

export function buildContestBonusRewardSummary(rewards: ContestBonusReward[]) {
  if (rewards.length === 0) return null;
  if (rewards.length === 1) {
    const reward = rewards[0]!;
    return `${formatContestPlacement(reward.targetRank)}: ${formatContestBonusRewardValue(reward)}`;
  }
  return `${rewards.length} bonus rewards`;
}
