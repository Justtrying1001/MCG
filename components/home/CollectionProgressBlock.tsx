import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Props = {
  completionPct: number | null;
  ownedCount: number;
  missingCount: number;
};

export function CollectionProgressBlock({ completionPct, ownedCount, missingCount }: Props) {
  return (
    <Surface>
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Binder"
          title="Collection Progress"
          subtitle="Keep chasing missing cards and editions."
          actions={<Link href="/collection" className="mcg-btn ghost">Open binder</Link>}
        />
        <div className="mcg-progress-list">
          <div className="mcg-progress-row"><span>Completion</span><strong>{completionPct === null ? "—" : `${completionPct}%`}</strong></div>
          <div className="mcg-progress-row"><span>Owned templates</span><strong>{ownedCount}</strong></div>
          <div className="mcg-progress-row"><span>Missing templates</span><strong>{missingCount}</strong></div>
        </div>
      </div>
    </Surface>
  );
}
