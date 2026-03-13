export function ContestResultPanel({ status, myRank, myScore }: { status: string; myRank: number | null; myScore: number | null }) {
  if (status !== "SETTLED") return null;
  return (
    <section className="contest-info-panel">
      <h3 className="contest-section-title">Result snapshot</h3>
      <p className="contest-inline-note">Status: settled</p>
      <p className="contest-inline-note">Final rank: {myRank ? `#${myRank}` : "Pending"}</p>
      <p className="contest-inline-note">Final score: {typeof myScore === "number" ? myScore.toFixed(2) : "Pending"}</p>
    </section>
  );
}
