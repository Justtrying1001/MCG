import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCollectionItem } from "@/types/cards";

type Props = {
  cards: MvpCollectionItem[];
  emptyState?: ReactNode;
  action?: ReactNode;
};

export function FeaturedCardsStrip({ cards, emptyState, action }: Props) {
  return (
    <Surface variant="raised" className="profile-featured-surface">
      <div className="profile-featured-cards-wrap">
        <div className="profile-featured-head">
          <div className="profile-section-heading">
            <div>
              <h2>Showcase</h2>
            </div>
          </div>
          {action}
        </div>
        {cards.length > 0 ? (
          <div className="profile-featured-cards-strip" data-layout="visual-rail">
            {cards.map((item) => (
              <div key={item.templateId} className="profile-featured-card-item">
                <div className="profile-featured-card-frame">
                  <MvpCardTile card={item.card} quantity={item.instanceCount} variant="canonical" />
                </div>
                <div className="profile-featured-card-meta">
                  <strong>{item.card.displayName}</strong>
                  <span>{item.card.rarity}</span>
                  <small>{item.instanceCount} owned</small>
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
