import { Surface } from "@/components/ui/Surface";

export function ContestRewardPreview({ rosterSize, entries }: { rosterSize: number; entries: number }) {
  const points = Math.max(100, rosterSize * 40);
  const bonus = entries >= 20 ? "Rare card drop" : "Booster chance";

  return (
    <Surface className="contest-sidebar-panel">
      <p className="mcg-eyebrow">Reward preview</p>
      <strong>{points} pts</strong>
      <p className="contest-inline-note">{bonus}</p>
    </Surface>
  );
}
