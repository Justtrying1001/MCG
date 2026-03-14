import Link from "next/link";

// Placeholder card backs — 50 cards in Set 1, show a representative preview strip
const PREVIEW_CARDS = [
  { rarity: "Legendary", label: "?" },
  { rarity: "Epic", label: "?" },
  { rarity: "Rare", label: "?" },
  { rarity: "Rare", label: "?" },
  { rarity: "Uncommon", label: "?" },
  { rarity: "Uncommon", label: "?" },
  { rarity: "Common", label: "?" },
  { rarity: "Common", label: "?" },
  { rarity: "Common", label: "?" },
  { rarity: "Epic", label: "?" },
  { rarity: "Legendary", label: "?" },
  { rarity: "Rare", label: "?" },
];

const rarityClass: Record<string, string> = {
  Legendary: "genesis-card--legendary",
  Epic: "genesis-card--epic",
  Rare: "genesis-card--rare",
  Uncommon: "genesis-card--uncommon",
  Common: "genesis-card--common",
};

export function GenesisPreviewStrip() {
  return (
    <section className="home-genesis">
      <div className="home-genesis-header">
        <div>
          <p className="mcg-eyebrow">Set 1</p>
          <h2 className="home-genesis-title">GENESIS. 50 cards. Live now.</h2>
        </div>
        <Link href="/packs" className="home-genesis-cta">
          EXPLORE THE SET →
        </Link>
      </div>

      <div className="home-genesis-strip-wrap">
        <div className="home-genesis-strip">
          {PREVIEW_CARDS.map((card, i) => (
            <div
              key={i}
              className={`genesis-card ${rarityClass[card.rarity] ?? ""}`}
              aria-label={`${card.rarity} card`}
            >
              <div className="genesis-card-back">
                <div className="genesis-card-back-shine" aria-hidden="true" />
                <div className="genesis-card-rarity">{card.rarity}</div>
                <div className="genesis-card-question" aria-hidden="true">?</div>
              </div>
            </div>
          ))}
        </div>
        {/* fade edges */}
        <div className="home-genesis-fade-left" aria-hidden="true" />
        <div className="home-genesis-fade-right" aria-hidden="true" />
      </div>
    </section>
  );
}
