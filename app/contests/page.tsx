"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ContestHubHero } from "@/components/contests/ContestHubHero";
import { ContestLifecycleTabs, type ContestLifecycleTab } from "@/components/contests/ContestLifecycleTabs";
import { ContestFiltersBar, type ContestSort } from "@/components/contests/ContestFiltersBar";
import { ContestTile } from "@/components/contests/ContestTile";
import { ContestHistoryCard } from "@/components/contests/ContestHistoryCard";
import type { ContestListItem } from "@/components/contests/types";
import { useSession } from "@/components/useSession";

function rankForStatus(status: ContestListItem["status"]) {
  if (status === "OPEN") return 0;
  if (status === "LOCKED") return 1;
  if (status === "LIVE") return 2;
  if (status === "SETTLED") return 3;
  return 4;
}

export default function ContestsPage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ContestLifecycleTab>("OPEN");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<ContestSort>("urgency");
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

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
        setError((await res.text()) || "Cannot load contests");
        setIsLoading(false);
        return;
      }
      const payload = (await res.json()) as { contests: ContestListItem[] };
      setContests(payload.contests ?? []);
      setIsLoading(false);
    })();
  }, [loading, me]);

  const guestBlocked = !loading && me?.mode === "guest";

  const counts = useMemo(() => {
    const byTab: Partial<Record<ContestLifecycleTab, number>> = {
      UPCOMING: contests.filter((c) => c.status === "DRAFT").length,
      OPEN: contests.filter((c) => c.status === "OPEN").length,
      LOCKED: contests.filter((c) => c.status === "LOCKED").length,
      LIVE: contests.filter((c) => c.status === "LIVE").length,
      SETTLED: contests.filter((c) => c.status === "SETTLED").length,
    };
    return byTab;
  }, [contests]);

  const featured = useMemo(() => contests.find((c) => c.status === "LIVE") ?? contests.find((c) => c.status === "OPEN") ?? null, [contests]);

  const visible = useMemo(() => {
    const lifecycleFiltered = contests.filter((contest) => {
      if (tab === "UPCOMING") return contest.status === "DRAFT";
      return contest.status === tab;
    });

    const withSearch = lifecycleFiltered.filter((contest) => `${contest.code} ${contest.title}`.toLowerCase().includes(query.toLowerCase()));
    const withStatus = statusFilter === "ALL" ? withSearch : withSearch.filter((contest) => contest.status === statusFilter);

    const sorted = [...withStatus];
    sorted.sort((a, b) => {
      if (sort === "reward") {
        const aReward = (a.rules[0]?.maxRosterSize ?? 5) * 40;
        const bReward = (b.rules[0]?.maxRosterSize ?? 5) * 40;
        return bReward - aReward;
      }
      if (sort === "date") {
        return new Date(b.lockAt ?? b.endsAt ?? 0).getTime() - new Date(a.lockAt ?? a.endsAt ?? 0).getTime();
      }
      return rankForStatus(a.status) - rankForStatus(b.status);
    });

    return sorted;
  }, [contests, tab, query, statusFilter, sort]);

  const recentSettled = useMemo(() => contests.filter((contest) => contest.status === "SETTLED").slice(0, 8), [contests]);

  return (
    <SiteShell>
      <ContestHubHero contest={featured} nowTs={nowTs} />

      {guestBlocked ? <EmptyState title="Contests require an authenticated account" description="Guest mode can preview pages but cannot submit entries." /> : null}

      {!guestBlocked ? (
        <>
          <ContestLifecycleTabs active={tab} onChange={setTab} counts={counts} />

          <ContestFiltersBar
            query={query}
            onQuery={setQuery}
            status={statusFilter}
            onStatus={setStatusFilter}
            sort={sort}
            onSort={setSort}
          />

          {isLoading ? (
            <EmptyState title="Loading contests…" />
          ) : error ? (
            <EmptyState title="Unable to load contests" description={error} />
          ) : visible.length === 0 ? (
            <EmptyState title="No contests in this lifecycle" description="Adjust filters or check another status tab." />
          ) : (
            <section>
              <SectionHeader
                eyebrow="Contest grid"
                title="Choose your competition"
                subtitle="Each contest card shows urgency, lineup size, and reward teaser."
              />
              <div className="contest-card-grid-v3">
                {visible.map((contest) => <ContestTile key={contest.id} contest={contest} nowTs={nowTs} />)}
              </div>
            </section>
          )}

          <section>
            <SectionHeader
              eyebrow="Recent results"
              title="Settled contests"
              subtitle="Review recent finishes and jump back into competition."
            />
            {recentSettled.length > 0 ? (
              <div className="contest-results-rail">
                {recentSettled.map((contest) => <ContestHistoryCard key={contest.id} contest={contest} />)}
              </div>
            ) : (
              <EmptyState title="No settled contests yet" />
            )}
          </section>
        </>
      ) : null}
    </SiteShell>
  );
}
