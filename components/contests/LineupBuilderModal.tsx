import { useEffect, useMemo, useRef, useState } from "react";
import type { ContestStatus, LineupOption } from "@/components/contests/types";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";
import { getLogicalTokenKey } from "@/lib/domain/contests/lineup-token";

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

type SortMode = "rarity" | "name";

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

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
  onRemoveSlot,
  onSaveDraft,
  onSubmit,
  flashMessage,
  errorMessage,
  submitLabel,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [editionFilter, setEditionFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "eligible" | "unavailable">("all");
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [lockCountdown, setLockCountdown] = useState(() => countdown(lockAt));

  const canEdit = contestStatus === "OPEN";
  const selectedCount = lineupSlots.filter(Boolean).length;
  const readyToSubmit = selectedCount === rosterSize;
  const optionById = useMemo(() => new Map(options.map((item) => [item.instanceId, item])), [options]);

  useEffect(() => {
    if (!open) return;
    const firstEmpty = lineupSlots.findIndex((slot) => slot === null);
    const preferred = typeof initialActiveSlot === "number" ? initialActiveSlot : firstEmpty;
    const nextActive = preferred >= 0 ? preferred : 0;
    setActiveSlot(nextActive);
    onSelectSlot(nextActive);
  }, [initialActiveSlot, lineupSlots, onSelectSlot, open]);

  useEffect(() => {
    if (!open || contestStatus !== "OPEN") return;
    const id = window.setInterval(() => setLockCountdown(countdown(lockAt)), 1000);
    return () => window.clearInterval(id);
  }, [contestStatus, lockAt, open]);

  const rarityOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.rarityCode))], [options]);
  const editionOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.editionCode))], [options]);
  const setOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.cardSetCode))], [options]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const rows = options.filter((item) => {
      const tokenKey = getLogicalTokenKey({ tokenProjectId: item.tokenProjectId, cardTemplateId: item.cardTemplateId });
      const selectedIndex = lineupSlots.findIndex((value) => value === item.instanceId);
      const tokenConflict = selectedLogicalTokenKeys.has(tokenKey) && selectedIndex < 0;
      const unavailable = item.isLockedByActiveContest || tokenConflict;

      const byAvailability = availabilityFilter === "all"
        || (availabilityFilter === "eligible" && !unavailable)
        || (availabilityFilter === "unavailable" && unavailable);
      const byQuery = normalizedQuery.length === 0
        || item.name.toLowerCase().includes(normalizedQuery)
        || item.tokenProjectName.toLowerCase().includes(normalizedQuery)
        || item.cardSetCode.toLowerCase().includes(normalizedQuery)
        || item.cardSetName.toLowerCase().includes(normalizedQuery);
      const byRarity = rarityFilter === "all" || item.rarityCode === rarityFilter;
      const byEdition = editionFilter === "all" || item.editionCode === editionFilter;
      const bySet = setFilter === "all" || item.cardSetCode === setFilter;
      return byAvailability && byQuery && byRarity && byEdition && bySet;
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
  }, [availabilityFilter, editionFilter, lineupSlots, options, query, rarityFilter, selectedLogicalTokenKeys, setFilter, sortMode]);

  const prevSlotsRef = useRef(lineupSlots);
  useEffect(() => {
    const prev = prevSlotsRef.current;
    const curr = lineupSlots;
    for (let i = 0; i < curr.length; i += 1) {
      if (!prev[i] && curr[i]) {
        const nextEmpty = curr.findIndex((slot) => !slot);
        if (nextEmpty >= 0) {
          setActiveSlot(nextEmpty);
          onSelectSlot(nextEmpty);
        }
        break;
      }
    }
    prevSlotsRef.current = curr;
  }, [lineupSlots, onSelectSlot]);

  const validationText = !canEdit
    ? "Lineup can only be submitted while contest is OPEN."
    : !readyToSubmit
      ? `${selectedCount}/${rosterSize} cards selected.`
      : "Lineup valid and ready to submit.";

  if (!open) return null;

  return (
    <div className="bldr-overlay" role="presentation" onClick={onClose}>
      <div className="bldr-modal" role="dialog" aria-modal="true" aria-label="Lineup builder" onClick={(event) => event.stopPropagation()}>
        <header className="bldr-head">
          <div>
            <p className="bldr-head-kicker">Lineup Builder</p>
            <h2>{contestTitle}</h2>
            <p className="bldr-head-helper">Select {rosterSize} cards from your eligible collection.</p>
          </div>
          <div className="bldr-head-status">
            {contestCode ? <span className="mcg-chip mono">{contestCode}</span> : null}
            <span className={`mcg-badge ${contestStatus === "OPEN" ? "open" : contestStatus === "LIVE" ? "live" : contestStatus === "LOCKED" ? "locked" : "settled"}`}>{contestStatus}</span>
            {contestStatus === "OPEN" ? <span className="mcg-chip">Lock in {lockCountdown}</span> : null}
            <button type="button" className="bldr-close" onClick={onClose} aria-label="Close lineup builder">✕</button>
          </div>
        </header>

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
                  onSelectSlot(index);
                }}
              >
                <span className="bldr-tray-slot-label">Slot {index + 1}</span>
                {card ? (cardView ? <MvpCardTile card={cardView} variant="canonical" interactive={false} /> : <strong>Card unavailable</strong>) : <strong>Add card</strong>}
                {card && canEdit ? (
                  <span
                    className="bldr-slot-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSlot(index);
                    }}
                  >
                    Remove
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="bldr-rule-strip">
          <span>{selectedCount}/{rosterSize} cards selected</span>
          <span>Duplicate logical tokens are not allowed</span>
          <span>Locked cards cannot be selected</span>
          <span>Lineup can only be submitted while contest is OPEN</span>
        </div>

        <div className="bldr-controls">
          <input className="bldr-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by card name, project or set" />
          <select className="bldr-select" value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
            {rarityOptions.map((value) => <option key={value} value={value}>{value === "all" ? "All rarities" : value}</option>)}
          </select>
          <select className="bldr-select" value={editionFilter} onChange={(event) => setEditionFilter(event.target.value)}>
            {editionOptions.map((value) => <option key={value} value={value}>{value === "all" ? "All editions" : value}</option>)}
          </select>
          <select className="bldr-select" value={setFilter} onChange={(event) => setSetFilter(event.target.value)}>
            {setOptions.map((value) => <option key={value} value={value}>{value === "all" ? "All sets" : value}</option>)}
          </select>
          <select className="bldr-select" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as "all" | "eligible" | "unavailable")}>
            <option value="all">All cards</option>
            <option value="eligible">Eligible</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <select className="bldr-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="rarity">Sort: Rarity</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        <div className="bldr-pool-grid" aria-live="polite">
          {filtered.map((item) => {
            const slotIndex = lineupSlots.findIndex((value) => value === item.instanceId);
            const isSelected = slotIndex >= 0;
            const atCapacity = selectedCount >= rosterSize && !isSelected;
            const tokenKey = getLogicalTokenKey({ tokenProjectId: item.tokenProjectId, cardTemplateId: item.cardTemplateId });
            const tokenConflict = selectedLogicalTokenKeys.has(tokenKey) && !isSelected;
            const tokenAlreadyUsed = tokenConflict;
            const cardView = toMvpCardView(item);
            const isUnavailable = !canEdit || atCapacity || item.isLockedByActiveContest || tokenAlreadyUsed || !cardView;

            return (
              <article key={item.instanceId} className={`bldr-card-wrap ${isSelected ? "selected" : ""} ${isUnavailable ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="bldr-card-btn"
                  onClick={() => {
                    if (isUnavailable) return;
                    onSelectCard(item.instanceId, activeSlot);
                  }}
                  disabled={isUnavailable}
                >
                  {cardView ? <MvpCardTile card={cardView} variant="canonical" interactive={false} /> : <div className="bldr-card-missing">Card preview unavailable</div>}
                </button>
                <div className="bldr-card-meta">
                  <strong>{item.name}</strong>
                  <p>{item.tokenProjectName}</p>
                  <div>
                    <span>{item.rarityCode}</span>
                    <span>{item.editionCode}</span>
                    <span>{item.cardSetCode}</span>
                  </div>
                </div>
                {isSelected ? <span className="bldr-chip selected">Selected · Slot {slotIndex + 1}</span> : null}
                {item.isLockedByActiveContest ? <span className="bldr-chip warn">Unavailable: locked in active contest</span> : null}
                {tokenAlreadyUsed ? <span className="bldr-chip warn">Already used in this lineup</span> : null}
                {!cardView ? <span className="bldr-chip warn">Unavailable: missing canonical card data</span> : null}
              </article>
            );
          })}
          {options.length === 0 ? <p className="bldr-pool-empty">No eligible cards available for this contest.</p> : null}
          {options.length > 0 && filtered.length === 0 ? <p className="bldr-pool-empty">No cards match these filters.</p> : null}
        </div>

        <footer className="bldr-footer">
          <div>
            <strong>{selectedCount}/{rosterSize} selected</strong>
            <p>{errorMessage || flashMessage || validationText}</p>
          </div>
          <div className="bldr-footer-actions">
            <button type="button" className="mcg-btn ghost" onClick={onSaveDraft} disabled={!canEdit || busy}>Save draft</button>
            <button type="button" className="mcg-btn primary" onClick={onSubmit} disabled={!canEdit || !readyToSubmit || busy}>
              {busy ? "Submitting…" : submitLabel ?? "Submit lineup"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
