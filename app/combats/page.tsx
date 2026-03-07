"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { useSession } from "@/components/useSession";
import type { BattleActionLog, BattleResultPayload, BattleUnitSnapshot, PveDifficulty } from "@/lib/pve/types";
import { useEffect, useMemo, useState } from "react";

type SortKey = "power" | "ATK" | "DEF" | "SPD" | "CTRL";

const TEAM_SIZE = 5;
const DIFFICULTIES: Array<{ value: PveDifficulty; label: string; reward: string; bonus: string; note: string }> = [
  { value: "easy", label: "Easy", reward: "90 win / 25 loss", bonus: "4% bonus pack", note: "Safe runs for testing teams." },
  { value: "normal", label: "Normal", reward: "130 win / 35 loss", bonus: "7% bonus pack", note: "Balanced reward and risk." },
  { value: "hard", label: "Hard", reward: "190 win / 50 loss", bonus: "11% bonus pack", note: "Stronger enemies, best returns." },
];

function calcPower(unit: { ATK: number; DEF: number; SPD: number; CTRL: number }) {
  return unit.ATK + unit.DEF + unit.SPD + unit.CTRL;
}

function useReplay(result: BattleResultPayload | null, speedMs = 220) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (!result || result.rounds.length === 0) return;

    const timer = window.setInterval(() => {
      setStep((current) => {
        if (!result) return current;
        if (current >= result.rounds.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [result, speedMs]);

  return step;
}

export default function CombatsPage() {
  const { me, refresh } = useSession();
  const [team, setTeam] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<PveDifficulty>("normal");
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BattleResultPayload | null>(null);
  const [error, setError] = useState<string>("");

  const available = useMemo(() => {
    const base = me?.collection.filter((x) => x.quantity > 0) ?? [];
    return [...base].sort((a, b) => {
      const av = sortKey === "power" ? calcPower(a.card) : a.card[sortKey];
      const bv = sortKey === "power" ? calcPower(b.card) : b.card[sortKey];
      return bv - av;
    });
  }, [me, sortKey]);

  const toggle = (id: string) => {
    setTeam((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TEAM_SIZE) return prev;
      return [...prev, id];
    });
  };

  const run = async () => {
    if (team.length !== TEAM_SIZE) return;
    setIsRunning(true);
    setError("");

    try {
      const res = await fetch("/api/pve/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCardIds: team, difficulty }),
      });
      if (!res.ok) {
        setError(await res.text());
        setIsRunning(false);
        return;
      }
      const payload = (await res.json()) as BattleResultPayload;
      setResult(payload);
      await refresh();
    } catch {
      setError("Cannot run battle now. Please retry.");
    }

    setIsRunning(false);
  };

  const teamCards = team.map((id) => available.find((x) => x.baseCardId === id)).filter(Boolean);
  const teamTotals = teamCards.reduce(
    (acc, item) => {
      acc.ATK += item!.card.ATK;
      acc.DEF += item!.card.DEF;
      acc.SPD += item!.card.SPD;
      acc.CTRL += item!.card.CTRL;
      return acc;
    },
    { ATK: 0, DEF: 0, SPD: 0, CTRL: 0 },
  );

  const replayStep = useReplay(result);
  const replayState = useMemo(() => {
    if (!result) return null;
    const playerHp = Object.fromEntries(result.playerTeam.map((u) => [u.slot, u.maxHp]));
    const enemyHp = Object.fromEntries(result.enemyTeam.map((u) => [u.slot, u.maxHp]));

    for (let i = 0; i < Math.min(replayStep, result.rounds.length); i += 1) {
      const action = result.rounds[i];
      if (action.targetSide === "player") playerHp[action.targetSlot] = action.targetRemainingHp;
      else enemyHp[action.targetSlot] = action.targetRemainingHp;
    }

    const currentAction = replayStep > 0 ? result.rounds[Math.min(replayStep, result.rounds.length) - 1] : null;
    return { playerHp, enemyHp, currentAction };
  }, [result, replayStep]);

  const canOpenPack = (me?.user.points ?? 0) >= 100;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">PvE Arena</h1>
          <p className="page-subtitle">Build a 5-card roster, run auto battles, earn points, and open more packs.</p>
        </div>
      </div>

      <div className="battle-layout">
        <div>
          <div className="battle-panel" style={{ marginBottom: "1rem" }}>
            <p className="panel-label">PvE Hub</p>
            <p style={{ marginTop: "0.35rem", color: "var(--text-2)", fontSize: "0.9rem" }}>
              Open packs → strengthen roster → win PvE → earn rewards → open more packs.
            </p>
            <div className="diff-tabs" style={{ marginTop: "0.8rem" }}>
              <Button onClick={() => { window.location.hash = "team-builder"; }}>Build Team</Button>
              <Button onClick={() => void run()} disabled={team.length !== TEAM_SIZE || isRunning}>
                {isRunning ? "Battle in progress..." : "Battle"}
              </Button>
            </div>
            <p style={{ marginTop: "0.7rem", color: "var(--text-3)", fontSize: "0.8rem" }}>
              Runs played: {me?.pveRunsCount ?? 0} {result ? `· Last result: ${result.result}` : ""}
            </p>
          </div>

          <div className="battle-panel" id="team-builder">
            <p className="panel-label">Team Builder (5/5 required)</p>
            <div className="diff-tabs" style={{ margin: "0.7rem 0" }}>
              {(["power", "ATK", "DEF", "SPD", "CTRL"] as SortKey[]).map((key) => (
                <button key={key} className={`diff-tab${sortKey === key ? " active" : ""}`} onClick={() => setSortKey(key)}>
                  Sort: {key}
                </button>
              ))}
            </div>
            {available.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No cards available</p>
                <p className="empty-state-desc">Open packs first to build your PvE roster.</p>
              </div>
            ) : (
              <div className="card-grid">
                {available.map((item) => (
                  <button
                    key={item.baseCardId}
                    className="card-select"
                    onClick={() => toggle(item.baseCardId)}
                    disabled={!team.includes(item.baseCardId) && team.length >= TEAM_SIZE}
                    style={{ opacity: !team.includes(item.baseCardId) && team.length >= TEAM_SIZE ? 0.45 : 1 }}
                  >
                    <CardFrame card={item.card} quantity={item.quantity} selectable selected={team.includes(item.baseCardId)} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="battle-sidebar">
          <div className="battle-panel">
            <p className="panel-label">Selected Team</p>
            <div className="squad-slots" style={{ marginTop: "0.75rem" }}>
              {Array.from({ length: TEAM_SIZE }).map((_, i) => {
                const card = teamCards[i];
                return (
                  <div key={i} className={`squad-slot${card ? " filled" : ""}`}>
                    <div className="squad-slot-num">{i + 1}</div>
                    {card ? <div className="squad-slot-name">{card.card.name}</div> : <span className="squad-slot-empty">Empty slot</span>}
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "var(--text-3)" }}>
              ATK {teamTotals.ATK} · DEF {teamTotals.DEF} · SPD {teamTotals.SPD} · CTRL {teamTotals.CTRL} · Power {teamTotals.ATK + teamTotals.DEF + teamTotals.SPD + teamTotals.CTRL}
            </p>
          </div>

          <div className="battle-panel">
            <p className="panel-label">Difficulty</p>
            <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.7rem" }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={`diff-tab${difficulty === d.value ? " active" : ""}`}
                  onClick={() => setDifficulty(d.value)}
                  style={{ textAlign: "left" }}
                >
                  <strong>{d.label}</strong> · {d.reward} · {d.bonus}
                  <div style={{ opacity: 0.8, marginTop: "0.2rem" }}>{d.note}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="battle-log-box">{error}</div>}
        </div>
      </div>

      {result && replayState && (
        <div className="battle-panel" style={{ marginTop: "1rem" }}>
          <p className="panel-label">Battle Replay</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginTop: "0.8rem" }}>
            <TeamHealth title="Player" units={result.playerTeam} hpMap={replayState.playerHp} action={replayState.currentAction} side="player" />
            <TeamHealth title="Enemy" units={result.enemyTeam} hpMap={replayState.enemyHp} action={replayState.currentAction} side="enemy" />
          </div>
          <div className="battle-log-box" style={{ marginTop: "0.8rem" }}>
            {(result.rounds.slice(0, Math.max(1, replayStep)).map((a, idx) => (
              <div key={`${a.round}-${idx}`} style={{ marginBottom: "0.25rem" }}>
                R{a.round} · {a.actorSide}#{a.actorSlot + 1} → {a.targetSide}#{a.targetSlot + 1} · -{a.damage} HP {a.isCrit ? "· CRIT" : ""} {a.targetDefeated ? "· KO" : ""}
              </div>
            ))) || "No battle events."}
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.3rem" }}>
            <h3 style={{ margin: 0 }}>{result.result === "WIN" ? "Victory" : "Defeat"}</h3>
            <div>Points gained: +{result.rewardPoints}</div>
            <div>Rounds: {result.totalRounds}</div>
            <div>Survivors: you {result.battleStats.survivingPlayerUnits} · enemy {result.battleStats.survivingEnemyUnits}</div>
            <div>{result.bonusPackAwarded ? "Bonus pack reward triggered." : "No bonus pack this run."}</div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <Button onClick={() => void run()} disabled={team.length !== TEAM_SIZE || isRunning}>Play Again</Button>
              <Button onClick={() => { window.location.hash = "team-builder"; }}>Change Team</Button>
              <Button onClick={() => { window.location.href = "/packs"; }} disabled={!canOpenPack}>Open Packs</Button>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function TeamHealth({
  title,
  units,
  hpMap,
  action,
  side,
}: {
  title: string;
  units: BattleUnitSnapshot[];
  hpMap: Record<number, number>;
  action: BattleActionLog | null;
  side: "player" | "enemy";
}) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.9rem", padding: "0.75rem" }}>
      <p className="panel-label">{title}</p>
      <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.55rem" }}>
        {units.map((u) => {
          const hp = Math.max(0, hpMap[u.slot] ?? u.maxHp);
          const pct = Math.max(0, Math.min(100, Math.round((hp / u.maxHp) * 100)));
          const isActor = action?.actorSide === side && action.actorSlot === u.slot;
          const isTarget = action?.targetSide === side && action.targetSlot === u.slot;

          return (
            <div
              key={u.slot}
              style={{
                padding: "0.45rem",
                borderRadius: "0.6rem",
                border: isActor ? "1px solid #66e3ff" : isTarget ? "1px solid #ff7c7c" : "1px solid var(--line)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span>{u.name}</span>
                <span>{hp}/{u.maxHp}</span>
              </div>
              <div style={{ height: "7px", borderRadius: "999px", background: "#1b2434", marginTop: "0.25rem" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: pct > 45 ? "#3ddc97" : pct > 20 ? "#e9b949" : "#ef476f" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
