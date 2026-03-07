"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

export default function ComptePage() {
  const { me } = useSession();

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Compte</h2>
        <p>Suivi profil, historique de progression et prochains objectifs.</p>
      </section>

      {me ? (
        <section className="feature-grid">
          <article className="feature-panel">
            <h3>Profil</h3>
            <p>Joueur: <strong>{me.user.username}</strong></p>
            <p>Points: <strong>{me.user.points}</strong></p>
          </article>
          <article className="feature-panel">
            <h3>Historique packs</h3>
            <p>Packs ouverts: <strong>{me.user.packsOpened}</strong></p>
            <p>Openings enregistrées: <strong>{me.openingsCount}</strong></p>
          </article>
          <article className="feature-panel">
            <h3>Progression PvE</h3>
            <ProgressBar value={Math.min(me.pveRunsCount, 100)} max={100} label="Road to Master" />
            <p>Runs PvE: <strong>{me.pveRunsCount}</strong></p>
          </article>
        </section>
      ) : (
        <p>Connecte-toi pour voir ton compte.</p>
      )}
    </SiteShell>
  );
}
