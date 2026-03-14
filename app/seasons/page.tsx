"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/EmptyState";

type SeasonRow = {
  id: string;
  name: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  startsAt: string;
  endsAt: string;
  contestsCount: number;
  playersCount: number;
  myStanding: { rank: number | null; points: number } | null;
  leaderboard: Array<{ userId: string; rank: number | null; points: number; user: { displayName: string; xUsername: string } }>;
};

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function countdown(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Season completed";
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  return `${d}d ${h}h remaining`;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/seasons", { cache: "no-store" });
      if (!res.ok) {
        setError("Cannot load seasons right now.");
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as { seasons: SeasonRow[] };
      setSeasons(payload.seasons ?? []);
      setLoading(false);
    })();
  }, []);

  const active = useMemo(() => seasons.find((row) => row.status === "ACTIVE") ?? seasons[0] ?? null, [seasons]);

  return (
    <SiteShell>
      <SectionHeader eyebrow="Seasons" title="Competitive Leagues" subtitle="Track your seasonal climb, rating, and leaderboard rewards." />

      {loading ? <section className="contest-skeleton-grid">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="contest-skeleton-card" />)}</section> : null}
      {!loading && error ? <EmptyState title="Seasons unavailable" description={error} /> : null}

      {!loading && !error && !active ? <EmptyState title="No seasons configured" description="The next season will appear here once scheduled." /> : null}

      {!loading && !error && active ? (
        <>
          <Surface className="season-hero" variant="raised">
            <p className="mcg-eyebrow">Current season</p>
            <h2>{active.name}</h2>
            <div className="contest-hero-meta-row">
              <span className="mcg-chip">Status {active.status}</span>
              <span className="mcg-chip">Contests {active.contestsCount}</span>
              <span className="mcg-chip">Players {active.playersCount}</span>
              <span className="mcg-chip">{fmtDate(active.startsAt)} → {fmtDate(active.endsAt)}</span>
              <span className="mcg-chip">{countdown(active.endsAt)}</span>
            </div>
            {active.myStanding ? (
              <p className="contest-inline-note">Your standing: {active.myStanding.rank ? `#${active.myStanding.rank}` : "Unranked"} · {active.myStanding.points} pts</p>
            ) : (
              <p className="contest-inline-note">Enter contests this season to start climbing the leaderboard.</p>
            )}
          </Surface>

          <Surface variant="raised">
            <SectionHeader eyebrow="Season leaderboard" title={`${active.name} top players`} />
            {active.leaderboard.length > 0 ? (
              <div className="contest-leaderboard-list-v2">
                {active.leaderboard.map((row, index) => (
                  <div key={row.userId} className="contest-leaderboard-row-v2">
                    <span>#{row.rank ?? index + 1}</span>
                    <span>{row.user.displayName || `@${row.user.xUsername}`}</span>
                    <strong>{row.points} pts</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Season leaderboard is empty" description="Settled contests will populate rankings automatically." />
            )}
          </Surface>

          <section>
            <SectionHeader eyebrow="Season rewards" title="End-of-season reward tiers" />
            <div className="contest-result-grid">
              <div><span>Top 1</span><strong>Legendary pack</strong></div>
              <div><span>Top 10</span><strong>Epic pack</strong></div>
              <div><span>Top 100</span><strong>Bonus points</strong></div>
            </div>
          </section>
        </>
      ) : null}
    </SiteShell>
  );
}
