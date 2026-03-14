import { Surface } from "@/components/ui/Surface";

type RankingRow = { id: string; userId: string; rank: number; score: number; displayName?: string | null; xUsername?: string | null };

export function LeaderboardCard({ rankings, currentUserId }: { rankings: RankingRow[]; currentUserId?: string }) {
  if (!rankings.length) {
    return (
      <Surface className="contest-sidebar-panel leaderboard-panel" variant="raised">
        <p className="mcg-eyebrow">Leaderboard</p>
        <h4>Ranking pending</h4>
        <p className="contest-inline-note">Scores appear after end snapshot + scoring compute. Check back after contest end.</p>
      </Surface>
    );
  }

  return (
    <Surface className="contest-sidebar-panel leaderboard-panel" variant="raised">
      <p className="mcg-eyebrow">Leaderboard</p>
      <div className="contest-leaderboard-list-v2">
        {rankings.slice(0, 10).map((row) => {
          const isMe = row.userId === currentUserId;
          const label = row.displayName?.trim() || (row.xUsername ? `@${row.xUsername}` : `Player #${row.rank}`);
          return (
            <div key={row.id} className={`contest-leaderboard-row-v2${isMe ? " is-me" : ""}`}>
              <span>#{row.rank}</span>
              <span>{isMe ? "You" : label}</span>
              <strong>{row.score.toFixed(2)}</strong>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
