import type { ContestWizardStep } from "../_hooks/types";

type Props = {
  steps: ContestWizardStep[];
  activeIndex: number;
  onStepClick: (index: number) => void;
  issueCountByStep: Record<string, number>;
};

export function WizardStepper({ steps, activeIndex, onStepClick, issueCountByStep }: Props) {
  return (
    <nav className="contest-builder-v2-stepper" aria-label="Contest builder steps">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const issueCount = issueCountByStep[step.id] ?? 0;
        const hasIssue = issueCount > 0;
        const isCompleted = index < activeIndex && !hasIssue;

        return (
          <button
            key={step.id}
            type="button"
            className={`contest-builder-v2-step-pill${isActive ? " is-active" : ""}${hasIssue ? " has-issue" : ""}${isCompleted ? " is-complete" : ""}`}
            onClick={() => onStepClick(index)}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${step.title}${hasIssue ? ` (${issueCount} issue${issueCount > 1 ? "s" : ""})` : ""}`}
          >
            <span>{index + 1}. {step.title}</span>
            {hasIssue ? <span className="contest-builder-v2-step-pill-badge">{issueCount}</span> : isCompleted ? <span className="contest-builder-v2-step-pill-badge ok">✓</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
