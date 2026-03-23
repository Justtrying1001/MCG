import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";

type Props = {
  displayName: string;
  points: number;
  level: number;
  completionPct: number | null;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export function CollectorShowcase({
  displayName,
  points,
  level,
  completionPct,
  primaryAction,
  secondaryAction,
}: Props) {
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Surface className="profile-showcase stitch-panel-card" variant="raised">
      <div className="profile-showcase-card-shell">
        <div className="profile-showcase-card-frame">
          <div className="profile-showcase-head">
            <span className="profile-showcase-label">Trainer card</span>
            <span className="profile-showcase-id">LVL {level}</span>
          </div>

          <div className="profile-showcase-avatar" aria-hidden="true">
            <span>{initial}</span>
            <strong>
              {completionPct === null ? "Memedex" : `${completionPct}%`}
            </strong>
          </div>

          <div
            className="profile-showcase-prestige-row"
            aria-label="Trainer card prestige markers"
          >
            <div className="profile-showcase-prestige-pill">
              <span>Collection prestige</span>
              <strong>
                {completionPct === null
                  ? "Vault locked"
                  : `${completionPct}% complete`}
              </strong>
            </div>
            <div className="profile-showcase-prestige-pill">
              <span>Point stockpile</span>
              <strong>{points.toLocaleString()} XP</strong>
            </div>
          </div>

          <SectionHeader
            eyebrow="Trainer identity"
            title={displayName}
            subtitle="Your MCG trainer card."
          />

          <div className="profile-showcase-chips">
            <Chip label={`Level ${level}`} />
            <Chip label={`${points.toLocaleString()} points`} />
            <Chip
              label={`Memedex ${completionPct === null ? "—" : `${completionPct}%`}`}
            />
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
