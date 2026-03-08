"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { useSession } from "@/components/useSession";
import type { BattleResultPayload, PveDifficulty } from "@/lib/pve/types";
import { useEffect, useMemo, useState } from "react";

type SortKey = "combatScore" | "ATK" | "DEF" | "SPD" | "CTRL" | "archetype";

const TEAM_SIZE = 5;
const PACK_COST = 100;
const DIFFICULTIES: Array<{ value: PveDifficulty; label: string; win: number; loss: number; bonus: string; desc: string }> = [
  { value: "easy", label: "Easy", win: 90, loss: 20, bonus: "4%", desc: "Safe test run" },
  { value: "normal", label: "Normal", win: 130, loss: 30, bonus: "7%", desc: "Balanced reward / risk" },
  { value: "hard", label: "Hard", win: 190, loss: 45, bonus: "11%", desc: "Stronger enemy, best returns" },
];

function cardCombatScore(card: { ATK: number; DEF: number; SPD: number; CTRL: number; combatScore?: number }) {
  if (typeof card.combatScore === "number") return card.combatScore;
  return Math.max(0, Math.min(100, Math.round(card.ATK * 0.34 + card.DEF * 0.27 + card.SPD * 0.21 + card.CTRL * 0.18)));
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useResetCountdown(nextResetAt: string | undefined) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = useMemo(() => {
    if (!nextResetAt) return 0;
    return Math.max(0, new Date(nextResetAt).getTime() - now);
  }, [nextResetAt, now]);

  return {
    remainingLabel: formatCountdown(remainingMs),
    resetAtLabel: nextResetAt ? new Date(nextResetAt).toLocaleString() : "—",
  };
}

