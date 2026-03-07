"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";

const DIFFICULTIES = [
  { value: "easy",   label: "Easy",   desc: "Low risk, low reward. Good for testing new squads." },
  { value: "normal", label: "Normal", desc: "Balanced encounter. Recommended for daily grinding." },
  { value: "hard",   label: "Hard",   desc: "High risk, max XP. Only for optimised squads." },
];

export default function CombatsPage() {
  const { me, refresh } = useSession();
  const [team, setTeam] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("normal");
  const [log, setLog] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const available = useMemo(
    () => me?.collection.filter((x) => x.quantity > 0).slice(0, 24) ?? [],
    [me]
  );

  const toggle = (id: string) => {
    setTeam((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const run = async () => {
    setIsRunning(true);
    setLog("");
    const res = await fetch("/api/pve/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCardIds: team, difficulty }),
    });
    if (!res.ok) {
      alert(await res.text());
      setIsRunning(false);
      return;
    }
    const payload = await res.json();
    setLog(payload.log as string);
    await refresh();
    setIsRunning(false);
  };

  const teamCards = team
    .map((id) => available.find((x) => x.baseCardId === id))
    .filter(Boolean);

  const currentDiff = DIFFICULTIES.find((d) => d.value === difficulty) ?? DIFFICULTIES[1];

  return (
    <SiteShell>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">PvE Arena</h1>
          <p className="page-subtitle">
            Select up to 3 cards, set the encounter difficulty, and run the battle
            to earn XP and progress your account.
          </p>
        </div>
      </div>

      {/* Two-column battle layout */}
      <div className="battle-layout">
        {/* Left — card picker */}
        <div>
          {!me ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚔</div>
              <p className="empty-state-title">Sign in to battle</p>
              <p className="empty-state-desc">
                Create an account, open some packs, then return here to run PvE encounters.
              </p>
            </div>
          ) : available.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◈</div>
              <p className="empty-state-title">No cards in your roster</p>
              <p className="empty-state-desc">
                Open a booster pack first to get cards you can bring into battle.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {available.map((item) => (
                <button
                  key={item.baseCardId}
                  className="card-select"
                  onClick={() => toggle(item.baseCardId)}
                  disabled={!team.includes(item.baseCardId) && team.length >= 3}
                  style={{ opacity: !team.includes(item.baseCardId) && team.length >= 3 ? 0.45 : 1 }}
                >
                  <CardFrame
                    card={item.card}
                    quantity={item.quantity}
                    selectable
                    selected={team.includes(item.baseCardId)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — battle sidebar */}
        <div className="battle-sidebar">
          {/* Squad builder */}
          <div className="battle-panel">
            <p className="panel-label">Your squad</p>
            <ProgressBar value={team.length} max={3} label="Slots filled" />
            <div className="squad-slots" style={{ marginTop: "0.75rem" }}>
              {[0, 1, 2].map((i) => {
                const card = teamCards[i];
                return (
                  <div key={i} className={`squad-slot${card ? " filled" : ""}`}>
                    <div className="squad-slot-num">{i + 1}</div>
                    {card ? (
                      <div className="squad-slot-info">
                        <div className="squad-slot-name">{card.card.name}</div>
                        <div className="squad-slot-sub">{card.card.faction || "Unknown"}</div>
                      </div>
                    ) : (
                      <span className="squad-slot-empty">Empty slot</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty selector */}
          <div className="battle-panel">
            <p className="panel-label">Difficulty</p>
            <div className="diff-tabs">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={`diff-tab${difficulty === d.value ? " active" : ""}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-3)", lineHeight: 1.6, marginTop: "0.6rem" }}>
              {currentDiff.desc}
            </p>
          </div>

          {/* Run button */}
          <Button
            onClick={() => void run()}
            disabled={team.length === 0 || isRunning}
            className="btn-lg"
            style={{ width: "100%" }}
          >
            {isRunning ? "Running encounter…" : "Start battle run"}
          </Button>

          {/* Battle log */}
          {log && (
            <div className="battle-log-box">
              <p className="panel-label">Battle log</p>
              <div className="battle-log-text">{log}</div>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
