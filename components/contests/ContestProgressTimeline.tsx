import type { ContestStatus } from "@/components/contests/types";

const steps: ContestStatus[] = ["OPEN", "LOCKED", "LIVE", "SETTLED"];

export function ContestProgressTimeline({ status }: { status: ContestStatus }) {
  const activeIndex = Math.max(0, steps.indexOf(status));
  return (
    <div className="contest-timeline-v2" aria-label="Contest lifecycle timeline">
      {steps.map((step, index) => (
        <div className={`contest-timeline-v2-step${index <= activeIndex ? " active" : ""}`} key={step}>
          <span>{index + 1}</span>
          <p>{step}</p>
        </div>
      ))}
    </div>
  );
}
