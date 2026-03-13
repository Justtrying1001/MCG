"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
};

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rules: ContestRule[];
  _count: { entries: number };
};

export default function ContestsPage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!me || me.mode === "guest") {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      setError("");
      const res = await fetch("/api/contests", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Cannot load contests");
        setIsLoading(false);
        return;
      }

      const payload = (await res.json()) as { contests: ContestListItem[] };
      setContests(payload.contests ?? []);
      setIsLoading(false);
    })();
  }, [loading, me]);

  const grouped = useMemo(
    () => ({
      open: contests.filter((c) => c.status === "OPEN" || c.status === "LOCKED" || c.status === "LIVE"),
      settled: contests.filter((c) => c.status === "SETTLED"),
    }),
    [contests]
  );

  const guestBlocked = !loading && me?.mode === "guest";

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contests</h1>
          <p className="page-subtitle">
            Choose a contest, build your lineup visually, and track each phase from open registration to final rankings.
          </p>
        </div>
      </div>

      <section className="contest-flow-strip">
        <div><strong>1.</strong> Pick a live contest</div>
        <div><strong>2.</strong> Build your roster</div>
        <div><strong>3.</strong> Lock your entry</div>
        <div><strong>4.</strong> Follow results</div>
      </section>

      {guestBlocked ? <GuestNotice /> : null}

      {isLoading ? (
        <div className="empty-state"><p className="empty-state-title">Loading contests…</p></div>
      ) : error ? (
        <div className="empty-state"><p className="empty-state-title">{error}</p></div>
      ) : contests.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No contests are currently published.</p>
          <p className="empty-state-desc">New lineup windows will appear here as soon as they are available.</p>
        </div>
      ) : (
        <>
          <ContestSection title="Active + Upcoming" contests={grouped.open} />
          <ContestSection title="Settled" contests={grouped.settled} />
        </>
      )}
    </SiteShell>
  );
}

function ContestSection({ title, contests }: { title: string; contests: ContestListItem[] }) {
  if (contests.length === 0) return null;

  return (
    <section className="contest-section">
      <h2 className="contest-section-title">{title}</h2>
      <div className="contest-list">
        {contests.map((contest) => {
          const rule = contest.rules[0];
          return (
            <Link href={`/contests/${contest.id}`} key={contest.id} className="contest-card">
              <div className="contest-card-top">
                <p className="contest-code">{contest.code}</p>
                <span className={`contest-status status-${contest.status.toLowerCase()}`}>{contest.status}</span>
              </div>
              <h3 className="contest-title">{contest.title}</h3>
              <div className="contest-meta-grid">
                <ContestMeta label="Entries" value={String(contest._count.entries)} />
                <ContestMeta label="Roster size" value={String(rule?.maxRosterSize ?? 5)} />
                <ContestMeta label="Starts" value={formatDate(contest.startsAt)} />
                <ContestMeta label="Lock" value={formatDate(contest.lockAt)} />
              </div>
              <p className="contest-inline-note" style={{ marginTop: "0.6rem" }}>Open detail to build your lineup and submit your team.</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}

function GuestNotice() {
  return (
    <div className="contest-guest-notice">
      Contest participation requires an authenticated account with owned card instances. Guest mode can open packs and preview collection data, but cannot submit lineups.
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
