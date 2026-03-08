"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

export default function AccountPage() {
  const { me } = useSession();

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Your account overview — XP, pack history, and PvE progression.
          </p>
        </div>
      </div>

      {me ? (
        <>
          {/* Profile banner */}
          <div className="profile-banner">
            <div className="profile-banner-bg" />
            <div className="profile-header">
              <div className="profile-avatar">
                {me.user.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="profile-name">{me.user.displayName}</div>
                <div className="profile-sub">{me.mode === "guest" ? "Guest session · Temporary" : `Connected with X · @${me.user.username}`}</div>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-label">Total XP</span>
                <span className="profile-stat-value" style={{ color: "var(--cyan)" }}>
                  {me.user.points}
                </span>
                <span className="profile-stat-sub">Progression points</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-label">Packs opened</span>
                <span className="profile-stat-value">{me.user.packsOpened}</span>
                <span className="profile-stat-sub">{me.openingsCount} recorded openings</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-label">PvE runs</span>
                <span className="profile-stat-value">{me.pveRunsCount}</span>
                <span className="profile-stat-sub">Encounters completed</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-label">Road to Mythic</span>
                <div style={{ marginTop: "0.5rem" }}>
                  <ProgressBar value={Math.min(me.pveRunsCount, 100)} max={100} label="PvE ladder" />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <p className="empty-state-title">Sign in to view your profile</p>
          <p className="empty-state-desc">
            Continue with X for persistent progress, or start as guest for a temporary session.
          </p>
        </div>
      )}
    </SiteShell>
  );
}
