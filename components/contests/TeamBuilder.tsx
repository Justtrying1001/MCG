import { Button } from "@/components/ui/Button";
import type { LineupOption } from "@/components/contests/types";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { EligibleCardsPanel } from "@/components/contests/EligibleCardsPanel";

export function TeamBuilder({
  maxRosterSize,
  selectedCards,
  selectedIds,
  filteredOptions,
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
    <section className="contest-team-builder">
      <div className="contest-builder-head">
        <p className="mcg-eyebrow">Team builder</p>
        <strong>{filled}/{maxRosterSize} slots filled</strong>
      </div>

      <div className="contest-lineup-progress-track"><span style={{ width: `${pct}%` }} /></div>

      <div className="contest-lineup-grid-v2">
        {Array.from({ length: maxRosterSize }).map((_, index) => (
          <LineupSlot
            key={index}
            index={index}
            card={selectedCards[index]}
            canEdit={canManageLineup}
            onRemove={() => onRemoveSlot(index)}
            onOpenPicker={() => onOpenPicker(index)}
          />
        ))}
      </div>

      <div className="contest-builder-actions">
        {canManageLineup ? (
          <>
            <Button variant="ghost" onClick={() => onOpenPicker(null)}>Browse all eligible cards</Button>
            <Button onClick={onSubmit} disabled={!canEnter || selectedIds.length !== maxRosterSize || submitState === "saving"}>
              {submitState === "saving" ? "Submitting…" : submitState === "success" ? "Entry confirmed" : "Confirm lineup"}
            </Button>
          </>
        ) : (
          <p className="contest-inline-note">Lineup editing is unavailable in current contest state.</p>
        )}
      </div>

      <EligibleCardsPanel options={filteredOptions} selectedIds={selectedIds} canManage={canManageLineup} onToggle={onToggle} />
    </section>
  );
}
