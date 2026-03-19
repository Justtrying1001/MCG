import Image from "next/image";
import { GAME_CONFIG } from "@/lib/game-config";

type Odd = { label: string; pct: number };

type FeaturedPackStageProps = {
  packImageSrc: unknown;
  packName: string;
  cardsPerPack: number;
  remaining?: number;
  planned?: number;
  isOpening: boolean;
  openingPhase: "idle" | "tearing" | "revealing";
  canOpen: boolean;
  onOpen: () => void;
  onOpenOdds: () => void;
  rarityOdds?: Odd[];
  editionOdds?: Odd[];
  userPoints?: number;
  isGuest?: boolean;
  purchaseLimit?: {
    enabled: boolean;
    limit: number | null;
    used: number;
    remainingPurchases: number | null;
    resetAt: string | null;
    cooldownSeconds: number;
    isBlocked: boolean;
  } | null;
  statusNotice?: {
    tone: "neutral" | "success" | "danger";
    title: string;
    detail?: string;
  } | null;
  guestHeadline?: string;
  guestSupportingCopy?: string;
};

const DEFAULT_RARITY_ODDS: Odd[] = [
  { label: "COMMON", pct: 73 },
  { label: "UNCOMMON", pct: 18 },
  { label: "RARE", pct: 6 },
  { label: "EPIC", pct: 2.5 },
  { label: "LEGENDARY", pct: 0.3 },
];

const DEFAULT_EDITION_ODDS: Odd[] = [
  { label: "BASE", pct: 60 },
  { label: "REVERSE", pct: 25 },
  { label: "BRILLANTE", pct: 10 },
  { label: "HOLO", pct: 4 },
  { label: "FULL ART", pct: 1 },
];

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#7E8794",
  UNCOMMON: "#4FA39A",
  RARE: "#3C6DF2",
  EPIC: "#6E4CCF",
  LEGENDARY: "#D8A63E",
};

const EDITION_COLOR: Record<string, string> = {
  BASE: "#6B7280",
  REVERSE: "#38BDF8",
  BRILLANTE: "#F59E0B",
  HOLO: "#A855F7",
  "FULL ART": "#D8A63E",
  FULL_ART: "#D8A63E",
};

