import type { ContestStatus } from "@/components/contests/types";
import { toUserPhase } from "@/components/contests/contestLifecycle";
import { formatDate } from "@/components/contests/contestUtils";

const steps = [
  { key: "OPEN", label: "Open", hint: "Build and edit lineup freely", icon: "🛡️" },
  { key: "TEAM_LOCK", label: "Locked", hint: "Lineups freeze", icon: "🔒" },
  { key: "LIVE", label: "Live", hint: "Performance race in progress", icon: "🔥" },
  { key: "END", label: "End", hint: "Scoring snapshots & compute", icon: "📊" },
  { key: "RESULT", label: "Settled", hint: "Final ranks and rewards", icon: "🏆" },
] as const;

export function ContestProgressTimeline({
  status,
  startsAt,
  lockAt,
  endsAt,
}: {
  status: ContestStatus;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
}) {
  const phase = toUserPhase(status);
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === phase));
  return (
    <section className="contest-timeline-shell" aria-label="Battle lifecycle timeline">
      {steps.map((step, index) => {
        const date =
          step.key === "OPEN"
            ? startsAt
            : step.key === "TEAM_LOCK"
              ? lockAt
              : endsAt;

        return (
          <article className={`contest-timeline-v2-step${index <= activeIndex ? " active" : ""}`} key={step.key}>
            <span aria-hidden>{step.icon}</span>
            <div>
              <p>{step.label}</p>
              <small>{step.hint}</small>
              <small>{formatDate(date)}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
