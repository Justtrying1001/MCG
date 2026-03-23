"use client";

import { useEffect, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { FeaturedPackStage } from "@/components/packs/FeaturedPackStage";
import { PackCard } from "@/components/packs/PackCard";
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
  rarityOdds: Array<{ rarityCode: string; pct: number }>;
  editionOdds: Array<{ editionCode: string; pct: number }>;
  rarityEditionOdds: Array<{
    rarityCode: string;
    editionCode: string;
    pct: number;
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
  const [openingPhase, setOpeningPhase] = useState<
    "idle" | "tearing" | "revealing"
  >("idle");
  const [revealMode, setRevealMode] = useState<RevealMode>("real");
  const [packConfig, setPackConfig] = useState<PackConfigPayload | null>(null);
  const [zoomedCard, setZoomedCard] = useState<MvpCardView | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [rewardGrants, setRewardGrants] = useState<RewardPackGrant[]>([]);
  const [loadingRewardGrants, setLoadingRewardGrants] = useState(false);
  const [openingRewardGrantId, setOpeningRewardGrantId] = useState<
    string | null
  >(null);
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
        return (await response.json().catch(() => null)) as {
          grants?: RewardPackGrant[];
        } | null;
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
    trackInternalEvent("PACK_OPEN");
    trackEvent("packs_guest_preview_opened", {
      cards: GUEST_PACK_PREVIEW_CARDS.length,
    });
  };

  const openPack = async () => {
    if (!me) {
      openGuestPreview();
      return;
    }

    trackEvent("packs_cta_click", {
      state: "authenticated",
      intent: "open_real_pack",
    });
    trackInternalEvent("CLICK_OPEN_PACK");
    setSaleNotice(null);
    setRevealMode("real");
    setIsOpening(true);
    setOpeningPhase("tearing");
    setResultMvp([]);
    setRevealed([]);

    const res = await fetch("/api/pack/open", {
      method: "POST",
      headers: getAnalyticsRequestHeaders({
        "Content-Type": "application/json",
      }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: { message?: string; purchaseLimit?: PurchaseLimitStatus };
      } | null;
      if (payload?.error?.purchaseLimit) {
        setPackConfig((prev) =>
          prev
            ? { ...prev, purchaseLimit: payload.error!.purchaseLimit! }
            : prev,
        );
        setSaleNotice({
          tone: "danger",
          title: "Daily purchase cap reached",
          detail: payload.error.purchaseLimit.resetAt
            ? `Try again when the cooldown expires.`
            : (payload.error.message ?? "Purchase limit reached."),
        });
      } else {
        const fallbackMessage =
          payload?.error?.message ??
          "Unable to open pack right now. Please try again.";
        setSaleNotice({
          tone: "danger",
          title: "Pack purchase failed",
          detail: fallbackMessage,
        });
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
        detail:
          "Pack opened but the reveal payload is missing. Please refresh and try again.",
      });
      setIsOpening(false);
      setOpeningPhase("idle");
      await refresh();
      return;
    }

    setPackConfig((prev) =>
      prev
        ? {
            ...prev,
            purchaseLimit: payload.purchaseLimit ?? prev.purchaseLimit,
          }
        : prev,
    );
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
        headers: getAnalyticsRequestHeaders({
          "Content-Type": "application/json",
        }),
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

      const payload = (await res.json()) as {
        pulledCardsMvp?: MvpCardView[];
        packCode?: string;
      };
      const pulledMvp = payload.pulledCardsMvp ?? [];

      if (pulledMvp.length === 0) {
        setRewardNotice({
          tone: "danger",
          title: "Reward reveal unavailable",
          detail:
            "Reward pack opened but the reveal payload is missing. Please refresh and try again.",
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
    trackEvent("packs_guest_preview_connect_click", {
      location: "preview_complete",
    });
    void loginWithPrivy();
  };

  const packRemaining = packConfig?.pack?.remainingPackCount;
  const packPlanned = packConfig?.pack?.plannedPackCount;
  const cardsPerPack =
    packConfig?.pack?.cardsPerPack ?? GAME_CONFIG.CARDS_PER_PACK;
  const purchaseLimit = (() => {
    const base = packConfig?.purchaseLimit;
    if (!base?.resetAt) return base ?? null;

    const remainingMs = new Date(base.resetAt).getTime() - nowMs;
    const cooldownSeconds = Math.max(Math.ceil(remainingMs / 1000), 0);
    const isBlocked =
      base.enabled &&
      cooldownSeconds > 0 &&
      (base.remainingPurchases ?? 0) <= 0;

    return {
      ...base,
      cooldownSeconds,
      isBlocked,
      remainingPurchases: isBlocked ? 0 : base.remainingPurchases,
    };
  })();

  const rarityRows = (packConfig?.rarityOdds ?? [])
    .map((row) => ({ label: row.rarityCode.toUpperCase(), rate: Number(row.pct.toFixed(2)) }))
    .sort((a, b) => b.rate - a.rate);

  const editionRows = (packConfig?.editionOdds ?? [])
    .map((row) => ({ label: row.editionCode.toUpperCase(), rate: Number(row.pct.toFixed(2)) }))
    .sort((a, b) => b.rate - a.rate);

  const groupedRewardGrants = (() => {
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
  })();

  return (
    <SiteShell>
      <div className="stitch-screen stitch-packs-screen">
        <section className="packs-main-section stitch-pack-stage-shell">
          <div className="packs-main-header">
            <div>
              <p className="packs-main-kicker">Booster shop</p>
              <h2>Featured drop</h2>
            </div>
          </div>

          <div className="packs-shop-marquee" aria-label="Featured pack summary">
            <span>{cardsPerPack} cards per pack</span>
            <span>•</span>
            <span>
              {typeof packRemaining === "number"
                ? `${packRemaining.toLocaleString()} packs left`
                : typeof packPlanned === "number"
                  ? `${packPlanned.toLocaleString()} planned`
                  : "Supply pending"}
            </span>
            <span>•</span>
            <span>
              {purchaseLimit?.enabled
                ? purchaseLimit.isBlocked
                  ? "Cooldown active"
                  : `${purchaseLimit.remainingPurchases ?? 0} purchases left`
                : "Cap off"}
            </span>
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
            rarityOdds={rarityRows.map((row) => ({ label: row.label, pct: row.rate }))}
            editionOdds={editionRows.map((row) => ({ label: row.label, pct: row.rate }))}
            userPoints={me?.user?.points}
            purchaseLimit={purchaseLimit}
            statusNotice={saleNotice}
            isGuest={!me}
            guestHeadline="Discover what can be inside"
            guestSupportingCopy="Run a demo reveal now, then connect with X when you want your next pack to count."
            onConnectWithX={() => void loginWithPrivy()}
            guestCtaLabel="Connect wallet / X to open your pack"
          />
        </section>

        {me ? (
          <section className="packs-shop-section stitch-pack-gallery-shell">
            <section className="reward-packs-section">
              <div className="reward-packs-header">
                <p className="reward-packs-kicker">Reward inventory</p>
                <h2>Reward Packs</h2>
                <p className="reward-packs-intro">
                  Packs earned from contests, quests, and bonus drops. Open
                  them here when you are ready to reveal.
                </p>
              </div>

              {rewardNotice ? (
                <div
                  className={`packs-inline-notice packs-inline-notice--${rewardNotice.tone}`}
                  role="status"
                  aria-live="polite"
                >
                  <strong>{rewardNotice.title}</strong>
                  {rewardNotice.detail ? (
                    <span>{rewardNotice.detail}</span>
                  ) : null}
                </div>
              ) : null}

              {loadingRewardGrants ? (
                <p className="reward-packs-status">Loading reward packs…</p>
              ) : null}

              {!loadingRewardGrants && groupedRewardGrants.length === 0 ? (
                <p className="reward-packs-status">
                  No reward packs yet. Win events and complete quests to build
                  your inventory.
                </p>
              ) : null}

              {!loadingRewardGrants && groupedRewardGrants.length > 0 ? (
                <div className="reward-pack-grid">
                  {groupedRewardGrants.map((group) => {
                    const quantity = group.grants.length;
                    const nextGrantId = group.grants[0]?.id;
                    const isOpeningThisGroup = Boolean(
                      openingRewardGrantId &&
                      group.grants.some((grant) => grant.id === openingRewardGrantId),
                    );

                    return (
                      <PackCard
                        key={group.key}
                        imageSrc={officialPackImage}
                        imageAlt={`${group.displayName} pack`}
                        eyebrow={group.sourceLabel}
                        name={group.displayName}
                        description={
                          group.description ??
                          "Special pack awarded for your progress in MCG."
                        }
                        priceLabel="Reward pack"
                        infoLabel={`${quantity} ready to open`}
                        ctaLabel={isOpeningThisGroup ? "Opening…" : "Open reward pack"}
                        onAction={() => {
                          if (!nextGrantId) return;
                          void openRewardPack(nextGrantId);
                        }}
                        disabled={
                          isOpening ||
                          !nextGrantId ||
                          isOpeningThisGroup ||
                          openingPhase === "tearing"
                        }
                        quantityLabel={quantity > 1 ? `x${quantity}` : undefined}
                        tags={[
                          quantity > 1 ? `${quantity} copies` : "Single pack",
                          "Earned inventory",
                        ]}
                        accent="violet"
                      />
                    );
                  })}
                </div>
              ) : null}
            </section>
          </section>
        ) : null}

        <PackOddsDrawer
          open={oddsOpen}
          onClose={() => setOddsOpen(false)}
          rarityRows={rarityRows}
          editionRows={editionRows}
          remaining={packRemaining}
          planned={packPlanned}
        />

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
