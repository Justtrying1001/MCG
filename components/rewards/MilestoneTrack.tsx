import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type MilestoneItem = {
  key: string;
  title: string;
  objective: string;
  progressValue: number;
  targetValue: number;
  done: boolean;
  icon?: string;
};

export function MilestoneTrack({ items }: { items: MilestoneItem[] }) {
  return (
    <Surface>
      <div className="milestone-track-wrap">
        <SectionHeader
          eyebrow="Milestone track"
          title="Progression path"
          subtitle="See what is completed and what comes next."
        />

        <div className="milestone-track-grid-v2">
          {items.map((item) => {
            const pct = Math.min(100, Math.round((item.progressValue / Math.max(item.targetValue, 1)) * 100));
            return (
              <article key={item.key} className={`milestone-track-item${item.done ? " done" : ""}`}>
                <p className="mcg-eyebrow">{item.icon ?? "🏁"} {item.title}</p>
                <p className="contest-inline-note">{item.objective}</p>
                <div className="milestone-track-bar"><span style={{ width: `${pct}%` }} /></div>
                <p className="contest-inline-note">{item.progressValue} / {item.targetValue}</p>
              </article>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
