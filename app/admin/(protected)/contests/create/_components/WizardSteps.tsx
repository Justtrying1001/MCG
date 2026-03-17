import type { CardSet, ContestFormState, RewardCapacityCheck } from "../_hooks/types";

export function ContestIdentityStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  uploadBusy: boolean;
  uploadCoverImage: (file: File | null) => Promise<void>;
}) {
  const { form, setField, uploadBusy, uploadCoverImage } = props;
  return (
    <section className="admin-panel contest-builder-v2-section">
      <header>
        <h2 className="admin-section-title">Step 1 — Identity / Contest Info</h2>
        <p className="contest-inline-note">Define the contest naming and admin-facing presentation before configuring schedule and gameplay constraints.</p>
      </header>

      <article className="admin-callout" style={{ display: "grid", gap: "0.8rem" }}>
        <p className="contest-inline-note"><strong>Contest identity</strong></p>
        <p className="contest-inline-note">These fields are mandatory and used across admin surfaces and user-facing contest cards.</p>
        <div className="admin-field-grid">
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="contest-inline-note"><strong>Contest name</strong></span>
            <input className="input" placeholder="e.g. Weekly Genesis Clash" value={form.title} onChange={(e) => setField("title", e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="contest-inline-note"><strong>Contest code</strong></span>
            <input className="input" placeholder="e.g. WEEKLY-GENESIS-01" value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase().replace(/\s+/g, "-"))} />
          </label>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.8rem" }}>
        <p className="contest-inline-note"><strong>Optional admin/context fields</strong></p>
        <p className="contest-inline-note">Use these to improve admin discoverability and card presentation quality.</p>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span className="contest-inline-note"><strong>Short description</strong></span>
          <textarea className="input" placeholder="One or two lines that explain the contest positioning." value={form.description} onChange={(e) => setField("description", e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span className="contest-inline-note"><strong>Cover image (optional)</strong></span>
          <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploadBusy} onChange={(e) => void uploadCoverImage(e.target.files?.[0] ?? null)} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span className="contest-inline-note"><strong>Cover image URL</strong></span>
          <input className="input" placeholder="https://..." value={form.coverImageUrl} onChange={(e) => setField("coverImageUrl", e.target.value)} />
        </label>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.35rem" }}>
        <p className="contest-inline-note"><strong>Guidance</strong></p>
        <p className="contest-inline-note">• Keep names concise and unique.</p>
        <p className="contest-inline-note">• Use uppercase code format with dashes (example: WEEKLY-GENESIS-01).</p>
        <p className="contest-inline-note">• Schedule, entry rules, and rewards are configured in the next steps.</p>
      </article>
    </section>
  );
}

export function ContestScheduleStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  computedDurationHours: number | null;
}) {
  const { form, setField, computedDurationHours } = props;
  const timelineHasIssue =
    Boolean(form.openAt && form.lockAt && form.openAt > form.lockAt)
    || Boolean(form.lockAt && form.startsAt && form.lockAt > form.startsAt)
    || Boolean(form.startsAt && form.endsAt && form.startsAt >= form.endsAt);

  return (
    <section className="admin-panel contest-builder-v2-section">
      <header>
        <h2 className="admin-section-title">Step 2 — Schedule</h2>
        <p className="contest-inline-note">Configure the lifecycle in chronological order: registration opens, lineups lock, contest goes live, then contest ends.</p>
      </header>
      <article className="admin-callout" style={{ display: "grid", gap: "0.7rem" }}>
        <p className="contest-inline-note"><strong>A. Registration window</strong></p>
        <p className="contest-inline-note">Defines when users can start entering and editing lineups.</p>
        <div className="contest-builder-v2-schedule-grid">
          <article className="contest-builder-v2-schedule-card">
            <p className="contest-builder-v2-schedule-title">1. Registration opens</p>
            <label className="contest-inline-note" htmlFor="schedule-open-at">Open at</label>
            <input id="schedule-open-at" className="input" type="datetime-local" value={form.openAt} onChange={(e) => setField("openAt", e.target.value)} />
          </article>
          <article className="contest-builder-v2-schedule-card">
            <p className="contest-builder-v2-schedule-title">2. Lineup lock</p>
            <label className="contest-inline-note" htmlFor="schedule-lock-at">Lock at</label>
            <input id="schedule-lock-at" className="input" type="datetime-local" min={form.openAt || undefined} value={form.lockAt} onChange={(e) => setField("lockAt", e.target.value)} />
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.7rem" }}>
        <p className="contest-inline-note"><strong>B. Contest runtime</strong></p>
        <p className="contest-inline-note">Defines when scoring starts and when the contest officially stops accepting game events.</p>
        <div className="contest-builder-v2-schedule-grid">
          <article className="contest-builder-v2-schedule-card">
            <p className="contest-builder-v2-schedule-title">3. Contest goes live</p>
            <label className="contest-inline-note" htmlFor="schedule-live-at">Live at</label>
            <input id="schedule-live-at" className="input" type="datetime-local" min={form.lockAt || form.openAt || undefined} value={form.startsAt} onChange={(e) => setField("startsAt", e.target.value)} />
          </article>
          <article className="contest-builder-v2-schedule-card is-result">
            <p className="contest-builder-v2-schedule-title">4. Contest ends</p>
            <label className="contest-inline-note" htmlFor="schedule-ends-at">Ends at</label>
            <input id="schedule-ends-at" className="input" type="datetime-local" min={form.startsAt || undefined} value={form.endsAt} onChange={(e) => setField("endsAt", e.target.value)} />
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.35rem" }}>
        <p className="contest-inline-note"><strong>Timeline guidance</strong></p>
        <p className="contest-inline-note">Registration opens → Lineup locks → Contest goes live → Contest ends / settles after end.</p>
        <p className="contest-inline-note">Computed runtime duration (live → end): {computedDurationHours !== null ? `${computedDurationHours}h` : "—"}</p>
        {timelineHasIssue ? <p className="contest-error">Timeline is inconsistent. Keep chronological order: open ≤ lock ≤ live &lt; end.</p> : null}
      </article>
    </section>
  );
}