export function FeaturedPackStage({
  packImageSrc,
  packName,
  cardsPerPack,
  remaining,
  planned,
  isOpening,
  openingPhase,
  canOpen,
  onOpen,
  onOpenOdds,
  rarityOdds,
  editionOdds,
  userPoints,
  isGuest = false,
  purchaseLimit,
  statusNotice,
  guestHeadline,
  guestSupportingCopy,
}: FeaturedPackStageProps) {
  const packCost = GAME_CONFIG.PACK_COST;
  const displayRarity = rarityOdds && rarityOdds.length > 0 ? rarityOdds : DEFAULT_RARITY_ODDS;
  const displayEdition = (editionOdds && editionOdds.length > 0 ? editionOdds : DEFAULT_EDITION_ODDS).map(
    (o) => ({ ...o, label: o.label.replace("_", " ") }),
  );
  const canAfford = userPoints === undefined || userPoints >= packCost;
  const isPurchaseBlocked = !isGuest && Boolean(purchaseLimit?.isBlocked);

  const ctaLabel =
    openingPhase === "tearing"
      ? isGuest
        ? "Preparing preview…"
        : "Breaking seal…"
      : isOpening
        ? isGuest
          ? "Loading demo reveal…"
          : "Preparing reveal…"
        : isGuest
          ? "Reveal a demo pack"
          : isPurchaseBlocked
            ? "Daily cap reached"
            : `Reveal pack — ${packCost} pts`;

  const hours = Math.floor((purchaseLimit?.cooldownSeconds ?? 0) / 3600);
  const minutes = Math.floor(((purchaseLimit?.cooldownSeconds ?? 0) % 3600) / 60);
  const cooldownLabel = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;

  const supplyText =
    typeof remaining === "number"
      ? `${remaining.toLocaleString()} packs remaining`
      : typeof planned === "number"
        ? `${planned.toLocaleString()} total planned`
        : "Supply pending";

  return (
    <div className="ps-layout">
      <div className="ps-hero">
        <div className="ps-hero-glow" />
        <div className="ps-hero-inner">
          <div className="ps-hero-image-wrap">
            <Image
              src={packImageSrc as Parameters<typeof Image>[0]["src"]}
              alt="MCG booster pack"
              className="ps-hero-image"
              priority
            />
          </div>
          <div className="ps-hero-meta">
            <span className="ps-edition-badge">GENESIS</span>
            <h1 className="ps-pack-name">{packName.toUpperCase()}</h1>
            <p className="ps-supply-counter">{supplyText}</p>
          </div>
        </div>
      </div>

      <div className="ps-panel">
        <div className="ps-price-block">
          <span className="ps-price-label">PRICE</span>
          <span className="ps-price-value">{packCost} PTS</span>
          {!canAfford && <span className="ps-price-warn">Not enough points</span>}
          {purchaseLimit ? (
            purchaseLimit.enabled ? (
              <div style={{ marginTop: 10 }}>
                <span className="ps-price-warn" style={{ color: isPurchaseBlocked ? "#fca5a5" : "#cbd5e1" }}>
                  {purchaseLimit.used} / {purchaseLimit.limit ?? 0} packs purchased
                </span>
                <span className="ps-price-warn" style={{ color: isPurchaseBlocked ? "#fca5a5" : "#86efac", display: "block" }}>
                  {isPurchaseBlocked
                    ? `Daily purchase cap reached · Try again in ${cooldownLabel}`
                    : `${purchaseLimit.remainingPurchases ?? 0} purchase${purchaseLimit.remainingPurchases === 1 ? "" : "s"} remaining`}
                </span>
              </div>
            ) : (
              <span className="ps-price-warn" style={{ marginTop: 10, color: "#86efac" }}>Purchase cap disabled</span>
            )
          ) : null}
        </div>

        <div className="ps-section">
          <h2 className="ps-section-title">WHAT&apos;S INSIDE</h2>
          <p className="ps-cards-count">{cardsPerPack} cards per pack</p>
          <div className="ps-slots-row">
            <span className="ps-slot-pill">STANDARD ×3</span>
            <span className="ps-slot-pill ps-slot-pill--boost">EDITION BOOST</span>
            <span className="ps-slot-pill ps-slot-pill--hit">RARITY HIT</span>
          </div>
        </div>

        <div className="ps-section">
          <h2 className="ps-section-title">ODDS</h2>
          <div className="ps-odds-grid">
            <div className="ps-odds-col">
              <p className="ps-odds-col-title">RARITY <span className="ps-odds-col-note">Slots 1–3</span></p>
              {displayRarity.map((o) => (
                <div key={o.label} className="ps-odd-row">
                  <span className="ps-rarity-dot" style={{ background: RARITY_COLOR[o.label] ?? "#7E8794" }} />
                  <span className="ps-rarity-label">{o.label}</span>
                  <span className="ps-rarity-pct">{o.pct}%</span>
                </div>
              ))}
            </div>
            <div className="ps-odds-col">
              <p className="ps-odds-col-title">EDITION <span className="ps-odds-col-note">Slot 4↑</span></p>
              {displayEdition.map((o) => (
                <div key={o.label} className="ps-odd-row">
                  <span className="ps-rarity-dot" style={{ background: EDITION_COLOR[o.label] ?? "#7E8794" }} />
                  <span className="ps-rarity-label">{o.label}</span>
                  <span className="ps-rarity-pct">{o.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ps-cta-block">
          <button
            type="button"
            className="ps-btn-primary"
            onClick={onOpen}
            disabled={!canOpen || isPurchaseBlocked}
          >
            {ctaLabel}
          </button>
          {statusNotice ? (
            <div
              className={`packs-inline-notice packs-inline-notice--${statusNotice.tone}`}
              role="status"
              aria-live="polite"
            >
              <strong>{statusNotice.title}</strong>
              {statusNotice.detail ? <span>{statusNotice.detail}</span> : null}
            </div>
          ) : null}
          {isGuest ? (
            <div className="ps-guest-copy-block">
              {guestHeadline ? <p className="ps-guest-headline">{guestHeadline}</p> : null}
              {guestSupportingCopy ? <p className="ps-guest-copy">{guestSupportingCopy}</p> : null}
            </div>
          ) : (
            <p className="ps-cta-subcopy">Open with points, reveal instantly, and add cards directly to your collection. Reward, contest, and admin-granted packs are unaffected by this purchase cap.</p>
          )}
          <button type="button" className="ps-btn-secondary" onClick={onOpenOdds}>
            Full odds &amp; supply details
          </button>
        </div>
      </div>
    </div>
  );
}
