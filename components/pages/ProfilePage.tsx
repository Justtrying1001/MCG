"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  reasonRef: string | null;
  createdAt: string;
};

type QuestRow = {
  id: string;
  code: string;
  title: string;
  rewardPoints: number;
  status: "AVAILABLE" | "IN_PROGRESS" | "CLAIMABLE" | "COMPLETED" | "REJECTED";
  completedAt: string | null;
  latestSubmissionStatus: "SUBMITTED" | "APPROVED" | "REJECTED" | null;
};

const MAX_LEDGER_ROWS = 8;

export default function AccountPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [historyError, setHistoryError] = useState("");

  const isUser = me?.mode === "user";
  const v2 = isUser ? me.coexistence?.v2 : undefined;
  const account = v2?.accountProgression;
  const collection = v2?.collectionProgression;
  const competitive = v2?.competitiveProgression;

  useEffect(() => {
    if (loading || !isUser) return;

    const loadHistory = async () => {
      setHistoryError("");
      const [ledgerRes, questsRes] = await Promise.all([
        fetch("/api/rewards/ledger?limit=30", { cache: "no-store" }),
        fetch("/api/quests", { cache: "no-store" }),
      ]);

      if (!ledgerRes.ok || !questsRes.ok) {
        setHistoryError("Account history is temporarily unavailable.");
        return;
      }

      const ledgerPayload = (await ledgerRes.json()) as { entries?: LedgerRow[] };
      const questPayload = (await questsRes.json()) as { quests?: QuestRow[] };

      setLedger(ledgerPayload.entries ?? []);
      setQuests(questPayload.quests ?? []);
    };

    void loadHistory();
  }, [isUser, loading]);

  const pointsIn = ledger.filter((entry) => entry.entryType === "CREDIT");
  const pointsOut = ledger.filter((entry) => entry.entryType === "DEBIT");

  const completedQuests = useMemo(
    () => quests.filter((quest) => quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED"),
    [quests]
  );

  const accountTimeline = useMemo(() => {
    const contestEvents =
      competitive?.recentResults.map((result) => ({
        id: `${result.contestId}-${result.rankedAt}`,
        label: `Contest result · ${result.contestTitle}`,
        subLabel: `Rank #${result.rank} · Score ${result.score}`,
        at: result.rankedAt,
      })) ?? [];

    const questEvents = completedQuests.slice(0, 6).map((quest) => ({
      id: quest.id,
      label: `Quest completed · ${quest.title}`,
      subLabel: `+${quest.rewardPoints} points`,
      at: quest.completedAt ?? new Date().toISOString(),
    }));

    return [...contestEvents, ...questEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [competitive?.recentResults, completedQuests]);

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Your account hub: progression, collection value, points history, and validated quest activity.
          </p>
        </div>
      </div>

      {me ? (
        <div className="profile-page-layout">
          <section className="profile-hero-card">
            <div className="profile-banner-bg" />
            <div className="profile-header">
              <div className="profile-avatar">{me.user.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <p className="profile-hero-label">Account identity</p>
                <div className="profile-name">{me.user.displayName}</div>
                <div className="profile-sub">
                  {me.mode === "guest"
                    ? "Guest mode · Temporary progression preview"
                    : `Connected with X · @${me.user.username}`}
                </div>
              </div>
            </div>

            <div className="profile-main-kpis">
              <div className="profile-kpi-card highlight">
                <p className="profile-kpi-label">Points balance</p>
                <p className="profile-kpi-value">{account?.pointsBalance ?? me.user.points}</p>
                <p className="profile-kpi-sub">Spend in rewards-ready systems and track every movement below.</p>
              </div>
              <div className="profile-kpi-card">
                <p className="profile-kpi-label">Level</p>
                <p className="profile-kpi-value">Lv {account?.level ?? 1}</p>
                <p className="profile-kpi-sub">{account?.xp ?? 0} XP total</p>
              </div>
              <div className="profile-kpi-card">
                <p className="profile-kpi-label">Cards owned</p>
                <p className="profile-kpi-value">{collection?.totalOwnedInstances ?? me.mvpCollection.reduce((acc, item) => acc + item.instanceCount, 0)}</p>
                <p className="profile-kpi-sub">{collection?.ownedTemplateCount ?? me.mvpCollection.length} unique templates</p>
              </div>
            </div>

            {account ? (
              <div className="profile-progress-card">
                <div className="profile-progress-head">
                  <p>Progress to Lv {account.nextMilestoneLevel}</p>
                  <p>{account.progressPct}%</p>
                </div>
                <ProgressBar value={account.xp - account.levelXpFloor} max={account.levelXpCeil - account.levelXpFloor} label="Account level" />
              </div>
            ) : (
              <div className="profile-empty-inline">Detailed level progression is available for authenticated accounts.</div>
            )}
          </section>

          <section className="profile-hub-grid">
            <article className="profile-stat-card">
              <span className="profile-stat-label">Collection progression</span>
              <span className="profile-stat-value">{collection?.completionPct ?? 0}%</span>
              <span className="profile-stat-sub">{collection?.missingTemplateCount ?? 0} cards missing</span>
              <span className="profile-stat-sub">Top rarity: {collection?.topRarityCode ?? "Not available yet"}</span>
            </article>
            <article className="profile-stat-card">
              <span className="profile-stat-label">Contest performance</span>
              <span className="profile-stat-value">{competitive?.contestsEntered ?? 0}</span>
              <span className="profile-stat-sub">Entries · {competitive?.contestsWon ?? 0} wins</span>
              <span className="profile-stat-sub">Best rank: {competitive?.bestRank ?? "—"} · Rating: {competitive?.rating ?? "—"}</span>
            </article>
            <article className="profile-stat-card">
              <span className="profile-stat-label">Quest completion</span>
              <span className="profile-stat-value">{completedQuests.length}</span>
              <span className="profile-stat-sub">Validated quests completed</span>
              <span className="profile-stat-sub">Ready for future reward seasons</span>
            </article>
          </section>

          {historyError ? <p className="contest-error">{historyError}</p> : null}

          <div className="profile-ledger-grid">
            <section className="profile-secondary-panel">
              <h2 className="profile-secondary-title">Points earned</h2>
              {pointsIn.length === 0 ? (
                <p className="profile-empty-inline">No points earned yet. Complete your first quest to start the ledger.</p>
              ) : (
                <div className="profile-results-list">
                  {pointsIn.slice(0, MAX_LEDGER_ROWS).map((entry) => (
                    <div key={entry.id} className="profile-result-row">
                      <div>
                        <div className="profile-result-name">{entry.reasonType}</div>
                        <div className="profile-result-sub">{new Date(entry.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="profile-result-rank" style={{ color: "var(--emerald)" }}>+{entry.amount}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="profile-secondary-panel">
              <h2 className="profile-secondary-title">Points spent</h2>
              {pointsOut.length === 0 ? (
                <p className="profile-empty-inline">No points spent yet. Future reward redemptions will appear here.</p>
              ) : (
                <div className="profile-results-list">
                  {pointsOut.slice(0, MAX_LEDGER_ROWS).map((entry) => (
                    <div key={entry.id} className="profile-result-row">
                      <div>
                        <div className="profile-result-name">{entry.reasonType}</div>
                        <div className="profile-result-sub">{new Date(entry.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="profile-result-rank" style={{ color: "var(--red)" }}>-{entry.amount}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="profile-ledger-grid">
            <section className="profile-secondary-panel">
              <h2 className="profile-secondary-title">Account activity</h2>
              {accountTimeline.length === 0 ? (
                <p className="profile-empty-inline">No recent account activity yet.</p>
              ) : (
                <div className="profile-results-list">
                  {accountTimeline.map((event) => (
                    <div key={event.id} className="profile-result-row">
                      <div>
                        <div className="profile-result-name">{event.label}</div>
                        <div className="profile-result-sub">{event.subLabel}</div>
                      </div>
                      <div className="profile-result-sub">{new Date(event.at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="profile-secondary-panel">
              <h2 className="profile-secondary-title">Completed quests</h2>
              {completedQuests.length === 0 ? (
                <p className="profile-empty-inline">No completed quests yet. Start with available social quests on Rewards.</p>
              ) : (
                <div className="profile-results-list">
                  {completedQuests.slice(0, 8).map((quest) => (
                    <div key={quest.id} className="profile-result-row">
                      <div>
                        <div className="profile-result-name">{quest.title}</div>
                        <div className="profile-result-sub">{quest.code}</div>
                      </div>
                      <div className="profile-result-sub">{quest.completedAt ? new Date(quest.completedAt).toLocaleDateString() : "Validated"}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {me.mode === "guest" ? (
            <div className="profile-guest-note">
              Guest mode only stores temporary local progression. Continue with X to unlock persistent points ledger,
              completed quests history, and account timeline synchronization.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <p className="empty-state-title">Sign in to view your account hub</p>
          <p className="empty-state-desc">Continue with X for persistent profile, collection and quest history.</p>
        </div>
      )}
    </SiteShell>
  );
}
