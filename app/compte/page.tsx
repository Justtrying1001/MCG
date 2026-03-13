"use client";

import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

export default function AccountPage() {
  const { me } = useSession();

  const v2          = me?.mode === "user" ? me.coexistence?.v2 : undefined;
  const account     = v2?.accountProgression;
  const collection  = v2?.collectionProgression;
  const competitive = v2?.competitiveProgression;

  return (
    <SiteShell>
      <div className="hub-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">
              Your progression hub — account milestones, collection completion, and contest performance.
            </p>
          </div>
        </div>

        {!me ? (
          <div className="empty-state">
            <div className="empty-state-icon">◎</div>
            <p className="empty-state-title">Sign in to view your progression</p>
            <p className="empty-state-desc">
              Connect with X for persistent account, collection, and contest stats.
            </p>
          </div>
        ) : (
          <>
            {/* ── Player Card ── */}
            <div className="player-card-header">
              <div className="player-card-bg" />
              <div className="player-card-grid" />
              <div className="player-card-inner">
                <div className="player-avatar-xl">
                  {me.user.displayName.slice(0, 1).toUpperCase()}
                </div>

                <div className="player-info-block">
                  <div className="player-display-name">{me.user.displayName}</div>
                  <div className="player-handle">
                    {me.mode === "guest"
                      ? "Guest session · Temporary local data"
                      : `@${me.user.username ?? me.user.displayName}`}
                  </div>
                  <div className="player-level-row">
                    <span className="player-level-badge">
                      Lv {account?.level ?? 1}
                    </span>
                    {account && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
                        {account.xp} XP
                      </span>
                    )}
                    {me.mode === "guest" && (
                      <span style={{
                        fontSize: "0.72rem", color: "var(--amber)",
                        background: "rgba(240,164,58,0.10)", border: "1px solid rgba(240,164,58,0.25)",
                        borderRadius: 999, padding: "0.15rem 0.5rem",
                      }}>
                        Guest
                      </span>
                    )}
                  </div>

                  {account && (
                    <div style={{ marginTop: "0.35rem", maxWidth: 320 }}>
                      <ProgressBar
                        value={account.xp - account.levelXpFloor}
                        max={account.levelXpCeil - account.levelXpFloor}
                        label={`Level ${account.level} progress`}
                      />
                    </div>
                  )}
                </div>

                <div className="player-card-stats">
                  <div className="pcs-stat">
                    <div className="pcs-value">{me.user.points}</div>
                    <div className="pcs-label">Points</div>
                  </div>
                  {collection && (
                    <div className="pcs-stat">
                      <div className="pcs-value">{collection.ownedTemplateCount}</div>
                      <div className="pcs-label">Cards</div>
                    </div>
                  )}
                  {competitive && (
                    <div className="pcs-stat">
                      <div className="pcs-value">{competitive.contestsEntered}</div>
                      <div className="pcs-label">Contests</div>
                    </div>
                  )}
                </div>
              </div>

              {me.mode === "guest" && (
                <div style={{
                  position: "relative", marginTop: "1.2rem",
                  borderRadius: "var(--radius-sm)", padding: "0.8rem 1rem",
                  border: "1px solid rgba(240,164,58,0.25)",
                  background: "rgba(240,164,58,0.07)",
                  fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.55,
                }}>
                  Guest mode keeps temporary local data only.
                  Sign in with X to permanently save your collection, progression, and contest history.
                </div>
              )}
            </div>

            {/* ── Stats Hub Grid ── */}
            <div className="stats-hub-grid">
              <div className="stats-hub-card">
                <div className="shc-head">
                  <div className="shc-icon" style={{ background: "rgba(200,155,60,0.12)", color: "var(--gold)", fontSize: "1.2rem" }}>
                    ⬡
                  </div>
                  <span className="shc-label">Account</span>
                </div>
                <div className="shc-value" style={{ color: "var(--gold)" }}>
                  Lv {account?.level ?? 1}
                </div>
                <div className="shc-sub">
                  {account
                    ? `${account.xp} XP · next milestone at Lv ${account.nextMilestoneLevel}`
                    : "Connect to see account progression"}
                </div>
                {account && (
                  <div style={{ marginTop: "0.55rem" }}>
                    <ProgressBar
                      value={account.xp - account.levelXpFloor}
                      max={account.levelXpCeil - account.levelXpFloor}
                      label="Level progress"
                    />
                  </div>
                )}
                <div className="shc-sub" style={{ marginTop: "0.35rem" }}>
                  Points balance:{" "}
                  <strong style={{ color: "var(--text)" }}>{account?.pointsBalance ?? me.user.points}</strong>
                </div>
              </div>

              <div className="stats-hub-card">
                <div className="shc-head">
                  <div className="shc-icon" style={{ background: "rgba(46,107,255,0.12)", color: "var(--arc-blue)", fontSize: "1.2rem" }}>
                    ▦
                  </div>
                  <span className="shc-label">Collection</span>
                </div>
                <div className="shc-value">
                  {collection?.completionPct ?? 0}
                  <span style={{ fontSize: "1rem", opacity: 0.6 }}>%</span>
                </div>
                <div className="shc-sub">
                  {collection
                    ? `${collection.ownedTemplateCount} owned · ${collection.missingTemplateCount} missing`
                    : me.mode === "guest"
                      ? `${me.mvpCollection.length} cards in guest session`
                      : "Sync to see collection data"}
                </div>
                {collection && (
                  <div className="shc-sub" style={{ marginTop: "0.2rem" }}>
                    Top rarity:{" "}
                    <strong style={{ color: "var(--text)" }}>{collection.topRarityCode ?? "—"}</strong>
                    {" · "}Top edition:{" "}
                    <strong style={{ color: "var(--text)" }}>{collection.topEditionCode ?? "—"}</strong>
                  </div>
                )}
                <div style={{ marginTop: "0.55rem" }}>
                  <Link href="/collection" className="btn btn-ghost btn-sm">View Collection →</Link>
                </div>
              </div>

              <div className="stats-hub-card">
                <div className="shc-head">
                  <div className="shc-icon" style={{ background: "rgba(31,122,92,0.12)", color: "var(--emerald)", fontSize: "1.2rem" }}>
                    🏆
                  </div>
                  <span className="shc-label">Competitive</span>
                </div>
                <div className="shc-value">
                  {competitive?.contestsEntered ?? 0}
                </div>
                <div className="shc-sub">
                  {competitive
                    ? `${competitive.activeEntries} active · ${competitive.settledEntries} settled`
                    : "No contest data yet"}
                </div>
                {competitive && (
                  <div className="shc-sub" style={{ marginTop: "0.2rem" }}>
                    Best rank:{" "}
                    <strong style={{ color: "var(--gold)" }}>
                      {competitive.bestRank != null ? `#${competitive.bestRank}` : "—"}
                    </strong>
                    {" · "}Rating:{" "}
                    <strong style={{ color: "var(--text)" }}>{competitive.rating ?? "—"}</strong>
                  </div>
                )}
                <div style={{ marginTop: "0.55rem" }}>
                  <Link href="/contests" className="btn btn-ghost btn-sm">View Contests →</Link>
                </div>
              </div>
            </div>

            {/* ── Recent Contest Results ── */}
            {competitive?.recentResults?.length ? (
              <div style={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "linear-gradient(158deg, rgba(22,24,29,0.95), rgba(11,11,13,0.99))",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "0.9rem 1.2rem",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--text-3)",
                  }}>
                    Recent Contest Results
                  </span>
                </div>
                <div>
                  {competitive.recentResults.map((result) => (
                    <div
                      key={`${result.contestId}-${result.rankedAt}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: "1rem",
                        alignItems: "center",
                        padding: "0.75rem 1.2rem",
                        borderBottom: "1px solid rgba(35,38,45,0.55)",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: result.rank <= 3 ? "rgba(200,155,60,0.14)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${result.rank <= 3 ? "rgba(200,155,60,0.28)" : "var(--border)"}`,
                        display: "grid", placeItems: "center",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 900, fontSize: "1rem",
                        color: result.rank <= 3 ? "var(--gold)" : "var(--text-3)",
                      }}>
                        #{result.rank}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700 }}>{result.contestTitle}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-3)", marginTop: "0.1rem" }}>
                          {new Date(result.rankedAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </div>
                      </div>
                      <Link
                        href={`/contests/${result.contestId}`}
                        style={{ fontSize: "0.78rem", color: "var(--text-3)" }}
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </>
        )}

      </div>
    </SiteShell>
  );
}
