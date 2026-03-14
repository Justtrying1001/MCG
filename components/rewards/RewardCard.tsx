import { Surface } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export function RewardCard({
  title,
  description,
  reward,
  progressText,
  status,
  ctaLabel,
  onCta,
  disabled,
  icon,
}: {
  title: string;
  description: string;
  reward: string;
  progressText: string;
  status: "open" | "locked" | "live" | "settled";
  ctaLabel?: string;
  onCta?: () => void;
  disabled?: boolean;
  icon?: string;
}) {
  return (
    <Surface className="reward-card-v2">
      <div className="reward-card-head">
        <div>
          <p className="mcg-eyebrow">{icon ?? "✦"} Quest</p>
          <h3 className="reward-card-title">{title}</h3>
        </div>
        <StatusBadge tone={status} label={status.toUpperCase()} />
      </div>

      <p className="reward-card-desc">{description}</p>
      <div className="reward-card-meta">
        <span className="mcg-chip">{reward}</span>
        <span className="mcg-chip">{progressText}</span>
      </div>

      {ctaLabel && onCta ? <Button variant="ghost" onClick={onCta} disabled={disabled}>{ctaLabel}</Button> : null}
    </Surface>
  );
}
