import { useMemo, useState } from "react";
import type { LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

type SortMode = "rarity" | "name" | "score";

const rarityWeight: Record<string, number> = {
  LEGENDARY: 5,
  EPIC: 4,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

function scorePotential(option: LineupOption) {
  const rarity = rarityWeight[option.rarityCode.toUpperCase()] ?? 0;
  const editionBoost = option.editionCode.toUpperCase().includes("FIRST") ? 2 : 1;
  return (rarity * 10) + editionBoost;
}

export function EligibleCardsPanel({
  options,
  selectedIds,
  activeSlot,
  canManage,
  onAssign,
}: {
  options: LineupOption[];
  selectedIds: string[];
  activeSlot: number | null;
  canManage: boolean;
  onAssign: (instanceId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("ALL");
  const [edition, setEdition] = useState("ALL");
  const [token, setToken] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("rarity");

  const rarityOptions = useMemo(() => ["ALL", ...new Set(options.map((o) => o.rarityCode))], [options]);
  const editionOptions = useMemo(() => ["ALL", ...new Set(options.map((o) => o.editionCode))], [options]);
  const tokenOptions = useMemo(() => ["ALL", ...new Set(options.map((o) => o.tokenProjectName))], [options]);

  const visible = useMemo(() => {
    const filtered = options.filter((item) => {
      if (rarity !== "ALL" && item.rarityCode !== rarity) return false;
      if (edition !== "ALL" && item.editionCode !== edition) return false;
      if (token !== "ALL" && item.tokenProjectName !== token) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${item.name} ${item.tokenProjectName} ${item.rarityCode} ${item.editionCode}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "score") return scorePotential(b) - scorePotential(a);
      const ra = rarityWeight[a.rarityCode.toUpperCase()] ?? 0;
      const rb = rarityWeight[b.rarityCode.toUpperCase()] ?? 0;
      return rb - ra;
    });
  }, [edition, options, rarity, search, sort, token]);

  return (
    <section className="contest-eligible-panel">
      <div className="contest-eligible-head contest-builder-section-head">
        <div>
          <p className="mcg-eyebrow">Card pool</p>
          <strong>{visible.length} cards available</strong>
        </div>
        <p className="contest-inline-note">
          {activeSlot !== null ? `Assigning to slot ${activeSlot + 1}` : "Select a slot, then choose a card."}
        </p>
      </div>

      <div className="contest-card-pool-toolbar">
        <div className="contest-card-pool-filters">
          <input className="input" placeholder="Search cards / token" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="input" value={rarity} onChange={(event) => setRarity(event.target.value)}>
            {rarityOptions.map((value) => <option key={value} value={value}>{value === "ALL" ? "All rarities" : value}</option>)}
          </select>
          <select className="input" value={edition} onChange={(event) => setEdition(event.target.value)}>
            {editionOptions.map((value) => <option key={value} value={value}>{value === "ALL" ? "All editions" : value}</option>)}
          </select>
          <select className="input" value={token} onChange={(event) => setToken(event.target.value)}>
            {tokenOptions.map((value) => <option key={value} value={value}>{value === "ALL" ? "All tokens" : value}</option>)}
          </select>
          <select className="input" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="rarity">Sort: rarity</option>
            <option value="name">Sort: name</option>
            <option value="score">Sort: score potential</option>
          </select>
        </div>
        <p className="contest-card-pool-meta">
          <span>{selectedIds.length} selected</span>
          <span>{visible.length} matching cards</span>
        </p>
      </div>

      <div className="contest-eligible-grid visual">
        {visible.length ? (
          visible.map((item) => {
            const isSelected = selectedIds.includes(item.instanceId);
            const isLocked = item.isLockedByActiveContest && !isSelected;
            return (
              <LineupCardTile
                key={item.instanceId}
                option={item}
                selected={isSelected}
                disabled={!canManage || isLocked || (isSelected && activeSlot === null)}
                onClick={() => onAssign(item.instanceId)}
              />
            );
          })
        ) : (
          <div className="contest-card-pool-empty">
            <strong>No cards match these filters.</strong>
            <span>Try broadening your search, rarity, edition, or token filters.</span>
          </div>
        )}
      </div>
    </section>
  );
}
