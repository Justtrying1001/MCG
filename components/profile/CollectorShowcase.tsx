import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

type Props = {
  displayName: string;
  title: string;
  trencherId: string;
  level: number;
  avatarUrl?: string | null;
  totalPointsLabel: string;
  completionLabel: string;
  rankLabel: string;
  leagueLabel: string;
  prestigeLabel: string;
  xpLabel: string;
  progressPct: number;
  tagline: string;
  settingsAction?: ReactNode;
  primaryAction?: ReactNode;
};

const heroStats = [
  { label: "Total Points", tone: "tone-primary" },
  { label: "Memedex %", tone: "tone-secondary" },
  { label: "League", tone: "tone-tertiary" },
  { label: "Rank", tone: "tone-neutral" },
  { label: "Prestige", tone: "tone-primary profile-showcase-stat-pill--wide" },
] as const;

export function CollectorShowcase({
  displayName,
  title,
  trencherId,
  level,
  avatarUrl,
  totalPointsLabel,
  completionLabel,
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
  const statValues = [totalPointsLabel, completionLabel, leagueLabel, rankLabel, prestigeLabel];

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <span className="profile-showcase-label">Trencher Card</span>
            <div className="profile-showcase-head-actions">{settingsAction}</div>
          </div>

          <div className="profile-showcase-main-grid">
            <div className="profile-showcase-visual-column" aria-hidden="true">
              <div className="profile-showcase-avatar-core">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 420px" className="profile-showcase-avatar-image" />
                ) : (
                  <>
                    <span>{initial}</span>
                    <small>Collector identity online</small>
                  </>
                )}
                <div className="profile-showcase-visual-topline">
                  <span className="profile-showcase-card-tag">{title}</span>
                  <span className="profile-showcase-card-id">ID · {trencherId}</span>
                </div>
                <strong className="profile-showcase-level-badge">LVL {level}</strong>
              </div>
            </div>

            <div className="profile-showcase-primary-column">
              <div className="profile-showcase-identity-copy">
                <p className="profile-showcase-role">{title}</p>
                <h1 className="profile-showcase-name">{displayName}</h1>
                <p className="profile-showcase-subtitle">{tagline}</p>
              </div>

              <div className="profile-showcase-stat-grid" aria-label="Trencher card summary">
                {heroStats.map((stat, index) => (
                  <article key={stat.label} className={`profile-showcase-stat-pill ${stat.tone}`}>
                    <span>{stat.label}</span>
                    <strong>{statValues[index]}</strong>
                  </article>
                ))}
              </div>

              <div className="profile-showcase-progress-block">
                <div className="profile-showcase-progress-copy">
                  <span>XP progress</span>
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
        </div>
      </div>
    </Surface>
  );
}
