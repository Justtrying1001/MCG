import { Button } from "@/components/ui/Button";
import type { LineupOption } from "@/components/contests/types";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { EligibleCardsPanel } from "@/components/contests/EligibleCardsPanel";

export function TeamBuilder({
  maxRosterSize,
  selectedCards,
  selectedIds,
  filteredOptions,
  activeSlot,
  canManageLineup,
  canEnter,
  submitState,
  onOpenPicker,
  onRemoveSlot,
  onToggle,
  onSubmit,
}: {
  maxRosterSize: number;
  selectedCards: Array<LineupOption | null>;
  selectedIds: string[];
  filteredOptions: LineupOption[];
  activeSlot: number | null;
  canManageLineup: boolean;
  canEnter: boolean;
  submitState: "idle" | "saving" | "success";
  onOpenPicker: (slot: number | null) => void;
  onRemoveSlot: (slot: number) => void;
  onToggle: (instanceId: string) => void;
  onSubmit: () => void;
}) {
  const filled = selectedCards.filter(Boolean).length;
  const pct = Math.min(100, Math.round((filled / Math.max(maxRosterSize, 1)) * 100));

  return (
    <section className="contest-team-builder premium">
      <div className="contest-builder-head contest-builder-head-shell">
        <div>
          <p className="mcg-eyebrow">Tournament team builder</p>
          <strong className="contest-builder-title">Build your {maxRosterSize}-card lineup</strong>
          <p className="contest-inline-note">Select a slot first, then assign the best card from your eligible pool.</p>
        </div>
        <div className="contest-builder-stat">
          <span>Lineup progress</span>
          <strong>{filled}/{maxRosterSize} slots filled</strong>
        </div>
      </div>

      <div className="contest-builder-slots-panel">
        <div className="contest-builder-section-head">
          <div>
            <p className="mcg-eyebrow">Selected slots</p>
            <strong>Arrange your starting lineup</strong>
          </div>
          <p className="contest-inline-note">Your selected cards stay editable here until battle lock.</p>
        </div>

        <div className="contest-lineup-progress-track"><span style={{ width: `${pct}%` }} /></div>

        <div className="contest-lineup-grid-v2 tcg-layout">
          {Array.from({ length: maxRosterSize }).map((_, index) => (
            <LineupSlot
              key={index}
              index={index}
              card={selectedCards[index]}
              canEdit={canManageLineup}
              isActive={activeSlot === index}
              onRemove={() => onRemoveSlot(index)}
              onOpenPicker={() => onOpenPicker(index)}
            />
          ))}
        </div>

        <div className="contest-builder-actions">
          {canManageLineup ? (
            <>
              <Button variant="ghost" onClick={() => onOpenPicker(null)}>Clear active slot</Button>
              <Button onClick={onSubmit} disabled={!canEnter || selectedIds.length !== maxRosterSize || submitState === "saving"}>
                {submitState === "saving" ? "Saving lineup…" : "Save team"}
              </Button>
            </>
          ) : (
            <p className="contest-inline-note">Team lock is active. Lineup editing is disabled.</p>
          )}
        </div>
      </div>

      <EligibleCardsPanel
        options={filteredOptions}
        selectedIds={selectedIds}
        activeSlot={activeSlot}
        canManage={canManageLineup}
        onAssign={onToggle}
      />
    </section>
  );
}
