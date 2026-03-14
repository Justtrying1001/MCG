import Link from "next/link";
import { Surface } from "@/components/ui/Surface";

type RewardRow = {
  id: string;
  type: "POINTS" | "PACK" | "CARD_INSTANCE";
  amount: number | null;
  packDefinitionId: string | null;
};

type BreakdownRow = {
  id: string;
  tokenProjectId: string;
  baseScore: number;
  rarityMultiplier: number;
  editionMultiplier: number;
  finalScore: number;
  cardInstance: {
    id: string;
    cardTemplate: {
      name: string;
      imageUrl: string | null;
      tokenProject: { displayName: string };
    };
  };
};

export function ContestResultPanel({ status, myRank, myScore, rewards, breakdown, rankedUsers }: { status: string; myRank: number | null; myScore: number | null; rewards: RewardRow[]; breakdown: BreakdownRow[]; rankedUsers: number }) {
  const totalBreakdown = breakdown.reduce((sum, row) => sum + row.finalScore, 0);
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

  return (
    <Surface className="contest-result-panel" variant="highlight">
      <p className="mcg-eyebrow">Result</p>
      <h3 className="mcg-title">Final results</h3>
      <div className="contest-result-grid">
        <div><span>Final rank</span><strong>{myRank ? `#${myRank}` : "Pending"}</strong></div>
        <div><span>Final score</span><strong>{typeof myScore === "number" ? myScore.toFixed(2) : "Pending"}</strong></div>
        <div><span>Top %</span><strong>{myRank && rankedUsers > 0 ? `${Math.max(1, Math.round((myRank / rankedUsers) * 100))}%` : "—"}</strong></div>
      </div>
      {rewards.length > 0 ? (
        <div className="contest-result-grid contest-reward-grid">
          {rewards.map((reward) => (
            <div key={reward.id} className="contest-reward-card">
              <span>{reward.type === "POINTS" ? "🏅 POINTS" : reward.type === "PACK" ? "🎁 PACK" : "✨ CARD"}</span>
              <strong>
                {reward.type === "PACK"
                  ? `${reward.amount ?? 1}x pack`
                  : reward.type === "POINTS"
                    ? `${reward.amount ?? 0} pts`
                    : reward.amount ?? "Granted"}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="contest-inline-note">No reward grant recorded for your account on this contest.</p>
      )}
      {breakdown.length > 0 ? (
        <div className="contest-breakdown-list">
          {breakdown.slice(0, 5).map((row) => {
            const contribution = totalBreakdown > 0 ? Math.round((row.finalScore / totalBreakdown) * 100) : 0;
            return (
              <div key={row.id} className="contest-breakdown-row">
                <div className="contest-breakdown-head">
                  <span>{row.cardInstance.cardTemplate.name} · {row.cardInstance.cardTemplate.tokenProject.displayName}</span>
                  <strong>{row.finalScore.toFixed(2)}</strong>
                </div>
                <p className="contest-inline-note">{row.baseScore.toFixed(1)} × {row.rarityMultiplier.toFixed(2)} × {row.editionMultiplier.toFixed(2)}</p>
                <div className="contest-contribution-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={contribution}>
                  <span style={{ width: `${contribution}%` }} />
                </div>
                <p className="contest-inline-note">Contribution: {contribution}%</p>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="contest-inline-note">Your contest cards are unlocked and can now be reused in open contests.</p>
      <Link href="/contests" className="mcg-btn ghost">Explore next contests</Link>
    </Surface>
  );
}
