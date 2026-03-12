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

export default function ProfilePage() {
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
        label: result.contestTitle,
        subLabel: `Contest result · Rank #${result.rank} · Score ${result.score}`,
        at: result.rankedAt,
      })) ?? [];

    const questEvents = completedQuests.slice(0, 6).map((quest) => ({
      id: quest.id,
      label: quest.title,
      subLabel: `Quest validated · +${quest.rewardPoints} points`,
      at: quest.completedAt ?? new Date().toISOString(),
    }));

    return [...contestEvents, ...questEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [competitive?.recentResults, completedQuests]);

  const cardsOwned = collection?.totalOwnedInstances ?? me?.mvpCollection.reduce((acc, item) => acc + item.instanceCount, 0) ?? 0;
  const uniqueOwned = collection?.ownedTemplateCount ?? me?.mvpCollection.length ?? 0;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Account command center: identity, currency, progression, collection and verified activity.</p>
        </div>
      </div>

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <p className="empty-state-title">Sign in to load your full account profile</p>
          <p className="empty-state-desc">Continue with X to unlock progression, points history, quests and contest activity.</p>
        </div>
      ) : (
        <div className="profile-v3-shell">
          <section className="profile-v3-hero">
            <div className="profile-v3-orb" />
            <header className="profile-v3-head">
              <div className="profile-avatar">{me.user.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <p className="profile-v3-eyebrow">Account identity</p>
                <h2>{me.user.displayName}</h2>
                <p className="profile-sub">{me.mode === "guest" ? "Guest mode · temporary local profile" : `X handle · @${me.user.username}`}</p>
              </div>
            </header>

            <div className="profile-v3-currency">
              <p className="profile-v3-eyebrow">Points balance</p>
              <p className="profile-v3-points">{account?.pointsBalance ?? me.user.points}</p>
              <p className="profile-v3-caption">Primary account currency · ledger tracked</p>
            </div>

            <div className="profile-v3-hero-stats">
              <article>
                <p>Level</p>
                <strong>Lv {account?.level ?? 1}</strong>
                <span>{account?.xp ?? 0} XP</span>
              </article>
              <article>
                <p>Total cards</p>
                <strong>{cardsOwned}</strong>
                <span>{uniqueOwned} unique</span>
              </article>
              <article>
                <p>Collection</p>
                <strong>{collection?.completionPct ?? 0}%</strong>
                <span>{collection?.missingTemplateCount ?? 0} missing</span>
              </article>
              <article>
                <p>Contest entries</p>
                <strong>{competitive?.contestsEntered ?? 0}</strong>
                <span>Best rank {competitive?.bestRank ?? "-"}</span>
              </article>
            </div>

            {account ? (
              <div className="profile-v3-progress-wrap">
                <div className="profile-v3-progress-head">
                  <span>Progression to Lv {account.nextMilestoneLevel}</span>
                  <span>{account.progressPct}%</span>
                </div>
                <ProgressBar value={account.xp - account.levelXpFloor} max={account.levelXpCeil - account.levelXpFloor} label="Account XP progress" />
              </div>
            ) : (
              <div className="profile-empty-inline">Level progression details are available for authenticated accounts.</div>
            )}
          </section>

          {historyError ? <p className="contest-error">{historyError}</p> : null}

          <section className="profile-v3-board-grid">
            <article className="profile-v3-panel">
              <h3>Account activity timeline</h3>
              {accountTimeline.length === 0 ? (
                <p className="profile-empty-inline">No recent events yet.</p>
              ) : (
                <div className="profile-v3-list">
                  {accountTimeline.map((event) => (
                    <div className="profile-v3-row" key={event.id}>
                      <div>
                        <p className="profile-result-name">{event.label}</p>
                        <p className="profile-result-sub">{event.subLabel}</p>
                      </div>
                      <time className="profile-result-sub">{new Date(event.at).toLocaleDateString()}</time>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="profile-v3-panel">
              <h3>Completed quests</h3>
              {completedQuests.length === 0 ? (
                <p className="profile-empty-inline">No completed quests yet.</p>
              ) : (
                <div className="profile-v3-list">
                  {completedQuests.slice(0, MAX_LEDGER_ROWS).map((quest) => (
                    <div className="profile-v3-row" key={quest.id}>
                      <div>
                        <p className="profile-result-name">{quest.title}</p>
                        <p className="profile-result-sub">{quest.code}</p>
                      </div>
                      <span className="profile-v3-pill">+{quest.rewardPoints}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="profile-v3-board-grid">
            <article className="profile-v3-panel">
              <h3>Points earned</h3>
              {pointsIn.length === 0 ? (
                <p className="profile-empty-inline">No credits recorded yet.</p>
              ) : (
                <div className="profile-v3-list">
                  {pointsIn.slice(0, MAX_LEDGER_ROWS).map((entry) => (
                    <div className="profile-v3-row" key={entry.id}>
                      <div>
                        <p className="profile-result-name">{entry.reasonType}</p>
                        <p className="profile-result-sub">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="profile-v3-pill positive">+{entry.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="profile-v3-panel">
              <h3>Points spent</h3>
              {pointsOut.length === 0 ? (
                <p className="profile-empty-inline">No debits recorded yet.</p>
              ) : (
                <div className="profile-v3-list">
                  {pointsOut.slice(0, MAX_LEDGER_ROWS).map((entry) => (
                    <div className="profile-v3-row" key={entry.id}>
                      <div>
                        <p className="profile-result-name">{entry.reasonType}</p>
                        <p className="profile-result-sub">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="profile-v3-pill negative">-{entry.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {me.mode === "guest" ? (
            <div className="profile-guest-note">
              Guest mode uses local temporary progression only. Sign in with X to persist points ledger and quest history.
            </div>
          ) : null}
        </div>
      )}
    </SiteShell>
  );
}
