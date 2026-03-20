"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { FeaturedPackStage } from "@/components/packs/FeaturedPackStage";
import { PackOddsDrawer } from "@/components/packs/PackOddsDrawer";
import { PackRevealModal } from "@/components/packs/PackRevealModal";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { useSession } from "@/components/useSession";
import { GAME_CONFIG } from "@/lib/game-config";
import { trackEvent, trackInternalEvent } from "@/lib/analytics/track";
import { getAnalyticsRequestHeaders } from "@/lib/analytics/visitor-id";
import { GUEST_PACK_PREVIEW_CARDS } from "@/lib/packs/guest-preview";
import type { MvpCardView } from "@/types/cards";
import officialPackImage from "../../pack.png";
import versoImage from "../../verso.png";

type PackConfigPayload = {
  purchaseLimit: PurchaseLimitStatus | null;
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

type PurchaseLimitStatus = {
  enabled: boolean;
  limit: number | null;
  used: number;
  remainingPurchases: number | null;
  resetAt: string | null;
  cooldownSeconds: number;
  isBlocked: boolean;
  windowHours: number;
};

type RewardPackGrant = {
  id: string;
  createdAt: string;
  sourceContestSettlementId: string | null;
  sourcePackOpeningEventId: string | null;
  sourceContestSettlement?: {
    contest?: {
      title: string;
    } | null;
  } | null;
  sourcePackOpeningEvent?: {
    packDefinition?: {
      displayName: string;
    } | null;
  } | null;
  packDefinition: {
    code: string;
    displayName: string;
    description?: string | null;
  };
};

type RevealMode = "real" | "guest-preview";

type InlineNotice = {
  tone: "neutral" | "success" | "danger";
  title: string;
  detail?: string;
};

export default function PacksPage() {
  const { me, refresh } = useSession();
  const { loginWithPrivy } = usePrivyLogin();
  const [resultMvp, setResultMvp] = useState<MvpCardView[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");
  const [revealMode, setRevealMode] = useState<RevealMode>("real");
  const [packConfig, setPackConfig] = useState<PackConfigPayload | null>(null);
  const [zoomedCard, setZoomedCard] = useState<MvpCardView | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [rewardGrants, setRewardGrants] = useState<RewardPackGrant[]>([]);
  const [loadingRewardGrants, setLoadingRewardGrants] = useState(false);
  const [openingRewardGrantId, setOpeningRewardGrantId] = useState<string | null>(null);
  const [saleNotice, setSaleNotice] = useState<InlineNotice | null>(null);
  const [rewardNotice, setRewardNotice] = useState<InlineNotice | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    trackEvent("packs_page_view", { state: me ? "authenticated" : "guest" });
  }, [me]);

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
  }, [me?.user?.id]);

  useEffect(() => {
    if (!packConfig?.purchaseLimit?.resetAt) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [packConfig?.purchaseLimit?.resetAt]);

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
  const nextRevealIndex = revealed.findIndex((v) => !v);
  const isGuestPreview = revealMode === "guest-preview";

  const startReveal = (cards: MvpCardView[], mode: RevealMode) => {
    setRevealMode(mode);
    setTimeout(() => {
      setResultMvp(cards);
      setRevealed(new Array(cards.length).fill(false));
      setOpeningPhase("revealing");
      setIsOpening(false);
      setOpeningRewardGrantId(null);
    }, 900);
  };

  const openGuestPreview = () => {
    trackEvent("packs_cta_click", { state: "guest", intent: "preview" });
    trackInternalEvent("CLICK_OPEN_PACK");
    setRevealMode("guest-preview");
    setIsOpening(true);
    setOpeningPhase("tearing");
    setResultMvp([]);
    setRevealed([]);
    startReveal(GUEST_PACK_PREVIEW_CARDS, "guest-preview");
    trackEvent("packs_guest_preview_opened", { cards: GUEST_PACK_PREVIEW_CARDS.length });
  };

  const openPack = async () => {
    if (!me) {
      openGuestPreview();
      return;
    }

    trackEvent("packs_cta_click", { state: "authenticated", intent: "open_real_pack" });
    trackInternalEvent("CLICK_OPEN_PACK");
    setSaleNotice(null);
    setRevealMode("real");
    setIsOpening(true);
    setOpeningPhase("tearing");
    setResultMvp([]);
    setRevealed([]);

    const res = await fetch("/api/pack/open", {
      method: "POST",
      headers: getAnalyticsRequestHeaders({ "Content-Type": "application/json" }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null) as { error?: { message?: string; purchaseLimit?: PurchaseLimitStatus } } | null;
      if (payload?.error?.purchaseLimit) {
        setPackConfig((prev) => prev ? { ...prev, purchaseLimit: payload.error!.purchaseLimit! } : prev);
        setSaleNotice({
          tone: "danger",
          title: "Daily purchase cap reached",
          detail: payload.error.purchaseLimit.resetAt
            ? `Try again when the cooldown expires.`
            : payload.error.message ?? "Purchase limit reached.",
        });
      } else {
        const fallbackMessage = payload?.error?.message ?? "Unable to open pack right now. Please try again.";
        setSaleNotice({ tone: "danger", title: "Pack purchase failed", detail: fallbackMessage });
      }
      setIsOpening(false);
      setOpeningPhase("idle");
      return;
    }

    const payload = await res.json();
    const pulledMvp = (payload.pulledCardsMvp ?? []) as MvpCardView[];

    if (pulledMvp.length === 0) {
      setSaleNotice({
        tone: "danger",
        title: "Pack reveal unavailable",
        detail: "Pack opened but the reveal payload is missing. Please refresh and try again.",
      });
      setIsOpening(false);
      setOpeningPhase("idle");
      await refresh();
      return;
    }

    setPackConfig((prev) => prev ? { ...prev, purchaseLimit: payload.purchaseLimit ?? prev.purchaseLimit } : prev);
    setSaleNotice({
      tone: "success",
      title: "Pack purchased successfully",
      detail: "Your purchase count has been updated below.",
    });
    startReveal(pulledMvp, "real");
    trackEvent("packs_real_open_success", {
      source: "sale_pack",
      cards: pulledMvp.length,
      packCode: packConfig?.pack?.code ?? "unknown",
    });

    await refresh();
  };

  const openRewardPack = async (grantId: string) => {
    if (!me) return;
    try {
      setRewardNotice(null);
      setRevealMode("real");
      setOpeningRewardGrantId(grantId);
      setIsOpening(true);
      setOpeningPhase("tearing");
      setResultMvp([]);
      setRevealed([]);

      const res = await fetch("/api/rewards/packs/claim", {
        method: "POST",
        headers: getAnalyticsRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ grantId }),
      });

      if (!res.ok) {
        setRewardNotice({
          tone: "danger",
          title: "Reward pack unavailable",
          detail: await res.text(),
        });
        setOpeningRewardGrantId(null);
        setIsOpening(false);
        setOpeningPhase("idle");
        return;
      }

      const payload = (await res.json()) as { pulledCardsMvp?: MvpCardView[]; packCode?: string };
      const pulledMvp = payload.pulledCardsMvp ?? [];

      if (pulledMvp.length === 0) {
        setRewardNotice({
          tone: "danger",
          title: "Reward reveal unavailable",
          detail: "Reward pack opened but the reveal payload is missing. Please refresh and try again.",
        });
        setOpeningRewardGrantId(null);
        setIsOpening(false);
        setOpeningPhase("idle");
        await refresh();
        return;
      }

      setRewardGrants((prev) => prev.filter((grant) => grant.id !== grantId));
      setRewardNotice({
        tone: "success",
        title: "Reward pack opened",
        detail: "Your reward inventory has been updated.",
      });
      startReveal(pulledMvp, "real");
      trackEvent("packs_real_open_success", {
        source: "reward_pack",
        cards: pulledMvp.length,
        packCode: payload.packCode ?? "reward_pack",
      });

      await refresh();
    } catch {
      setRewardNotice({
        tone: "danger",
        title: "Reward pack unavailable",
        detail: "Unable to open reward pack. Please try again.",
      });
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
    setRevealMode("real");
  };

  const handleConnectWithX = () => {
    trackEvent("packs_guest_preview_connect_click", { location: "preview_complete" });
    loginWithPrivy();
  };

  const packRemaining = packConfig?.pack?.remainingPackCount;
  const packPlanned = packConfig?.pack?.plannedPackCount;
  const cardsPerPack = packConfig?.pack?.cardsPerPack ?? GAME_CONFIG.CARDS_PER_PACK;
  const purchaseLimit = useMemo(() => {
    const base = packConfig?.purchaseLimit;
    if (!base?.resetAt) return base ?? null;

    const remainingMs = new Date(base.resetAt).getTime() - nowMs;
    const cooldownSeconds = Math.max(Math.ceil(remainingMs / 1000), 0);
    const isBlocked = base.enabled && cooldownSeconds > 0 && (base.remainingPurchases ?? 0) <= 0;

    return {
      ...base,
      cooldownSeconds,
      isBlocked,
      remainingPurchases: isBlocked ? 0 : base.remainingPurchases,
    };
  }, [nowMs, packConfig?.purchaseLimit]);

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

  const groupedRewardGrants = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        displayName: string;
        description: string | null;
        grants: RewardPackGrant[];
        sourceLabel: string;
      }
    >();

    const sourceLabelForGrant = (grant: RewardPackGrant) => {
      if (grant.sourceContestSettlement?.contest?.title) {
        return `Contest reward · ${grant.sourceContestSettlement.contest.title}`;
      }
      if (grant.sourcePackOpeningEvent?.packDefinition?.displayName) {
        return `Pack bonus · ${grant.sourcePackOpeningEvent.packDefinition.displayName}`;
      }
      return "Earned reward pack";
    };

    for (const grant of rewardGrants) {
      const sourceLabel = sourceLabelForGrant(grant);
      const key = `${grant.packDefinition.code}::${sourceLabel}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.grants.push(grant);
        continue;
      }

      grouped.set(key, {
        key,
        displayName: grant.packDefinition.displayName,
        description: grant.packDefinition.description ?? null,
        grants: [grant],
        sourceLabel,
      });
    }

    return Array.from(grouped.values());
  }, [rewardGrants]);

  return (
    <SiteShell>
      {!me ? (
        <section className="packs-guest-intro" aria-label="Pack preview intro">
          <p className="packs-guest-kicker">Preview first</p>
          <h2>See what a reveal feels like before you connect.</h2>
          <p className="packs-guest-copy">
            Explore the pack, run a demo reveal, then connect with X when you&apos;re ready to open a real pack and keep the cards.
          </p>
          <p className="packs-guest-hint">Your cards unlock collection progress, contest lineups, and future rewards once you sign in.</p>
        </section>
      ) : null}

      <section className="packs-main-section">
        <div className="packs-main-header">
          <p className="packs-main-kicker">Pack store</p>
          <h2>Main Pack</h2>
        </div>

        <FeaturedPackStage
          packImageSrc={officialPackImage}
          packName={packConfig?.pack?.displayName ?? "GENESIS PACK — SET 01"}
          cardsPerPack={cardsPerPack}
          remaining={packRemaining}
          planned={packPlanned}
          isOpening={isOpening}
          openingPhase={openingPhase}
          canOpen={!isOpening && openingPhase !== "tearing"}
          onOpen={() => void openPack()}
          onOpenOdds={() => setOddsOpen(true)}
          rarityOdds={rarityOddsForDisplay}
          editionOdds={editionOddsForDisplay}
          userPoints={me?.user?.points}
          purchaseLimit={purchaseLimit}
          statusNotice={saleNotice}
          isGuest={!me}
          guestHeadline="Discover what can be inside"
          guestSupportingCopy="Run a short preview reveal now. Connect with X after the demo to open a real pack and keep every card you pull."
        />
      </section>

      <PackOddsDrawer
        open={oddsOpen}
        onClose={() => setOddsOpen(false)}
        rarityRows={rarityRows}
        editionRows={editionRows}
        remaining={packRemaining}
        planned={packPlanned}
      />

      {me ? (
        <section className="reward-packs-section">
          <div className="reward-packs-header">
            <p className="reward-packs-kicker">Reward inventory</p>
            <h2>Reward Packs</h2>
            <p className="reward-packs-intro">
              Packs earned from contests, quests, and future rewards. Open your earned packs here.
            </p>
          </div>

          {rewardNotice ? (
            <div className={`packs-inline-notice packs-inline-notice--${rewardNotice.tone}`} role="status" aria-live="polite">
              <strong>{rewardNotice.title}</strong>
              {rewardNotice.detail ? <span>{rewardNotice.detail}</span> : null}
            </div>
          ) : null}

          {loadingRewardGrants ? <p className="reward-packs-status">Loading reward packs…</p> : null}

          {!loadingRewardGrants && groupedRewardGrants.length === 0 ? (
            <p className="reward-packs-status">No reward packs yet. Win events and complete quests to build your inventory.</p>
          ) : null}

          {!loadingRewardGrants && groupedRewardGrants.length > 0 ? (
            <div className="reward-pack-grid">
              {groupedRewardGrants.map((group) => {
                const quantity = group.grants.length;
                const nextGrantId = group.grants[0]?.id;
                const isOpeningThisGroup = Boolean(
                  openingRewardGrantId && group.grants.some((grant) => grant.id === openingRewardGrantId),
                );

                return (
                  <article key={group.key} className="reward-pack-card">
                    <div className="reward-pack-art-wrap">
                      <Image src={officialPackImage} alt={`${group.displayName} pack`} className="reward-pack-art" />
                      {quantity > 1 ? <span className="reward-pack-quantity">x{quantity}</span> : null}
                    </div>

                    <div className="reward-pack-body">
                      <p className="reward-pack-source">{group.sourceLabel}</p>
                      <h3>{group.displayName}</h3>
                      <p className="reward-pack-copy">
                        {group.description ?? "Special pack awarded for your progress in MCG."}
                      </p>
                    </div>

                    <Button
                      className="reward-pack-open"
                      disabled={isOpening || !nextGrantId || isOpeningThisGroup || openingPhase === "tearing"}
                      onClick={() => {
                        if (!nextGrantId) return;
                        void openRewardPack(nextGrantId);
                      }}
                    >
                      {isOpeningThisGroup ? "Opening…" : "Open reward pack"}
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      <PackRevealModal
        open={revealSize > 0 && openingPhase === "revealing"}
        cards={resultMvp}
        revealed={revealed}
        nextRevealIndex={nextRevealIndex}
        onReveal={handleReveal}
        onZoom={setZoomedCard}
        onClose={closeReveal}
        isGuestPreview={isGuestPreview}
        onConnectWithX={isGuestPreview ? handleConnectWithX : undefined}
        cardBackSrc={versoImage}
      />

      <CardZoomModal card={zoomedCard} quantity={1} open={Boolean(zoomedCard)} onClose={() => setZoomedCard(null)} />
    </SiteShell>
  );
}
