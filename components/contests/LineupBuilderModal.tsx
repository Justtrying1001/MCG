import { useEffect, useMemo, useRef, useState } from "react";
import { lineupIdentityKey } from "@/lib/domain/contests/lineup-identity";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";

type Props = {
  open: boolean;
  contestTitle: string;
  contestStatus: ContestStatus;
  lockAt: string | null;
  entryFeeLabel: string;
  rosterSize: number;
  rule?: ContestRule;
  lineupSlots: Array<string | null>;
  options: LineupOption[];
  busy?: boolean;
  onClose: () => void;
  onSelectCard: (instanceId: string, targetSlotIndex: number | null) => void;
  onSelectSlot: (slotIndex: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  flashMessage?: string;
  errorMessage?: string;
};

type SortMode = "rarity" | "name" | "project";

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

const RARITY_COLOR: Record<string, string> = {
  LEGENDARY: "#c8a84b",
  EPIC: "#a855f7",
  RARE: "#3b82f6",
  UNCOMMON: "#22c55e",
  COMMON: "#6b7280",
};

export function LineupBuilderModal({
  open,
  contestTitle,
  contestStatus,
  lockAt,
  entryFeeLabel,
  rosterSize,
  rule,
  lineupSlots,
  options,
  busy,
  onClose,
  onSelectCard,
  onSelectSlot,
  onRemoveSlot,
  onSaveDraft,
  onSubmit,
  flashMessage,
  errorMessage,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [editionFilter, setEditionFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [activeSlot, setActiveSlot] = useState<number>(0);

  const canEdit = contestStatus === "OPEN";
  const selectedCount = lineupSlots.filter(Boolean).length;
  const readyToSubmit = selectedCount === rosterSize;

  // Init active slot to first empty on open
  useEffect(() => {
    if (!open) return;
    const firstEmpty = lineupSlots.findIndex((slot) => slot === null);
    setActiveSlot(firstEmpty >= 0 ? firstEmpty : 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionById = useMemo(() => new Map(options.map((item) => [item.instanceId, item])), [options]);

  const selectedIdentityKeysBySlot = useMemo(() => lineupSlots.map((instanceId) => {
    if (!instanceId) return null;
    const option = optionById.get(instanceId);
    return option ? lineupIdentityKey(option) : instanceId;
  }), [lineupSlots, optionById]);

  const rarityOptions  = useMemo(() => ["all", ...new Set(options.map((item) => item.rarityCode))], [options]);
  const editionOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.editionCode))], [options]);
  const projectOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.tokenProjectName))], [options]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const rows = options.filter((item) => {
      const byQuery =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.cardSetCode.toLowerCase().includes(normalizedQuery) ||
        item.tokenProjectName.toLowerCase().includes(normalizedQuery);
      const byRarity   = rarityFilter  === "all" || item.rarityCode  === rarityFilter;
      const byEdition  = editionFilter === "all" || item.editionCode === editionFilter;
      const byProject  = projectFilter === "all" || item.tokenProjectName === projectFilter;
      return byQuery && byRarity && byEdition && byProject;
    });

    rows.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "project") {
        const projectDelta = a.tokenProjectName.localeCompare(b.tokenProjectName);
        if (projectDelta !== 0) return projectDelta;
        return a.name.localeCompare(b.name);
      }
      const ai = RARITY_ORDER.indexOf(a.rarityCode.toUpperCase());
      const bi = RARITY_ORDER.indexOf(b.rarityCode.toUpperCase());
      const rarityDelta = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      if (rarityDelta !== 0) return rarityDelta;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [options, query, rarityFilter, editionFilter, projectFilter, sortMode]);

  // Auto-advance to next empty slot after selecting a card
  const prevSlotsRef = useRef(lineupSlots);
  useEffect(() => {
    const prev = prevSlotsRef.current;
    const curr = lineupSlots;
    // Find the slot that was just filled
    for (let i = 0; i < curr.length; i++) {
      if (!prev[i] && curr[i]) {
        // Find next empty slot after i
        let nextEmpty = -1;
        for (let j = i + 1; j < curr.length; j++) {
          if (!curr[j]) { nextEmpty = j; break; }
        }
        if (nextEmpty < 0) {
          for (let j = 0; j < i; j++) {
            if (!curr[j]) { nextEmpty = j; break; }
          }
        }
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
    ? "Lineup is locked — no changes allowed"
    : readyToSubmit
      ? "Ready to submit ✓"
      : `Select ${rosterSize - selectedCount} more card${rosterSize - selectedCount !== 1 ? "s" : ""}`;

  if (!open) return null;

  return (
    <div className="bldr-overlay" role="presentation" onClick={onClose}>
      <div
        className="bldr-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lineup builder"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="bldr-head">
          <div className="bldr-head-left">
            <span className="bldr-head-title">LINEUP BUILDER</span>
            <span className="bldr-head-contest">{contestTitle}</span>
          </div>
          <div className="bldr-head-right">
            <span className="bldr-slot-count">{selectedCount}/{rosterSize} slots filled</span>
            <button type="button" className="bldr-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── SLOT PILLS ─────────────────────────────────────────────── */}
        <div className="bldr-pills-row">
          {Array.from({ length: rosterSize }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`bldr-pill ${activeSlot === i ? "bldr-pill-active" : ""} ${lineupSlots[i] ? "bldr-pill-filled" : ""}`}
              onClick={() => { setActiveSlot(i); onSelectSlot(i); }}
              aria-label={`Slot ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
          <span className="bldr-pills-count">{selectedCount}/{rosterSize} filled</span>
        </div>

        {/* ── SELECTED SLOTS ROW ─────────────────────────────────────── */}
        <div className="bldr-slots-row">
          {Array.from({ length: rosterSize }).map((_, i) => {
            const instanceId = lineupSlots[i];
            const card = instanceId ? optionById.get(instanceId) : null;
            const isActive = activeSlot === i;

            if (card) {
              return (
                <div
                  key={i}
                  className={`bldr-slot-mvp${isActive ? " bldr-slot-mvp-active" : ""}`}
                  onClick={() => { setActiveSlot(i); onSelectSlot(i); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Slot ${i + 1}: ${card.name}`}
                >
                  <MvpCardTile card={toMvpCardView(card)} variant="compact" interactive={false} />
                  {canEdit && (
                    <button
                      type="button"
                      className="bldr-slot-remove-btn"
                      onClick={(e) => { e.stopPropagation(); onRemoveSlot(i); }}
                      aria-label={`Remove ${card.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`bldr-slot bldr-slot-empty${isActive ? " bldr-slot-active" : ""}`}
                onClick={() => { setActiveSlot(i); onSelectSlot(i); }}
                role="button"
                tabIndex={0}
                aria-label={`Slot ${i + 1}: empty`}
              >
                <span className="bldr-slot-num">{i + 1}</span>
              </div>
            );
          })}
        </div>

        {/* ── CARD POOL ──────────────────────────────────────────────── */}
        <div className="bldr-pool-section">

          {/* Controls */}
          <div className="bldr-controls">
            <input
              className="bldr-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards…"
            />
            <select
              className="bldr-select"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
            >
              {rarityOptions.map((v) => (
                <option key={v} value={v}>{v === "all" ? "All rarities" : v}</option>
              ))}
            </select>
            <select
              className="bldr-select"
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value)}
            >
              {editionOptions.map((v) => (
                <option key={v} value={v}>{v === "all" ? "All editions" : v}</option>
              ))}
            </select>
            <select
              className="bldr-select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              {projectOptions.map((v) => (
                <option key={v} value={v}>{v === "all" ? "All tokens" : v}</option>
              ))}
            </select>
            <select
              className="bldr-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
              <option value="project">Sort: Token</option>
            </select>
          </div>

          {options.length === 0 && (
            <p className="bldr-pool-empty">No eligible cards available for this contest.</p>
          )}
          {options.length > 0 && filtered.length === 0 && (
            <p className="bldr-pool-empty">No cards match these filters.</p>
          )}

          {/* Card grid */}
          <div className="bldr-pool-grid" aria-live="polite">
            {filtered.map((item) => {
              const slotIndex = lineupSlots.findIndex((v) => v === item.instanceId);
              const isSelected = slotIndex >= 0;
              const hasNoCapacity = selectedCount >= rosterSize && !isSelected;
              const itemIdentityKey = lineupIdentityKey(item);
              const duplicateTokenInOtherSlot = selectedIdentityKeysBySlot.some((key, idx) => key === itemIdentityKey && idx !== activeSlot);
              const isDisabled = !canEdit || hasNoCapacity || item.isLockedByActiveContest || duplicateTokenInOtherSlot;

              return (
                <div
                  key={item.instanceId}
                  className={`bldr-card-mvp${isSelected ? " bldr-card-selected" : ""}${isDisabled ? " bldr-card-disabled" : ""}`}
                  onClick={() => {
                    if (isDisabled) return;
                    onSelectCard(item.instanceId, activeSlot);
                  }}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label={`${item.name} — ${item.rarityCode}`}
                  aria-pressed={isSelected}
                >
                  <MvpCardTile card={toMvpCardView(item)} variant="compact" interactive={false} />

                  {/* Selected overlay */}
                  {isSelected && (
                    <div className="bldr-card-check-overlay">✓</div>
                  )}

                  {/* Locked overlay */}
                  {item.isLockedByActiveContest && (
                    <div className="bldr-card-locked-overlay">Locked</div>
                  )}

                  {duplicateTokenInOtherSlot && !isSelected && (
                    <div className="bldr-card-locked-overlay">Already used</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div className="bldr-footer">
          <div className="bldr-footer-top">
            <div className="bldr-footer-info">
              <span className="bldr-footer-count">{selectedCount} / {rosterSize} selected</span>
              {errorMessage
                ? <span className="bldr-footer-validation">{errorMessage}</span>
                : flashMessage
                  ? <span className="bldr-footer-flash">{flashMessage}</span>
                  : <span className="bldr-footer-validation">{validationText}</span>
              }
            </div>
          </div>
          <div className="bldr-footer-actions">
            <button
              type="button"
              className="bldr-btn-ghost"
              onClick={onSaveDraft}
              disabled={!canEdit || busy}
            >
              Save draft
            </button>
            {readyToSubmit && (
              <button
                type="button"
                className={`bldr-btn-submit-main${!busy ? " bldr-btn-pulse" : ""}`}
                onClick={onSubmit}
                disabled={!canEdit || busy}
              >
                {busy ? "Submitting…" : "Submit Lineup ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
