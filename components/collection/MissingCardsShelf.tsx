import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type MissingCardsShelfProps = {
  missingCount: number;
};

export function MissingCardsShelf({ missingCount }: MissingCardsShelfProps) {
  const placeholders = Array.from({ length: Math.min(Math.max(missingCount, 3), 8) }, (_, i) => i);

  return (
    <Surface>
      <div className="missing-shelf-wrap">
        <SectionHeader
          eyebrow="Chase"
          title="Missing cards"
          subtitle={missingCount > 0 ? `${missingCount} templates left to complete your binder.` : "You are currently complete on visible templates."}
        />
        <div className="missing-shelf-grid" aria-label="Missing cards placeholders">
          {placeholders.map((idx) => (
            <div key={idx} className="missing-shelf-card">
              <span>?</span>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