export function ContestEntryRulesStep(props: {
  form: ContestFormState;
  cardSets: CardSet[];
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
}) {
  const { form, cardSets, setField } = props;
  return (
    <section className="admin-panel contest-builder-v2-section">
      <header><h2 className="admin-section-title">Step 3 — Entry & Rules</h2></header>
      <div className="contest-builder-v2-entry-grid">
        <article className="contest-builder-v2-entry-card">
          <p className="contest-builder-v2-schedule-title">Entry fee</p>
          <label className="contest-inline-note"><input type="checkbox" checked={form.entryFeeEnabled} onChange={(e) => setField("entryFeeEnabled", e.target.checked)} /> Enable entry fee</label>
          <input className="input" type="number" min={1} disabled={!form.entryFeeEnabled} value={form.entryFeeAmount} onChange={(e) => setField("entryFeeAmount", e.target.value)} />
        </article>
        <article className="contest-builder-v2-entry-card">
          <p className="contest-builder-v2-schedule-title">Roster size</p>
          <select className="input" value={form.maxRosterSize} onChange={(e) => setField("maxRosterSize", e.target.value)}>
            <option value="3">3 cards</option><option value="5">5 cards</option><option value="7">7 cards</option>
          </select>
        </article>
        <article className="contest-builder-v2-entry-card">
          <p className="contest-builder-v2-schedule-title">Eligibility</p>
          <select className="input" value={form.eligibilityMode} onChange={(e) => setField("eligibilityMode", e.target.value as ContestFormState["eligibilityMode"])}>
            <option value="ANY">Any eligible card</option><option value="CARD_SET_ONLY">Specific card set only</option>
          </select>
          {form.eligibilityMode === "CARD_SET_ONLY" ? (
            <select className="input" value={form.cardSetId} onChange={(e) => setField("cardSetId", e.target.value)}>
              <option value="">Select card set</option>
              {cardSets.map((set) => <option key={set.id} value={set.id}>{set.displayName} ({set.code})</option>)}
            </select>
          ) : null}
        </article>
      </div>
      <textarea className="input" placeholder="Rules shown to players" value={form.rulesText} onChange={(e) => setField("rulesText", e.target.value)} />
      <textarea className="input" placeholder="Participation notes" value={form.participationNotes} onChange={(e) => setField("participationNotes", e.target.value)} />
      <textarea className="input" placeholder="Optional clarifications" value={form.optionalClarifications} onChange={(e) => setField("optionalClarifications", e.target.value)} />
    </section>
  );
}

