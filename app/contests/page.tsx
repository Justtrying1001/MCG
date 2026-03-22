"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContestCard } from "@/components/contests/ContestCard";
import type { ContestListItem } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { useSession } from "@/components/useSession";

type ContestPayload = { contests?: ContestListItem[] };

type LobbyGroupKey = "active" | "upcoming" | "completed";

function getZoneTone(group: LobbyGroupKey) {
  if (group === "active") return "active";
  if (group === "upcoming") return "upcoming";
  return "completed";
}

function getZoneEyebrow(group: LobbyGroupKey) {
  if (group === "active") return "Arena floor";
  if (group === "upcoming") return "Entry gates";
  return "Victory archive";
}

function getZoneBadge(group: LobbyGroupKey, count: number) {
  if (group === "active")
    return `${count} clash${count === 1 ? "" : "es"} live`;
  if (group === "upcoming")
    return `${count} bracket${count === 1 ? "" : "s"} opening`;
  return `${count} result board${count === 1 ? "" : "s"}`;
}

function getFeaturedContest(contests: ContestListItem[]) {
  return (
    contests.find((contest) => contest.status === "LIVE") ??
    contests.find((contest) => contest.status === "LOCKED") ??
    contests.find((contest) => contest.status === "OPEN") ??
    contests.find((contest) => contest.status === "SETTLED") ??
    null
  );
}

function getSectionEmptyState(group: LobbyGroupKey) {
  if (group === "active") {
    return {
      title: "No contests live right now",
      description: "New tournaments are coming soon.",
    };
  }

  if (group === "upcoming") {
    return {
      title: "No upcoming contests right now",
      description:
        "Fresh lobbies will appear here when the next contest wave opens.",
    };
  }

  return {
    title: "No completed contests yet",
    description: "Finished contests and published results will land here.",
  };
}

function sortContests(contests: ContestListItem[], group: LobbyGroupKey) {
  return [...contests].sort((a, b) => {
    const aDate =
      group === "completed"
        ? new Date(a.endsAt ?? 0).getTime()
        : new Date(a.lockAt ?? a.liveAt ?? a.endsAt ?? 0).getTime();
    const bDate =
      group === "completed"
        ? new Date(b.endsAt ?? 0).getTime()
        : new Date(b.lockAt ?? b.liveAt ?? b.endsAt ?? 0).getTime();

    return group === "completed" ? bDate - aDate : aDate - bDate;
  });
}

