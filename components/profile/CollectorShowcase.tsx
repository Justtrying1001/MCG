import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

type Props = {
  displayName: string;
  title: string;
  trainerId: string;
  level: number;
  avatarUrl?: string | null;
  rankLabel: string;
  leagueLabel: string;
  prestigeLabel: string;
  xpLabel: string;
  progressPct: number;
  tagline: string;
  settingsAction?: ReactNode;
  primaryAction?: ReactNode;
};

export function CollectorShowcase({
  displayName,
  title,
  trainerId,
  level,
  avatarUrl,
  rankLabel,
  leagueLabel,
  prestigeLabel,
  xpLabel,
  progressPct,
  tagline,
  settingsAction,
  primaryAction,
}: Props) {
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <span className="profile-showcase-label">Trainer card</span>
            <div className="profile-showcase-head-actions">{settingsAction}</div>
          </div>

          <div className="profile-showcase-card-topline">
            <span className="profile-showcase-card-tag">TRAINER CARD</span>
            <span className="profile-showcase-card-id">ID · {trainerId}</span>
          </div>

          <div className="profile-showcase-avatar" aria-hidden="true">
            <div className="profile-showcase-avatar-core">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 360px" className="profile-showcase-avatar-image" />
              ) : (
                <>
                  <span>{initial}</span>
                  <small>Collector identity online</small>
                </>
              )}
              <strong className="profile-showcase-level-badge">LVL {level}</strong>
            </div>
          </div>

          <div className="profile-showcase-identity-copy">
            <p className="profile-showcase-identity-kicker">Core identity</p>
            <h1 className="profile-showcase-name">{displayName}</h1>
            <p className="profile-showcase-title">{title}</p>
            <p className="profile-showcase-subtitle">{tagline}</p>
          </div>

          <div className="profile-showcase-prestige-row" aria-label="Trainer card summary">
            <article className="profile-showcase-prestige-pill tone-primary">
              <span>Rank</span>
              <strong>{rankLabel}</strong>
            </article>
            <article className="profile-showcase-prestige-pill tone-secondary">
              <span>League</span>
              <strong>{leagueLabel}</strong>
            </article>
            <article className="profile-showcase-prestige-pill tone-tertiary">
              <span>Prestige</span>
              <strong>{prestigeLabel}</strong>
            </article>
          </div>

          <div className="profile-showcase-progress-block">
            <div className="profile-showcase-progress-copy">
              <span>XP to next level</span>
              <strong>{xpLabel}</strong>
            </div>
            <div className="profile-showcase-progress-bar" aria-hidden="true">
              <div className="profile-showcase-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

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
    </Surface>
  );
}
