"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

type QuestType = "WELCOME" | "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | "CONTEST_COUNT_MILESTONE" | "MANUAL";
type QuestValidationMode = "AUTO" | "SUBMIT" | "MANUAL_REVIEW";

type AdminQuest = {
  id: string;
  code: string;
  type: QuestType;
  title: string;
  description: string | null;
  rewardPoints: number;
  validationMode: QuestValidationMode;
  oneTime: boolean;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  config: unknown;
  createdAt: string;
  updatedAt: string;
  analytics: {
    progressCount: number;
    completedCount: number;
    pendingSubmissionCount: number;
    approvedSubmissionCount: number;
    rejectedSubmissionCount: number;
    totalPointsDistributed: number;
  };
};

const TYPE_OPTIONS: QuestType[] = [
  "WELCOME",
  "CONTEST_COUNT_MILESTONE",
  "SOCIAL_FOLLOW_X",
  "SOCIAL_ENGAGEMENT_X",
  "MANUAL",
];

const VALIDATION_OPTIONS: QuestValidationMode[] = [
  "AUTO",
  "SUBMIT",
  "MANUAL_REVIEW",
];

function parseThreshold(config: unknown): number | "" {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const threshold = (config as Record<string, unknown>).threshold;
  return Number.isInteger(threshold) && Number(threshold) > 0 ? Number(threshold) : "";
}

function parseSocialConfig(config: unknown): { proofRequired: boolean; targetUrl: string; instructions: string } {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { proofRequired: false, targetUrl: "", instructions: "" };
  }

  const root = config as Record<string, unknown>;
  return {
    proofRequired: Boolean(root.proofRequired),
    targetUrl: typeof root.targetUrl === "string" ? root.targetUrl : "",
    instructions: typeof root.instructions === "string" ? root.instructions : "",
  };
}

