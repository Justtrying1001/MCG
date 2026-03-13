"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { Modal } from "@/components/ui/Modal";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { useSession } from "@/components/useSession";
import { GAME_CONFIG } from "@/lib/game-config";
import type { MvpCardView } from "@/types/cards";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import officialPackImage from "../../pack.png";
import versoImage from "../../verso.png";

type PackConfigPayload = {
  exists: boolean;
  pack: null | {
    code: string;
    displayName: string;
    cardsPerPack: number;
    plannedPackCount: number;
    openedPackCount: number;
    remainingPackCount: number;
    isActive: boolean;
  };
  slots: Array<{ index: number; type: string; label: string; rarityOdds: Array<{ rarityCode: string; pct: number }>; rarityEditionOdds: Array<{ rarityCode: string; editionCode: string; pct: number }> }>;
};

export default function PacksPage() {
  const { me, refresh, updateGuestState } = useSession();
  const [resultMvp, setResultMvp]       = useState<MvpCardView[]>([]);
  const [isOpening, setIsOpening]       = useState(false);
  const [revealed, setRevealed]         = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");
  const [packConfig, setPackConfig]     = useState<PackConfigPayload | null>(null);
  const [zoomedCard, setZoomedCard]     = useState<MvpCardView | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/pack/config")
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (active) setPackConfig(p as PackConfigPayload | null); })
      .catch(() => { if (active) setPackConfig(null); });
    return () => { active = false; };
  }, []);

  const revealSize = resultMvp.length;
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const revealedCount = revealed.filter(Boolean).length;
  const nextRevealIndex = revealed.findIndex((v) => !v);

  const openPack = async () => {
    if (!me) return;
    setIsOpening(true);
    setOpeningPhase("tearing");
    setResultMvp([]);
    setRevealed([]);

    const guestState = me.mode === "guest" ? {
      points: me.user.points, packsOpened: me.user.packsOpened,
      mvpCollection: me.mvpCollection, openingsCount: me.openingsCount,
    } : undefined;

    const res = await fetch(
      me.mode === "guest" ? "/api/guest/pack/open" : "/api/pack/open",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: guestState ? JSON.stringify({ state: guestState }) : undefined }
    );

    if (!res.ok) {
      alert(await res.text());
      setIsOpening(false); setOpeningPhase("idle");
      return;
    }

    const payload = await res.json();
    const pulledMvp = (payload.pulledCardsMvp ?? []) as MvpCardView[];

    if (pulledMvp.length === 0) {
      alert("Pack opened but MVP reveal payload is missing. Please refresh and retry.");
      setIsOpening(false); setOpeningPhase("idle");
      if (me.mode === "guest") updateGuestState(payload.state);
      else await refresh();
      return;
    }

    setTimeout(() => {
      setResultMvp(pulledMvp);
      setRevealed(new Array(pulledMvp.length).fill(false));
      setOpeningPhase("revealing");
      setIsOpening(false);
    }, 1000);

    if (me.mode === "guest") updateGuestState(payload.state);
    else await refresh();
  };

  const handleReveal = (index: number) => {
    if (revealed[index] || index !== nextRevealIndex) return;
    setRevealed((prev) => prev.map((v, i) => (i === index ? true : v)));
  };

  const closeReveal = () => {
    setResultMvp([]); setRevealed([]);
    setOpeningPhase("idle"); setZoomedCard(null);
  };

  const revealCards = useMemo(
    () => resultMvp.map((card, i) => ({
      key: `${card.templateId}_${i}`,
      render: <MvpCardTile card={card} quantity={1} variant="reveal" />,
    })),
    [resultMvp]
  );

  const packRemaining = packConfig?.pack?.remainingPackCount;
  const packPlanned   = packConfig?.pack?.plannedPackCount;
  const packsSold     = packConfig?.pack?.openedPackCount;
  const cardsPerPack  = packConfig?.pack?.cardsPerPack ?? GAME_CONFIG.CARDS_PER_PACK;
  const standardSlots = packConfig?.slots?.filter((slot) => slot.type.toLowerCase().includes("standard")).length ?? 3;
  const premiumSlots  = packConfig?.slots?.filter((slot) => slot.type.toLowerCase().includes("premium")).length ?? 1;
  const hitSlots      = packConfig?.slots?.filter((slot) => slot.type.toLowerCase().includes("hit")).length ?? 1;

  const rarityRows = useMemo(() => {
    const totalSlots = Math.max(cardsPerPack, 1);
    const aggregate = new Map<string, number>();

    for (const slot of packConfig?.slots ?? []) {
      for (const odd of slot.rarityOdds ?? []) {
        const key = odd.rarityCode.toUpperCase();
        aggregate.set(key, (aggregate.get(key) ?? 0) + (odd.pct / totalSlots));
      }
    }

    return Array.from(aggregate.entries())
      .map(([label, rate]) => ({ label, rate: Number(rate.toFixed(2)) }))
      .sort((a, b) => b.rate - a.rate);
  }, [cardsPerPack, packConfig?.slots]);

  const editionRows = useMemo(() => {
    const totalSlots = Math.max(cardsPerPack, 1);
    const aggregate = new Map<string, number>();

    for (const slot of packConfig?.slots ?? []) {
      for (const odd of slot.rarityEditionOdds ?? []) {
        const key = odd.editionCode.toUpperCase();
        aggregate.set(key, (aggregate.get(key) ?? 0) + (odd.pct / totalSlots));
      }
    }

    return Array.from(aggregate.entries())
      .map(([label, rate]) => ({ label, rate: Number(rate.toFixed(2)) }))
      .sort((a, b) => b.rate - a.rate);
  }, [cardsPerPack, packConfig?.slots]);

  return (
    <SiteShell>
      <div className="hub-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Open Packs</h1>
            <p className="page-subtitle">
              Dark, clean, and reveal-first. Open fast, flip one by one, collect forever.
            </p>
          </div>
        </div>

        {/* ── Mode Banner ── */}
        {!me ? (
          <div className="warning-banner">
            Sign in with X or start a guest session to open packs and reveal cards.
          </div>
        ) : me.mode === "guest" ? (
          <div className="info-banner">
            Guest mode is local and temporary. Connect with X to save your collection permanently.
          </div>
        ) : (
          <div className="success-banner">
            Authenticated — every card you pull is saved directly to your collection.
          </div>
        )}

        {/* ── Pack Stage ── */}
        <div className={`pack-stage${openingPhase === "tearing" ? " is-opening" : ""}`}>

          {/* LEFT — Info Panel */}
          <div className="pack-info">
            <div>
              <p className="pack-info-title">Genesis Booster · S01</p>
              <p className="pack-info-desc">
                Minimal info, maximum suspense. The cards stay center stage.
              </p>
              {typeof packRemaining === "number" && typeof packPlanned === "number" && (
                <div style={{ marginTop: "0.85rem" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: "0.74rem", color: "var(--text-3)", marginBottom: "0.35rem",
                  }}>
                    <span>Packs remaining</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>
                      {packRemaining} / {packPlanned}
                    </span>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 999,
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      background: "var(--gold)",
                      width: `${Math.round((packRemaining / Math.max(packPlanned, 1)) * 100)}%`,
                      transition: "width 400ms ease-out",
                    }} />
                  </div>
                </div>
              )}
            </div>

            <div className="pack-metrics">
              <div className="pack-metric-line">
                <span className="pack-metric-label">Price</span>
                <span className="pack-metric-value">{GAME_CONFIG.PACK_COST} pts</span>
              </div>
              <div className="pack-metric-line">
                <span className="pack-metric-label">Supply</span>
                <span className="pack-metric-value">
                  {typeof packRemaining === "number" ? packRemaining.toLocaleString() : "—"} left · {typeof packsSold === "number" ? packsSold.toLocaleString() : "—"} sold · {typeof packPlanned === "number" ? packPlanned.toLocaleString() : "—"} total
                </span>
              </div>
            </div>

            <div className="pack-pill-row">
              <span className="pack-pill">{cardsPerPack} cards</span>
              <span className="pack-pill">{standardSlots} standard</span>
              <span className="pack-pill">{premiumSlots} premium</span>
              <span className="pack-pill">{hitSlots} hit</span>
            </div>

            <div className="pack-rates-table-wrap">
              <p className="pack-odds-label">Drop rates</p>
              <div className="pack-rates-split">
                <div>
                  <p className="pack-odds-label" style={{ marginBottom: "0.2rem" }}>By rarity</p>
                  <table className="pack-rates-table" aria-label="Pack drop rates by rarity">
                    <thead>
                      <tr>
                        <th>Rarity</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rarityRows.slice(0, 5).map((row) => (
                        <tr key={`rarity_${row.label}`}>
                          <td>{row.label}</td>
                          <td>{row.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="pack-odds-label" style={{ marginBottom: "0.2rem" }}>By edition</p>
                  <table className="pack-rates-table" aria-label="Pack drop rates by edition">
                    <thead>
                      <tr>
                        <th>Edition</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editionRows.slice(0, 5).map((row) => (
                        <tr key={`edition_${row.label}`}>
                          <td>{row.label}</td>
                          <td>{row.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER — Pack Visual & CTA */}
          <div className="pack-center">
            <div className={`pack-visual${openingPhase === "idle" ? " pack-visual-idle" : ""}${openingPhase === "tearing" ? " is-tearing" : ""}`}>
              <Image
                src={officialPackImage}
                alt="Official MCG Genesis Booster pack"
                className="pack-visual-image"
                priority
              />
              <div className="pack-open-flash" />
            </div>

            <div className="pack-action-copy">
              <p className="pack-action-title">Genesis Booster — Standard Pull</p>
              <p className="pack-action-desc">
                Reveal all 5 cards manually, one at a time. The ritual is yours.
              </p>
            </div>

            <Button
              onClick={() => void openPack()}
              disabled={!me || isOpening || openingPhase === "tearing"}
              className="btn-lg"
            >
              {openingPhase === "tearing"
                ? "Breaking seal…"
                : isOpening
                  ? "Preparing reveal…"
                  : "Open Pack"}
            </Button>

            {openingPhase === "tearing" && (
              <p className="pack-opening-status">Foil tearing… cards incoming.</p>
            )}
          </div>

          {/* RIGHT — Summary */}
          <div className="pack-right">
            <div className="pack-side-card">
              <p className="pack-side-card-label">Pack summary</p>
              <p className="pack-side-card-copy">
                {cardsPerPack} cards. Open and flip in order. Premium guaranteed. Signed-in pulls are saved.
              </p>
            </div>
          </div>
        </div>

        {/* ── Reveal Modal ── */}
        <Modal
          title={allRevealed ? "Pack complete — all cards revealed" : "Pack reveal — flip cards in order"}
          open={revealSize > 0 && openingPhase === "revealing"}
          onClose={closeReveal}
        >
          <div className="reveal-progress-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <p className="reveal-progress-text">Revealed {revealedCount} / {revealSize}</p>
              {!allRevealed && (
                <p className="reveal-next-copy">Next: click card #{nextRevealIndex + 1}</p>
              )}
            </div>
            <div className="reveal-progress-track">
              <div
                className="reveal-progress-fill"
                style={{ width: `${(revealedCount / Math.max(revealSize, 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="pack-reveal-grid">
            {revealCards.map((card, index) => {
              const isCardRevealed = revealed[index];
              const isNext = index === nextRevealIndex;
              return (
                <button
                  key={card.key}
                  className={`reveal-slot${isCardRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`}
                  onClick={() => {
                    if (isCardRevealed) { setZoomedCard(resultMvp[index] ?? null); return; }
                    handleReveal(index);
                  }}
                  disabled={!isCardRevealed && !isNext}
                >
                  <div className="reveal-slot-inner">
                    <div className="reveal-slot-face reveal-slot-back">
                      <Image src={versoImage} alt="Card back" className="reveal-slot-back-image" />
                      <span className="back-label">
                        {isNext ? "Click to reveal" : "Awaiting previous"}
                      </span>
                    </div>
                    <div className="reveal-slot-face reveal-slot-front">{card.render}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {allRevealed && (
            <div className="reveal-complete-row">
              <p className="reveal-complete-copy">
                Full pack revealed. Cards have been added to your collection.
              </p>
              <Button onClick={closeReveal}>Done</Button>
            </div>
          )}
        </Modal>

        <CardZoomModal
          card={zoomedCard}
          quantity={1}
          open={Boolean(zoomedCard)}
          onClose={() => setZoomedCard(null)}
        />

      </div>
    </SiteShell>
  );
}
