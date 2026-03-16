import { useEffect, useMemo, useState } from "react";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

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
};

type SortMode = "rarity" | "name" | "project";

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

function formatCountdown(lockAt: string | null, nowTs: number) {
  if (!lockAt) return "No lock set";
  const diff = new Date(lockAt).getTime() - nowTs;
  if (diff <= 0) return "Team lock reached";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}

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
}: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const canEdit = contestStatus === "OPEN";
  const selectedCount = lineupSlots.filter(Boolean).length;
  const readyToSubmit = selectedCount === rosterSize;

  useEffect(() => {
    if (!open) return;
    const firstEmpty = lineupSlots.findIndex((slot) => slot === null);
    setActiveSlot(firstEmpty >= 0 ? firstEmpty : 0);
  }, [open, lineupSlots]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  const optionById = useMemo(() => new Map(options.map((item) => [item.instanceId, item])), [options]);

  const rarityOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.rarityCode))], [options]);
  const projectOptions = useMemo(() => ["all", ...new Set(options.map((item) => item.tokenProjectName))], [options]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const rows = options.filter((item) => {
      const byQuery =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.cardSetCode.toLowerCase().includes(normalizedQuery) ||
        item.tokenProjectName.toLowerCase().includes(normalizedQuery);
      const byRarity = rarityFilter === "all" || item.rarityCode === rarityFilter;
      const byProject = projectFilter === "all" || item.tokenProjectName === projectFilter;
      return byQuery && byRarity && byProject;
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
  }, [options, query, rarityFilter, projectFilter, sortMode]);

  const validationText = !canEdit
    ? "Team lock prevents changes"
    : readyToSubmit
      ? "Ready to submit"
      : `Lineup incomplete · select ${rosterSize - selectedCount} more`;

  if (!open) return null;

  return (
    <div className="contest-modal-overlay" role="presentation" onClick={onClose}>
      <div className="contest-lineup-builder-modal" role="dialog" aria-modal="true" aria-label="Lineup builder" onClick={(event) => event.stopPropagation()}>
        <header className="contest-lineup-builder-head">
          <div>
            <p className="mcg-eyebrow">{contestStatus === "OPEN" ? "Build your lineup" : "Lineup locked"}</p>
            <h3>{contestTitle}</h3>
            <p className="contest-inline-note">
              {lineupSlots.some(Boolean) ? "Edit your lineup before submissions close" : `Build your ${rosterSize}-card lineup before team lock`} · Entry {entryFeeLabel}
            </p>
          </div>
          <div className="contest-lineup-builder-head-meta">
            <p><b>Status</b>{contestStatus}</p>
            <p><b>Time before lock</b>{formatCountdown(lockAt, nowTs)}</p>
            <button type="button" className="mcg-btn mcg-btn-ghost" onClick={onClose}>Close</button>
          </div>
        </header>

        <div className="contest-lineup-builder-layout">
          <section className="contest-lineup-selected-zone">
            <div>
              <h4>Selected Lineup</h4>
              <p className="contest-inline-note">Pick a slot, then choose a card from the pool.</p>
              <p className="contest-inline-note">{selectedCount}/{rosterSize} selected</p>
            </div>

            <div className="contest-lineup-slots">
              {Array.from({ length: rosterSize }).map((_, index) => {
                const instanceId = lineupSlots[index];
                const card = instanceId ? optionById.get(instanceId) : null;
                const isActive = activeSlot === index;

                return (
                  <article key={index} className={`contest-lineup-slot ${isActive ? "is-active" : ""}`}>
                    <div className="contest-lineup-slot-top">
                      <p>Slot {index + 1}</p>
                      <button
                        type="button"
                        className="contest-slot-select-btn"
                        onClick={() => {
                          setActiveSlot(index);
                          onSelectSlot(index);
                        }}
                      >
                        {isActive ? "Target slot" : "Select slot"}
                      </button>
                    </div>

                    {!card ? (
                      <button
                        type="button"
                        className="contest-lineup-empty-slot"
                        onClick={() => {
                          setActiveSlot(index);
                          onSelectSlot(index);
                        }}
                      >
                        Empty slot · choose a card
                      </button>
                    ) : (
                      <div className="contest-lineup-filled-slot">
                        <LineupCardTile option={card} selected onClick={() => onSelectCard(card.instanceId, index)} />
                        <div className="contest-lineup-slot-actions">
                          {canEdit ? (
                            <button type="button" className="mcg-btn mcg-btn-ghost" onClick={() => onRemoveSlot(index)}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="contest-lineup-rule-hint">
              <p><b>Lineup size:</b> {rosterSize} cards exact</p>
              <p><b>Eligibility:</b> {rule?.cardSetId ? "Restricted card set" : "Any eligible owned cards"}</p>
            </div>
          </section>

          <section className="contest-lineup-pool-zone">
            <div className="contest-lineup-pool-controls">
              <input
                className="collection-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by card, set or project"
              />
              <select className="collection-select" value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
                {rarityOptions.map((value) => <option key={value} value={value}>{value === "all" ? "All rarities" : value}</option>)}
              </select>
              <select className="collection-select" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                {projectOptions.map((value) => <option key={value} value={value}>{value === "all" ? "All projects" : value}</option>)}
              </select>
              <select className="collection-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="rarity">Sort by rarity</option>
                <option value="name">Sort by name</option>
                <option value="project">Sort by project</option>
              </select>
            </div>

            {options.length === 0 ? <p className="contest-inline-note">No eligible cards available for this contest.</p> : null}
            {options.length > 0 && filtered.length === 0 ? <p className="contest-inline-note">No cards match current search and filters.</p> : null}

            <div className="contest-lineup-pool-grid" aria-live="polite">
              {filtered.map((item) => {
                const slotIndex = lineupSlots.findIndex((value) => value === item.instanceId);
                const isSelected = slotIndex >= 0;
                const hasNoCapacity = selectedCount >= rosterSize && !isSelected;
                const isDisabled = !canEdit || hasNoCapacity || item.isLockedByActiveContest;
                const stateLabel = item.isLockedByActiveContest
                  ? "Locked in another contest"
                  : isSelected
                    ? `In slot ${slotIndex + 1}`
                    : hasNoCapacity
                      ? "Lineup full"
                      : "Selectable";

                return (
                  <article key={item.instanceId} className={`contest-pool-card-wrap ${isSelected ? "is-selected" : ""}`}>
                    <LineupCardTile
                      option={item}
                      selected={isSelected}
                      disabled={isDisabled}
                      onClick={() => onSelectCard(item.instanceId, activeSlot)}
                    />
                    <div className="contest-pool-card-meta">
                      <span>{stateLabel}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="contest-lineup-builder-footer">
          <div>
            <p>{selectedCount} / {rosterSize} selected</p>
            <p className="contest-inline-note">{validationText}</p>
            {flashMessage ? <p className="contest-lineup-flash">{flashMessage}</p> : null}
          </div>
          <div className="contest-lineup-builder-actions">
            <button type="button" className="mcg-btn mcg-btn-ghost" onClick={onSaveDraft} disabled={!canEdit || busy}>Save draft</button>
            <button type="button" className="mcg-btn" onClick={onSubmit} disabled={!canEdit || !readyToSubmit || busy}>
              {busy ? "Submitting…" : "Submit lineup"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
