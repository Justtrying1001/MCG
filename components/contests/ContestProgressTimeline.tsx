import type { ContestStatus } from "@/components/contests/types";
import { toUserPhase } from "@/components/contests/contestLifecycle";

const steps = [
  { key: "OPEN", label: "Open", hint: "Build and edit lineup freely" },
  { key: "TEAM_LOCK", label: "Team Lock", hint: "Lineups freeze / contest starts" },
  { key: "LIVE", label: "Live", hint: "Performance race in progress" },
  { key: "END", label: "End / Computing", hint: "Scoring snapshots & compute" },
  { key: "RESULT", label: "Result", hint: "Final ranks and rewards" },
] as const;

export function ContestProgressTimeline({ status }: { status: ContestStatus }) {
  const phase = toUserPhase(status);
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === phase));
  return (
    <section className="contest-timeline-shell" aria-label="Contest lifecycle timeline">
      {steps.map((step, index) => (
        <article className={`contest-timeline-v2-step${index <= activeIndex ? " active" : ""}`} key={step.key}>
          <span>{index + 1}</span>
          <div>
            <p>{step.label}</p>
            <small>{step.hint}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
