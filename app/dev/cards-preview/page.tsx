import type { MvpCardView } from "@/types/cards";
import { MvpCardTile } from "@/components/ui/MvpCardTile";

const baseCard: Omit<MvpCardView, "templateId" | "tokenId" | "displayName" | "symbol" | "rarity" | "edition" | "imageUrl"> = {
  slug: "demo-token",
  primaryChain: "Ethereum",
  faction: "PANTHEON",
  plannedSupply: 730,
  issuedSupply: 127,
  remainingSupply: 603,
  owned: true,
  instanceCount: 1,
  cardText: "A premium collectible identity card forged for UI validation.",
  flavorText: "The frame should carry the rarity and edition finish at first glance.",
  cardNumber: "S01-001",
  setCode: "GENESIS",
  setEditionLabel: "Edition 1",
  setOrder: 1,
  editionNumber: 1,
};

const cases: Array<{ title: string; card: MvpCardView; quantity?: number }> = [
  {
    title: "COMMON · BASE",
    card: {
      ...baseCard,
      templateId: "tpl_common_base",
      tokenId: "tok_dogecoin",
      displayName: "Dogecoin",
      symbol: "DOGE",
      rarity: "COMMON",
      edition: "BASE",
      imageUrl: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409",
    },
  },
  {
    title: "UNCOMMON · REVERSE",
    card: {
      ...baseCard,
      templateId: "tpl_uncommon_reverse",
      tokenId: "tok_shiba-inu",
      displayName: "Shiba Inu",
      symbol: "SHIB",
      rarity: "UNCOMMON",
      edition: "REVERSE",
      imageUrl: "https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800",
    },
    quantity: 2,
  },
  {
    title: "RARE · BRILLANTE",
    card: {
      ...baseCard,
      templateId: "tpl_rare_brillante",
      tokenId: "tok_pepe",
      displayName: "Pepe",
      symbol: "PEPE",
      rarity: "RARE",
      edition: "BRILLANTE",
      imageUrl: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
    },
  },
  {
    title: "EPIC · HOLO",
    card: {
      ...baseCard,
      templateId: "tpl_epic_holo",
      tokenId: "tok_bonk",
      displayName: "Bonk",
      symbol: "BONK",
      rarity: "EPIC",
      edition: "HOLO",
      imageUrl: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg?1696527587",
    },
  },
  {
    title: "LEGENDARY · FULL_ART",
    card: {
      ...baseCard,
      templateId: "tpl_legendary_full_art",
      tokenId: "tok_wif",
      displayName: "dogwifhat",
      symbol: "WIF",
      rarity: "LEGENDARY",
      edition: "FULL_ART",
      imageUrl: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg?1702499428",
      plannedSupply: 45,
      issuedSupply: 8,
      remainingSupply: 37,
      cardNumber: "S01-025",
      setOrder: 25,
    },
  },
];

export default function CardsPreviewPage() {
  const heroCard = cases[4].card;

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0d", color: "#f3f1ec", padding: "24px 20px 56px" }}>
      <div style={{ maxWidth: 1420, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Rajdhani, Inter, sans-serif", fontSize: 42, letterSpacing: "0.04em", marginBottom: 8 }}>MCG Card Fidelity Preview</h1>
        <p style={{ color: "#8a8a84", marginBottom: 24 }}>Canonical card QA matrix for pack-opening parity.</p>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ marginBottom: 14 }}>Canonical matrix (rarity × edition)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(188px, 188px))", gap: 16, justifyContent: "center" }}>
            {cases.map((entry) => (
              <div key={`canonical_${entry.card.templateId}`}>
                <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>{entry.title}</p>
                <MvpCardTile card={entry.card} quantity={entry.quantity} variant="canonical" />
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ marginBottom: 14 }}>Zoom consistency</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 220px))", gap: 20, justifyContent: "center", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>Canonical</p>
              <MvpCardTile card={heroCard} variant="canonical" />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>Zoom (same internals)</p>
              <MvpCardTile card={heroCard} variant="zoom" />
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: 14 }}>Context wrappers (layout-only differences)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 210px))", gap: 16, justifyContent: "center" }}>
            {[
              "Collection grid",
              "Profile strip",
              "Contest tile",
              "Home recent pulls",
              "Pack reveal front",
            ].map((label) => (
              <div key={label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.02)" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.08em", color: "#8a8a84", marginBottom: 8 }}>{label}</p>
                <MvpCardTile card={cases[0].card} variant="canonical" interactive={false} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
