import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { Chip } from "@/components/ui/Chip";

export function HeroDrop() {
  return (
    <Surface className="mcg-home-hero" variant="raised">
      <div className="mcg-home-pack">
        <p className="mcg-eyebrow">Season 01 · Genesis Drop</p>
        <h2>Open. Reveal. Collect.</h2>
        <p>
          MCG brings back the thrill of the pull: hero illustrations first, rarity chase second, data last.
          Every pack you open expands your personal collectible gallery.
        </p>
        <div className="mcg-home-hero-actions">
          <Link href="/packs" className="mcg-btn primary">Open Packs</Link>
          <Link href="/collection" className="mcg-btn ghost">View Memedex</Link>
        </div>
        <div className="mcg-home-hero-chips">
          <Chip label="5 cards per pack" />
          <Chip label="Legendary chase" />
          <Chip label="Battle-ready pulls" />
        </div>
      </div>

      <div className="mcg-hero-cards">
        <article className="mcg-mini-card">
          <strong>Genesis Pepe</strong>
          <span>Legendary · Full Art</span>
        </article>
        <article className="mcg-mini-card">
          <strong>Bull Matrix</strong>
          <span>Epic · Holo</span>
        </article>
        <article className="mcg-mini-card">
          <strong>Moon Cat</strong>
          <span>Rare · Reverse</span>
        </article>
        <article className="mcg-mini-card">
          <strong>Turbo Doge</strong>
          <span>Uncommon · Base</span>
        </article>
      </div>
    </Surface>
  );
}
