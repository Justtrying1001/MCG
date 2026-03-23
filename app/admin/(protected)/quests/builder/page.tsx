"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildQuestCodeBase } from "@/lib/admin/quest-code";
import { QUEST_PRESETS, type QuestPreset } from "@/lib/admin/quest-presets";
import { useRouter, useSearchParams } from "next/navigation";

import { QuestLivePreviewCard } from "@/components/quests/QuestLivePreviewCard";
import { Button } from "@/components/ui/Button";
import type {
  BuilderObjectiveType,
  MilestoneType,
  SocialAction,
} from "@/lib/domain/quests/social";

type RewardType = "points" | "pack" | "both";

type PreviewPayload = {
  title: string;
  description: string;
  objective: string;
  rewardCopy: string;
  proofCopy: string;
  ctaCopy: string;
};

type ValidatePayload = {
  issues?: Array<{
    field: string;
    severity: "ERROR" | "WARN";
    message: string;
  }>;
  preview?: PreviewPayload | null;
  normalizedPayload?: Record<string, unknown> | null;
  error?: string;
  blocking?: boolean;
};

export default function QuestBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = searchParams.get("questId");
  const initialObjectiveType = searchParams.get("objectiveType");
  const isEditMode = Boolean(questId);

  const [code, setCode] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<
    QuestPreset["id"] | ""
  >("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectiveType, setObjectiveType] = useState<BuilderObjectiveType>(
    initialObjectiveType === "MILESTONE" ||
      initialObjectiveType === "SOCIAL_ENGAGEMENT" ||
      initialObjectiveType === "FOLLOW_X"
      ? initialObjectiveType
      : "FOLLOW_X",
  );
  const [socialAction, setSocialAction] = useState<SocialAction>("LIKE");
  const [milestoneType, setMilestoneType] =
    useState<MilestoneType>("CONTESTS_JOINED");
  const [targetValue, setTargetValue] = useState("3");
  const [targetUrl, setTargetUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [proofRequired, setProofRequired] = useState(true);
  const [rewardType, setRewardType] = useState<RewardType>("points");
  const [rewardPoints, setRewardPoints] = useState("100");
  const [rewardPackDefinitionId, setRewardPackDefinitionId] = useState("");
  const [rewardPackQuantity, setRewardPackQuantity] = useState("1");
  const [validationMode, setValidationMode] = useState<
    "AUTO" | "SUBMIT" | "MANUAL_REVIEW"
  >("MANUAL_REVIEW");
  const [isActive, setIsActive] = useState(true);
  const [oneTime, setOneTime] = useState(true);

  const [packDefinitions, setPackDefinitions] = useState<
    Array<{ id: string; code: string; plannedPackCount: number }>
  >([]);

  const [issues, setIssues] = useState<
    Array<{ field: string; severity: "ERROR" | "WARN"; message: string }>
  >([]);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!questId) return;
    const load = async () => {
      setLoading(true);
      setMessage("");
      const response = await fetch(`/api/internal/quests/${questId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(payload?.error ?? "Cannot load quest");
        setLoading(false);
        return;
      }
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
      if (quest.type === "SOCIAL_ENGAGEMENT_X")
        setObjectiveType("SOCIAL_ENGAGEMENT");
      if (quest.type === "CONTEST_COUNT_MILESTONE")
        setObjectiveType("MILESTONE");

      const config = (quest.config ?? {}) as Record<string, unknown>;
      if (typeof config.targetUrl === "string") setTargetUrl(config.targetUrl);
      if (typeof config.ctaLabel === "string") setCtaLabel(config.ctaLabel);
      if (typeof config.proofRequired === "boolean")
        setProofRequired(config.proofRequired);
      if (typeof config.socialAction === "string")
        setSocialAction(config.socialAction as SocialAction);
      if (typeof config.milestoneType === "string")
        setMilestoneType(config.milestoneType as MilestoneType);
      if (typeof config.targetValue === "number")
        setTargetValue(String(config.targetValue));
      if (
        typeof config.threshold === "number" &&
        !(typeof config.targetValue === "number")
      )
        setTargetValue(String(config.threshold));
      const hasPackReward =
        typeof quest.rewardPackDefinitionId === "string" &&
        quest.rewardPackDefinitionId.length > 0;
      const hasPointsReward = Number(quest.rewardPoints ?? 0) > 0;
      if (hasPointsReward && hasPackReward) setRewardType("both");
      else if (hasPackReward) setRewardType("pack");
      else setRewardType("points");

      if (hasPackReward)
        setRewardPackDefinitionId(quest.rewardPackDefinitionId);
      if (typeof quest.rewardPackQuantity === "number")
        setRewardPackQuantity(String(quest.rewardPackQuantity));
      setLoading(false);
    };
    void load();
  }, [questId]);

  useEffect(() => {
    const loadPacks = async () => {
      const response = await fetch("/api/internal/pack-definitions", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        ok: boolean;
        packDefinitions?: Array<{
          id: string;
          code: string;
          plannedPackCount: number;
        }>;
      };
      if (payload.ok && Array.isArray(payload.packDefinitions)) {
        setPackDefinitions(payload.packDefinitions);
      }
    };
    void loadPacks();
  }, []);

  const builderInput = useMemo(() => {
    const includesPointsReward =
      rewardType === "points" || rewardType === "both";
    const includesPackReward = rewardType === "pack" || rewardType === "both";

    return {
      code,
      title,
      description,
      objectiveType,
      socialAction,
      milestoneType,
      targetValue: Number(targetValue),
      targetUrl,
      ctaLabel,
      proofRequired,
      rewardType,
      ...(includesPointsReward ? { rewardPoints: Number(rewardPoints) } : {}),
      ...(includesPackReward
        ? {
            rewardPackDefinitionId: rewardPackDefinitionId || undefined,
            rewardPackQuantity: Number(rewardPackQuantity) || 1,
          }
        : {}),
      validationMode,
      isActive,
      oneTime,
    };
  }, [
    code,
    title,
    description,
    objectiveType,
    socialAction,
    milestoneType,
    targetValue,
    targetUrl,
    ctaLabel,
    proofRequired,
    rewardType,
    rewardPoints,
    rewardPackDefinitionId,
    rewardPackQuantity,
    validationMode,
    isActive,
    oneTime,
  ]);

  useEffect(() => {
    if (isEditMode) return;
    const presetTitle = selectedPresetId
      ? (QUEST_PRESETS.find((preset) => preset.id === selectedPresetId)
          ?.codeSeed ?? "")
      : "";
    const seed = title.trim() || presetTitle;
    setCode(buildQuestCodeBase(seed));
  }, [isEditMode, title, selectedPresetId]);

  const applyPreset = (preset: QuestPreset) => {
    setSelectedPresetId(preset.id);
    setTitle(preset.title);
    setObjectiveType(preset.objectiveType);
    setSocialAction(preset.socialAction);
    setRewardType("points");
    setRewardPoints(String(preset.rewardPoints));
    setValidationMode("AUTO");
    setCtaLabel(preset.ctaLabel);
    setProofRequired(true);
  };

  const saveQuest = async () => {
    setSaving(true);
    setValidating(true);
    setMessage("");

    const validateResponse = await fetch(
      "/api/internal/quests/builder/validate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(builderInput),
      },
    );

    const validatePayload = (await validateResponse
      .json()
      .catch(() => null)) as ValidatePayload | null;
    if (!validateResponse.ok || !validatePayload) {
      setMessage(validatePayload?.error ?? "Builder validation failed");
      setSaving(false);
      setValidating(false);
      return;
    }

    setIssues(validatePayload.issues ?? []);
    setPreview(validatePayload.preview ?? null);

    if (validatePayload.blocking || !validatePayload.normalizedPayload) {
      setMessage("Please fix validation errors before saving.");
      setSaving(false);
      setValidating(false);
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch(
      questId ? `/api/internal/quests/${questId}` : "/api/internal/quests",
      {
        method: questId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatePayload.normalizedPayload),
      },
    );

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      quest?: { id: string };
    } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Cannot save quest");
      setSaving(false);
      return;
    }

    setMessage(
      isEditMode
        ? "Quest updated successfully."
        : "Quest created successfully.",
    );
    setSaving(false);
    setValidating(false);

    if (!isEditMode) {
      router.push("/admin/quests?created=1");
      router.refresh();
      return;
    }
  };

  return (
    <div className="admin-page quest-admin-page">
      <section className="admin-panel">
        <Link href="/admin/quests" className="contest-inline-note">
          ← Back to quest library
        </Link>
      </section>

      <section className="admin-panel quest-builder-shell">
        <header className="quest-builder-header">
          <div>
            <h1 className="admin-title">
              {isEditMode ? "Edit Quest" : "Create Quest"}
            </h1>
            <p className="admin-subtitle">
              {isEditMode
                ? "Update quest setup, rewards, and lifecycle in one place."
                : "Create quests in one pass with automatic validation and a live player preview."}
            </p>
          </div>
          <div className="quest-builder-header-actions">
            <Button
              className="quest-primary-action"
              onClick={() => void saveQuest()}
              disabled={saving || loading || validating}
            >
              {saving || validating
                ? "Saving quest…"
                : isEditMode
                  ? "Save changes"
                  : "Create Quest"}
            </Button>
          </div>
        </header>

        <div className="quest-builder-layout">
          <div className="quest-builder-main">
            {loading ? (
              <p className="contest-inline-note">Loading quest...</p>
            ) : null}

            <section className="quest-form-section">
              <h3 className="contest-section-title">Preset</h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {QUEST_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={
                      selectedPresetId === preset.id ? "primary" : "ghost"
                    }
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="quest-form-section">
              <h3 className="contest-section-title">1. Identity</h3>
              <div className="admin-field-grid">
                <input
                  className="input"
                  placeholder="Code auto-generated"
                  value={code}
                  disabled
                  readOnly
                />
                <input
                  className="input"
                  placeholder="Quest title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <input
                  className="input"
                  placeholder="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </section>

            <section className="quest-form-section">
              <h3 className="contest-section-title">2. Objective</h3>
              <div className="admin-field-grid">
                <select
                  className="input"
                  value={objectiveType}
                  onChange={(event) =>
                    setObjectiveType(event.target.value as BuilderObjectiveType)
                  }
                >
                  <option value="FOLLOW_X">Social · Follow X</option>
                  <option value="SOCIAL_ENGAGEMENT">
                    Social · Like / RT / Comment / Libre
                  </option>
                  <option value="MILESTONE">Milestone / Objective</option>
                </select>

                {objectiveType === "SOCIAL_ENGAGEMENT" ? (
                  <select
                    className="input"
                    value={socialAction}
                    onChange={(event) =>
                      setSocialAction(event.target.value as SocialAction)
                    }
                  >
                    <option value="LIKE">LIKE</option>
                    <option value="RETWEET">RETWEET</option>
                    <option value="COMMENT">COMMENT</option>
                    <option value="CUSTOM">CUSTOM / FREE</option>
                  </select>
                ) : null}

                {objectiveType === "MILESTONE" ? (
                  <>
                    <select
                      className="input"
                      value={milestoneType}
                      onChange={(event) =>
                        setMilestoneType(event.target.value as MilestoneType)
                      }
                    >
                      <option value="CONTESTS_JOINED">Battles joined</option>
                      <option value="PACK_OPEN_COUNT">Packs opened</option>
                      <option value="TOTAL_CARDS_COLLECTED">
                        Total cards collected
                      </option>
                      <option value="UNIQUE_CARDS_COLLECTED">
                        Unique cards collected
                      </option>
                      <option value="CONTESTS_WON">Battles won</option>
                      <option value="CONTESTS_TOP3">Battles top 3</option>
                      <option value="RARE_PLUS_CARDS_OWNED">
                        Rare+ cards owned
                      </option>
                      <option value="EPIC_PLUS_CARDS_OWNED">
                        Epic+ cards owned
                      </option>
                      <option value="LEGENDARY_CARDS_OWNED">
                        Legendary cards owned
                      </option>
                      <option value="REWARDS_CLAIMED">
                        Quest rewards claimed
                      </option>
                      <option value="REWARD_POINTS_EARNED">
                        Reward points earned
                      </option>
                      <option value="ROSTER_SUBMISSIONS_COUNT">
                        Roster submissions
                      </option>
                      <option value="CONTESTS_SETTLED_COUNT">
                        Settled battles
                      </option>
                      <option value="POINTS_BALANCE_REACHED">
                        Points balance reached
                      </option>
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder="Target value"
                      value={targetValue}
                      onChange={(event) => setTargetValue(event.target.value)}
                    />
                  </>
                ) : null}

                {objectiveType !== "MILESTONE" ? (
                  <>
                    <input
                      className="input"
                      placeholder="target_url (https://x.com/username or .../status/123)"
                      value={targetUrl}
                      onChange={(event) => setTargetUrl(event.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="CTA label (optional, ex: Open on X)"
                      value={ctaLabel}
                      onChange={(event) => setCtaLabel(event.target.value)}
                    />
                    <label
                      className="contest-inline-note"
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={proofRequired}
                        onChange={(event) =>
                          setProofRequired(event.target.checked)
                        }
                      />{" "}
                      proof required
                    </label>
                  </>
                ) : null}
              </div>
            </section>

            <section className="quest-form-section">
              <h3 className="contest-section-title">3. Reward & Policy</h3>
              <div className="admin-field-grid">
                <label
                  className="contest-inline-note"
                  style={{ display: "grid", gap: "0.35rem" }}
                >
                  <span>Reward type</span>
                  <select
                    className="input"
                    value={rewardType}
                    onChange={(event) =>
                      setRewardType(event.target.value as RewardType)
                    }
                  >
                    <option value="points">Points</option>
                    <option value="pack">Pack</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                {rewardType === "points" || rewardType === "both" ? (
                  <input
                    className="input"
                    type="number"
                    min={0}
                    placeholder="Reward points"
                    value={rewardPoints}
                    onChange={(event) => setRewardPoints(event.target.value)}
                  />
                ) : null}
                {rewardType === "pack" || rewardType === "both" ? (
                  <>
                    <select
                      className="input"
                      value={rewardPackDefinitionId}
                      onChange={(event) =>
                        setRewardPackDefinitionId(event.target.value)
                      }
                    >
                      <option value="">Reward pack</option>
                      {packDefinitions.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack.code} ({pack.plannedPackCount} supply)
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder="Pack quantity"
                      value={rewardPackQuantity}
                      onChange={(event) =>
                        setRewardPackQuantity(event.target.value)
                      }
                    />
                  </>
                ) : null}
                <select
                  className="input"
                  value={validationMode}
                  onChange={(event) =>
                    setValidationMode(
                      event.target.value as "AUTO" | "SUBMIT" | "MANUAL_REVIEW",
                    )
                  }
                >
                  <option value="AUTO">AUTO</option>
                  <option value="SUBMIT">SUBMIT</option>
                  <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                </select>
                <label
                  className="contest-inline-note"
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                  />{" "}
                  active
                </label>
                <label
                  className="contest-inline-note"
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(event) => setOneTime(event.target.checked)}
                  />{" "}
                  one-time
                </label>
              </div>
            </section>

            {message ? <p className="contest-inline-note">{message}</p> : null}
            {issues.map((issue, index) => (
              <p
                key={`${issue.field}-${index}`}
                className={
                  issue.severity === "ERROR"
                    ? "contest-error"
                    : "contest-inline-note"
                }
              >
                {issue.field}: {issue.message}
              </p>
            ))}

            {preview ? (
              <section
                className="admin-panel"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <h3 className="contest-section-title">Validation snapshot</h3>
                <p className="contest-inline-note">{preview.title}</p>
                <p className="contest-inline-note">{preview.description}</p>
                <p className="contest-inline-note">{preview.objective}</p>
                <p className="contest-inline-note">{preview.rewardCopy}</p>
                <p className="contest-inline-note">{preview.proofCopy}</p>
                <p className="contest-inline-note">{preview.ctaCopy}</p>
              </section>
            ) : null}
          </div>

          <QuestLivePreviewCard
            title={title}
            description={description}
            objectiveType={objectiveType}
            socialAction={
              objectiveType === "SOCIAL_ENGAGEMENT" ? socialAction : undefined
            }
            rewardPoints={
              rewardType === "points" || rewardType === "both"
                ? Number(rewardPoints) || 0
                : 0
            }
            statusLabel={isActive ? "AVAILABLE" : "INACTIVE"}
            targetUrl={targetUrl}
            ctaLabel={ctaLabel}
            milestoneType={
              objectiveType === "MILESTONE" ? milestoneType : undefined
            }
            milestoneTargetValue={
              objectiveType === "MILESTONE"
                ? Number(targetValue) || 0
                : undefined
            }
            progressValue={
              objectiveType === "MILESTONE"
                ? Math.min(Number(targetValue) || 0, 1)
                : 0
            }
          />
        </div>
      </section>
    </div>
  );
}
