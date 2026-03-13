type RankingRow = { id: string; userId: string; rank: number; score: number };

export function LeaderboardCard({ rankings, currentUserId }: { rankings: RankingRow[]; currentUserId?: string }) {
  if (!rankings.length) {
    return <p className="contest-inline-note">Ranking is not available yet. Scores will appear once recorded.</p>;
  }

  return (
    <div className="leaderboard-card">
      {rankings.map((row) => {
        const me = row.userId === currentUserId;
        return (
          <div key={row.id} className={`leaderboard-row${me ? " is-me" : ""}`}>
            <span>#{row.rank}</span>
            <span>{me ? "You" : `${row.userId.slice(0, 8)}…`}</span>
            <strong>{row.score.toFixed(2)}</strong>
          </div>
        );
      })}
    </div>
  );
}
