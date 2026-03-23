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
  const trainerId = `${level.toString().padStart(2, "0")}-${points
    .toString()
    .slice(-4)
    .padStart(4, "0")}`;

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <span className="profile-showcase-label">Trainer hero</span>
            {settingsAction}
          </div>

          <div className="profile-showcase-hero-row">
            <div className="profile-showcase-avatar" aria-hidden="true">
              <div className="profile-showcase-avatar-top">
                <span className="profile-showcase-card-tag">Trainer card</span>
                <span className="profile-showcase-card-id">ID · {trainerId}</span>
              </div>

              <div className="profile-showcase-avatar-core">
                <div className="profile-showcase-avatar-badge">Collector profile</div>
                <div className="profile-showcase-avatar-emblem">{initial}</div>
                <div className="profile-showcase-avatar-rank">
                  <strong>LVL {level}</strong>
                  <small>Identity online</small>
                </div>
              </div>
            </div>

            <div className="profile-showcase-identity">
              <div className="profile-showcase-identity-copy">
                <p className="profile-showcase-identity-kicker">Your trainer</p>
                <h1 className="profile-showcase-name">{displayName}</h1>
                <p className="profile-showcase-subtitle">{tagline}</p>
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

              <p className="profile-showcase-memedex-line">Memedex completion · {memedexLabel}</p>

              <div className="profile-showcase-actions">
                {primaryAction ?? (
                  <>
                    <Link href="/collection" className="mcg-btn primary btn-sm">
                      Open Memedex
                    </Link>
                    <Link href="/combats" className="mcg-btn ghost btn-sm">
                      Go to Battles
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
