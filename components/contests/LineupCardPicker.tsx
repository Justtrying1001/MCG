import { useMemo, useState } from "react";
import { LineupCardTile } from "@/components/contests/LineupCardTile";
import type { LineupOption } from "@/components/contests/types";
import { getLogicalTokenKey } from "@/lib/domain/contests/lineup-token";

type Props = {
  activeSlot: number;
  canEdit: boolean;
  lineupSlots: Array<string | null>;
  options: LineupOption[];
  rosterSize: number;
  selectedLogicalTokenKeys: Set<string>;
  onPick: (instanceId: string) => void;
};

type SortMode = "rarity" | "name";

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

export function LineupCardPicker({
  activeSlot,
  canEdit,
  lineupSlots,
  options,
  rosterSize,
  selectedLogicalTokenKeys,
  onPick,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "selected">("available");

  const selectedCount = lineupSlots.filter(Boolean).length;

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const rows = options.filter((item) => {
      const slotIndex = lineupSlots.findIndex((value) => value === item.instanceId);
      const isSelected = slotIndex >= 0;
      const atCapacity = selectedCount >= rosterSize && !isSelected;
      const tokenKey = getLogicalTokenKey({
        tokenProjectId: item.tokenProjectId,
        cardTemplateId: item.cardTemplateId,
      });
      const tokenConflict = selectedLogicalTokenKeys.has(tokenKey) && !isSelected;
      const tokenAlreadyUsed = tokenConflict;
      const unavailable = !canEdit || atCapacity || item.isLockedByActiveContest || tokenAlreadyUsed;

      const byAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && !unavailable) ||
        (availabilityFilter === "selected" && isSelected);
      const byQuery =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.tokenProjectName.toLowerCase().includes(normalizedQuery) ||
        item.cardSetCode.toLowerCase().includes(normalizedQuery) ||
        item.cardSetName.toLowerCase().includes(normalizedQuery);

      return byAvailability && byQuery;
    });

    rows.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      const ai = RARITY_ORDER.indexOf(a.rarityCode.toUpperCase());
      const bi = RARITY_ORDER.indexOf(b.rarityCode.toUpperCase());
      const rarityDelta = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      if (rarityDelta !== 0) return rarityDelta;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [availabilityFilter, canEdit, lineupSlots, options, query, rosterSize, selectedCount, selectedLogicalTokenKeys, sortMode]);

  return (
    <section className="bldr-pool-stage" aria-label={`Card picker for slot ${activeSlot + 1}`}>
      <div className="bldr-section-head">
        <div>
          <p className="bldr-section-kicker">Card picker</p>
          <h3>Browse your cards</h3>
        </div>
        <div className="bldr-stage-summary">
          <strong>{filtered.length}</strong>
          <span>cards shown</span>
        </div>
      </div>

      <div className="bldr-picker-summary">
        <span className="mcg-chip">Slot {activeSlot + 1}</span>
        <span className="mcg-chip">{selectedCount}/{rosterSize} selected</span>
      </div>
      <div className="bldr-rule-callout" role="note" aria-label="Lineup assignment rules">
        <p>Each card can only be used once per lineup.</p>
        <p>Click a card to assign it to the active slot.</p>
      </div>

      <div className="bldr-controls bldr-controls-slim">
        <input
          className="bldr-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by card name, project, or set"
        />
        <select
          className="bldr-select"
          value={availabilityFilter}
          onChange={(event) =>
            setAvailabilityFilter(
              event.target.value as "all" | "available" | "selected",
            )
          }
        >
          <option value="available">Available cards</option>
          <option value="all">All cards</option>
          <option value="selected">Selected cards</option>
        </select>
        <select
          className="bldr-select"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="rarity">Sort: Rarity</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="bldr-pool-scroll">
        <div className="bldr-pool-grid" aria-live="polite">
          {filtered.map((item) => {
            const slotIndex = lineupSlots.findIndex((value) => value === item.instanceId);
            const isSelected = slotIndex >= 0;
            const atCapacity = selectedCount >= rosterSize && !isSelected;
            const tokenKey = getLogicalTokenKey({
              tokenProjectId: item.tokenProjectId,
              cardTemplateId: item.cardTemplateId,
            });
            const tokenConflict = selectedLogicalTokenKeys.has(tokenKey) && !isSelected;
            const tokenAlreadyUsed = tokenConflict;
            const isUnavailable = !canEdit || atCapacity || item.isLockedByActiveContest || tokenAlreadyUsed;
            const cardStateClass = isSelected
              ? "in-lineup"
              : tokenAlreadyUsed
                ? "duplicate-blocked"
                : isUnavailable
                  ? "disabled"
                  : "available";

            return (
              <article
                key={item.instanceId}
                className={`bldr-card-wrap ${cardStateClass}`}
              >
                <LineupCardTile
                  option={item}
                  selected={isSelected}
                  disabled={isUnavailable}
                  onClick={() => {
                    if (isUnavailable) return;
                    onPick(item.instanceId);
                  }}
                />
                {isSelected ? (
                  <span className="bldr-card-state-badge success">
                    IN LINEUP · Slot {slotIndex + 1}
                  </span>
                ) : null}
                {tokenAlreadyUsed ? (
                  <span className="bldr-card-state-badge muted">
                    Already used in this lineup
                  </span>
                ) : null}
                {item.isLockedByActiveContest ? (
                  <span className="bldr-card-state-badge muted">
                    Locked in active contest
                  </span>
                ) : null}
              </article>
            );
          })}
          {options.length === 0 ? (
            <p className="bldr-pool-empty">
              No eligible cards available for this contest.
            </p>
          ) : null}
          {options.length > 0 && filtered.length === 0 ? (
            <p className="bldr-pool-empty">
              No cards match this search.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
