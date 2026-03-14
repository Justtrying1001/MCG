import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

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

  const filtered = useMemo(
    () =>
      options.filter((card) => {
        const byQuery = card.name.toLowerCase().includes(query.toLowerCase()) || card.cardSetCode.toLowerCase().includes(query.toLowerCase());
        const byRarity = rarity === "all" || card.rarityCode === rarity;
        return byQuery && byRarity;
      }),
    [options, query, rarity],
  );

  if (!open) return null;

  return (
    <div className="contest-modal-overlay" role="presentation" onClick={onClose}>
      <div className="contest-modal" role="dialog" aria-modal="true" aria-label="Select cards" onClick={(event) => event.stopPropagation()}>
        <div className="contest-modal-head">
          <div>
            <h4>Eligible cards</h4>
            <p className="contest-inline-note">{selectedIds.length} selected · {filtered.length} shown</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="contest-modal-filters">
          <input className="collection-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search card or set" />
          <select className="collection-select" value={rarity} onChange={(event) => setRarity(event.target.value)}>
            {rarityOptions.map((value) => (
              <option value={value} key={value}>{value === "all" ? "All rarities" : value}</option>
            ))}
          </select>
        </div>

        <div className="contest-modal-grid visual">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.instanceId);
            const isLocked = Boolean(item.lockState) && !isSelected;
            return (
              <LineupCardTile
                key={item.instanceId}
                option={item}
                selected={isSelected}
                disabled={isLocked || !canEnter}
                onClick={() => onToggle(item.instanceId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
