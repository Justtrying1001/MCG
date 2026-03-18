import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCardView } from "@/types/cards";

type RecentPullItem = {
  id: string;
  openedAt: string;
  playerName: string;
  card: MvpCardView;
};

function formatRelativeTime(isoDate: string) {
  const parsed = new Date(isoDate).getTime();
  if (!Number.isFinite(parsed)) return "just now";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSeconds < 15) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentPullsRail({ pulls }: { pulls: RecentPullItem[] }) {
  const hasPulls = pulls.length > 0;

  return (
    <Surface className="mcg-anim-fade-up recent-pulls-panel" variant="raised">
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Live activity"
          title="Recent pulls"
          subtitle="Fresh reveals from active players across the game."
          actions={<Link href="/packs" className="mcg-btn ghost">Open packs</Link>}
        />
        {hasPulls ? (
          <div className="mcg-recent-pulls-rail" aria-label="Recent pulls feed">
            {pulls.map((pull) => (
              <article key={pull.id} className="mcg-recent-pull-item">
                <div className="mcg-recent-pull-card-wrap">
                  <MvpCardTile card={pull.card} variant="canonical" interactive={false} />
                </div>
                <div className="mcg-recent-pull-meta">
                  <strong>{pull.card.displayName}</strong>
                  <span>
                    {pull.card.rarity} · {pull.card.setEditionLabel ?? pull.card.edition}
                  </span>
                  <span>
                    {pull.playerName} · {formatRelativeTime(pull.openedAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mcg-mini-card recent-pulls-empty">
            <strong>No recent pulls yet</strong>
            <span>The next pack opening will appear here live.</span>
          </div>
        )}
      </div>
    </Surface>
  );
}