function isSocialType(type: QuestType) {
  return type === "SOCIAL_FOLLOW_X" || type === "SOCIAL_ENGAGEMENT_X";
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<QuestType>("CONTEST_COUNT_MILESTONE");
  const [validationMode, setValidationMode] = useState<QuestValidationMode>("AUTO");
  const [rewardPoints, setRewardPoints] = useState("500");
  const [threshold, setThreshold] = useState("2");
  const [proofRequired, setProofRequired] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [oneTime, setOneTime] = useState(true);
  const [createMessage, setCreateMessage] = useState("");

  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editingRewardPoints, setEditingRewardPoints] = useState("");
  const [editingThreshold, setEditingThreshold] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingProofRequired, setEditingProofRequired] = useState(false);
  const [editingTargetUrl, setEditingTargetUrl] = useState("");
  const [editingInstructions, setEditingInstructions] = useState("");

  const loadQuests = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/internal/quests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load quests");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { quests: AdminQuest[] };
    setQuests(payload.quests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadQuests();
  }, []);

  const buildCreateConfig = () => {
    if (type === "CONTEST_COUNT_MILESTONE") {
      const parsedThreshold = Number(threshold);
      if (!Number.isInteger(parsedThreshold) || parsedThreshold <= 0) {
        throw new Error("CONTEST_COUNT_MILESTONE requires a positive threshold.");
      }
      return { threshold: parsedThreshold };
    }

    if (isSocialType(type)) {
      return {
        proofRequired,
        targetUrl: targetUrl.trim() || null,
        instructions: instructions.trim() || null,
      };
    }

    return undefined;
  };

  const createQuest = async () => {
    setCreateMessage("");

    const parsedRewardPoints = Number(rewardPoints);
    if (!code.trim() || !title.trim() || !Number.isInteger(parsedRewardPoints) || parsedRewardPoints < 0) {
      setCreateMessage("Provide code/title and valid reward points.");
      return;
    }

    let config: unknown;
    try {
      config = buildCreateConfig();
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Invalid config");
      return;
    }

    const response = await fetch("/api/internal/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        title: title.trim(),
        description: description.trim() || null,
        type,
        validationMode,
        rewardPoints: parsedRewardPoints,
        oneTime,
        isActive,
        config,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setCreateMessage(payload?.error ?? "Quest creation failed");
      return;
    }

    setCode("");
    setTitle("");
    setDescription("");
    setRewardPoints("500");
    setThreshold("2");
    setProofRequired(false);
    setTargetUrl("");
    setInstructions("");
    setCreateMessage("Quest created.");
    await loadQuests();
  };

  const startEditing = (quest: AdminQuest) => {
    const social = parseSocialConfig(quest.config);

    setEditingQuestId(quest.id);
    setEditingRewardPoints(String(quest.rewardPoints));
    setEditingThreshold(String(parseThreshold(quest.config)));
    setEditingTitle(quest.title);
    setEditingDescription(quest.description ?? "");
    setEditingProofRequired(social.proofRequired);
    setEditingTargetUrl(social.targetUrl);
    setEditingInstructions(social.instructions);
  };

  const saveEditing = async (quest: AdminQuest) => {
    const parsedRewardPoints = Number(editingRewardPoints);
    if (!Number.isInteger(parsedRewardPoints) || parsedRewardPoints < 0) {
      return;
    }

    const patchBody: Record<string, unknown> = {
      title: editingTitle,
      description: editingDescription,
      rewardPoints: parsedRewardPoints,
    };

    if (quest.type === "CONTEST_COUNT_MILESTONE") {
      const parsedThreshold = Number(editingThreshold);
      if (!Number.isInteger(parsedThreshold) || parsedThreshold <= 0) {
        return;
      }
      patchBody.config = { threshold: parsedThreshold };
    }

    if (isSocialType(quest.type)) {
      patchBody.config = {
        proofRequired: editingProofRequired,
        targetUrl: editingTargetUrl.trim() || null,
        instructions: editingInstructions.trim() || null,
      };
    }

    const response = await fetch(`/api/internal/quests/${quest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });

    if (!response.ok) {
      return;
    }

    setEditingQuestId(null);
    await loadQuests();
  };

  const toggleActive = async (quest: AdminQuest) => {
    const response = await fetch(`/api/internal/quests/${quest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !quest.isActive }),
    });

    if (response.ok) {
      await loadQuests();
    }
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Quest Admin</h1>
          <p className="page-subtitle">Create and maintain quest definitions for rewards progression.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="contest-section" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/admin" className="contest-inline-note">← Back to admin home</Link>
        <Link href="/admin/quests/submissions" className="contest-inline-note">Open submissions queue →</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
        <h2 className="contest-section-title">Create quest</h2>
        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input className="input" placeholder="code" value={code} onChange={(event) => setCode(event.target.value)} />
          <input className="input" placeholder="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input className="input" placeholder="description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <select className="input" value={type} onChange={(event) => setType(event.target.value as QuestType)}>
            {TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="input" value={validationMode} onChange={(event) => setValidationMode(event.target.value as QuestValidationMode)}>
            {VALIDATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input className="input" type="number" min={0} placeholder="rewardPoints" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} />
          {type === "CONTEST_COUNT_MILESTONE" ? (
            <input className="input" type="number" min={1} placeholder="threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
          ) : null}
          {isSocialType(type) ? (
            <>
              <input className="input" placeholder="targetUrl (optional)" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} />
              <input className="input" placeholder="instructions (optional)" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
            </>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
          <label><input type="checkbox" checked={oneTime} onChange={(event) => setOneTime(event.target.checked)} /> One-time</label>
          {isSocialType(type) ? (
            <label><input type="checkbox" checked={proofRequired} onChange={(event) => setProofRequired(event.target.checked)} /> Proof required</label>
          ) : null}
          <Button onClick={() => void createQuest()}>Create quest</Button>
          {createMessage ? <span className="contest-inline-note">{createMessage}</span> : null}
        </div>
      </section>

      <section className="contest-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
          <h2 className="contest-section-title">Quest definitions</h2>
          <Button variant="ghost" onClick={() => void loadQuests()}>Refresh</Button>
        </div>

        {loading ? <p className="contest-inline-note">Loading quests…</p> : null}
        {error ? <p className="contest-error">{error}</p> : null}

        {!loading ? (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {quests.map((quest) => {
              const isEditing = editingQuestId === quest.id;
              const social = parseSocialConfig(quest.config);

              return (
                <div key={quest.id} className="contest-card">
                  <div className="contest-card-top">
                    <p className="contest-code">{quest.code}</p>
                    <span className={`contest-status ${quest.isActive ? "status-open" : "status-canceled"}`}>{quest.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                  <h3 className="contest-title"><Link href={`/admin/quests/${quest.id}`}>{quest.title}</Link></h3>
                  <p className="contest-inline-note">{quest.type} · {quest.validationMode} · reward {quest.rewardPoints} pts</p>
                  <p className="contest-inline-note">{quest.description || "—"}</p>
                  <p className="contest-inline-note">Threshold: {parseThreshold(quest.config) || "n/a"}</p>
                  <p className="contest-inline-note">
                    Analytics — Progress: {quest.analytics.progressCount} · Completed: {quest.analytics.completedCount} · Pending: {quest.analytics.pendingSubmissionCount} · Approved: {quest.analytics.approvedSubmissionCount} · Rejected: {quest.analytics.rejectedSubmissionCount} · Points distributed: {quest.analytics.totalPointsDistributed}
                  </p>
                  {isSocialType(quest.type) ? (
                    <>
                      <p className="contest-inline-note">Proof required: {social.proofRequired ? "Yes" : "No"}</p>
                      <p className="contest-inline-note">Target URL: {social.targetUrl || "—"}</p>
                      <p className="contest-inline-note">Instructions: {social.instructions || "—"}</p>
                    </>
                  ) : null}

                  {isEditing ? (
                    <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.6rem" }}>
                      <input className="input" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} />
                      <input className="input" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} />
                      <input className="input" type="number" min={0} value={editingRewardPoints} onChange={(event) => setEditingRewardPoints(event.target.value)} />
                      {quest.type === "CONTEST_COUNT_MILESTONE" ? (
                        <input className="input" type="number" min={1} value={editingThreshold} onChange={(event) => setEditingThreshold(event.target.value)} />
                      ) : null}
                      {isSocialType(quest.type) ? (
                        <>
                          <input className="input" placeholder="targetUrl" value={editingTargetUrl} onChange={(event) => setEditingTargetUrl(event.target.value)} />
                          <input className="input" placeholder="instructions" value={editingInstructions} onChange={(event) => setEditingInstructions(event.target.value)} />
                          <label><input type="checkbox" checked={editingProofRequired} onChange={(event) => setEditingProofRequired(event.target.checked)} /> Proof required</label>
                        </>
                      ) : null}
                      <div style={{ display: "flex", gap: "0.6rem" }}>
                        <Button onClick={() => void saveEditing(quest)}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingQuestId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem" }}>
                      <Link href={`/admin/quests/${quest.id}`}><Button variant="ghost">Open detail</Button></Link>
                      <Button variant="ghost" onClick={() => startEditing(quest)}>Edit</Button>
                      <Button variant="ghost" onClick={() => void toggleActive(quest)}>{quest.isActive ? "Deactivate" : "Activate"}</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
