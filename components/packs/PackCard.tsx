import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Surface } from "@/components/ui/Surface";

export type PackCardProps = {
  imageSrc: Parameters<typeof Image>[0]["src"];
  imageAlt: string;
  eyebrow: string;
  name: string;
  description: string;
  priceLabel: string;
  infoLabel: string;
  ctaLabel: string;
  onAction: () => void;
  disabled?: boolean;
  quantityLabel?: string;
  tags?: string[];
  accent?: "orange" | "gold" | "violet";
};

export function PackCard({
  imageSrc,
  imageAlt,
  eyebrow,
  name,
  description,
  priceLabel,
  infoLabel,
  ctaLabel,
  onAction,
  disabled = false,
  quantityLabel,
  tags = [],
  accent = "orange",
}: PackCardProps) {
  return (
    <Surface
      variant="raised"
      className={`pack-card pack-card--${accent}`}
      aria-label={name}
    >
      <div className="pack-card-art-shell">
        <div className="pack-card-art-bg" />
        {quantityLabel ? (
          <span className="pack-card-quantity">{quantityLabel}</span>
        ) : null}
        <Image src={imageSrc} alt={imageAlt} className="pack-card-art" />
      </div>

      <div className="pack-card-body">
        <div className="pack-card-copy">
          <p className="pack-card-eyebrow">{eyebrow}</p>
          <h3>{name}</h3>
          <p className="pack-card-description">{description}</p>
        </div>

        <div className="pack-card-meta-row">
          <span className="pack-card-price">{priceLabel}</span>
          <span className="pack-card-info">{infoLabel}</span>
        </div>

        {tags.length > 0 ? (
          <div className="pack-card-tag-row">
            {tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </div>
        ) : null}

        <Button className="pack-card-cta" onClick={onAction} disabled={disabled}>
          {ctaLabel}
        </Button>
      </div>
    </Surface>
  );
}
