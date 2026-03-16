import Link from "next/link";
import Image from "next/image";
import { GAME_CONFIG } from "@/lib/game-config";

const PREVIEW_TOKENS = [
  { symbol: "PEPE", label: "Pepe", rarity: "Legendary", img: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776" },
  { symbol: "WIF", label: "dogwifhat", rarity: "Legendary", img: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg?1702499428" },
  { symbol: "BONK", label: "Bonk", rarity: "Epic", img: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg?1696527587" },
  { symbol: "SHIB", label: "Shiba Inu", rarity: "Epic", img: "https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800" },
  { symbol: "DOGE", label: "Dogecoin", rarity: "Rare", img: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409" },
  { symbol: "FLOKI", label: "FLOKI", rarity: "Rare", img: "https://coin-images.coingecko.com/coins/images/16746/large/PNG_image.png?1696516318" },
  { symbol: "TRUMP", label: "TRUMP", rarity: "Rare", img: "https://coin-images.coingecko.com/coins/images/53746/large/trump.png?1737171561" },
  { symbol: "POPCAT", label: "Popcat", rarity: "Uncommon", img: "https://coin-images.coingecko.com/coins/images/33760/large/image.jpg?1702964227" },
  { symbol: "PNUT", label: "Peanut", rarity: "Uncommon", img: "https://coin-images.coingecko.com/coins/images/51301/large/Peanut_the_Squirrel.png?1734941241" },
  { symbol: "MOG", label: "Mog Coin", rarity: "Uncommon", img: "https://coin-images.coingecko.com/coins/images/31059/large/MOG_LOGO_200x200.png?1696529893" },
  { symbol: "ELON", label: "Dogelon Mars", rarity: "Common", img: "https://coin-images.coingecko.com/coins/images/14962/large/6GxcPRo3_400x400.jpg?1696514622" },
  { symbol: "BRETT", label: "Based Brett", rarity: "Common", img: "https://coin-images.coingecko.com/coins/images/35529/large/1000050750.png?1709031995" },
  { symbol: "M", label: "MemeCore", rarity: "Common", img: "https://coin-images.coingecko.com/coins/images/31861/large/1_FK6A0fD7XVk.jpg?1721041697" },
  { symbol: "TURBO", label: "Turbo", rarity: "Common", img: "https://coin-images.coingecko.com/coins/images/30117/large/TurboMark-QL_200.png?1708079597" },
] as const;

const RARITY_CLASS: Record<string, string> = {
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
          <p className="home-genesis-eyebrow">Set 1</p>
          <h2 className="home-genesis-title">GENESIS. {GAME_CONFIG.GENESIS_SET.TOKEN_COUNT} tokens. Live now.</h2>
        </div>
        <Link href="/packs" className="home-genesis-cta">
          EXPLORE THE SET →
        </Link>
      </div>

      <div className="home-genesis-strip-wrap">
        <div className="home-genesis-strip">
          {PREVIEW_TOKENS.map((token) => (
            <div
              key={token.symbol}
              className={`genesis-card ${RARITY_CLASS[token.rarity] ?? ""}`}
            >
              <div className="genesis-card-img-wrap">
                <Image
                  src={token.img}
                  alt={token.label}
                  fill
                  sizes="120px"
                  className="genesis-card-img"
                  unoptimized
                />
                <div className="genesis-card-overlay" />
              </div>
              <div className="genesis-card-footer">
                <span className="genesis-card-rarity">{token.rarity}</span>
                <span className="genesis-card-symbol">{token.symbol}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="home-genesis-fade-left" aria-hidden="true" />
        <div className="home-genesis-fade-right" aria-hidden="true" />
      </div>
    </section>
  );
}
