import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";

export default function HomePage() {
  return (
    <SiteShell>
      {/* ── Hero ── */}
      <section className="hero-wrap">
        <div className="hero-bg-glow" />
        <div className="hero-grid-lines" />

        <div className="hero-body">
          <Suspense fallback={null}>
            <AuthErrorNotice />
          </Suspense>
          <p className="eyebrow">Bienvenue dans ton univers de cartes</p>
          <h1 className="hero-title">
            Collectionne, échange des vibes,<br />
            <span className="accent">ouvre tes boosters</span><br />
            et joue les contests.
          </h1>
          <p className="hero-desc">
            MCG est un jeu de collection de cartes fun et accessible.
            Ouvre des packs, complète ta collection et compose ton lineup
            pour grimper dans les contests.
          </p>
          <div className="cta-row">
            <Link href="/packs" className="btn btn-primary btn-lg">Ouvrir un pack</Link>
            <Link href="/collection" className="btn btn-ghost btn-lg">Voir ma collection</Link>
          </div>
          <div className="hero-pills">
            <span className="hero-pill">Raretés et éditions</span>
            <span className="hero-pill">Ouverture progressive</span>
            <span className="hero-pill">Rewards et quêtes</span>
          </div>
        </div>

        <div className="hero-cards-wrap">
          <div className="hero-card hero-card-1">
            <span className="hero-card-name">Genesis Pepe</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-legendary)" }}>Legendary · S01</span>
            <div className="hero-card-art">🐸</div>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-name">Bull Matrix</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-epic)" }}>Epic · S01</span>
            <div className="hero-card-art">🐂</div>
          </div>
          <div className="hero-card hero-card-3">
            <span className="hero-card-name">Signal Drop</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-rare)" }}>Rare · S01</span>
            <div className="hero-card-art">◈</div>
          </div>
        </div>
      </section>

      {/* ── Feature panels ── */}
      <div className="feature-grid">
        <article className="feature-panel">
          <div className="feature-panel-icon">◈</div>
          <h3>Ouvre ton booster</h3>
          <p>
            Découvre 5 cartes par pack avec une révélation carte par carte.
            Chaque tirage enrichit ta progression et ton style de jeu.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">▦</div>
          <h3>Construis ta collection</h3>
          <p>
            Trie, admire et complète ta binder avec des cartes rares, éditions spéciales
            et cartes iconiques à collectionner.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">🏆</div>
          <h3>Entre en contest</h3>
          <p>
            Sélectionne tes cartes possédées, inscris-toi aux contests actifs
            et vise le top du classement pour gagner des rewards.
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
