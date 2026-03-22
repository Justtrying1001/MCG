import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type SetCompletion = {
  label: string;
  done: number;
  total: number;
};

export function SetCompletionSection({ rows, footer }: { rows: SetCompletion[]; footer?: ReactNode }) {
  return (
    <Surface variant="raised" className="profile-set-surface">
      <div className="profile-set-completion-wrap">
        <SectionHeader
          eyebrow="Memedex sectors"
          title="Set completion overview"
          subtitle="Track your Memedex progress across the sets that shape your trainer card."
        />

        <div className="profile-set-completion-grid">
          {rows.map((row) => {
            const pct = Math.min(100, Math.round((row.done / Math.max(row.total, 1)) * 100));
            return (
              <article key={row.label} className="profile-set-completion-item">
                <div className="profile-set-completion-top">
                  <strong>{row.label}</strong>
                  <span>{pct}%</span>
                </div>
                <div className="profile-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                <p className="contest-inline-note">Memedex completion: {row.done} / {row.total}</p>
              </article>
            );
          })}
        </div>
        {footer ? <div style={{ marginTop: "1rem" }}>{footer}</div> : null}
      </div>
    </Surface>
  );
}
