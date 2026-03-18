import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Props = {
  completionPct: number | null;
  ownedCount: number;
  missingCount: number;
};

export function CollectionProgressBlock({ completionPct, ownedCount, missingCount }: Props) {
  const hasCompletion = typeof completionPct === "number" && Number.isFinite(completionPct);

  return (
    <Surface variant="raised" className="collection-progress-block">
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Collection"
          title="Collection stats"
          subtitle="Your current collection snapshot."
        />

        <div className="collection-progress-hero">
          <div>
            <p className="collection-progress-label">Collection completion</p>
            <div className="collection-progress-value">
              {hasCompletion ? `${completionPct}%` : "—"}
            </div>
          </div>

          <div className="collection-progress-stats" aria-label="Collection summary">
            <div className="collection-progress-stat">
              <span>Cards owned</span>
              <strong>{ownedCount.toLocaleString()}</strong>
            </div>
            <div className="collection-progress-stat">
              <span>Cards missing</span>
              <strong>{missingCount.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <p className="collection-progress-note">
          {hasCompletion
            ? "Based on your current collection summary."
            : "Completion percentage is unavailable, but owned and missing template counts are currently tracked."}
        </p>
      </div>
    </Surface>
  );
}
