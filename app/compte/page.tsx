"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

export default function AccountPage() {
  const { me } = useSession();

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Account</h2>
        <p>Track your profile performance, opening history, and seasonal progression.</p>
      </section>

      {me ? (
        <section className="feature-grid">
          <article className="feature-panel">
            <h3>Profile</h3>
            <p>Player: <strong>{me.user.username}</strong></p>
            <p>XP: <strong>{me.user.points}</strong></p>
          </article>
          <article className="feature-panel">
            <h3>Pack history</h3>
            <p>Packs opened: <strong>{me.user.packsOpened}</strong></p>
            <p>Recorded openings: <strong>{me.openingsCount}</strong></p>
          </article>
          <article className="feature-panel">
            <h3>PvE progression</h3>
            <ProgressBar value={Math.min(me.pveRunsCount, 100)} max={100} label="Road to Mythic" />
            <p>PvE runs: <strong>{me.pveRunsCount}</strong></p>
          </article>
        </section>
      ) : (
        <p>Please log in to view your account dashboard.</p>
      )}
    </SiteShell>
  );
}
