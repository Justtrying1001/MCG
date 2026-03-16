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

type RewardPackGrant = {
  id: string;
  createdAt: string;
  packDefinition: {
    code: string;
    displayName: string;
    description?: string | null;
  };
};

export default function PacksPage() {
  const { me, refresh } = useSession();
  const [resultMvp, setResultMvp] = useState<MvpCardView[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");
  const [packConfig, setPackConfig] = useState<PackConfigPayload | null>(null);
  const [zoomedCard, setZoomedCard] = useState<MvpCardView | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [rewardGrants, setRewardGrants] = useState<RewardPackGrant[]>([]);
  const [loadingRewardGrants, setLoadingRewardGrants] = useState(false);
  const [openingRewardGrantId, setOpeningRewardGrantId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!me) {
      setRewardGrants([]);
      setLoadingRewardGrants(false);
      return;
    }

    let active = true;
    setLoadingRewardGrants(true);
    fetch("/api/rewards/packs", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as { grants?: RewardPackGrant[] } | null;
      })
      .then((payload) => {
        if (!active) return;
        const grants = Array.isArray(payload?.grants)
          ? payload.grants.map((grant) => ({
              ...grant,
              packDefinition: {
                ...grant.packDefinition,
                description: grant.packDefinition.description ?? null,
              },
            }))
          : [];
        setRewardGrants(grants);
        setLoadingRewardGrants(false);
      })
      .catch(() => {
        if (!active) return;
        setRewardGrants([]);
        setLoadingRewardGrants(false);
      });

    return () => {
      active = false;
    };
  }, [me]);

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

    const res = await fetch("/api/pack/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      await refresh();
      return;
    }

    setTimeout(() => {
      setResultMvp(pulledMvp);
      setRevealed(new Array(pulledMvp.length).fill(false));
      setOpeningPhase("revealing");
      setIsOpening(false);
    }, 900);

    await refresh();
  };

  const openRewardPack = async (grantId: string) => {
    if (!me) return;
    try {
      setOpeningRewardGrantId(grantId);
      setIsOpening(true);
      setOpeningPhase("tearing");
      setResultMvp([]);
      setRevealed([]);

      const res = await fetch("/api/rewards/packs/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });

      if (!res.ok) {
        alert(await res.text());
        setOpeningRewardGrantId(null);
        setIsOpening(false);
        setOpeningPhase("idle");
        return;
      }

      const payload = (await res.json()) as { pulledCardsMvp?: MvpCardView[] };
      const pulledMvp = payload.pulledCardsMvp ?? [];

      if (pulledMvp.length === 0) {
        alert("Reward pack opened but MVP reveal payload is missing. Please refresh and retry.");
        setOpeningRewardGrantId(null);
        setIsOpening(false);
        setOpeningPhase("idle");
        await refresh();
        return;
      }

      setRewardGrants((prev) => prev.filter((grant) => grant.id !== grantId));
      setTimeout(() => {
        setResultMvp(pulledMvp);
        setRevealed(new Array(pulledMvp.length).fill(false));
        setOpeningPhase("revealing");
        setIsOpening(false);
        setOpeningRewardGrantId(null);
      }, 900);

      await refresh();
    } catch {
      alert("Unable to open reward pack. Please try again.");
      setOpeningRewardGrantId(null);
      setIsOpening(false);
      setOpeningPhase("idle");
    }
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

  const rarityOddsForDisplay = useMemo(() => {
    // Use only STANDARD slots (indices 0–2) for the display odds
    const standardSlots = (packConfig?.slots ?? []).filter((s) => s.type === "STANDARD");
    if (standardSlots.length === 0) return undefined;
    const aggregate = new Map<string, number>();
    for (const slot of standardSlots) {
      for (const odd of slot.rarityOdds ?? []) {
        const key = odd.rarityCode.toUpperCase();
        aggregate.set(key, (aggregate.get(key) ?? 0) + odd.pct / standardSlots.length);
      }
    }
    return Array.from(aggregate.entries())
      .map(([label, pct]) => ({ label, pct: Number(pct.toFixed(1)) }))
      .sort((a, b) => b.pct - a.pct);
  }, [packConfig?.slots]);

  const editionOddsForDisplay = useMemo(() => {
    if (!editionRows.length) return undefined;
    return editionRows.map((r) => ({ label: r.label, pct: r.rate }));
  }, [editionRows]);

  return (
    <SiteShell>
      {!me ? (
        <EmptyState title="Connect to open packs" description="Sign in with X to reveal cards." />
      ) : null}

      <FeaturedPackStage
        packImageSrc={officialPackImage}
        packName={packConfig?.pack?.displayName ?? "GENESIS PACK — SET 01"}
        cardsPerPack={cardsPerPack}
        remaining={packRemaining}
        planned={packPlanned}
        isOpening={isOpening}
        openingPhase={openingPhase}
        canOpen={Boolean(me) && !isOpening && openingPhase !== "tearing"}
        onOpen={() => void openPack()}
        onOpenOdds={() => setOddsOpen(true)}
        rarityOdds={rarityOddsForDisplay}
        editionOdds={editionOddsForDisplay}
        userPoints={me?.user?.points}
      />

      <PackOddsDrawer
        open={oddsOpen}
        onClose={() => setOddsOpen(false)}
        rarityRows={rarityRows}
        editionRows={editionRows}
        remaining={packRemaining}
        planned={packPlanned}
      />

      {me ? (
        <section className="mcg-surface" style={{ display: "grid", gap: "0.8rem" }}>
          <h2 style={{ margin: 0 }}>Your reward packs</h2>
          <p className="mcg-muted" style={{ margin: 0 }}>Open the packs you won in contests or quests.</p>

          {loadingRewardGrants ? <p className="mcg-muted" style={{ margin: 0 }}>Loading reward packs…</p> : null}

          {!loadingRewardGrants && rewardGrants.length === 0 ? (
            <p className="mcg-muted" style={{ margin: 0 }}>You have no reward packs to open right now.</p>
          ) : null}

          {rewardGrants.map((grant) => (
            <article
              key={grant.id}
              className="mcg-surface-raised"
              style={{
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{grant.packDefinition.displayName}</h3>
                <p className="mcg-muted" style={{ margin: "0.35rem 0 0" }}>
                  {grant.packDefinition.description ?? "Reward pack won from a contest."}
                </p>
              </div>
              <Button
                disabled={isOpening || openingRewardGrantId === grant.id || openingPhase === "tearing"}
                onClick={() => void openRewardPack(grant.id)}
              >
                {openingRewardGrantId === grant.id ? "Opening…" : "Open"}
              </Button>
            </article>
          ))}
        </section>
      ) : null}

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
