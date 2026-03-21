import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";

type CollectionHeaderProps = {
  completionPct: number | null;
  totalCards: number;
  uniqueCards: number;
  shown: number;
  missingCount?: number | null;
  totalTemplates?: number | null;
  completionWidth?: number;
};

export function CollectionHeader({
  completionPct,
  totalCards,
  uniqueCards,
  shown,
  missingCount = null,
  totalTemplates = null,
  completionWidth = completionPct === null
    ? 12
    : Math.max(6, Math.min(100, completionPct)),
}: CollectionHeaderProps) {
  return (
    <Surface
      variant="raised"
      className="memedex-header-shell stitch-panel-card"
    >
      <div className="collection-header-wrap memedex-header-wrap">
        <div className="memedex-header-copy">
          <SectionHeader
            eyebrow="Your Memedex"
            title="The album"
            subtitle="Complete your Memedex with tactile discovery tools, clearer rarity reads, and a collectible-first inventory view."
          />
          <div className="collection-header-chips memedex-header-chips">
            <Chip
              label={`Memedex completion ${completionPct === null ? "—" : `${completionPct}%`}`}
            />
            <Chip label={`Owned ${totalCards}`} />
            <Chip label={`Unique ${uniqueCards}`} />
            <Chip label={`Shown ${shown}`} />
            {typeof missingCount === "number" ? (
              <Chip label={`Locked ${missingCount}`} />
            ) : null}
          </div>
        </div>

        <div
          className="memedex-header-progress"
          aria-label="Memedex completion summary"
        >
          <div className="memedex-header-progress-top">
            <span>Memedex progress</span>
            <strong>
              {typeof totalTemplates === "number" && totalTemplates > 0
                ? `${uniqueCards}/${totalTemplates}`
                : completionPct === null
                  ? "—"
                  : `${completionPct}%`}
            </strong>
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
              : "Sign in to sync your live Memedex completion and missing entries."}
          </p>
        </div>
      </div>
    </Surface>
  );
}
