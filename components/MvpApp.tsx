"use client";

import { useEffect, useMemo, useState } from "react";
import type { BaseCard } from "@/types/cards";

type CollectionItem = {
  baseCardId: string;
  quantity: number;
  card: BaseCard;
};

type MeResponse = {
  user: { id: string; username: string; points: number; packsOpened: number };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
};

function renderCard(card: BaseCard, qty: number | null = null, selectable = false, selected = false) {
  return (
    <article className="card" data-card-id={card.baseCardId}>
      <div className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.image} alt={card.name} loading="lazy" />
        <div>
          <div>
            <strong>{card.name}</strong> ({card.symbol})
          </div>
          <div className="small">Faction: {card.faction || "Unknown"}</div>
          <div className="small">
            Rank: #{card.marketCapRank ?? "N/A"} · Tier: {card.projectTier ?? "N/A"}
          </div>
          {qty !== null && <div className="small">Owned: {qty}</div>}
          {selectable && <div className="small">{selected ? "✅ In Team" : "Click to add"}</div>}
        </div>
      </div>
      <div className="stats">
        <span>ATK {card.ATK}</span>
        <span>DEF {card.DEF}</span>
        <span>SPD {card.SPD}</span>
        <span>CTRL {card.CTRL}</span>
      </div>
    </article>
  );
}

export function MvpApp() {
  const [username, setUsername] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [packResult, setPackResult] = useState<BaseCard[]>([]);
  const [battleLog, setBattleLog] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  const refresh = async () => {
    const res = await fetch("/api/me");
    if (!res.ok) {
      setMe(null);
      return;
    }
    const payload = (await res.json()) as MeResponse;
    setMe(payload);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const factions = useMemo(() => {
    if (!me) return [];
    return [...new Set(me.collection.map((x) => x.card.faction).filter(Boolean) as string[])].sort();
  }, [me]);

  const filteredCollection = useMemo(() => {
    if (!me) return [];
    const q = search.trim().toLowerCase();
    return me.collection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => {
        if (!q) return true;
        const hay = `${item.card.name} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.quantity - a.quantity);
  }, [me, search, faction]);

  const teamOwned = useMemo(() => {
    if (!me) return [];
    return me.collection.filter((x) => x.quantity > 0).slice(0, 60);
  }, [me]);

  const toggleTeam = (baseCardId: string) => {
    setSelectedTeam((prev) => {
      if (prev.includes(baseCardId)) return prev.filter((x) => x !== baseCardId);
      if (prev.length >= 3) return prev;
      return [...prev, baseCardId];
    });
  };

  const login = async () => {
    if (!username.trim()) return;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    if (!res.ok) {
      alert("Login error");
      return;
    }
    setPackResult([]);
    setBattleLog("");
    setSelectedTeam([]);
    await refresh();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setPackResult([]);
    setBattleLog("");
    setSelectedTeam([]);
  };

  const openPack = async () => {
    const res = await fetch("/api/pack/open", { method: "POST" });
    if (!res.ok) {
      const txt = await res.text();
      alert(txt || "Cannot open pack");
      return;
    }
    const payload = await res.json();
    setPackResult(payload.pulledCards as BaseCard[]);
    await refresh();
  };

  const runPve = async () => {
    if (!selectedTeam.length) return;
    const res = await fetch("/api/pve/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCardIds: selectedTeam, difficulty }),
    });
    if (!res.ok) {
      const txt = await res.text();
      alert(txt || "PvE error");
      return;
    }
    const payload = await res.json();
    setBattleLog(payload.log as string);
    await refresh();
  };

  return (
    <>
      <header>
        <h1>MCG MVP V1</h1>
        <p>Open packs → collect base cards → play PvE → earn rewards.</p>
      </header>

      <section className="panel">
        <h2>Login</h2>
        <div className="inline">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
          <button onClick={login}>Login / Register</button>
        </div>
        <p>{me ? `Active user: ${me.user.username}` : "No active user"}</p>
      </section>

      {me && (
        <>
          <section className="panel">
            <h2>Profile</h2>
            <div className="inline wrap">
              <strong>User: {me.user.username}</strong>
              <span>Points: {me.user.points}</span>
              <span>Packs opened: {me.user.packsOpened}</span>
              <span>Opening records: {me.openingsCount}</span>
              <span>PvE runs: {me.pveRunsCount}</span>
              <button onClick={logout}>Logout</button>
            </div>
          </section>

          <section className="panel">
            <h2>Pack Opening (Base Cards Only)</h2>
            <p>
              Each pack contains <strong>5 base cards</strong> using weighted tier/rank drop logic.
            </p>
            <button onClick={openPack}>Open Pack (cost: 100 points)</button>
            <div className="card-grid">{packResult.map((c) => <div key={c.baseCardId}>{renderCard(c, 1)}</div>)}</div>
          </section>

          <section className="panel">
            <h2>Collection</h2>
            <div className="inline wrap">
              <input
                placeholder="Filter by name / symbol / faction"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={faction} onChange={(e) => setFaction(e.target.value)}>
                <option value="">All factions</option>
                {factions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="card-grid">
              {filteredCollection.length
                ? filteredCollection.map((x) => <div key={x.baseCardId}>{renderCard(x.card, x.quantity)}</div>)
                : "No cards owned yet. Open a pack first."}
            </div>
          </section>

          <section className="panel">
            <h2>PvE Battle</h2>
            <p>Select up to 3 owned cards. Win for points and bonus pack chance.</p>
            <div className="inline">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
              <button onClick={runPve}>Start PvE Battle</button>
            </div>
            <div className="card-grid">
              {teamOwned.length
                ? teamOwned.map((x) => (
                    <button key={x.baseCardId} onClick={() => toggleTeam(x.baseCardId)}>
                      {renderCard(x.card, x.quantity, true, selectedTeam.includes(x.baseCardId))}
                    </button>
                  ))
                : "Own cards to build a PvE team."}
            </div>
            <pre>{battleLog}</pre>
          </section>
        </>
      )}
    </>
  );
}
