import { Surface } from "@/components/ui/Surface";

type ContestHubHeaderProps = {
  counts: {
    open: number;
    inProgress: number;
    finished: number;
    total: number;
  };
};

export function ContestHubHeader({ counts }: ContestHubHeaderProps) {
  return (
    <Surface className="contest-hub-header" variant="raised">
      <div className="contest-hub-header-copy">
        <p className="mcg-eyebrow">Contest hub</p>
        <h1>Contests</h1>
        <p>
          Discover active events, lock your lineup, then follow live rankings until final settlement.
          Every contest card highlights the key timing, reward teaser, and participation signal.
        </p>
      </div>

      <div className="contest-hub-kpi-grid" aria-label="Contest lifecycle summary">
        <article className="contest-hub-kpi open">
          <span>Open</span>
          <strong>{counts.open}</strong>
        </article>
        <article className="contest-hub-kpi progress">
          <span>In progress</span>
          <strong>{counts.inProgress}</strong>
        </article>
        <article className="contest-hub-kpi finished">
          <span>Finished</span>
          <strong>{counts.finished}</strong>
        </article>
        <article className="contest-hub-kpi total">
          <span>Total</span>
          <strong>{counts.total}</strong>
        </article>
      </div>
    </Surface>
  );
}
