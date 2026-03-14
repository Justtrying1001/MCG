import Link from "next/link";
import { Surface } from "@/components/ui/Surface";

export function ContestResultPanel({ status, myRank, myScore }: { status: string; myRank: number | null; myScore: number | null }) {
  if (status !== "SETTLED") return null;

  return (
    <Surface className="contest-result-panel" variant="highlight">
      <p className="mcg-eyebrow">Contest settled</p>
      <h3 className="mcg-title">Final results</h3>
      <div className="contest-result-grid">
        <div><span>Final rank</span><strong>{myRank ? `#${myRank}` : "Pending"}</strong></div>
        <div><span>Final score</span><strong>{typeof myScore === "number" ? myScore.toFixed(2) : "Pending"}</strong></div>
      </div>
      <Link href="/contests" className="mcg-btn ghost">Explore next contests</Link>
    </Surface>
  );
}
