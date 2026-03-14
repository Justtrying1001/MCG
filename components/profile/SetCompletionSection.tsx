import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type SetCompletion = {
  label: string;
  done: number;
  total: number;
};

export function SetCompletionSection({ rows }: { rows: SetCompletion[] }) {
  return (
    <Surface>
      <div className="profile-set-completion-wrap">
        <SectionHeader
          eyebrow="Set completion"
          title="Binder progress by set"
          subtitle="Track your completion in a visual, collection-first way."
        />

        <div className="profile-set-completion-grid">
          {rows.map((row) => {
            const pct = Math.min(100, Math.round((row.done / Math.max(row.total, 1)) * 100));
            return (
              <article key={row.label} className="profile-set-completion-item">
                <strong>{row.label}</strong>
                <div className="profile-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                <p className="contest-inline-note">{row.done} / {row.total} ({pct}%)</p>
              </article>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
