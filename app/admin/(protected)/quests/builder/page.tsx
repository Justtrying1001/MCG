"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";

type ObjectiveType = "FOLLOW_X" | "SOCIAL_ENGAGEMENT" | "CONTEST_MILESTONE";
type SocialAction = "LIKE" | "RETWEET" | "COMMENT";

export default function QuestBuilderPage() {
  const searchParams = useSearchParams();
  const questId = searchParams.get("questId");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>("FOLLOW_X");
  const [socialAction, setSocialAction] = useState<SocialAction>("LIKE");
  const [targetUrl, setTargetUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [proofRequired, setProofRequired] = useState(true);
  const [rewardPoints, setRewardPoints] = useState("100");
  const [milestoneThreshold, setMilestoneThreshold] = useState("3");
  const [validationMode, setValidationMode] = useState<"AUTO" | "SUBMIT" | "MANUAL_REVIEW">("MANUAL_REVIEW");
  const [isActive, setIsActive] = useState(true);
  const [oneTime, setOneTime] = useState(true);

  const [issues, setIssues] = useState<Array<{ field: string; severity: "ERROR" | "WARN"; message: string }>>([]);
  const [preview, setPreview] = useState<{ title: string; description: string; objective: string; rewardCopy: string; proofCopy: string } | null>(null);
  const [normalizedPayload, setNormalizedPayload] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!questId) return;
    const load = async () => {
      const response = await fetch(`/api/internal/quests/${questId}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const quest = payload.quest;
      setCode(quest.code ?? "");
      setTitle(quest.title ?? "");
      setDescription(quest.description ?? "");
      setRewardPoints(String(quest.rewardPoints ?? 0));
      setValidationMode(quest.validationMode);
      setIsActive(Boolean(quest.isActive));
      setOneTime(Boolean(quest.oneTime));

      if (quest.type === "SOCIAL_FOLLOW_X") setObjectiveType("FOLLOW_X");
      if (quest.type === "SOCIAL_ENGAGEMENT_X") setObjectiveType("SOCIAL_ENGAGEMENT");
      if (quest.type === "CONTEST_COUNT_MILESTONE") setObjectiveType("CONTEST_MILESTONE");

      const config = (quest.config ?? {}) as Record<string, unknown>;
      if (typeof config.targetUrl === "string") setTargetUrl(config.targetUrl);
      if (typeof config.instructions === "string") setInstructions(config.instructions);
      if (typeof config.proofRequired === "boolean") setProofRequired(config.proofRequired);
      if (typeof config.threshold === "number") setMilestoneThreshold(String(config.threshold));
      if (typeof config.socialAction === "string") setSocialAction(config.socialAction as SocialAction);
    };
    void load();
  }, [questId]);

  const builderInput = useMemo(() => ({
    code,
    title,
    description,
    objectiveType,
    socialAction,
    targetUrl,
    instructions,
    proofRequired,
    rewardPoints: Number(rewardPoints),
    milestoneThreshold: Number(milestoneThreshold),
    validationMode,
    isActive,
    oneTime,
  }), [code, title, description, objectiveType, socialAction, targetUrl, instructions, proofRequired, rewardPoints, milestoneThreshold, validationMode, isActive, oneTime]);

  const runValidate = async () => {
    const response = await fetch("/api/internal/quests/builder/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(builderInput),
    });

    const payload = await response.json().catch(() => null) as { issues?: Array<{ field: string; severity: "ERROR" | "WARN"; message: string }>; preview?: any; normalizedPayload?: any; error?: string; blocking?: boolean } | null;
    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Builder validation failed");
      return;
    }

    setIssues(payload.issues ?? []);
    setPreview(payload.preview ?? null);
    setNormalizedPayload(payload.normalizedPayload ?? null);
    setMessage(payload.blocking ? "Validation blocked." : "Validation passed.");
  };

  const saveQuest = async () => {
    if (!normalizedPayload) {
      setMessage("Validate first.");
      return;
    }

    const response = await fetch(questId ? `/api/internal/quests/${questId}` : "/api/internal/quests", {
      method: questId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedPayload),
    });

    const payload = await response.json().catch(() => null) as { error?: string; quest?: { id: string } } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Cannot save quest");
      return;
    }

    setMessage(questId ? "Quest updated." : "Quest created.");
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href="/admin/quests" className="contest-inline-note">← Back to quest library</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 className="page-title">Quest Builder</h1>
        <p className="page-subtitle">Guided flow for Follow X, Like/RT/Comment, and Contest milestone quests.</p>

        <h3 className="contest-section-title">1) Identity</h3>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="input" placeholder="code" value={code} onChange={(event) => setCode(event.target.value)} />
          <input className="input" placeholder="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input className="input" placeholder="description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <h3 className="contest-section-title">2) Objective</h3>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <select className="input" value={objectiveType} onChange={(event) => setObjectiveType(event.target.value as ObjectiveType)}>
            <option value="FOLLOW_X">Follow X</option>
            <option value="SOCIAL_ENGAGEMENT">Like / RT / Comment</option>
            <option value="CONTEST_MILESTONE">Contest milestone</option>
          </select>
          {objectiveType === "SOCIAL_ENGAGEMENT" ? (
            <select className="input" value={socialAction} onChange={(event) => setSocialAction(event.target.value as SocialAction)}>
              <option value="LIKE">LIKE</option>
              <option value="RETWEET">RETWEET</option>
              <option value="COMMENT">COMMENT</option>
            </select>
          ) : null}
          {objectiveType === "CONTEST_MILESTONE" ? (
            <input className="input" type="number" min={1} placeholder="milestone threshold" value={milestoneThreshold} onChange={(event) => setMilestoneThreshold(event.target.value)} />
          ) : null}
          {objectiveType !== "CONTEST_MILESTONE" ? (
            <>
              <input className="input" placeholder="target URL" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} />
              <input className="input" placeholder="instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
              <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}><input type="checkbox" checked={proofRequired} onChange={(event) => setProofRequired(event.target.checked)} /> proof required</label>
            </>
          ) : null}
        </div>

        <h3 className="contest-section-title">3) Reward & policy</h3>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="input" type="number" min={0} placeholder="reward points" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} />
          <select className="input" value={validationMode} onChange={(event) => setValidationMode(event.target.value as any)}>
            <option value="AUTO">AUTO</option>
            <option value="SUBMIT">SUBMIT</option>
            <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
          </select>
          <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> active</label>
          <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}><input type="checkbox" checked={oneTime} onChange={(event) => setOneTime(event.target.checked)} /> one-time</label>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button onClick={() => void runValidate()}>Validate + Preview</Button>
          <Button onClick={() => void saveQuest()} disabled={!normalizedPayload}>{questId ? "Save quest" : "Create quest"}</Button>
        </div>

        {message ? <p className="contest-inline-note">{message}</p> : null}
        {issues.map((issue, index) => (
          <p key={`${issue.field}-${index}`} className={issue.severity === "ERROR" ? "contest-error" : "contest-inline-note"}>{issue.field}: {issue.message}</p>
        ))}

        {preview ? (
          <section className="contest-section" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h3 className="contest-section-title">User-facing preview</h3>
            <p className="contest-inline-note">{preview.title}</p>
            <p className="contest-inline-note">{preview.description}</p>
            <p className="contest-inline-note">{preview.objective}</p>
            <p className="contest-inline-note">{preview.rewardCopy}</p>
            <p className="contest-inline-note">{preview.proofCopy}</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
