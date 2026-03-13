import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { LineupOption } from "@/components/contests/types";

type Props = {
  open: boolean;
  options: LineupOption[];
  selectedIds: string[];
  onToggle: (instanceId: string) => void;
  onClose: () => void;
  canEnter: boolean;
};

export function CardSelectorModal({ open, options, selectedIds, onToggle, onClose, canEnter }: Props) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");

  const rarityOptions = useMemo(() => ["all", ...new Set(options.map((card) => card.rarityCode))], [options]);

  const filtered = useMemo(() => {
    return options.filter((card) => {
      const byQuery = card.name.toLowerCase().includes(query.toLowerCase()) || card.cardSetCode.toLowerCase().includes(query.toLowerCase());
      const byRarity = rarity === "all" || card.rarityCode === rarity;
      return byQuery && byRarity;
    });
  }, [options, query, rarity]);

  if (!open) return null;

  return (
    <div className="contest-modal-overlay" role="presentation" onClick={onClose}>
      <div className="contest-modal" role="dialog" aria-modal="true" aria-label="Select cards for lineup" onClick={(event) => event.stopPropagation()}>
        <div className="contest-modal-head">
          <h4>Card Selector</h4>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="contest-modal-filters">
          <input className="filter-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or set" />
          <select className="filter-select" value={rarity} onChange={(event) => setRarity(event.target.value)}>
            {rarityOptions.map((value) => <option value={value} key={value}>{value === "all" ? "All rarities" : value}</option>)}
          </select>
        </div>
        <div className="contest-modal-grid">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.instanceId);
            const isLocked = Boolean(item.lockState) && !isSelected;
            return (
              <button key={item.instanceId} className={`contest-option-card sketch-card${isSelected ? " selected" : ""}`} type="button" onClick={() => onToggle(item.instanceId)} disabled={isLocked || !canEnter}>
                <span className="contest-mini-art" aria-hidden>🃏</span>
                <p className="contest-option-name">{item.name}</p>
                <p className="contest-option-meta">{item.rarityCode} · {item.editionCode}</p>
                <p className="contest-option-meta">{item.cardSetCode}</p>
                {isLocked ? <span className="contest-option-lock">Locked in another contest</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
