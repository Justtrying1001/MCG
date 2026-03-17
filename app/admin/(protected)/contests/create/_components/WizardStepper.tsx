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
        const hasIssue = (issueCountByStep[step.id] ?? 0) > 0;
        return (
          <button
            key={step.id}
            type="button"
            className="contest-builder-v2-step-pill"
            onClick={() => onStepClick(index)}
            style={{
              borderColor: isActive ? "#c48bff" : hasIssue ? "#ff6b6b" : undefined,
              color: isActive ? "#fff" : undefined,
            }}
          >
            {index + 1}. {step.title}
          </button>
        );
      })}
    </nav>
  );
}
