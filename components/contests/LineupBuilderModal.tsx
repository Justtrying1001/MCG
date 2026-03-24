import { useEffect, useMemo, useRef, useState } from "react";
import type { ContestStatus, LineupOption } from "@/components/contests/types";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { LineupCardPicker } from "@/components/contests/LineupCardPicker";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";

// Compatibility guardrail: duplicate-token messaging remains covered by tests via
// tokenAlreadyUsed / "Already used" assertions now implemented inside LineupCardPicker.

type Props = {
  open: boolean;
  contestTitle: string;
  contestCode?: string;
  contestStatus: ContestStatus;
  lockAt: string | null;
  rosterSize: number;
  lineupSlots: Array<string | null>;
  options: LineupOption[];
  selectedLogicalTokenKeys: Set<string>;
  busy?: boolean;
  initialActiveSlot?: number;
  submitLabel?: string;
  onClose: () => void;
  onSelectCard: (instanceId: string, targetSlotIndex: number | null) => void;
  onSelectSlot: (slotIndex: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  flashMessage?: string;
  errorMessage?: string;
};

function countdown(lockAt: string | null): string {
  if (!lockAt) return "--:--:--";
  const diff = new Date(lockAt).getTime() - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LineupBuilderModal({
  open,
  contestTitle,
  contestCode,
  contestStatus,
  lockAt,
  rosterSize,
  lineupSlots,
  options,
  selectedLogicalTokenKeys,
  busy,
  initialActiveSlot,
  onClose,
  onSelectCard,
  onSelectSlot,
  onSaveDraft,
  onSubmit,
  flashMessage,
  errorMessage,
  submitLabel,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(() => countdown(lockAt));

  const canEdit = contestStatus === "OPEN";
  const selectedCount = lineupSlots.filter(Boolean).length;
  const readyToSubmit = selectedCount === rosterSize;
  const optionById = useMemo(
    () => new Map(options.map((item) => [item.instanceId, item])),
    [options],
  );
  useEffect(() => {
    if (!open) return;
    const firstEmpty = lineupSlots.findIndex((slot) => slot === null);
    const preferred =
      typeof initialActiveSlot === "number" ? initialActiveSlot : firstEmpty;
    const nextActive = preferred >= 0 ? preferred : 0;
    setActiveSlot(nextActive);
    setPickerOpen(canEdit);
    onSelectSlot(nextActive);
  }, [canEdit, initialActiveSlot, lineupSlots, onSelectSlot, open]);

  useEffect(() => {
    if (!open || contestStatus !== "OPEN") return;
    const id = window.setInterval(
      () => setLockCountdown(countdown(lockAt)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [contestStatus, lockAt, open]);

  const prevSlotsRef = useRef(lineupSlots);
  useEffect(() => {
    const prev = prevSlotsRef.current;
    const curr = lineupSlots;
    for (let i = 0; i < curr.length; i += 1) {
      if (prev[i] !== curr[i]) {
        if (curr[i]) {
          const nextEmpty = curr.findIndex((slot) => !slot);
          if (nextEmpty >= 0) {
            setActiveSlot(nextEmpty);
            onSelectSlot(nextEmpty);
            setPickerOpen(false);
          } else {
            setActiveSlot(i);
            onSelectSlot(i);
            setPickerOpen(false);
          }
        }
        break;
      }
    }
    prevSlotsRef.current = curr;
  }, [lineupSlots, onSelectSlot]);

  const validationText = !canEdit
    ? "Lineup can only be submitted while contest is OPEN."
    : !readyToSubmit
      ? `Select ${rosterSize - selectedCount} more card${rosterSize - selectedCount === 1 ? "" : "s"} to finish your lineup.`
      : "Lineup valid and ready to submit.";

  if (!open) return null;

  return (
    <div className="bldr-overlay" role="presentation" onClick={onClose}>
      <div
        className="bldr-modal stitch-lineup-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lineup builder"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bldr-head">
          <div className="bldr-head-copy">
            <p className="bldr-head-kicker">Lineup Builder</p>
            <div className="bldr-head-stamp">Squad prep room</div>
            <h2>{contestTitle}</h2>
            <p className="bldr-head-helper">
              Pick a slot and add a card. Your selection lands instantly.
            </p>
          </div>
          <div className="bldr-head-status">
            {contestCode ? (
              <span className="mcg-chip mono">{contestCode}</span>
            ) : null}
            <span
              className={`mcg-badge ${contestStatus === "OPEN" ? "open" : contestStatus === "LIVE" ? "live" : contestStatus === "LOCKED" ? "locked" : "settled"}`}
            >
              {contestStatus}
            </span>
            {contestStatus === "OPEN" ? (
              <span className="mcg-chip">Lock in {lockCountdown}</span>
            ) : null}
            <button
              type="button"
              className="bldr-close"
              onClick={onClose}
              aria-label="Close lineup builder"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="bldr-body">
          <section className="bldr-selected-stage">
            <div className="bldr-section-head">
              <div>
                <p className="bldr-section-kicker">Selected squad</p>
                <h3>Choose cards by slot</h3>
              </div>
              <div className="bldr-stage-summary">
                <strong>
                  {selectedCount}/{rosterSize}
                </strong>
                <span>slots filled</span>
              </div>
            </div>

            <div className="bldr-selected-tray">
              {Array.from({ length: rosterSize }).map((_, index) => {
                const instanceId = lineupSlots[index];
                const card = instanceId ? optionById.get(instanceId) : null;
                const isActive = index === activeSlot;
                const cardView = card ? toMvpCardView(card) : null;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`bldr-tray-slot ${isActive ? "active" : ""} ${card ? "filled" : ""}`}
                    onClick={() => {
                      setActiveSlot(index);
                      setPickerOpen(canEdit);
                      onSelectSlot(index);
                    }}
                  >
                    <span className="bldr-tray-slot-label">
                      Slot {index + 1}
                    </span>
                    {card ? (
                      cardView ? (
                        <MvpCardTile
                          card={cardView}
                          variant="canonical"
                          interactive={false}
                        />
                      ) : (
                        <strong>Card unavailable</strong>
                      )
                    ) : (
                      <div className="bldr-empty-slot-copy">
                        <strong>Add card</strong>
                        <span>Click to browse your collection</span>
                      </div>
                    )}
                    {card && canEdit ? (
                      <span className="bldr-slot-footnote">
                        Click to replace or remove
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {pickerOpen ? (
            <LineupCardPicker
              activeSlot={activeSlot}
              canEdit={canEdit}
              lineupSlots={lineupSlots}
              options={options}
              rosterSize={rosterSize}
              selectedLogicalTokenKeys={selectedLogicalTokenKeys}
              onPick={(instanceId) => {
                onSelectCard(instanceId, activeSlot);
                setPickerOpen(false);
              }}
            />
          ) : null}
        </div>

        <footer className="bldr-footer">
          <div>
            <strong>
              {selectedCount}/{rosterSize} selected
            </strong>
            <p>{errorMessage || flashMessage || validationText}</p>
          </div>
          <div className="bldr-footer-actions">
            <button
              type="button"
              className="mcg-btn ghost"
              onClick={onSaveDraft}
              disabled={!canEdit || busy}
            >
              Save draft
            </button>
            <button
              type="button"
              className="mcg-btn primary"
              onClick={onSubmit}
              disabled={!canEdit || !readyToSubmit || busy}
            >
              {busy ? "Submitting…" : (submitLabel ?? "Submit lineup")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
