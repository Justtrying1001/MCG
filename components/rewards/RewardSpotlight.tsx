import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export function RewardSpotlight({
  title,
  description,
  reward,
  progress,
  status,
  ctaLabel,
  onCta,
  ctaDisabled,
}: {
  title: string;
  description: string;
  reward: string;
  progress: string;
  status: "open" | "locked" | "live" | "settled";
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
}) {
  return (
    <Surface className="rewards-spotlight" variant="raised">
      <div>
        <SectionHeader
          eyebrow="Reward spotlight"
          title={title}
          subtitle={description}
          actions={<StatusBadge tone={status} label={status.toUpperCase()} />}
        />
        <div className="rewards-spotlight-chips">
          <span className="mcg-chip">Reward {reward}</span>
          <span className="mcg-chip">Progress {progress}</span>
        </div>
      </div>

      <div className="rewards-spotlight-action">
        {ctaLabel && onCta ? (
          <Button onClick={onCta} disabled={ctaDisabled}>{ctaLabel}</Button>
        ) : (
          <p className="contest-inline-note">No action required right now.</p>
        )}
      </div>
    </Surface>
  );
}
