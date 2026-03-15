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

type SortMode = "rarity" | "name" | "potential";

export function CardSelectorModal({ open, options, selectedIds, onToggle, onClose, canEnter }: Props) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const [edition, setEdition] = useState("all");
  const [token, setToken] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");

  const rarityOptions = useMemo(() => ["all", ...new Set(options.map((card) => card.rarityCode))], [options]);
  const editionOptions = useMemo(() => ["all", ...new Set(options.map((card) => card.editionCode))], [options]);
  const tokenOptions = useMemo(() => ["all", ...new Set(options.map((card) => card.tokenProjectName))], [options]);
  const rarityOrder = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

  const filtered = useMemo(() => {
    const rows = options.filter((card) => {
      const byQuery = card.name.toLowerCase().includes(query.toLowerCase()) || card.cardSetCode.toLowerCase().includes(query.toLowerCase());
      const byRarity = rarity === "all" || card.rarityCode === rarity;
      const byEdition = edition === "all" || card.editionCode === edition;
      const byToken = token === "all" || card.tokenProjectName === token;
      return byQuery && byRarity && byEdition && byToken;
    });

    rows.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "potential") {
        const ai = rarityOrder.indexOf(a.rarityCode.toUpperCase());
        const bi = rarityOrder.indexOf(b.rarityCode.toUpperCase());
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.tokenProjectName.localeCompare(b.tokenProjectName);
      }
      const ai = rarityOrder.indexOf(a.rarityCode.toUpperCase());
      const bi = rarityOrder.indexOf(b.rarityCode.toUpperCase());
      const rarityDelta = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      if (rarityDelta !== 0) return rarityDelta;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [options, query, rarity, edition, token, sortMode]);

  if (!open) return null;

  return (
    <div className="contest-modal-overlay" role="presentation" onClick={onClose}>
      <div className="contest-modal team-builder-modal" role="dialog" aria-modal="true" aria-label="Select cards" onClick={(event) => event.stopPropagation()}>
        <div className="contest-modal-head">
          <div>
            <h4>Choose lineup card</h4>
            <p className="contest-inline-note">{selectedIds.length} selected · {filtered.length} available</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="contest-modal-filters team-builder-filters">
          <input className="collection-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name / set" />
          <select className="collection-select" value={rarity} onChange={(event) => setRarity(event.target.value)}>
            {rarityOptions.map((value) => (
              <option value={value} key={value}>{value === "all" ? "All rarities" : value}</option>
            ))}
          </select>
          <select className="collection-select" value={edition} onChange={(event) => setEdition(event.target.value)}>
            {editionOptions.map((value) => (
              <option value={value} key={value}>{value === "all" ? "All editions" : value}</option>
            ))}
          </select>
          <select className="collection-select" value={token} onChange={(event) => setToken(event.target.value)}>
            {tokenOptions.map((value) => (
              <option value={value} key={value}>{value === "all" ? "All tokens" : value}</option>
            ))}
          </select>
          <select className="collection-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="rarity">Sort: Rarity</option>
            <option value="name">Sort: Name</option>
            <option value="potential">Sort: Score potential</option>
          </select>
        </div>

        <div className="contest-modal-grid visual">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.instanceId);
            const isLocked = item.isLockedInOtherContest && !isSelected;
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
