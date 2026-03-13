"use client";

import { useEffect, useMemo, useState } from "react";

import { CardSelectorModal } from "@/components/contests/CardSelectorModal";
import { ContestHero } from "@/components/contests/ContestHero";
import { LeaderboardCard } from "@/components/contests/LeaderboardCard";
import { LineupSlot } from "@/components/contests/LineupSlot";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    startsAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    rules: ContestRule[];
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    status: string;
    rosterLocks: Array<{ id: string; ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number }>;
};

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success">("idle");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;

    void (async () => {
      setError("");
      const [detailRes, rankingRes, optionsRes] = await Promise.all([
        fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      ]);

      if (!detailRes.ok) {
        const text = await detailRes.text();
        setError(text || "Cannot load contest detail");
        return;
      }

      const detailPayload = (await detailRes.json()) as ContestDetail;
      setDetail(detailPayload);

      if (rankingRes.ok) {
        setRanking((await rankingRes.json()) as RankingPayload);
      }

      if (optionsRes.ok) {
        const lineupPayload = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(lineupPayload.options ?? []);
      }

      if (detailPayload.userEntry) {
        setSelected(detailPayload.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
      }
    })();
  }, [loading, params.contestId]);

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const isGuest = !loading && me?.mode === "guest";
  const canManageLineup = detail?.contest.status === "OPEN" && !detail?.userEntry;
  const canEnter = canManageLineup && !isGuest;

  const filteredOptions = useMemo(() => {
    if (!rule?.cardSetId) return options;
    return options.filter((item) => item.cardSetId === rule.cardSetId);
  }, [options, rule?.cardSetId]);

  const selectedCards = useMemo(() => {
    return selected.map((id) => filteredOptions.find((option) => option.instanceId === id) ?? null);
  }, [filteredOptions, selected]);

  const countdown = detail ? formatCountdown(getTargetDate(detail.contest.status, detail.contest.lockAt, detail.contest.endsAt), nowTs) : "—";

  const toggle = (instanceId: string) => {
    if (!canManageLineup) return;

    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const existingIndex = next.indexOf(instanceId);
        if (existingIndex >= 0) next.splice(existingIndex, 1);
        next[activeSlot] = instanceId;
        return next.filter(Boolean).slice(0, maxRosterSize);
      }
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      if (prev.length >= maxRosterSize) return prev;
      return [...prev, instanceId];
    });
  };

  const removeFromSlot = (slot: number) => {
    if (!canManageLineup) return;
    setSelected((prev) => prev.filter((_, index) => index !== slot));
  };

  const submitEntry = async () => {
    if (!detail || !canEnter || selected.length !== maxRosterSize) return;

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

    const updated = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });
    if (updated.ok) {
      setDetail((await updated.json()) as ContestDetail);
    }
    setSubmitState("success");
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contest Command Center</h1>
          <p className="page-subtitle">Build your lineup, confirm your entry, and track your rank.</p>
        </div>
      </div>

      {isGuest ? (
        <div className="contest-guest-notice">Guest mode can explore contest details and build a lineup preview. Connect with X to participate.</div>
      ) : null}

      {!detail ? (
        <div className="empty-state"><p className="empty-state-title">{error || "Loading contest…"}</p></div>
      ) : (
        <div className="contest-dashboard">
          <ContestHero
            code={detail.contest.code}
            title={detail.contest.title}
            status={detail.contest.status}
            startsAt={detail.contest.startsAt}
            lockAt={detail.contest.lockAt}
            endsAt={detail.contest.endsAt}
            rosterSize={maxRosterSize}
            restrictedSet={Boolean(rule?.cardSetId)}
            entries={detail.contest._count.entries}
          />

          <section className="contest-info-panel">
            <p className="contest-inline-note">⏱ Timer: {countdown}</p>
            <p className="contest-inline-note">📜 Rule: {rule?.cardSetId ? "Restricted set" : "All sets allowed"} · {maxRosterSize} required slots.</p>
          </section>

          <section className="contest-section">
            <h3 className="contest-section-title">Lineup Manager</h3>
            {detail.userEntry ? (
              <p className="contest-inline-note">Entry locked ({detail.userEntry.status}). Your lineup is frozen.</p>
            ) : (
              <p className="contest-inline-note">Select exactly {maxRosterSize} cards (visual slots + selection modal).</p>
            )}

            <div className="contest-selected-lineup">
              {Array.from({ length: maxRosterSize }).map((_, index) => (
                <LineupSlot
                  key={index}
                  index={index}
                  card={selectedCards[index]}
                  canEdit={Boolean(canManageLineup)}
                  onRemove={() => removeFromSlot(index)}
                  onOpenPicker={() => {
                    setActiveSlot(index);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {canManageLineup ? <Button type="button" variant="ghost" onClick={() => { setActiveSlot(null); setModalOpen(true); }}>Open selector</Button> : null}
              {canManageLineup ? (
                <Button onClick={() => void submitEntry()} disabled={isGuest || submitState === "saving" || selected.length !== maxRosterSize} className={selected.length === maxRosterSize && !isGuest ? "lineup-cta-ready" : ""}>
                  {isGuest ? "Connect with X to participate" : submitState === "saving" ? "Submitting…" : submitState === "success" ? "Entry confirmed ✨" : "Confirm my entry"}
                </Button>
              ) : null}
            </div>
          </section>

          {(detail.contest.status === "LOCKED" || detail.contest.status === "LIVE" || detail.contest.status === "SETTLED") && detail.userEntry ? (
            <section className="contest-info-panel">
              <h3 className="contest-section-title">Live Tracking</h3>
              <p className="contest-inline-note">Locked lineup · score updates via leaderboard.</p>
              <div className="contest-selected-lineup">
                {selectedCards.map((card, index) => (
                  <div className="lineup-slot filled" key={`${card?.instanceId ?? "empty"}-${index}`}>
                    <div className="lineup-slot-main">
                      <span className="contest-slot-index">Slot {index + 1}</span>
                      <span className="contest-slot-name">{card?.name ?? "Unknown card"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="contest-section">
            <h3 className="contest-section-title">Leaderboard</h3>
            <LeaderboardCard rankings={ranking?.rankings ?? []} currentUserId={me?.user.id} />
          </section>

          {error ? <div className="contest-error">{error}</div> : null}

          <CardSelectorModal
            open={modalOpen}
            options={filteredOptions}
            selectedIds={selected}
            onToggle={toggle}
            onClose={() => setModalOpen(false)}
            canEnter={Boolean(canManageLineup)}
          />
        </div>
      )}
    </SiteShell>
  );
}
