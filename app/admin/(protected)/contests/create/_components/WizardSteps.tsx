import type { CardSet, ContestFormState, RewardCapacityCheck } from "../_hooks/types";

export function ContestIdentityStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  builtInContestCovers: readonly { label: string; url: string }[];
}) {
  const { form, setField, builtInContestCovers } = props;
  const selectedBuiltInCover = builtInContestCovers.find((cover) => cover.url === form.coverImageUrl)?.url ?? "";
  const coverPreviewUrl = form.coverImageUrl.trim();
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
            <input
              className="input"
              placeholder="Auto-generated from contest name"
              value={form.code}
              readOnly
              disabled
              aria-readonly="true"
            />
            <span className="contest-inline-note">Automatically generated from the contest name.</span>
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
          <span className="contest-inline-note"><strong>Built-in cover image</strong></span>
          <select className="input" value={selectedBuiltInCover} onChange={(e) => setField("coverImageUrl", e.target.value)}>
            <option value="">No built-in cover</option>
            {builtInContestCovers.map((cover) => <option key={cover.url} value={cover.url}>{cover.label} ({cover.url})</option>)}
          </select>
          <span className="contest-inline-note">Select an existing static image from <code>/public</code>. This stores a public path like <code>/Contest.png</code>.</span>
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span className="contest-inline-note"><strong>Custom cover URL</strong></span>
          <input className="input" placeholder="https://..." value={form.coverImageUrl} onChange={(e) => setField("coverImageUrl", e.target.value)} />
          <span className="contest-inline-note">Paste an external URL to override the built-in selection.</span>
        </label>
        {coverPreviewUrl ? (
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <span className="contest-inline-note"><strong>Cover preview</strong></span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreviewUrl} alt="Contest cover preview" style={{ width: "100%", maxWidth: "360px", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "0.6rem" }} />
          </div>
        ) : null}
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.35rem" }}>
        <p className="contest-inline-note"><strong>Guidance</strong></p>
        <p className="contest-inline-note">• Keep names concise and unique.</p>
        <p className="contest-inline-note">• Contest code is auto-generated in uppercase with dashes.</p>
        <p className="contest-inline-note">• Schedule, entry rules, and rewards are configured in the next steps.</p>
      </article>
    </section>
  );
}

