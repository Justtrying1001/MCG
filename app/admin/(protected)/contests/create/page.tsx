"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";

import { WizardStepper } from "./_components/WizardStepper";
import {
  ContestEntryRulesStep,
  ContestIdentityStep,
  ContestReviewStep,
  ContestRewardsStep,
  ContestScheduleStep,
} from "./_components/WizardSteps";
import { useContestWizard, WIZARD_STEPS } from "./_hooks/useContestWizard";

export default function AdminContestBuilderPage() {
  const params = useSearchParams();
  const router = useRouter();
  const {
    stepIndex,
    setStepIndex,
    cardSets,
    form,
    setField,
    payload,
    computedDurationHours,
    generatedPreview,
    allIssues,
    issuesByStep,
    currentStepIssues,
    checklist,
    message,
    setMessage,
    publishSuccess,
    rewardCapacityCheck,
    uploadBusy,
    saveDraft,
    publishContest,
    uploadCoverImage,
  } = useContestWizard(params.get("contestId") ?? "");

  const goNext = () => {
    if (currentStepIssues.length > 0) {
      setMessage("Please resolve the issues in this step before continuing.");
      return;
    }
    setMessage("");
    setStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => {
    setMessage("");
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const save = async () => {
    await saveDraft();
  };

  const publish = async () => {
    const ok = await publishContest();
    if (!ok) return;
    window.setTimeout(() => {
      router.push("/admin/contests?published=1");
    }, 1200);
  };


  const goToStepById = (target: (typeof WIZARD_STEPS)[number]["id"]) => {
    const index = WIZARD_STEPS.findIndex((step) => step.id === target);
    if (index < 0) return;
    setMessage("");
    setStepIndex(index);
  };

  const issueCountByStep = {
    identity: issuesByStep.identity.length,
    schedule: issuesByStep.schedule.length,
    "entry-rules": issuesByStep["entry-rules"].length,
    rewards: issuesByStep.rewards.length,
    review: issuesByStep.review.length,
  };

  return (
    <div className="admin-v2-page contest-builder-v2-page">
      <section className="contest-builder-v2-header">
        <div>
          <p className="contest-builder-v2-eyebrow">Contest Builder</p>
          <h1 className="admin-title">{params.get("contestId") ? "Edit contest" : "Create contest"}</h1>
          <p className="admin-subtitle">Structured creation flow with step-by-step validation and review.</p>
        </div>
        <Link href="/admin/contests" className="admin-v2-link-chip">← Back to Contest Library</Link>
      </section>

      <WizardStepper
        steps={WIZARD_STEPS}
        activeIndex={stepIndex}
        onStepClick={setStepIndex}
        issueCountByStep={issueCountByStep}
      />

      {publishSuccess ? <div className="admin-callout success"><p className="contest-inline-note"><strong>Contest published successfully.</strong> Redirecting to Contest Library…</p></div> : null}

      {stepIndex === 0 ? <ContestIdentityStep form={form} setField={setField} uploadBusy={uploadBusy} uploadCoverImage={uploadCoverImage} /> : null}
      {stepIndex === 1 ? <ContestScheduleStep form={form} setField={setField} computedDurationHours={computedDurationHours} /> : null}
      {stepIndex === 2 ? <ContestEntryRulesStep form={form} cardSets={cardSets} setField={setField} /> : null}
      {stepIndex === 3 ? <ContestRewardsStep form={form} setField={setField} generatedPreview={generatedPreview} rewardIssues={issuesByStep.rewards} rewardCapacityCheck={rewardCapacityCheck} /> : null}
      {stepIndex === 4 ? <ContestReviewStep payload={payload} checklist={checklist} allIssues={allIssues} issuesByStep={issuesByStep} rewardCapacityCheck={rewardCapacityCheck} onGoToStep={goToStepById} /> : null}

      <section className="admin-panel" style={{ display: "grid", gap: "0.8rem" }}>
        {currentStepIssues.length > 0 ? (
          <div className="admin-callout danger">
            <p className="contest-inline-note"><strong>Issues in this step</strong></p>
            {currentStepIssues.map((issue) => <p className="contest-inline-note" key={issue}>• {issue}</p>)}
          </div>
        ) : null}
        <div className="contest-builder-v2-actions" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}>Back</Button>
          <Button variant="ghost" onClick={() => void save()}>Save draft</Button>
          {stepIndex < WIZARD_STEPS.length - 1 ? <Button onClick={goNext}>Next step</Button> : <Button onClick={() => void publish()} disabled={publishSuccess || allIssues.length > 0}>Publish contest</Button>}
        </div>
        {message ? <p className="contest-inline-note">{message}</p> : null}
      </section>
    </div>
  );
}