function useBattleReplay(result: BattleResultPayload | null, speed = 280) {
  const [actionStep, setActionStep] = useState(0);

  useEffect(() => {
    setActionStep(0);
    if (!result || result.actions.length === 0) return;

    const timer = window.setInterval(() => {
      setActionStep((prev) => {
        if (!result || prev >= result.actions.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [result, speed]);

  return actionStep;
}

export default function CombatsPage() {
  const { me, refresh } = useSession();
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<PveDifficulty>("normal");
  const [sortBy, setSortBy] = useState<SortKey>("combatScore");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [battle, setBattle] = useState<BattleResultPayload | null>(null);

  const { remainingLabel, resetAtLabel } = useResetCountdown(me?.nextPveResetAt);

  const collection = me?.collection ?? [];
  const sortedCards = useMemo(() => {
    return [...collection].sort((a, b) => {
      if (sortBy === "combatScore") {
        return cardCombatScore(b.card) - cardCombatScore(a.card);
      }
      if (sortBy === "archetype") {
        return (a.card.archetype || "balanced").localeCompare(b.card.archetype || "balanced");
      }
      return b.card[sortBy] - a.card[sortBy];
    });
  }, [collection, sortBy]);

  const selectedCardItems = selectedTeam.map((id) => sortedCards.find((c) => c.baseCardId === id)).filter(Boolean);

  const totals = selectedCardItems.reduce(
    (acc, item) => {
      acc.ATK += item!.card.ATK;
      acc.DEF += item!.card.DEF;
      acc.SPD += item!.card.SPD;
      acc.CTRL += item!.card.CTRL;
      acc.combatScore += cardCombatScore(item!.card);
      acc.archetypes.add(item!.card.archetype || "balanced");
      return acc;
    },
    { ATK: 0, DEF: 0, SPD: 0, CTRL: 0, combatScore: 0, archetypes: new Set<string>() },
  );

  const replayStep = useBattleReplay(battle);
  const shownActions = battle?.actions.slice(0, Math.max(1, replayStep)) ?? [];
  const liveRound = shownActions.at(-1)?.round ?? 1;

  const displayedRoundSummaries = useMemo(() => {
    if (!battle) return [];
    return battle.rounds.filter((r) => r.round <= liveRound);
  }, [battle, liveRound]);

  const cumulative = displayedRoundSummaries.reduce(
    (acc, round) => {
      acc.player += round.playerImpact;
      acc.enemy += round.enemyImpact;
      return acc;
    },
    { player: 0, enemy: 0 },
  );

  const toggleCard = (cardId: string, exhausted: boolean) => {
    if (exhausted) return;
    setSelectedTeam((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= TEAM_SIZE) return prev;
      return [...prev, cardId];
    });
  };

  const runBattle = async () => {
    if (selectedTeam.length !== TEAM_SIZE) return;
    setRunning(true);
    setError("");

    const res = await fetch("/api/pve/battle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCardIds: selectedTeam, difficulty }),
    });

    if (!res.ok) {
      setError(await res.text());
      setRunning(false);
      return;
    }

    const payload = (await res.json()) as BattleResultPayload;
    setBattle(payload);
    setSelectedTeam([]);
    await refresh();
    setRunning(false);
  };

  const canOpenPack = (me?.user.points ?? 0) >= PACK_COST;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">PvE Arena</h1>
          <p className="page-subtitle">Build a 5-card strike team. Every battle consumes 1 ticket and exhausts selected cards until daily reset.</p>
        </div>
      </div>

      <div className="battle-layout">
        <section className="battle-main-col">
          <div className="battle-panel pve-hub-panel">
            <p className="panel-label">Arena Hub</p>
            <div className="pve-hub-stats">
              <HubStat label="Tickets" value={`${me?.user.pveBattleTickets ?? 0}/3`} />
              <HubStat label="Cards Available" value={`${me?.availablePveCards ?? 0}`} />
              <HubStat label="Cards Exhausted" value={`${me?.exhaustedPveCards ?? 0}`} />
            </div>
            <div className="pve-reset-banner">
              <span>Daily reset in: <b>{remainingLabel}</b></span>
              <span className="pve-reset-sub">Next reset: {resetAtLabel}</span>
            </div>
            <div className="pve-hub-actions">
              <Button onClick={() => { window.location.hash = "team-builder"; }}>Build Team</Button>
              <Button onClick={() => void runBattle()} disabled={selectedTeam.length !== TEAM_SIZE || (me?.user.pveBattleTickets ?? 0) <= 0 || running}>
                {running ? "Running..." : "Start Battle"}
              </Button>
            </div>
          </div>

          <div className="battle-panel" id="team-builder">
            <p className="panel-label">Team Builder</p>
            <p className="pve-helper-copy">Select exactly 5 AVAILABLE cards. Selected cards become EXHAUSTED after battle and reset daily.</p>
            <div className="diff-tabs pve-sort-tabs">
              {(["combatScore", "ATK", "DEF", "SPD", "CTRL", "archetype"] as SortKey[]).map((key) => (
                <button key={key} className={`diff-tab${sortBy === key ? " active" : ""}`} onClick={() => setSortBy(key)}>
                  Sort: {key}
                </button>
              ))}
            </div>

            <div className="card-grid pve-collection-grid">
              {sortedCards.map((item) => {
                const isSelected = selectedTeam.includes(item.baseCardId);
                const exhausted = item.pveExhausted;
                const stateLabel = exhausted ? "EXHAUSTED" : isSelected ? "SELECTED" : "AVAILABLE";

                return (
                  <div key={item.baseCardId} className="pve-card-wrap">
                    <button
                      className="card-select"
                      onClick={() => toggleCard(item.baseCardId, exhausted)}
                      disabled={exhausted || (!isSelected && selectedTeam.length >= TEAM_SIZE)}
                      style={{
                        opacity: exhausted || (!isSelected && selectedTeam.length >= TEAM_SIZE) ? 0.45 : 1,
                        filter: exhausted ? "grayscale(0.65)" : "none",
                      }}
                    >
                      <CardFrame card={item.card} quantity={item.quantity} selectable selected={isSelected} />
                    </button>
                    <span className={`pve-state-badge ${exhausted ? "exhausted" : isSelected ? "selected" : "available"}`}>{stateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="battle-sidebar">
          <div className="battle-panel">
            <p className="panel-label">Selected Team ({selectedTeam.length}/5)</p>
            <div className="squad-slots" style={{ marginTop: "0.7rem" }}>
              {Array.from({ length: TEAM_SIZE }).map((_, idx) => {
                const card = selectedCardItems[idx];
                return (
                  <div key={idx} className={`squad-slot${card ? " filled" : ""}`}>
                    <div className="squad-slot-num">{idx + 1}</div>
                    {card ? <div className="squad-slot-name">{card.card.name} · {card.card.archetype || "balanced"} · CMB {cardCombatScore(card.card)}</div> : <span className="squad-slot-empty">Empty</span>}
                  </div>
                );
              })}
            </div>
            <p className="pve-team-stats">
              ATK {totals.ATK} · DEF {totals.DEF} · SPD {totals.SPD} · CTRL {totals.CTRL} · CMB {totals.combatScore} · Archetypes {totals.archetypes.size}
            </p>
          </div>

          <div className="battle-panel">
            <p className="panel-label">Difficulty</p>
            <div className="pve-difficulty-list">
              {DIFFICULTIES.map((d) => (
                <button key={d.value} className={`diff-tab pve-diff-card${difficulty === d.value ? " active" : ""}`} onClick={() => setDifficulty(d.value)}>
                  <strong>{d.label}</strong>
                  <span>Win +{d.win} · Loss +{d.loss} · Bonus {d.bonus}</span>
                  <span>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="battle-log-box">{error}</div> : null}
        </aside>
      </div>

      {battle ? (
        <div className="battle-panel pve-replay-panel">
          <p className="panel-label">Battle Replay</p>
          <div className="pve-replay-kpis">
            <span>Round {liveRound} / {battle.rounds.length}</span>
            <span>Impact — Player {cumulative.player} · Enemy {cumulative.enemy}</span>
            <span>Rounds won — You {battle.playerRoundsWon} · Enemy {battle.enemyRoundsWon}</span>
          </div>

          <div className="battle-log-box" style={{ marginTop: "0.75rem", maxHeight: "260px", overflowY: "auto" }}>
            {shownActions.map((a, idx) => (
              <div key={`${a.round}-${idx}`} style={{ marginBottom: "0.22rem" }}>
                R{a.round} · {a.actorSide}#{a.actorSlot + 1} → {a.targetSide}#{a.targetSlot + 1} · Impact +{a.impact} {a.isCrit ? "· CRIT" : ""}
              </div>
            ))}
          </div>

          <div className="pve-round-list">
            {displayedRoundSummaries.map((round) => (
              <div key={round.round} className="pve-round-item">
                Round {round.round}: Player {round.playerImpact} · Enemy {round.enemyImpact} · Winner: {round.winner.toUpperCase()}
              </div>
            ))}
          </div>

          <div className="pve-result-grid">
            <h3>{battle.result === "WIN" ? "Victory" : "Defeat"}</h3>
            <div>Total impact: You {battle.playerTotalImpact} · Enemy {battle.enemyTotalImpact}</div>
            <div>Rounds won: You {battle.playerRoundsWon} · Enemy {battle.enemyRoundsWon}</div>
            <div>Points earned: +{battle.rewardPoints}</div>
            <div>{battle.bonusPackAwarded ? "Bonus pack equivalent awarded." : "No bonus pack equivalent this run."}</div>
            <div>Cards exhausted this run: {battle.exhaustedCardIds.length}</div>
            <div>Remaining battle tickets: {battle.remainingBattleTickets}</div>
            <div className="pve-result-actions">
              <Button onClick={() => void runBattle()} disabled={selectedTeam.length !== TEAM_SIZE || (me?.user.pveBattleTickets ?? 0) <= 0 || running}>Play Again</Button>
              <Button onClick={() => { window.location.hash = "team-builder"; }}>Change Team</Button>
              <Button onClick={() => { window.location.href = "/packs"; }} disabled={!canOpenPack}>Open Packs</Button>
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}

function HubStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pve-hub-stat">
      <div className="pve-hub-stat-label">{label}</div>
      <div className="pve-hub-stat-value">{value}</div>
    </div>
  );
}
