import { Surface } from "@/components/ui/Surface";

type RankingRow = { id: string; userId: string; rank: number; score: number };

export function LeaderboardCard({ rankings, currentUserId }: { rankings: RankingRow[]; currentUserId?: string }) {
  if (!rankings.length) {
    return (
      <Surface className="contest-sidebar-panel">
        <p className="contest-inline-note">Leaderboard pending. Scores appear after recording.</p>
      </Surface>
    );
  }

  return (
    <Surface className="contest-sidebar-panel">
      <p className="mcg-eyebrow">Leaderboard</p>
      <div className="contest-leaderboard-list-v2">
        {rankings.map((row) => {
          const isMe = row.userId === currentUserId;
          return (
            <div key={row.id} className={`contest-leaderboard-row-v2${isMe ? " is-me" : ""}`}>
              <span>#{row.rank}</span>
              <span>{isMe ? "You" : `${row.userId.slice(0, 8)}…`}</span>
              <strong>{row.score.toFixed(2)}</strong>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
