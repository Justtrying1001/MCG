import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";

type CollectionHeaderProps = {
  completionPct: number | null;
  totalCards: number;
  uniqueCards: number;
  shown: number;
};

export function CollectionHeader({ completionPct, totalCards, uniqueCards, shown }: CollectionHeaderProps) {
  return (
    <Surface>
      <div className="collection-header-wrap">
        <SectionHeader
          eyebrow="Your binder"
          title="Collection"
          subtitle="Curate, filter, and complete your set with cards at center stage."
        />
        <div className="collection-header-chips">
          <Chip label={`Completion ${completionPct === null ? "—" : `${completionPct}%`}`} />
          <Chip label={`Owned ${totalCards}`} />
          <Chip label={`Unique ${uniqueCards}`} />
          <Chip label={`Shown ${shown}`} />
        </div>
      </div>
    </Surface>
  );
}
