import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

type HeroStat = {
  label: string;
  value: string;
  detail?: string;
  tone: string;
  wide?: boolean;
};

type Props = {
  displayName: string;
  title: string;
  trencherId: string;
  level: number;
  avatarUrl?: string | null;
  totalPointsLabel: string;
  completionLabel: string;
  cardsOwnedLabel: string;
  collectionXpLabel: string;
  milestonesUnlockedLabel: string;
  battlesEnteredLabel: string;
  bestBattleFinishLabel: string;
  xpLabel: string;
  progressPct: number;
  tagline: string;
  settingsAction?: ReactNode;
  primaryAction?: ReactNode;
};

export function CollectorShowcase({
  displayName,
  title,
  trencherId,
  level,
  avatarUrl,
  totalPointsLabel,
  completionLabel,
  cardsOwnedLabel,
  collectionXpLabel,
  milestonesUnlockedLabel,
  battlesEnteredLabel,
  bestBattleFinishLabel,
  xpLabel,
  progressPct,
  tagline,
  settingsAction,
  primaryAction,
}: Props) {
  const initial = displayName.slice(0, 1).toUpperCase();
  const heroStats: HeroStat[] = [
    { label: "Total Points", value: totalPointsLabel, detail: "Lifetime account score", tone: "tone-sun" },
    { label: "Memedex Completion", value: completionLabel, detail: "Templates discovered", tone: "tone-sky" },
    { label: "Cards Owned", value: cardsOwnedLabel, detail: "Total collection copies", tone: "tone-mint" },
    { label: "Collection XP", value: collectionXpLabel, detail: "Collection-powered XP", tone: "tone-peach" },
    { label: "Milestones Unlocked", value: milestonesUnlockedLabel, detail: "Completed collector milestones", tone: "tone-lilac" },
    { label: "Battles Entered", value: battlesEnteredLabel, detail: battlesEnteredLabel === "—" ? "No participation yet" : "Confirmed battle entries", tone: "tone-berry" },
    { label: "Best Battle Finish", value: bestBattleFinishLabel, detail: bestBattleFinishLabel === "—" ? "No finish recorded" : "Best recorded placement", tone: "tone-sun", wide: true },
  ];

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
                {heroStats.map((stat) => (
                  <article key={stat.label} className={`profile-showcase-stat-pill ${stat.tone}${stat.wide ? " profile-showcase-stat-pill--wide" : ""}`}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    {stat.detail ? <small>{stat.detail}</small> : null}
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
