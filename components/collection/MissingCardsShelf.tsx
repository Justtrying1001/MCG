import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type MissingCardsShelfProps = {
  missingCount: number;
};

export function MissingCardsShelf({ missingCount }: MissingCardsShelfProps) {
  const placeholders = Array.from({ length: Math.min(Math.max(missingCount, 3), 8) }, (_, i) => i);

  return (
    <Surface variant="raised" className="missing-shelf-surface">
      <div className="missing-shelf-wrap">
        <SectionHeader
          eyebrow="Locked entries"
          title="Still missing from your Memedex"
          subtitle={missingCount > 0 ? `${missingCount} templates left before your album is complete.` : "You are currently complete on visible templates."}
        />
        <div className="missing-shelf-grid" aria-label="Missing Memedex entry placeholders">
          {placeholders.map((idx) => (
            <div key={idx} className="missing-shelf-card">
              <span>?</span>
              <small>Locked</small>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