export function ContestScheduleStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  computedDurationHours: number | null;
  computedEndAtInput: string;
}) {
  const { form, setField, computedDurationHours, computedEndAtInput } = props;
  const timelineHasIssue =
    Boolean(form.openAt && form.lockAt && form.openAt >= form.lockAt)
    || !Number.isFinite(Number(form.durationValue))
    || Number(form.durationValue) <= 0;

  return (
    <section className="admin-panel contest-builder-v2-section">
      <header>
        <h2 className="admin-section-title">Step 2 — Schedule</h2>
        <p className="contest-inline-note">Configure the lifecycle in chronological order: registration opens, lineups lock (contest starts), then duration defines the end.</p>
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
            <p className="contest-builder-v2-schedule-title">2. Lineup lock / Contest starts</p>
            <label className="contest-inline-note" htmlFor="schedule-lock-at">Lock at / Start at</label>
            <input id="schedule-lock-at" className="input" type="datetime-local" min={form.openAt || undefined} value={form.lockAt} onChange={(e) => setField("lockAt", e.target.value)} />
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.7rem" }}>
        <p className="contest-inline-note"><strong>B. Contest duration</strong></p>
        <p className="contest-inline-note">Contest start is always the lineup lock timestamp. End time is calculated automatically from duration.</p>
        <div className="contest-builder-v2-schedule-grid">
          <article className="contest-builder-v2-schedule-card">
            <p className="contest-builder-v2-schedule-title">3. Contest duration</p>
            <label className="contest-inline-note" htmlFor="schedule-duration-value">Duration</label>
            <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr auto" }}>
              <input id="schedule-duration-value" className="input" type="number" min={1} value={form.durationValue} onChange={(e) => setField("durationValue", e.target.value)} />
              <select className="input" value={form.durationUnit} onChange={(e) => setField("durationUnit", e.target.value as ContestFormState["durationUnit"])}>
                <option value="HOURS">Hours</option>
                <option value="DAYS">Days</option>
              </select>
            </div>
          </article>
          <article className="contest-builder-v2-schedule-card is-result">
            <p className="contest-builder-v2-schedule-title">Calculated end time</p>
            <label className="contest-inline-note" htmlFor="schedule-ends-at-derived">Ends at (auto)</label>
            <input id="schedule-ends-at-derived" className="input" type="datetime-local" value={computedEndAtInput} readOnly disabled aria-readonly="true" />
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.35rem" }}>
        <p className="contest-inline-note"><strong>Timeline guidance</strong></p>
        <p className="contest-inline-note">Registration opens → Lineup lock (contest starts) → Duration elapses → Contest ends / settles after end.</p>
        <p className="contest-inline-note">Computed runtime duration: {computedDurationHours !== null ? `${computedDurationHours}h` : "—"}</p>
        {timelineHasIssue ? <p className="contest-error">Timeline is inconsistent. Keep chronological order: open &lt; lock, and duration &gt; 0.</p> : null}
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
  const selectedCardSet = cardSets.find((set) => set.id === form.cardSetId);

  return (
    <section className="admin-panel contest-builder-v2-section">
      <header>
        <h2 className="admin-section-title">Step 3 — Entry & Rules</h2>
        <p className="contest-inline-note">Define who can enter, what lineup they must submit, and which participation rules players will see.</p>
      </header>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>A. Lineup requirements</strong></p>
        <div className="contest-builder-v2-entry-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Roster size</p>
            <p className="contest-inline-note">Choose how many cards every lineup must include.</p>
            <select className="input" value={form.maxRosterSize} onChange={(e) => setField("maxRosterSize", e.target.value)}>
              <option value="3">3 cards</option><option value="5">5 cards</option><option value="7">7 cards</option>
            </select>
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>B. Entry settings</strong></p>
        <div className="contest-builder-v2-entry-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Entry fee</p>
            <label className="contest-inline-note"><input type="checkbox" checked={form.entryFeeEnabled} onChange={(e) => setField("entryFeeEnabled", e.target.checked)} /> Paid entry (POINTS)</label>
            <input className="input" type="number" min={1} placeholder="e.g. 10" disabled={!form.entryFeeEnabled} value={form.entryFeeAmount} onChange={(e) => setField("entryFeeAmount", e.target.value)} />
            <p className="contest-inline-note">{form.entryFeeEnabled ? "Players pay this amount when submitting an entry." : "Free entry: no points are debited on submit."}</p>
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>C. Eligibility</strong></p>
        <div className="contest-builder-v2-entry-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Eligible cards</p>
            <select className="input" value={form.eligibilityMode} onChange={(e) => setField("eligibilityMode", e.target.value as ContestFormState["eligibilityMode"])}>
              <option value="ANY">Any eligible card in inventory</option>
              <option value="CARD_SET_ONLY">Restrict to one card set</option>
            </select>
            {form.eligibilityMode === "CARD_SET_ONLY" ? (
              <>
                <select className="input" value={form.cardSetId} onChange={(e) => setField("cardSetId", e.target.value)}>
                  <option value="">Select card set</option>
                  {cardSets.map((set) => <option key={set.id} value={set.id}>{set.displayName} ({set.code})</option>)}
                </select>
                <p className="contest-inline-note">{selectedCardSet ? `Only cards from ${selectedCardSet.displayName} are allowed.` : "Select a card set to enforce eligibility."}</p>
              </>
            ) : <p className="contest-inline-note">Players can use any card that passes ownership and duplicate-token checks.</p>}
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>D. Access / participation constraints</strong></p>
        <p className="contest-inline-note">No additional league-tier or access-gate field is currently exposed in create flow. Participation constraints here are driven by entry fee and eligibility mode.</p>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.5rem" }}>
        <p className="contest-inline-note"><strong>E. Player-facing rules copy</strong></p>
        <textarea className="input" placeholder="Rules shown to players" value={form.rulesText} onChange={(e) => setField("rulesText", e.target.value)} />
        <textarea className="input" placeholder="Participation notes" value={form.participationNotes} onChange={(e) => setField("participationNotes", e.target.value)} />
        <textarea className="input" placeholder="Optional clarifications" value={form.optionalClarifications} onChange={(e) => setField("optionalClarifications", e.target.value)} />
        <p className="contest-inline-note">Guidance: keep these notes concise and actionable so players understand entry constraints before submitting.</p>
      </article>
    </section>
  );
}

export function ContestRewardsStep(props: {
  form: ContestFormState;
  setField: <K extends keyof ContestFormState>(field: K, value: ContestFormState[K]) => void;
  generatedPreview: { participantsCount: number; rows: Array<{ rank: number; pointsReward: number; packsReward: number }>; totalPoints: number; totalPacks: number };
  rewardIssues: string[];
  rewardCapacityCheck: RewardCapacityCheck | null;
}) {
  const { form, setField, generatedPreview, rewardIssues, rewardCapacityCheck } = props;
  const pointsPool = Number(form.pointsPoolAmount) || 0;
  const packPool = Number(form.packPoolAmount) || 0;
  const hasPointsRewards = pointsPool > 0;
  const hasPackRewards = packPool > 0;
  const winnersCount = generatedPreview.rows.length;

  return (
    <section className="admin-panel contest-builder-v2-section">
      <header>
        <h2 className="admin-section-title">Step 4 — Rewards</h2>
        <p className="contest-inline-note">Configure reward pools and distribution behavior for winners without changing backend reward policy mechanics.</p>
      </header>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>A. Reward configuration overview</strong></p>
        <p className="contest-inline-note">Reward types enabled: {hasPointsRewards ? "Points" : "No points"} · {hasPackRewards ? "Packs" : "No packs"}.</p>
        <p className="contest-inline-note">Distribution profile: <strong>{form.distributionProfile}</strong> · Rewarded top: <strong>{form.rewardedTopPercent}%</strong>.</p>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>B. Reward bundles / prize pools</strong></p>
        <div className="contest-builder-v2-entry-grid">
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Points pool</p>
            <input className="input" type="number" min={0} value={form.pointsPoolAmount} onChange={(e) => setField("pointsPoolAmount", e.target.value)} />
          </article>
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Pack pool</p>
            <input className="input" type="number" min={0} value={form.packPoolAmount} onChange={(e) => setField("packPoolAmount", e.target.value)} />
          </article>
        </div>
        <p className="contest-inline-note">Advanced bundle composition and custom distribution rules are still handled by the current backend reward policy layer.</p>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.65rem" }}>
        <p className="contest-inline-note"><strong>C. Distribution rules</strong></p>
        <div className="contest-builder-v2-entry-grid">
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Rewarded top %</p>
            <input className="input" type="number" min={1} max={100} value={form.rewardedTopPercent} onChange={(e) => setField("rewardedTopPercent", e.target.value)} />
          </article>
          <article className="contest-builder-v2-entry-card">
            <p className="contest-builder-v2-schedule-title">Distribution profile</p>
            <select className="input" value={form.distributionProfile} onChange={(e) => setField("distributionProfile", e.target.value as ContestFormState["distributionProfile"])}>
              <option value="balanced">Balanced</option>
              <option value="top-heavy">Top-heavy</option>
              <option value="very-top-heavy">Very top-heavy</option>
            </select>
          </article>
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.5rem" }}>
        <p className="contest-inline-note"><strong>D. Capacity / validation signals</strong></p>
        {rewardIssues.length > 0 ? rewardIssues.map((issue) => <p key={issue} className="contest-error">• {issue}</p>) : <p className="contest-inline-note">No frontend blocking issue detected for rewards.</p>}
        {rewardCapacityCheck ? (
          <>
            <p className="contest-inline-note"><strong>Latest backend capacity verdict:</strong> {rewardCapacityCheck.verdict} ({rewardCapacityCheck.isPublishable ? "publishable" : "not publishable"}).</p>
            {rewardCapacityCheck.rows.map((row) => (
              <p key={`${row.packDefinitionId}-${row.packCode ?? "none"}`} className="contest-inline-note">• Pack {row.packCode ?? row.packDefinitionId}: required {row.required}, available {row.available}, shortfall {row.shortfall}, verdict {row.verdict}.</p>
            ))}
          </>
        ) : <p className="contest-inline-note">Backend pack-capacity checks run during publish validation and are shown here once available.</p>}
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.5rem" }}>
        <p className="contest-inline-note"><strong>E. Reward summary preview</strong></p>
        <p className="contest-inline-note"><strong>Preview field size</strong></p>
        <input className="input" type="number" min={0} value={form.previewParticipants} onChange={(e) => setField("previewParticipants", e.target.value)} />
        <p className="contest-inline-note">Participants: {generatedPreview.participantsCount} · Winners: {winnersCount}</p>
        <p className="contest-inline-note">Estimated distributed totals → Points: {generatedPreview.totalPoints.toLocaleString()} · Packs: {generatedPreview.totalPacks.toLocaleString()}</p>
        <p className="contest-inline-note">This preview uses current pools + profile settings and does not override backend policy enforcement.</p>
      </article>
    </section>
  );
}

export function ContestReviewStep(props: {
  payload: any;
  checklist: Array<{ label: string; done: boolean }>;
  allIssues: string[];
  issuesByStep: Record<"identity" | "schedule" | "entry-rules" | "rewards" | "review", string[]>;
  rewardCapacityCheck: RewardCapacityCheck | null;
  scheduleDurationLabel: string;
  onGoToStep: (step: "identity" | "schedule" | "entry-rules" | "rewards") => void;
}) {
  const { payload, checklist, allIssues, issuesByStep, rewardCapacityCheck, scheduleDurationLabel, onGoToStep } = props;
  const localChecksPassed = allIssues.length === 0;
  const backendCapacityKnown = Boolean(rewardCapacityCheck);
  const backendPublishable = rewardCapacityCheck?.isPublishable ?? null;
  const publishReady = localChecksPassed && (backendPublishable !== false);

  const readinessLabel = publishReady
    ? (backendCapacityKnown ? "Ready to publish" : "Ready pending backend validation")
    : "Blocked — fix issues before publish";

  return (
    <section className="admin-panel contest-builder-v2-section contest-builder-v2-review">
      <header>
        <h2 className="admin-section-title">Step 5 — Review</h2>
        <p className="contest-inline-note">Final pre-flight check before save draft or publish.</p>
      </header>

      <article className="admin-callout" style={{ display: "grid", gap: "0.45rem" }}>
        <p className="contest-inline-note"><strong>A. Readiness status</strong></p>
        <p className="contest-inline-note"><strong>Overall:</strong> {readinessLabel}</p>
        <p className="contest-inline-note">Wizard validation: {localChecksPassed ? "passed" : "blocking issues detected"}.</p>
        <p className="contest-inline-note">Backend reward capacity: {backendCapacityKnown ? `${rewardCapacityCheck?.verdict} (${backendPublishable ? "publishable" : "not publishable"})` : "not yet checked (runs on publish validation)"}.</p>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          {checklist.map((item) => <p key={item.label} className="contest-inline-note">{item.done ? "✓" : "•"} {item.label}</p>)}
        </div>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.45rem" }}>
        <p className="contest-inline-note"><strong>B. Section summaries</strong></p>
        <p className="contest-inline-note"><strong>Identity:</strong> Contest name {payload.title || "—"} · Contest code {payload.code || "—"}</p>
        <p className="contest-inline-note"><strong>Schedule:</strong> Open {payload.openAt || "—"} · Start (lock) {payload.lockAt || "—"} · Duration {scheduleDurationLabel} · End {payload.endsAt || "—"}</p>
        <p className="contest-inline-note"><strong>Entry & Rules:</strong> Roster size {payload.maxRosterSize} · Entry {payload.entryFeeEnabled ? `${payload.entryFeeAmount ?? 0} POINTS` : "Free"} · Eligibility {payload.eligibilityMode === "CARD_SET_ONLY" ? `Card set only (${payload.cardSetId || "missing"})` : "Any eligible card"}</p>
        <p className="contest-inline-note"><strong>Rewards:</strong> Points pool {payload.rewardConfig?.pointsPool ?? 0} · Pack pool {payload.rewardConfig?.packPool ?? 0} · Rewarded top {payload.rewardConfig?.rewardedTopPercent ?? 0}% · Profile {payload.rewardConfig?.distributionProfile ?? "—"}</p>
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.45rem" }}>
        <p className="contest-inline-note"><strong>C. Validation / issue panel</strong></p>
        {!allIssues.length ? <p className="contest-inline-note">No blocking issue detected from current wizard validations.</p> : null}

        {issuesByStep.identity.length ? <><p className="contest-inline-note"><strong>Identity</strong></p>{issuesByStep.identity.map((issue) => <p key={issue} className="contest-error">• {issue}</p>)}<button type="button" className="admin-v2-link-chip" onClick={() => onGoToStep("identity")}>Go to Step 1</button></> : null}
        {issuesByStep.schedule.length ? <><p className="contest-inline-note"><strong>Schedule</strong></p>{issuesByStep.schedule.map((issue) => <p key={issue} className="contest-error">• {issue}</p>)}<button type="button" className="admin-v2-link-chip" onClick={() => onGoToStep("schedule")}>Go to Step 2</button></> : null}
        {issuesByStep["entry-rules"].length ? <><p className="contest-inline-note"><strong>Entry & Rules</strong></p>{issuesByStep["entry-rules"].map((issue) => <p key={issue} className="contest-error">• {issue}</p>)}<button type="button" className="admin-v2-link-chip" onClick={() => onGoToStep("entry-rules")}>Go to Step 3</button></> : null}
        {issuesByStep.rewards.length ? <><p className="contest-inline-note"><strong>Rewards</strong></p>{issuesByStep.rewards.map((issue) => <p key={issue} className="contest-error">• {issue}</p>)}<button type="button" className="admin-v2-link-chip" onClick={() => onGoToStep("rewards")}>Go to Step 4</button></> : null}
      </article>

      <article className="admin-callout" style={{ display: "grid", gap: "0.45rem" }}>
        <p className="contest-inline-note"><strong>D. Final actions</strong></p>
        <p className="contest-inline-note">Save draft persists your current configuration, even when incomplete.</p>
        <p className="contest-inline-note">Publish contest requires no blocking wizard issue and successful backend validation.</p>
      </article>
    </section>
  );
}
