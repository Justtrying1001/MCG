import Link from "next/link";
import { Surface } from "@/components/ui/Surface";

type MyRewards = { pointsTotal: number; xpTotal: number; packsTotal: number };

export function ContestResultPanel({
  status,
  myRank,
  myScore,
  myRewards,
}: {
  status: string;
  myRank: number | null;
  myScore: number | null;
  myRewards?: MyRewards | null;
}) {
  if (status !== "SETTLED") {
    if (status === "LIVE" || status === "LOCKED") {
      return (
        <Surface className="contest-result-panel" variant="raised">
          <p className="mcg-eyebrow">End phase</p>
          <h3 className="mcg-title">Scoring / result pending</h3>
          <p className="contest-inline-note">When the contest ends, scoring computes and the result phase appears here.</p>
        </Surface>
      );
    }
    return null;
  }

  const hasRewards = myRewards && (myRewards.pointsTotal > 0 || myRewards.xpTotal > 0 || myRewards.packsTotal > 0);

  return (
    <Surface className="contest-result-panel" variant="highlight">
      <p className="mcg-eyebrow">Result</p>
      <h3 className="mcg-title">Final results</h3>
      <div className="contest-result-grid">
        <div><span>Final rank</span><strong>{myRank ? `#${myRank}` : "Pending"}</strong></div>
        <div><span>Final score</span><strong>{typeof myScore === "number" ? myScore.toFixed(2) : "Pending"}</strong></div>
      </div>
      {hasRewards ? (
        <div className="contest-rewards-earned">
          <p className="mcg-eyebrow">Rewards earned</p>
          <div className="contest-result-grid">
            {myRewards.pointsTotal > 0 ? <div><span>Points</span><strong>+{myRewards.pointsTotal}</strong></div> : null}
            {myRewards.xpTotal > 0 ? <div><span>XP</span><strong>+{myRewards.xpTotal}</strong></div> : null}
            {myRewards.packsTotal > 0 ? <div><span>Packs</span><strong>{myRewards.packsTotal}</strong></div> : null}
          </div>
        </div>
      ) : myRank ? (
        <p className="contest-inline-note">No rewards assigned for your final rank.</p>
      ) : null}
      <Link href="/contests" className="mcg-btn ghost">Explore next contests</Link>
    </Surface>
  );
}
