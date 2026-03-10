"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

export default function AccountPage() {
  const { me } = useSession();

  const v2 = me?.mode === "user" ? me.coexistence?.v2 : undefined;
  const account = v2?.accountProgression;
  const collection = v2?.collectionProgression;
  const competitive = v2?.competitiveProgression;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Your progression hub — account milestones, collection completion, and contest performance.
          </p>
        </div>
      </div>

      {me ? (
        <>
          <div className="profile-banner">
            <div className="profile-banner-bg" />
            <div className="profile-header">
              <div className="profile-avatar">{me.user.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="profile-name">{me.user.displayName}</div>
                <div className="profile-sub">
                  {me.mode === "guest" ? "Guest session · Temporary progression preview" : `Connected with X · @${me.user.username}`}
                </div>
              </div>
            </div>

            {me.mode === "guest" ? (
              <div className="profile-guest-note">
                Guest mode only keeps temporary legacy session state. Sign in with X for persistent account,
                collection, and competitive progression.
              </div>
            ) : null}
          </div>

          <div className="profile-hub-grid">
            <section className="profile-stat-card">
              <span className="profile-stat-label">Account progression</span>
              <span className="profile-stat-value" style={{ color: "var(--cyan)" }}>
                Lv {account?.level ?? 1}
              </span>
              <span className="profile-stat-sub">
                {account ? `${account.xp} XP · milestone at Lv ${account.nextMilestoneLevel}` : "Lightweight progression summary unavailable"}
              </span>
              {account ? (
                <div style={{ marginTop: "0.45rem" }}>
                  <ProgressBar value={account.xp - account.levelXpFloor} max={account.levelXpCeil - account.levelXpFloor} label="Level progress" />
                </div>
              ) : null}
              <span className="profile-stat-sub">Points balance: {account?.pointsBalance ?? me.user.points}</span>
            </section>

            <section className="profile-stat-card">
              <span className="profile-stat-label">Collection progression</span>
              <span className="profile-stat-value">{collection?.completionPct ?? 0}%</span>
              <span className="profile-stat-sub">
                {collection
                  ? `${collection.ownedTemplateCount} owned templates · ${collection.missingTemplateCount} missing`
                  : "Collection projection available after authenticated sync"}
              </span>
              <span className="profile-stat-sub">
                {collection
                  ? `Top rarity: ${collection.topRarityCode ?? "-"} · Top edition: ${collection.topEditionCode ?? "-"}`
                  : `Legacy cards tracked: ${me.collection.length}`}
              </span>
            </section>

            <section className="profile-stat-card">
              <span className="profile-stat-label">Competitive progression</span>
              <span className="profile-stat-value">{competitive?.contestsEntered ?? 0}</span>
              <span className="profile-stat-sub">Contest entries</span>
              <span className="profile-stat-sub">
                {competitive
                  ? `${competitive.activeEntries} active · ${competitive.settledEntries} settled · best rank ${competitive.bestRank ?? "-"}`
                  : "Competitive summary requires authenticated contest data"}
              </span>
              <span className="profile-stat-sub">Rating: {competitive?.rating ?? "-"}</span>
            </section>
          </div>

          {competitive?.recentResults?.length ? (
            <section className="profile-secondary-panel">
              <h2 className="profile-secondary-title">Recent contest results</h2>
              <div className="profile-results-list">
                {competitive.recentResults.map((result) => (
                  <div key={`${result.contestId}-${result.rankedAt}`} className="profile-result-row">
                    <div>
                      <div className="profile-result-name">{result.contestTitle}</div>
                      <div className="profile-result-sub">{new Date(result.rankedAt).toLocaleString()}</div>
                    </div>
                    <div className="profile-result-rank">#{result.rank}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="profile-secondary-panel">
            <h2 className="profile-secondary-title">Legacy PvE continuity</h2>
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-label">PvE runs</span>
                <span className="profile-stat-value">{me.pveRunsCount}</span>
                <span className="profile-stat-sub">Encounters completed</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-label">PvE cards available</span>
                <span className="profile-stat-value">{me.availablePveCards}</span>
                <span className="profile-stat-sub">{me.exhaustedPveCards} exhausted today</span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <p className="empty-state-title">Sign in to view your progression hub</p>
          <p className="empty-state-desc">
            Continue with X for persistent account, collection, and contest progression.
          </p>
        </div>
      )}
    </SiteShell>
  );
}
