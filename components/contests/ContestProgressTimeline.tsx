import type { ContestStatus } from "@/components/contests/types";
import { toUserPhase } from "@/components/contests/contestLifecycle";

const steps = ["OPEN", "TEAM_LOCK", "LIVE", "END", "RESULT"] as const;

export function ContestProgressTimeline({ status }: { status: ContestStatus }) {
  const phase = toUserPhase(status);
  const activeIndex = Math.max(0, steps.indexOf(phase));
  return (
    <div className="contest-timeline-v2" aria-label="Contest lifecycle timeline">
      {steps.map((step, index) => (
        <div className={`contest-timeline-v2-step${index <= activeIndex ? " active" : ""}`} key={step}>
          <span>{index + 1}</span>
          <p>{step === "TEAM_LOCK" ? "Team Lock / Start" : step === "END" ? "End / Computing" : step}</p>
        </div>
      ))}
    </div>
  );
}
