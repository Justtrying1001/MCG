import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PackRevealSlot } from "@/components/packs/PackRevealSlot";
import type { MvpCardView } from "@/types/cards";

type PackRevealModalProps = {
  open: boolean;
  cards: MvpCardView[];
  revealed: boolean[];
  nextRevealIndex: number;
  onReveal: (index: number) => void;
  onZoom: (card: MvpCardView) => void;
  onClose: () => void;
  isGuestPreview: boolean;
  onConnectWithX?: () => void;
  cardBackSrc: Parameters<typeof PackRevealSlot>[0]["cardBackSrc"];
};

export function PackRevealModal({
  open,
  cards,
  revealed,
  nextRevealIndex,
  onReveal,
  onZoom,
  onClose,
  isGuestPreview,
  onConnectWithX,
  cardBackSrc,
}: PackRevealModalProps) {
  const revealSize = cards.length;
  const revealedCount = revealed.filter(Boolean).length;
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);

  return (
    <Modal
      title={
        isGuestPreview
          ? allRevealed
            ? "Preview complete — sample cards revealed"
            : "Preview reveal — flip cards in order"
          : allRevealed
            ? "Pack complete — all cards revealed"
            : "Pack reveal — flip cards in order"
      }
      open={open}
      onClose={onClose}
      className="pack-reveal-modal"
      contentClassName="pack-reveal-modal-content"
    >
      {isGuestPreview ? (
        <div className="packs-preview-banner">
          <span className="packs-preview-badge">Demo reveal</span>
          <p>This preview does not consume a pack or add cards to inventory.</p>
        </div>
      ) : null}

      <div className="reveal-progress-wrap">
        <div className="pack-reveal-head-row">
          <p className="reveal-progress-text">
            Revealed {revealedCount} / {revealSize}
          </p>
          {!allRevealed ? (
            <p className="reveal-next-copy">
              Next: click card #{nextRevealIndex + 1}
            </p>
          ) : null}
        </div>
        <div className="reveal-progress-track">
          <div
            className="reveal-progress-fill"
            style={{
              width: `${(revealedCount / Math.max(revealSize, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="pack-reveal-stage">
        <div className="pack-reveal-grid" aria-label="Pack reveal card rail">
          {cards.map((card, index) => (
            <PackRevealSlot
              key={`${card.templateId}_${index}`}
              card={card}
              cardBackSrc={cardBackSrc}
              index={index}
              isRevealed={Boolean(revealed[index])}
              isNext={index === nextRevealIndex}
              onReveal={onReveal}
              onZoom={onZoom}
            />
          ))}
        </div>
      </div>

      {allRevealed ? (
        <div className="reveal-complete-row">
          <p className="reveal-complete-copy">
            {isGuestPreview
              ? "Preview complete. Connect wallet / X to open a real pack, keep your pulls, and use them across collection, contests, and rewards."
              : "Full pack revealed. Cards have been added to your collection."}
          </p>
          {isGuestPreview ? (
            <div className="packs-preview-actions">
              {onConnectWithX ? (
                <Button onClick={onConnectWithX}>
                  Connect wallet / X to open for real
                </Button>
              ) : null}
              <Button variant="ghost" onClick={onClose}>
                Close preview
              </Button>
            </div>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
