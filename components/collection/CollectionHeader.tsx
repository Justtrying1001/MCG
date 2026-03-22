import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";

type CollectionHeaderProps = {
  completionPct: number | null;
  totalCards: number;
  uniqueCards: number;
  missingCount?: number | null;
  totalTemplates?: number | null;
  completionWidth?: number;
};

export function CollectionHeader({
  completionPct,
  totalCards,
  uniqueCards,
  missingCount = null,
  totalTemplates = null,
  completionWidth = completionPct === null
    ? 12
    : Math.max(6, Math.min(100, completionPct)),
}: CollectionHeaderProps) {
  const progressLabel =
    typeof totalTemplates === "number" && totalTemplates > 0
      ? `${uniqueCards}/${totalTemplates}`
      : completionPct === null
        ? "—"
        : `${completionPct}%`;

  return (
    <Surface
      variant="raised"
      className="memedex-header-shell stitch-panel-card"
    >
      <div className="collection-header-wrap memedex-header-wrap">
        <div className="memedex-header-copy">
          <SectionHeader
            eyebrow="Collection"
            title="Memedex"
            subtitle="Track your discovered cards, scan what is still locked, and keep the spotlight on your collection."
          />
          <div className="collection-header-chips memedex-header-chips">
            <Chip
              label={`Progress ${completionPct === null ? "—" : `${completionPct}%`}`}
            />
          </div>
        </div>

        <div
          className="memedex-header-progress"
          aria-label="Memedex completion summary"
        >
          <div className="memedex-header-progress-top">
            <span>Memedex progress</span>
            <strong>{progressLabel}</strong>
          </div>
          <div
            className="collection-progress-track memedex-header-track"
            aria-hidden="true"
          >
            <span style={{ width: `${completionWidth}%` }} />
          </div>
          <p>
            {typeof missingCount === "number"
              ? `${missingCount.toLocaleString()} locked entries remain before your Memedex is complete.`
              : `Preview ${totalCards.toLocaleString()} cards and connect to sync your live Memedex.`}
          </p>
        </div>
      </div>
    </Surface>
  );
}
