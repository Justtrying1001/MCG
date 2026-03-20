import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCollectionItem } from "@/types/cards";

export function FeaturedCardsStrip({ cards, emptyState }: { cards: MvpCollectionItem[]; emptyState?: ReactNode }) {
  return (
    <Surface>
      <div className="profile-featured-cards-wrap">
        <SectionHeader
          eyebrow="Featured cards"
          title="Collector highlights"
          subtitle="A quick look at your most meaningful pulls."
        />
        {cards.length > 0 ? (
          <div className="profile-featured-cards-strip">
            {cards.map((item) => (
              <div key={item.templateId} className="profile-featured-card-item">
                <MvpCardTile card={item.card} quantity={item.instanceCount} variant="canonical" />
                <div className="profile-featured-card-meta">
                  <strong>{item.card.displayName}</strong>
                  <span>{item.instanceCount > 1 ? `x${item.instanceCount} copies` : "1 copy"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : emptyState ? (
          emptyState
        ) : null}
      </div>
    </Surface>
  );
}
