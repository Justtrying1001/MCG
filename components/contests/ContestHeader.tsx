import type { ContestStatItem } from "@/components/contests/ContestStats";
import { ContestStats } from "@/components/contests/ContestStats";

export function ContestHeader({ stats }: { stats: ContestStatItem[] }) {
  return (
    <header className="contest-arena-header">
      <div className="contest-arena-header-copy">
        <p className="mcg-eyebrow">Tournament Hub</p>
        <h1>Contest Arena</h1>
        <p>Compete. Rank. Earn rewards.</p>
      </div>

      <ContestStats items={stats} />
    </header>
  );
}
