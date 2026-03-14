import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PackGalleryItem = {
  code: string;
  name: string;
  kind: "base" | "premium" | "event";
  cards: number;
  status: "open" | "locked";
};

function toneForStatus(status: PackGalleryItem["status"]) {
  return status === "open" ? "open" : "locked" as const;
}

function labelForKind(kind: PackGalleryItem["kind"]) {
  if (kind === "base") return "Base";
  if (kind === "premium") return "Premium";
  return "Event";
}

export function PackCard({ item }: { item: PackGalleryItem }) {
  return (
    <Surface as="article" className="pack-gallery-card">
      <div className="pack-gallery-card-top">
        <strong>{item.name}</strong>
        <StatusBadge tone={toneForStatus(item.status)} label={item.status.toUpperCase()} />
      </div>
      <div className="pack-gallery-meta">
        <span>{labelForKind(item.kind)}</span>
        <span>{item.cards} cards</span>
      </div>
      <span className="mcg-eyebrow">{item.code}</span>
    </Surface>
  );
}

export function PackGallery({ items }: { items: PackGalleryItem[] }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Pack gallery"
        title="Choose your format"
        subtitle="Base, premium, and event packs share the same collectible DNA."
      />
      <div className="pack-gallery-grid">
        {items.map((item) => <PackCard key={item.code} item={item} />)}
      </div>
    </section>
  );
}
