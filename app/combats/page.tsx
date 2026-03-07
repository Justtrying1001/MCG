"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";

export default function CombatsPage() {
  const { me, refresh } = useSession();
  const [team, setTeam] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("normal");
  const [log, setLog] = useState("");

  const available = useMemo(() => me?.collection.filter((x) => x.quantity > 0).slice(0, 24) ?? [], [me]);

  const toggle = (id: string) => {
    setTeam((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  };

  const run = async () => {
    const res = await fetch("/api/pve/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCardIds: team, difficulty }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const payload = await res.json();
    setLog(payload.log as string);
    await refresh();
  };

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Combat PvE</h2>
        <p>Choisis jusqu&apos;à 3 cartes, ajuste la difficulté et tente de gagner des points.</p>
        <ProgressBar value={team.length} max={3} label="Composition équipe" />
      </section>

      <section className="filters">
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
        <Button onClick={() => void run()} disabled={team.length === 0}>Lancer le combat</Button>
      </section>

      <section className="card-grid">
        {available.map((item) => (
          <button className="card-select" key={item.baseCardId} onClick={() => toggle(item.baseCardId)}>
            <CardFrame card={item.card} quantity={item.quantity} selectable selected={team.includes(item.baseCardId)} />
          </button>
        ))}
      </section>

      {log ? <pre className="battle-log">{log}</pre> : null}
    </SiteShell>
  );
}
