import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Chip } from "@/components/ui/Chip";

type Props = {
  displayName: string;
  points: number;
  level: number;
  completionPct: number | null;
};

export function CollectorShowcase({ displayName, points, level, completionPct }: Props) {
  return (
    <Surface className="profile-showcase" variant="raised">
      <div>
        <SectionHeader
          eyebrow="Collector identity"
          title={displayName}
          subtitle="Your personal collector showcase"
        />
        <div className="profile-showcase-chips">
          <Chip label={`Level ${level}`} />
          <Chip label={`${points.toLocaleString()} points`} />
          <Chip label={`Completion ${completionPct === null ? "—" : `${completionPct}%`}`} />
        </div>
      </div>

      <div className="profile-showcase-actions">
        <Link href="/collection" className="mcg-btn primary">Open collection</Link>
        <Link href="/contests" className="mcg-btn ghost">Go to contests</Link>
      </div>
    </Surface>
  );
}
