import Image from "next/image";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

type FeaturedPackStageProps = {
  packImageSrc: unknown;
  packName: string;
  cardsPerPack: number;
  remaining?: number;
  planned?: number;
  isOpening: boolean;
  openingPhase: "idle" | "tearing" | "revealing";
  canOpen: boolean;
  onOpen: () => void;
  onOpenOdds: () => void;
};

export function FeaturedPackStage({
  packImageSrc,
  packName,
  cardsPerPack,
  remaining,
  planned,
  isOpening,
  openingPhase,
  canOpen,
  onOpen,
  onOpenOdds,
}: FeaturedPackStageProps) {
  const label = openingPhase === "tearing"
    ? "Breaking seal…"
    : isOpening
      ? "Preparing reveal…"
      : "Open Pack";

  return (
    <Surface variant="raised" className="pack-featured-stage">
      <div className="pack-featured-media">
        <Image src={packImageSrc as Parameters<typeof Image>[0]["src"]} alt="MCG booster pack" className="pack-featured-image" priority />
      </div>

      <div className="pack-featured-body">
        <SectionHeader
          eyebrow="Featured pack"
          title={packName}
          subtitle="Crack the seal and reveal cards one by one."
          actions={<button type="button" className="mcg-btn ghost" onClick={onOpenOdds}>Odds & supply</button>}
        />

        <div className="pack-stage-chips">
          <Chip label={`${cardsPerPack} cards`} />
          <Chip label={typeof remaining === "number" ? `${remaining.toLocaleString()} left` : "Supply pending"} />
          <Chip label={typeof planned === "number" ? `${planned.toLocaleString()} total` : "Planned supply"} />
        </div>

        <div className="pack-open-row">
          <Button onClick={onOpen} disabled={!canOpen} className="btn-lg">
            {label}
          </Button>
          {openingPhase === "tearing" ? <p className="pack-stage-note">Foil tearing… cards incoming.</p> : null}
        </div>
      </div>
    </Surface>
  );
}
