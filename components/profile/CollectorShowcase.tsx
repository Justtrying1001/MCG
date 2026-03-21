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

          <SectionHeader
            eyebrow="Trainer identity"
            title={displayName}
            subtitle="Your premium MCG trainer card, with Memedex progress and competitive momentum in one place."
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
                Go to contests
              </Link>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
