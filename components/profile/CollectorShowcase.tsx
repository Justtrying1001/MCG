import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

type Props = {
  displayName: string;
  points: number;
  level: number;
  completionPct: number | null;
  tagline: string;
  settingsAction?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export function CollectorShowcase({
  displayName,
  points,
  level,
  completionPct,
  tagline,
  settingsAction,
  primaryAction,
  secondaryAction,
}: Props) {
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <div>
              <span className="profile-showcase-label">Player identity</span>
              <span className="profile-showcase-tagline">{tagline}</span>
            </div>
            {settingsAction}
          </div>

          <div className="profile-showcase-hero-row">
            <div className="profile-showcase-avatar" aria-hidden="true">
              <span>{initial}</span>
              <strong>{completionPct === null ? "Memedex" : `${completionPct}%`}</strong>
            </div>

            <div className="profile-showcase-identity">
              <p className="profile-showcase-identity-kicker">Trainer card</p>
              <h1 className="profile-showcase-name">{displayName}</h1>
              <p className="profile-showcase-subtitle">{tagline}</p>
            </div>
          </div>

          <div className="profile-showcase-metrics" aria-label="Player identity summary">
            <article className="profile-showcase-metric tone-primary">
              <span>Level</span>
              <strong>{level}</strong>
            </article>
            <article className="profile-showcase-metric tone-secondary">
              <span>Total points</span>
              <strong>{points.toLocaleString()}</strong>
            </article>
            <article className="profile-showcase-metric tone-tertiary">
              <span>Memedex</span>
              <strong>{completionPct === null ? "Vault locked" : `${completionPct}% complete`}</strong>
            </article>
          </div>

          <div className="profile-showcase-actions">
            {primaryAction ?? (
              <Link href="/collection" className="mcg-btn primary">
                Open Memedex
              </Link>
            )}
            {secondaryAction ?? (
              <Link href="/contests" className="mcg-btn ghost">
                Go to battles
              </Link>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
