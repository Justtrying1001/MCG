import { Surface } from "@/components/ui/Surface";

export function ContestRewardPreview({ rosterSize, entries }: { rosterSize: number; entries: number }) {
  const points = Math.max(100, rosterSize * 40);
  const bonus = entries >= 20 ? "Rare card drop chance" : "Booster chance";
  const tier = entries >= 100 ? "High competition" : entries >= 30 ? "Mid competition" : "Early field";

  return (
    <Surface className="contest-sidebar-panel reward-panel" variant="raised">
      <p className="mcg-eyebrow">Reward outlook</p>
      <strong>{points} pts base</strong>
      <p className="contest-inline-note">{bonus}</p>
      <div className="contest-reward-mini-grid">
        <div><span>Field tier</span><strong>{tier}</strong></div>
        <div><span>Participants</span><strong>{entries}</strong></div>
      </div>
    </Surface>
  );
}