export default function ContestsPage() {
  const { loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedContests, setHasLoadedContests] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const hasRequestedContestsRef = useRef(false);

  const loadContests = useCallback(
    async (options?: { showLoader?: boolean }) => {
      const showLoader = options?.showLoader ?? false;
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError("");

      try {
        const res = await fetch("/api/contests", { cache: "no-store" });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(
            payload?.error ??
              "We couldn't load contests right now. Please retry in a moment.",
          );
          return;
        }

        const payload = (await res
          .json()
          .catch(() => null)) as ContestPayload | null;
        const rows = Array.isArray(payload?.contests) ? payload!.contests : [];
        setContests(rows);
        setHasLoadedContests(true);
      } catch {
        setError(
          "Network issue while loading contests. Please check your connection and retry.",
        );
      } finally {
        if (showLoader) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (loading) return;
    if (retryCount === 0 && hasRequestedContestsRef.current) {
      return;
    }

    hasRequestedContestsRef.current = true;
    void loadContests({ showLoader: !hasLoadedContests });
  }, [hasLoadedContests, loading, retryCount, loadContests]);

  const computed = useMemo(() => {
    const upcoming = contests.filter(
      (contest) => contest.status === "OPEN",
    ).length;
    const active = contests.filter(
      (contest) => contest.status === "LOCKED" || contest.status === "LIVE",
    ).length;
    const completed = contests.filter(
      (contest) => contest.status === "SETTLED",
    ).length;
    const activePlayers = contests
      .filter(
        (contest) =>
          contest.status === "OPEN" ||
          contest.status === "LOCKED" ||
          contest.status === "LIVE",
      )
      .reduce((sum, contest) => sum + contest._count.entries, 0);

    return {
      active,
      upcoming,
      completed,
      activePlayers,
      total: contests.length,
    };
  }, [contests]);

  const groupedContests = useMemo(() => {
    const active = sortContests(
      contests.filter(
        (contest) => contest.status === "LOCKED" || contest.status === "LIVE",
      ),
      "active",
    );
    const upcoming = sortContests(
      contests.filter((contest) => contest.status === "OPEN"),
      "upcoming",
    );
    const completed = sortContests(
      contests.filter((contest) => contest.status === "SETTLED"),
      "completed",
    );

    return { active, upcoming, completed };
  }, [contests]);

  const featuredContest = useMemo(
    () => getFeaturedContest(contests),
    [contests],
  );
  const nowTs = Date.now();
  const showInitialSkeleton =
    isLoading && !hasLoadedContests && contests.length === 0;
  const showBlockingError =
    Boolean(error) && !hasLoadedContests && contests.length === 0;

  return (
    <SiteShell>
      <div className="contest-lobby-layout stitch-screen stitch-contests-screen">
        <Surface className="contest-lobby-hero" variant="raised">
          <div className="contest-lobby-hero-stage">
            <div className="contest-lobby-hero-copy">
              <p className="contest-lobby-hero-kicker">Arena central</p>
              <h1>Contests</h1>
              <p className="contest-lobby-hero-description">
                Enter the tournament map, scout the hottest rooms in the arena,
                and move from live clashes to upcoming brackets without leaving
                the battle board.
              </p>
              <div
                className="contest-lobby-hero-chips"
                aria-label="Contest lobby summary"
              >
                <Chip label={`${computed.active} active`} />
                <Chip label={`${computed.upcoming} upcoming`} />
                <Chip label={`${computed.completed} completed`} />
                <Chip label={`${computed.activePlayers} players in motion`} />
              </div>
              <div className="contest-lobby-hero-action-row">
                <div className="contest-lobby-hero-action-card tone-live">
                  <span>Live arena pulse</span>
                  <strong>{computed.activePlayers.toLocaleString()}</strong>
                  <small>Players moving through open or live contests.</small>
                </div>
                <div className="contest-lobby-hero-action-card tone-open">
                  <span>Bracket queue</span>
                  <strong>{computed.upcoming}</strong>
                  <small>Upcoming contests waiting for lineup locks.</small>
                </div>
              </div>
            </div>

            <div className="contest-lobby-map-board" aria-hidden="true">
              <div className="contest-lobby-map-path">
                <span className="node node-live" />
                <span className="path" />
                <span className="node node-open" />
                <span className="path" />
                <span className="node node-settled" />
              </div>
              <div className="contest-lobby-map-grid">
                <div className="contest-lobby-map-tile tone-live">
                  <strong>LIVE</strong>
                  <span>{computed.active} rooms</span>
                </div>
                <div className="contest-lobby-map-tile tone-open">
                  <strong>OPEN</strong>
                  <span>{computed.upcoming} rooms</span>
                </div>
                <div className="contest-lobby-map-tile tone-settled">
                  <strong>SETTLED</strong>
                  <span>{computed.completed} boards</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contest-lobby-featured">
            <span className="contest-lobby-featured-label">Spotlight room</span>
            {featuredContest ? (
              <>
                <strong>{featuredContest.title}</strong>
                <p>
                  {featuredContest.seasonName ?? featuredContest.code} ·{" "}
                  {featuredContest._count.entries} players ·{" "}
                  {featuredContest.leagueTierRequired ?? "OPEN"} tier
                </p>
                <div className="contest-lobby-featured-rail">
                  <span>{featuredContest.status}</span>
                  <span>
                    {featuredContest.userEntry
                      ? `Your entry ${featuredContest.userEntry.status}`
                      : "No entry on file"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <strong>No featured contest yet</strong>
                <p>
                  The lobby will spotlight the next headline contest as soon as
                  it opens.
                </p>
              </>
            )}
            <span className="contest-lobby-featured-total">
              {computed.total} contests loaded
            </span>
          </div>
        </Surface>

        {error && !showBlockingError ? (
          <section
            className="contest-hub-error-state contest-hub-inline-state"
            role="status"
            aria-live="polite"
          >
            <EmptyState
              title="Contest list may be out of date"
              description={error}
            />
            <button
              type="button"
              className="mcg-btn"
              onClick={() => {
                setRetryCount((current) => current + 1);
              }}
            >
              Retry
            </button>
          </section>
        ) : null}

        {isRefreshing && contests.length > 0 ? (
          <div className="contest-hub-refresh-note" aria-live="polite">
            Refreshing contests…
          </div>
        ) : null}

        {showInitialSkeleton ? (
          <section className="contest-lobby-grid" aria-label="Loading contests">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="contest-arena-skeleton-card" />
            ))}
          </section>
        ) : showBlockingError ? (
          <section className="contest-hub-error-state" role="alert">
            <EmptyState title="Unable to load contests" description={error} />
            <button
              type="button"
              className="mcg-btn"
              onClick={() => {
                setRetryCount((current) => current + 1);
              }}
            >
              Retry
            </button>
          </section>
        ) : contests.length === 0 ? (
          <div className="contest-arena-empty-wrap">
            <EmptyState
              title="No contests in the lobby"
              description="New contests will appear here once the next schedule is published."
            />
          </div>
        ) : (
          <div
            className="contest-lobby-sections contest-lobby-map-sections"
            aria-live="polite"
          >
            {(
              [
                {
                  key: "active",
                  title: "Active contests",
                  subtitle:
                    "The loudest rooms in the arena. Track live battles and locked entries already in motion.",
                  contests: groupedContests.active,
                },
                {
                  key: "upcoming",
                  title: "Upcoming contests",
                  subtitle:
                    "Plan ahead, tune your lineup, and grab your seat before team lock.",
                  contests: groupedContests.upcoming,
                },
                {
                  key: "completed",
                  title: "Completed contests",
                  subtitle:
                    "Review recent finishes, final placements, and the latest result boards.",
                  contests: groupedContests.completed,
                },
              ] satisfies Array<{
                key: LobbyGroupKey;
                title: string;
                subtitle: string;
                contests: ContestListItem[];
              }>
            ).map((section) => {
              const emptyState = getSectionEmptyState(section.key);

              return (
                <section
                  key={section.key}
                  className={`contest-lobby-section contest-lobby-section-${section.key} zone-${getZoneTone(section.key)}`}
                >
                  <div className="contest-lobby-section-banner">
                    <div className="contest-lobby-section-banner-copy">
                      <span className="contest-lobby-section-banner-eyebrow">
                        {getZoneEyebrow(section.key)}
                      </span>
                      <strong>{section.title}</strong>
                      <p>{section.subtitle}</p>
                    </div>
                    <span className="contest-lobby-section-banner-badge">
                      {getZoneBadge(section.key, section.contests.length)}
                    </span>
                  </div>
                  <SectionHeader
                    eyebrow="Contest state"
                    title={section.title}
                    subtitle={section.subtitle}
                    actions={
                      <Chip label={`${section.contests.length} listed`} />
                    }
                  />

                  {section.contests.length === 0 ? (
                    <div className="contest-arena-empty-wrap">
                      <EmptyState
                        title={emptyState.title}
                        description={emptyState.description}
                      />
                    </div>
                  ) : (
                    <div className="contest-lobby-grid">
                      {section.contests.map((contest) => (
                        <ContestCard
                          key={contest.id}
                          contest={contest}
                          group={section.key}
                          nowTs={nowTs}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
