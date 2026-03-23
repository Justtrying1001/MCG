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
};

export function CollectorShowcase({
  displayName,
  points,
  level,
  completionPct,
  tagline,
  settingsAction,
  primaryAction,
}: Props) {
  const initial = displayName.slice(0, 1).toUpperCase();
  const memedexLabel = completionPct === null ? "Memedex locked" : `${completionPct}% complete`;

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <span className="profile-showcase-label">Trainer card</span>
            {settingsAction}
          </div>

          <div className="profile-showcase-hero-row">
            <div className="profile-showcase-avatar" aria-hidden="true">
              <div className="profile-showcase-avatar-core">
                <span>{initial}</span>
                <small>Trainer ID</small>
              </div>
            </div>

            <div className="profile-showcase-identity">
              <h1 className="profile-showcase-name">{displayName}</h1>
              <p className="profile-showcase-subtitle">{tagline}</p>
              <p className="profile-showcase-memedex-line">Memedex completion · {memedexLabel}</p>
            </div>
          </div>

          <div className="profile-showcase-metrics" aria-label="Trainer card summary">
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
              <strong>{completionPct === null ? "Locked" : `${completionPct}%`}</strong>
            </article>
          </div>

          <div className="profile-showcase-actions">
            {primaryAction ?? (
              <Link href="/collection" className="mcg-btn primary">
                Open memedex
              </Link>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
