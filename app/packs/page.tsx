"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeaturedPackStage } from "@/components/packs/FeaturedPackStage";
import { PackGallery } from "@/components/packs/PackGallery";
import { PackOddsDrawer } from "@/components/packs/PackOddsDrawer";
import { useSession } from "@/components/useSession";
import { GAME_CONFIG } from "@/lib/game-config";
import type { MvpCardView } from "@/types/cards";
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
  slots: Array<{
    index: number;
    type: string;
    label: string;
    rarityOdds: Array<{ rarityCode: string; pct: number }>;
    rarityEditionOdds: Array<{ rarityCode: string; editionCode: string; pct: number }>;
  }>;
};

export default function PacksPage() {
  const { me, refresh, updateGuestState } = useSession();
  const [resultMvp, setResultMvp] = useState<MvpCardView[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");
  const [packConfig, setPackConfig] = useState<PackConfigPayload | null>(null);
  const [zoomedCard, setZoomedCard] = useState<MvpCardView | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/pack/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (active) setPackConfig(p as PackConfigPayload | null);
      })
      .catch(() => {
        if (active) setPackConfig(null);
      });
    return () => {
      active = false;
    };
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

    const guestState =
      me.mode === "guest"
        ? {
            points: me.user.points,
            packsOpened: me.user.packsOpened,
            mvpCollection: me.mvpCollection,
            openingsCount: me.openingsCount,
          }
        : undefined;

    const res = await fetch(me.mode === "guest" ? "/api/guest/pack/open" : "/api/pack/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: guestState ? JSON.stringify({ state: guestState }) : undefined,
    });

    if (!res.ok) {
      alert(await res.text());
      setIsOpening(false);
      setOpeningPhase("idle");
      return;
    }

    const payload = await res.json();
    const pulledMvp = (payload.pulledCardsMvp ?? []) as MvpCardView[];

    if (pulledMvp.length === 0) {
      alert("Pack opened but MVP reveal payload is missing. Please refresh and retry.");
      setIsOpening(false);
      setOpeningPhase("idle");
      if (me.mode === "guest") updateGuestState(payload.state);
      else await refresh();
      return;
    }

    setTimeout(() => {
      setResultMvp(pulledMvp);
      setRevealed(new Array(pulledMvp.length).fill(false));
      setOpeningPhase("revealing");
      setIsOpening(false);
    }, 900);

    if (me.mode === "guest") updateGuestState(payload.state);
    else await refresh();
  };

  const handleReveal = (index: number) => {
    if (revealed[index] || index !== nextRevealIndex) return;
    setRevealed((prev) => prev.map((v, i) => (i === index ? true : v)));
  };

  const closeReveal = () => {
    setResultMvp([]);
    setRevealed([]);
    setOpeningPhase("idle");
    setZoomedCard(null);
  };

  const revealCards = useMemo(
    () =>
      resultMvp.map((card, i) => ({
        key: `${card.templateId}_${i}`,
        render: <MvpCardTile card={card} quantity={1} variant="reveal" />,
      })),
    [resultMvp],
  );

  const packRemaining = packConfig?.pack?.remainingPackCount;
  const packPlanned = packConfig?.pack?.plannedPackCount;
  const cardsPerPack = packConfig?.pack?.cardsPerPack ?? GAME_CONFIG.CARDS_PER_PACK;

  const rarityRows = useMemo(() => {
    const totalSlots = Math.max(cardsPerPack, 1);
    const aggregate = new Map<string, number>();
    for (const slot of packConfig?.slots ?? []) {
      for (const odd of slot.rarityOdds ?? []) {
        const key = odd.rarityCode.toUpperCase();
        aggregate.set(key, (aggregate.get(key) ?? 0) + odd.pct / totalSlots);
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
        aggregate.set(key, (aggregate.get(key) ?? 0) + odd.pct / totalSlots);
      }
    }
    return Array.from(aggregate.entries())
      .map(([label, rate]) => ({ label, rate: Number(rate.toFixed(2)) }))
      .sort((a, b) => b.rate - a.rate);
  }, [cardsPerPack, packConfig?.slots]);

  const galleryItems = useMemo(
    () => [
      { code: "S01-BASE", name: "Genesis Base Booster", kind: "base" as const, cards: cardsPerPack, status: "open" as const },
      { code: "S01-PRM", name: "Genesis Premium Booster", kind: "premium" as const, cards: 8, status: "locked" as const },
      { code: "EVT-001", name: "Event Spotlight Pack", kind: "event" as const, cards: 5, status: "locked" as const },
    ],
    [cardsPerPack],
  );

  return (
    <SiteShell>
      {!me ? (
        <EmptyState title="Connect to open packs" description="Sign in with X or start a guest session to reveal cards." />
      ) : null}

      <FeaturedPackStage
        packImageSrc={officialPackImage}
        packName={packConfig?.pack?.displayName ?? "Genesis Booster"}
        cardsPerPack={cardsPerPack}
        remaining={packRemaining}
        planned={packPlanned}
        isOpening={isOpening}
        openingPhase={openingPhase}
        canOpen={Boolean(me) && !isOpening && openingPhase !== "tearing"}
        onOpen={() => void openPack()}
        onOpenOdds={() => setOddsOpen(true)}
      />

      <PackGallery items={galleryItems} />

      <PackOddsDrawer
        open={oddsOpen}
        onClose={() => setOddsOpen(false)}
        rarityRows={rarityRows}
        editionRows={editionRows}
        remaining={packRemaining}
        planned={packPlanned}
      />

      <Modal
        title={allRevealed ? "Pack complete — all cards revealed" : "Pack reveal — flip cards in order"}
        open={revealSize > 0 && openingPhase === "revealing"}
        onClose={closeReveal}
      >
        <div className="reveal-progress-wrap">
          <div className="pack-reveal-head-row">
            <p className="reveal-progress-text">Revealed {revealedCount} / {revealSize}</p>
            {!allRevealed ? <p className="reveal-next-copy">Next: click card #{nextRevealIndex + 1}</p> : null}
          </div>
          <div className="reveal-progress-track">
            <div className="reveal-progress-fill" style={{ width: `${(revealedCount / Math.max(revealSize, 1)) * 100}%` }} />
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
                  if (isCardRevealed) {
                    setZoomedCard(resultMvp[index] ?? null);
                    return;
                  }
                  handleReveal(index);
                }}
                disabled={!isCardRevealed && !isNext}
              >
                <div className="reveal-slot-inner">
                  <div className="reveal-slot-face reveal-slot-back">
                    <Image src={versoImage} alt="Card back" className="reveal-slot-back-image" />
                    <span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous"}</span>
                  </div>
                  <div className="reveal-slot-face reveal-slot-front">{card.render}</div>
                </div>
              </button>
            );
          })}
        </div>

        {allRevealed ? (
          <div className="reveal-complete-row">
            <p className="reveal-complete-copy">Full pack revealed. Cards have been added to your collection.</p>
            <Button onClick={closeReveal}>Done</Button>
          </div>
        ) : null}
      </Modal>

      <CardZoomModal card={zoomedCard} quantity={1} open={Boolean(zoomedCard)} onClose={() => setZoomedCard(null)} />
    </SiteShell>
  );
}
