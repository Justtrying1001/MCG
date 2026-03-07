"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { useSession } from "@/components/useSession";
import type { BattleResultPayload, PveDifficulty } from "@/lib/pve/types";
import { useEffect, useMemo, useState } from "react";

type SortKey = "power" | "ATK" | "DEF" | "SPD" | "CTRL";

const TEAM_SIZE = 5;
const PACK_COST = 100;
const DIFFICULTIES: Array<{ value: PveDifficulty; label: string; win: number; loss: number; bonus: string; desc: string }> = [
  { value: "easy", label: "Easy", win: 90, loss: 20, bonus: "4%", desc: "Safe test run" },
  { value: "normal", label: "Normal", win: 130, loss: 30, bonus: "7%", desc: "Balanced reward / risk" },
  { value: "hard", label: "Hard", win: 190, loss: 45, bonus: "11%", desc: "Stronger enemy, best returns" },
];

function cardPower(card: { ATK: number; DEF: number; SPD: number; CTRL: number }) {
  return card.ATK + card.DEF + card.SPD + card.CTRL;
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
  const [sortBy, setSortBy] = useState<SortKey>("power");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [battle, setBattle] = useState<BattleResultPayload | null>(null);

  const availableCards = useMemo(() => {
    const cards = me?.collection ?? [];
    return [...cards].sort((a, b) => {
      const va = sortBy === "power" ? cardPower(a.card) : a.card[sortBy];
      const vb = sortBy === "power" ? cardPower(b.card) : b.card[sortBy];
      return vb - va;
    });
  }, [me, sortBy]);

  const selectedCardItems = selectedTeam.map((id) => availableCards.find((c) => c.baseCardId === id)).filter(Boolean);

  const totals = selectedCardItems.reduce(
    (acc, item) => {
      acc.ATK += item!.card.ATK;
      acc.DEF += item!.card.DEF;
      acc.SPD += item!.card.SPD;
      acc.CTRL += item!.card.CTRL;
      return acc;
    },
    { ATK: 0, DEF: 0, SPD: 0, CTRL: 0 },
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
          <p className="page-subtitle">Build a 5-card strike team. Every battle consumes tickets and exhausts selected cards for today.</p>
        </div>
      </div>

      <div className="battle-layout">
        <div>
          <div className="battle-panel" style={{ marginBottom: "1rem" }}>
            <p className="panel-label">Arena Hub</p>
            <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "0.6rem" }}>
              <HubStat label="Tickets" value={`${me?.user.pveBattleTickets ?? 0}/3`} />
              <HubStat label="Cards Available" value={`${me?.availablePveCards ?? 0}`} />
              <HubStat label="Cards Exhausted" value={`${me?.exhaustedPveCards ?? 0}`} />
            </div>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
              <Button onClick={() => { window.location.hash = "team-builder"; }}>Build Team</Button>
              <Button onClick={() => void runBattle()} disabled={selectedTeam.length !== TEAM_SIZE || (me?.user.pveBattleTickets ?? 0) <= 0 || running}>
                {running ? "Running..." : "Start Battle"}
              </Button>
            </div>
          </div>

          <div className="battle-panel" id="team-builder">
            <p className="panel-label">Team Builder</p>
            <p style={{ marginTop: "0.45rem", color: "var(--text-2)", fontSize: "0.86rem" }}>Select exactly 5 AVAILABLE cards. Selected cards become EXHAUSTED after battle.</p>
            <div className="diff-tabs" style={{ margin: "0.8rem 0" }}>
              {(["power", "ATK", "DEF", "SPD", "CTRL"] as SortKey[]).map((key) => (
                <button key={key} className={`diff-tab${sortBy === key ? " active" : ""}`} onClick={() => setSortBy(key)}>
                  Sort: {key}
                </button>
              ))}
            </div>

            <div className="card-grid">
              {availableCards.map((item) => {
                const isSelected = selectedTeam.includes(item.baseCardId);
                const exhausted = item.pveExhausted;
                const stateLabel = exhausted ? "EXHAUSTED" : isSelected ? "SELECTED" : "AVAILABLE";
                return (
                  <div key={item.baseCardId} style={{ position: "relative" }}>
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
                    <span
                      style={{
                        position: "absolute",
                        top: "0.45rem",
                        left: "0.45rem",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        borderRadius: "999px",
                        padding: "0.2rem 0.5rem",
                        border: "1px solid var(--border)",
                        background: exhausted ? "rgba(255, 107, 107, 0.18)" : isSelected ? "rgba(0, 229, 255, 0.18)" : "rgba(61, 220, 151, 0.18)",
                      }}
                    >
                      {stateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="battle-sidebar">
          <div className="battle-panel">
            <p className="panel-label">Selected Team ({selectedTeam.length}/5)</p>
            <div className="squad-slots" style={{ marginTop: "0.7rem" }}>
              {Array.from({ length: TEAM_SIZE }).map((_, idx) => {
                const card = selectedCardItems[idx];
                return (
                  <div key={idx} className={`squad-slot${card ? " filled" : ""}`}>
                    <div className="squad-slot-num">{idx + 1}</div>
                    {card ? <div className="squad-slot-name">{card.card.name}</div> : <span className="squad-slot-empty">Empty</span>}
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: "0.75rem", color: "var(--text-3)", fontSize: "0.8rem" }}>
              ATK {totals.ATK} · DEF {totals.DEF} · SPD {totals.SPD} · CTRL {totals.CTRL} · POW {totals.ATK + totals.DEF + totals.SPD + totals.CTRL}
            </p>
          </div>

          <div className="battle-panel">
            <p className="panel-label">Difficulty</p>
            <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.7rem" }}>
              {DIFFICULTIES.map((d) => (
                <button key={d.value} className={`diff-tab${difficulty === d.value ? " active" : ""}`} onClick={() => setDifficulty(d.value)} style={{ textAlign: "left" }}>
                  <strong>{d.label}</strong>
                  <div style={{ opacity: 0.85, marginTop: "0.2rem", fontSize: "0.8rem" }}>
                    Win +{d.win} · Loss +{d.loss} · Bonus {d.bonus} · {d.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="battle-log-box">{error}</div> : null}
        </div>
      </div>

      {battle ? (
        <div className="battle-panel" style={{ marginTop: "1rem" }}>
          <p className="panel-label">Battle Replay</p>
          <div style={{ marginTop: "0.6rem", display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
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

          <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.4rem" }}>
            {displayedRoundSummaries.map((round) => (
              <div key={round.round} style={{ border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "0.45rem 0.6rem" }}>
                Round {round.round}: Player {round.playerImpact} · Enemy {round.enemyImpact} · Winner: {round.winner.toUpperCase()}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.35rem" }}>
            <h3 style={{ margin: 0 }}>{battle.result === "WIN" ? "Victory" : "Defeat"}</h3>
            <div>Total impact: You {battle.playerTotalImpact} · Enemy {battle.enemyTotalImpact}</div>
            <div>Rounds won: You {battle.playerRoundsWon} · Enemy {battle.enemyRoundsWon}</div>
            <div>Points earned: +{battle.rewardPoints}</div>
            <div>{battle.bonusPackAwarded ? "Bonus pack equivalent awarded." : "No bonus pack equivalent this run."}</div>
            <div>Cards exhausted this run: {battle.exhaustedCardIds.length}</div>
            <div>Remaining battle tickets: {battle.remainingBattleTickets}</div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
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
    <div style={{ border: "1px solid var(--border)", borderRadius: "0.7rem", padding: "0.55rem" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{label}</div>
      <div style={{ fontWeight: 800, marginTop: "0.2rem" }}>{value}</div>
    </div>
  );
}
