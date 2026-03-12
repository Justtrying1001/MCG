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
      imageUrl: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifcoin.jpg?1702499428",
      plannedSupply: 45,
      issuedSupply: 8,
      remainingSupply: 37,
      cardNumber: "S01-050",
      setOrder: 50,
    },
  },
];

const noImageCard: MvpCardView = {
  ...baseCard,
  templateId: "tpl_no_image",
  tokenId: "tok_noimg",
  displayName: "No Image Token",
  symbol: "NONE",
  rarity: "UNCOMMON",
  edition: "BASE",
  imageUrl: null,
};

const longTextCard: MvpCardView = {
  ...baseCard,
  templateId: "tpl_long_text",
  tokenId: "tok_long",
  displayName: "Extremely Long Meme Identity Name For Layout Stress Testing",
  symbol: "LONGTOKEN",
  rarity: "RARE",
  edition: "HOLO",
  imageUrl: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409",
  cardText:
    "This is intentionally long to test overflow behavior, line clamping, and premium readability in both reveal and collection contexts.",
};

export default function CardsPreviewPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0d", color: "#f3f1ec", padding: "24px 20px 56px" }}>
      <div style={{ maxWidth: 1420, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Rajdhani, Inter, sans-serif", fontSize: 42, letterSpacing: "0.04em", marginBottom: 8 }}>MCG Card Fidelity Preview</h1>
        <p style={{ color: "#8a8a84", marginBottom: 24 }}>Reference set rendered with production component for collection/reveal validation.</p>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ marginBottom: 14 }}>Collection variants (required 5 combos)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(188px, 188px))", gap: 16, justifyContent: "center" }}>
            {cases.map((entry) => (
              <div key={`collection_${entry.card.templateId}`}>
                <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>{entry.title}</p>
                <MvpCardTile card={entry.card} quantity={entry.quantity} variant="collection" />
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ marginBottom: 14 }}>Reveal variants (required 5 combos)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(188px, 188px))", gap: 16, justifyContent: "center" }}>
            {cases.map((entry) => (
              <div key={`reveal_${entry.card.templateId}`}>
                <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>{entry.title}</p>
                <MvpCardTile card={entry.card} quantity={entry.quantity} variant="reveal" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: 14 }}>Edge cases</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(188px, 188px))", gap: 16, justifyContent: "center" }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>No image fallback</p>
              <MvpCardTile card={noImageCard} variant="collection" />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>Long name / long text</p>
              <MvpCardTile card={longTextCard} variant="collection" quantity={3} />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8a84", marginBottom: 8 }}>Compact static</p>
              <MvpCardTile card={cases[4].card} variant="compact" interactive={false} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
