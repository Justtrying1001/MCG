export function ContestRewardPreview({ rosterSize, entries }: { rosterSize: number; entries: number }) {
  const points = Math.max(100, rosterSize * 40);
  const bonus = entries >= 20 ? "Rare card drop" : "Booster chance";
  return (
    <div className="contest-reward-preview" role="note">
      <p className="contest-meta-label">Rewards</p>
      <p className="contest-meta-value">{points} pts + {bonus}</p>
    </div>
  );
}
