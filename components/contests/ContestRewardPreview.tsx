import { Surface } from "@/components/ui/Surface";

type RewardTier = { label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number };

export function ContestRewardPreview({
  rosterSize,
  entries,
  tiers,
}: {
  rosterSize: number;
  entries: number;
  tiers?: RewardTier[] | null;
}) {
  const tier = entries >= 100 ? "High battle activity" : entries >= 30 ? "Medium battle activity" : "Early field";

  if (tiers && tiers.length > 0) {
    return (
      <Surface className="contest-sidebar-panel reward-panel" variant="raised">
        <p className="mcg-eyebrow">Reward tiers</p>
        <div className="contest-reward-tiers">
          {tiers.map((t, index) => (
            <div key={index} className="contest-reward-tier-row">
              <span>{t.label}</span>
              <div className="contest-reward-tier-amounts">
                {t.pointsAmount > 0 ? <strong>{t.pointsAmount} pts</strong> : null}
                {t.xpAmount > 0 ? <span>+{t.xpAmount} XP</span> : null}
                {t.packsCount > 0 ? <span>{t.packsCount} pack{t.packsCount > 1 ? "s" : ""}</span> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="contest-reward-mini-grid">
          <div><span>Field tier</span><strong>{tier}</strong></div>
          <div><span>Participants</span><strong>{entries}</strong></div>
        </div>
      </Surface>
    );
  }

  // Fallback: no published reward policy yet
  const points = Math.max(100, rosterSize * 40);
  const bonus = entries >= 20 ? "Rare card drop chance" : "Booster chance";

  return (
    <Surface className="contest-sidebar-panel reward-panel" variant="raised">
      <p className="mcg-eyebrow">Reward outlook</p>
      <strong>{points} pts est.</strong>
      <p className="contest-inline-note">{bonus}</p>
      <div className="contest-reward-mini-grid">
        <div><span>Field tier</span><strong>{tier}</strong></div>
        <div><span>Participants</span><strong>{entries}</strong></div>
      </div>
    </Surface>
  );
}
