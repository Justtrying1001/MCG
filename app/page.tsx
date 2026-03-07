import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      <section className="hero">
        <p className="eyebrow">TCG CRYPTO-NATIVE</p>
        <h2>Build your meme dynasty.</h2>
        <p>
          Ouvre des packs, assemble ton roster, monte en puissance en PvE et prépare les futurs combats classés.
          Une expérience collection + stratégie pensée pour les joueurs Web3.
        </p>
        <div className="cta-row">
          <Link href="/packs" className="btn btn-primary">Ouvrir un pack</Link>
          <Link href="/collection" className="btn btn-ghost">Voir ma collection</Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-panel">
          <h3>🎴 Cartes premium</h3>
          <p>Cadres holo, stats lisibles, raretés visibles et micro-interactions de survol.</p>
        </article>
        <article className="feature-panel">
          <h3>⚡ Ouverture animée</h3>
          <p>Effet de reveal progressif avec modal immersive pour chaque pack ouvert.</p>
        </article>
        <article className="feature-panel">
          <h3>🧠 PvE tactique</h3>
          <p>Compose une team de 3 cartes max et optimise ton run selon la difficulté.</p>
        </article>
      </section>
    </SiteShell>
  );
}