export function ContestRewardsStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  generatedPreview: { participantsCount: number; rows: Array<{ rank: number; pointsReward: number; packsReward: number }>; totalPoints: number; totalPacks: number };
}) {
  const { form, setField, generatedPreview } = props;
  return (
    <section className="admin-panel contest-builder-v2-section">
      <header><h2 className="admin-section-title">Step 4 — Rewards</h2></header>
      <div className="contest-builder-v2-entry-grid">
        <article className="contest-builder-v2-entry-card"><p className="contest-builder-v2-schedule-title">Points pool</p><input className="input" type="number" min={0} value={form.pointsPoolAmount} onChange={(e) => setField("pointsPoolAmount", e.target.value)} /></article>
        <article className="contest-builder-v2-entry-card"><p className="contest-builder-v2-schedule-title">Pack pool</p><input className="input" type="number" min={0} value={form.packPoolAmount} onChange={(e) => setField("packPoolAmount", e.target.value)} /></article>
        <article className="contest-builder-v2-entry-card"><p className="contest-builder-v2-schedule-title">Rewarded top %</p><input className="input" type="number" min={1} max={100} value={form.rewardedTopPercent} onChange={(e) => setField("rewardedTopPercent", e.target.value)} /><select className="input" value={form.distributionProfile} onChange={(e) => setField("distributionProfile", e.target.value as ContestFormState["distributionProfile"])}><option value="balanced">Balanced</option><option value="top-heavy">Top-heavy</option><option value="very-top-heavy">Very top-heavy</option></select></article>
      </div>
      <article className="admin-callout">
        <p className="contest-inline-note"><strong>Distribution preview field size</strong></p>
        <input className="input" type="number" min={0} value={form.previewParticipants} onChange={(e) => setField("previewParticipants", e.target.value)} />
        <p className="contest-inline-note">Participants: {generatedPreview.participantsCount} · Winners: {generatedPreview.rows.length}</p>
        <p className="contest-inline-note">Total points: {generatedPreview.totalPoints.toLocaleString()} · Total packs: {generatedPreview.totalPacks.toLocaleString()}</p>
      </article>
    </section>
  );
}

export function ContestReviewStep(props: {
  payload: any;
  checklist: Array<{ label: string; done: boolean }>;
  allIssues: string[];
  rewardCapacityCheck: RewardCapacityCheck | null;
}) {
  const { payload, checklist, allIssues, rewardCapacityCheck } = props;
  return (
    <section className="admin-panel contest-builder-v2-section contest-builder-v2-review">
      <header><h2 className="admin-section-title">Step 5 — Review</h2></header>
      <div className="admin-callout">
        <p className="contest-inline-note"><strong>Name:</strong> {payload.title || "—"}</p>
        <p className="contest-inline-note"><strong>Schedule:</strong> Open {payload.openAt || "—"} · Lock {payload.lockAt || "—"} · Live {payload.liveAt || "—"} · End {payload.endsAt || "—"}</p>
        <p className="contest-inline-note"><strong>Entry:</strong> Team size {payload.maxRosterSize} · Entry fee {payload.entryFeeEnabled ? `${payload.entryFeeAmount ?? 0} POINTS` : "Disabled"}</p>
      </div>
      <div className="admin-callout">
        {checklist.map((item) => <p key={item.label} className="contest-inline-note">{item.done ? "✓" : "•"} {item.label}</p>)}
        {allIssues.length ? allIssues.map((issue) => <p key={issue} className="contest-error">• {issue}</p>) : <p className="contest-inline-note">No blocking issue detected.</p>}
      </div>
      {rewardCapacityCheck ? <div className="admin-callout"><p className="contest-inline-note"><strong>Reward capacity:</strong> {rewardCapacityCheck.verdict}</p></div> : null}
    </section>
  );
}
