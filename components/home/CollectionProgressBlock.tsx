import Link from "next/link";
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
          title="Binder progress"
          subtitle="Track how much of the set is already in your collection."
          actions={<Link href="/collection" className="mcg-btn ghost">Open binder</Link>}
        />

        <div className="collection-progress-hero">
          <div>
            <p className="collection-progress-label">Completion</p>
            <div className="collection-progress-value">
              {hasCompletion ? `${completionPct}%` : "—"}
            </div>
          </div>
          <p className="collection-progress-note">
            {hasCompletion
              ? "Based on your current collection summary."
              : "Collection completion is not available yet, but your owned and missing counts are."}
          </p>
        </div>

        <div className="mcg-progress-list collection-progress-list">
          <div className="mcg-progress-row">
            <span>Owned templates</span>
            <strong>{ownedCount.toLocaleString()}</strong>
          </div>
          <div className="mcg-progress-row">
            <span>Missing templates</span>
            <strong>{missingCount.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </Surface>
  );
}
