"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { EligibleCardsPanel } from "@/components/contests/EligibleCardsPanel";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { loadContestCache } from "@/components/contests/contestUtils";
import { useSession } from "@/components/useSession";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import type { MvpCollectionItem } from "@/types/cards";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    status: ContestStatus;
    lockAt: string | null;
    rules: ContestRule[];
  };
  userEntry: {
    rosterLocks: Array<{ ownedCardInstanceId: string }>;
  } | null;
};

function formatCountdown(lockAt: string | null, nowTs: number) {
  if (!lockAt) return "Lock time TBD";
  const diff = new Date(lockAt).getTime() - nowTs;
  if (diff <= 0) return "Team lock active";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m before lock`;
}

function mapGuestCollectionToOptions(collection: MvpCollectionItem[]): LineupOption[] {
  const list: LineupOption[] = [];
  for (const row of collection) {
    const total = Math.max(1, row.instanceCount);
    for (let i = 0; i < total; i += 1) {
      list.push({
        instanceId: `guest-${row.templateId}-${i + 1}`,
        cardTemplateId: row.templateId,
        isLockedInOtherContest: false,
        cardSetId: row.card.setCode ?? "guest-set",
        cardSetCode: row.card.setCode ?? "SET",
        cardSetName: row.card.setEditionLabel ?? "Guest Collection",
        rarityCode: row.card.rarity,
        editionCode: row.card.edition,
        name: row.card.displayName,
        imageUrl: row.card.imageUrl,
        tokenProjectName: row.card.symbol || row.card.displayName,
      });
    }
  }
  return list;
}

export default function ContestLineupBuilderPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    void (async () => {
      setError("");
      const [detailRes, optionsRes] = await Promise.all([
        fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      ]);

      if (!detailRes.ok) {
        const cached = loadContestCache().find((contest) => contest.id === params.contestId);
        if (cached) {
          setDetail({ contest: cached, userEntry: null });
        } else {
          setError((await detailRes.text()) || "Cannot load contest builder");
          return;
        }
      } else {
        const payload = (await detailRes.json()) as ContestDetail;
        setDetail(payload);
        if (payload.userEntry) {
          setSelected(payload.userEntry.rosterLocks.map((row) => row.ownedCardInstanceId));
        }
      }

      if (optionsRes.ok) {
        const optionsPayload = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(optionsPayload.options ?? []);
      } else if (me?.mode === "guest") {
        setOptions(mapGuestCollectionToOptions(me.mvpCollection));
      }
    })();
  }, [loading, me, params.contestId]);

  const isGuest = !loading && me?.mode === "guest";
  const canManage = detail?.contest.status === "OPEN" && !isGuest;
  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const filteredOptions = useMemo(
    () => (rule?.cardSetId ? options.filter((item) => item.cardSetId === rule.cardSetId) : options),
    [options, rule?.cardSetId],
  );

  const selectedCards = useMemo(
    () => Array.from({ length: maxRosterSize }).map((_, index) => filteredOptions.find((item) => item.instanceId === selected[index]) ?? null),
    [filteredOptions, maxRosterSize, selected],
  );

  const filled = selectedCards.filter(Boolean).length;

  if (!detail) {
    return (
      <SiteShell>
        <section className="contest-detail-skeleton" aria-label="Loading lineup builder">
          <div className="contest-detail-skeleton-hero" />
          <div className="contest-detail-skeleton-main" />
        </section>
      </SiteShell>
    );
  }

  const toggle = (instanceId: string) => {
    if (!canManage) return;
    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const alreadyIn = next.indexOf(instanceId);
        if (alreadyIn >= 0) next.splice(alreadyIn, 1);
        next[activeSlot] = instanceId;
        return next.filter(Boolean).slice(0, maxRosterSize);
      }
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      if (prev.length >= maxRosterSize) return prev;
      return [...prev, instanceId];
    });
  };

  const removeFromSlot = (slot: number) => {
    if (!canManage) return;
    setSelected((prev) => prev.filter((_, index) => index !== slot));
  };

  const submitEntry = async () => {
    if (!canManage || filled !== maxRosterSize) return;
    setSubmitState("saving");
    setError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitState("idle");
      return;
    }
    window.location.href = `/contests/${params.contestId}?tab=entry`;
  };

  return (
    <SiteShell>
      {error ? <EmptyState title="Builder notice" description={error} /> : null}
      {isGuest ? <EmptyState title="Guest mode preview" description="Connect with X to save a lineup." /> : null}

      <Surface className="contest-builder-v4" variant="raised">
        <div className="contest-builder-v4-top">
          <div>
            <p className="mcg-eyebrow">Lineup builder</p>
            <h1>{detail.contest.title}</h1>
            <p className="contest-inline-note">{formatCountdown(detail.contest.lockAt, nowTs)}</p>
          </div>
          <Link href={`/contests/${params.contestId}`} className="btn btn-ghost">Back to contest</Link>
        </div>

        <div className="contest-builder-v4-layout">
          <section className="contest-builder-v4-slots">
            <p className="mcg-eyebrow">Selected lineup slots</p>
            <div className="contest-lineup-grid-v2 tcg-layout">
              {Array.from({ length: maxRosterSize }).map((_, index) => (
                <LineupSlot
                  key={index}
                  index={index}
                  card={selectedCards[index]}
                  canEdit={canManage}
                  isActive={activeSlot === index}
                  onRemove={() => removeFromSlot(index)}
                  onOpenPicker={() => setActiveSlot(index)}
                />
              ))}
            </div>
          </section>

          <section className="contest-builder-v4-pool">
            <EligibleCardsPanel
              options={filteredOptions}
              selectedIds={selected}
              activeSlot={activeSlot}
              canManage={canManage}
              onAssign={(instanceId) => {
                toggle(instanceId);
                if (activeSlot !== null) setActiveSlot(null);
              }}
            />
          </section>
        </div>
      </Surface>

      <div className="contest-builder-v4-footer">
        <p className="contest-inline-note">Validation: {filled}/{maxRosterSize} slots filled.</p>
        <Button onClick={() => void submitEntry()} disabled={!canManage || filled !== maxRosterSize || submitState === "saving"}>
          {submitState === "saving" ? "Saving lineup…" : "Submit lineup"}
        </Button>
      </div>
    </SiteShell>
  );
}
