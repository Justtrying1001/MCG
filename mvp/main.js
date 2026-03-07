const DB_KEY = "mcg_mvp_v1_db";
const SESSION_KEY = "mcg_mvp_v1_session";
const STARTING_POINTS = 300;
const PACK_COST = 100;
const CARDS_PER_PACK = 5;

const tierBaseWeight = { S: 1, A: 2, B: 4, C: 6, D: 8 };
const difficultyScale = {
  easy: { enemyMult: 0.9, reward: 80 },
  normal: { enemyMult: 1.0, reward: 120 },
  hard: { enemyMult: 1.2, reward: 180 },
};

const state = {
  cards: [],
  byId: new Map(),
  currentUser: null,
  selectedTeam: new Set(),
};

const el = {
  authSection: document.getElementById("auth-section"),
  userSection: document.getElementById("user-section"),
  packSection: document.getElementById("pack-section"),
  collectionSection: document.getElementById("collection-section"),
  pveSection: document.getElementById("pve-section"),
  usernameInput: document.getElementById("username-input"),
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  authState: document.getElementById("auth-state"),
  activeUser: document.getElementById("active-user"),
  balance: document.getElementById("balance"),
  packCount: document.getElementById("pack-count"),
  openingsCount: document.getElementById("openings-count"),
  openPackBtn: document.getElementById("open-pack-btn"),
  packResult: document.getElementById("pack-result"),
  collectionSearch: document.getElementById("collection-search"),
  factionFilter: document.getElementById("faction-filter"),
  collection: document.getElementById("collection"),
  teamPicker: document.getElementById("team-picker"),
  difficulty: document.getElementById("difficulty"),
  startPveBtn: document.getElementById("start-pve-btn"),
  battleLog: document.getElementById("battle-log"),
};

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : { users: {} };
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getUserRecord(username) {
  const db = loadDB();
  if (!db.users[username]) {
    db.users[username] = {
      username,
      points: STARTING_POINTS,
      packsOpened: 0,
      openings: [],
      collection: {},
      pveHistory: [],
    };
    saveDB(db);
  }
  return db.users[username];
}

function persistCurrentUser() {
  const db = loadDB();
  db.users[state.currentUser.username] = state.currentUser;
  saveDB(db);
}

function setSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function weightedCardsPool() {
  return state.cards.map((card) => {
    const tier = card.projectTier || "D";
    const base = tierBaseWeight[tier] ?? 8;
    const rank = Number(card.marketCapRank) || 1000;
    const rankFactor = Math.max(0.3, 1 - Math.min(rank, 2000) / 3000);
    return { card, weight: base * (1 + rankFactor) };
  });
}

function drawWeighted(pool) {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.card;
  }
  return pool[pool.length - 1].card;
}

function openPack() {
  if (state.currentUser.points < PACK_COST) {
    alert("Not enough points.");
    return;
  }

  const pool = weightedCardsPool();
  const pulled = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    const card = drawWeighted(pool);
    pulled.push(card);
    state.currentUser.collection[card.baseCardId] = (state.currentUser.collection[card.baseCardId] || 0) + 1;
  }

  state.currentUser.points -= PACK_COST;
  state.currentUser.packsOpened += 1;
  state.currentUser.openings.push({ at: new Date().toISOString(), cards: pulled.map((c) => c.baseCardId) });
  persistCurrentUser();
  renderAll();
  el.packResult.innerHTML = pulled.map((c) => renderCard(c, 1)).join("");
}

function renderCard(card, qty = null, selectable = false) {
  const selected = state.selectedTeam.has(card.baseCardId);
  return `
    <article class="card" data-card-id="${card.baseCardId}">
      <div class="top">
        <img src="${card.image}" alt="${card.name}" loading="lazy" />
        <div>
          <div><strong>${card.name}</strong> (${card.symbol})</div>
          <div class="small">Faction: ${card.faction || "Unknown"}</div>
          <div class="small">Rank: #${card.marketCapRank ?? "N/A"} · Tier: ${card.projectTier ?? "N/A"}</div>
          ${qty !== null ? `<div class="small">Owned: ${qty}</div>` : ""}
          ${selectable ? `<div class="small">${selected ? "✅ In Team" : "Click to add"}</div>` : ""}
        </div>
      </div>
      <div class="stats">
        <span>ATK ${card.ATK}</span>
        <span>DEF ${card.DEF}</span>
        <span>SPD ${card.SPD}</span>
        <span>CTRL ${card.CTRL}</span>
      </div>
    </article>
  `;
}

function renderProfile() {
  el.activeUser.textContent = `User: ${state.currentUser.username}`;
  el.balance.textContent = `Points: ${state.currentUser.points}`;
  el.packCount.textContent = `Packs opened: ${state.currentUser.packsOpened}`;
  el.openingsCount.textContent = `Opening records: ${state.currentUser.openings.length}`;
}

function renderCollection() {
  const q = el.collectionSearch.value.trim().toLowerCase();
  const faction = el.factionFilter.value;
  const owned = Object.entries(state.currentUser.collection)
    .map(([id, qty]) => ({ card: state.byId.get(id), qty }))
    .filter((x) => x.card && x.qty > 0)
    .filter(({ card }) => {
      if (faction && card.faction !== faction) return false;
      if (!q) return true;
      const hay = `${card.name} ${card.symbol} ${card.faction}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.qty - a.qty);

  el.collection.innerHTML = owned.length
    ? owned.map(({ card, qty }) => renderCard(card, qty)).join("")
    : "<p>No cards owned yet. Open a pack first.</p>";
}

function renderTeamPicker() {
  const ownedCards = Object.entries(state.currentUser.collection)
    .filter(([, qty]) => qty > 0)
    .slice(0, 60)
    .map(([id]) => state.byId.get(id))
    .filter(Boolean);

  el.teamPicker.innerHTML = ownedCards.length
    ? ownedCards.map((card) => renderCard(card, state.currentUser.collection[card.baseCardId], true)).join("")
    : "<p>Own cards to build a PvE team.</p>";

  [...el.teamPicker.querySelectorAll(".card")].forEach((node) => {
    node.addEventListener("click", () => {
      const id = node.dataset.cardId;
      if (state.selectedTeam.has(id)) {
        state.selectedTeam.delete(id);
      } else {
        if (state.selectedTeam.size >= 3) return;
        state.selectedTeam.add(id);
      }
      renderTeamPicker();
    });
  });
}

function runPveBattle() {
  const ids = [...state.selectedTeam];
  if (!ids.length) {
    alert("Select at least one card.");
    return;
  }

  const playerCards = ids.map((id) => state.byId.get(id)).filter(Boolean);
  const playerPower = playerCards.reduce((s, c) => s + c.ATK + c.DEF + c.SPD + c.CTRL, 0);

  const enemyCards = [];
  const pool = weightedCardsPool();
  for (let i = 0; i < playerCards.length; i++) enemyCards.push(drawWeighted(pool));
  const scale = difficultyScale[el.difficulty.value];
  const enemyPower = Math.round(enemyCards.reduce((s, c) => s + c.ATK + c.DEF + c.SPD + c.CTRL, 0) * scale.enemyMult);

  const won = playerPower >= enemyPower;
  let reward = won ? scale.reward : Math.round(scale.reward * 0.2);
  let bonusPack = false;

  if (won && Math.random() < 0.15) {
    bonusPack = true;
    reward += PACK_COST;
  }

  state.currentUser.points += reward;
  state.currentUser.pveHistory.push({
    at: new Date().toISOString(),
    difficulty: el.difficulty.value,
    won,
    reward,
    playerPower,
    enemyPower,
  });
  persistCurrentUser();
  renderProfile();

  el.battleLog.textContent = [
    `Battle result: ${won ? "WIN" : "LOSS"}`,
    `Difficulty: ${el.difficulty.value}`,
    `Player power: ${playerPower}`,
    `Enemy power: ${enemyPower}`,
    `Reward points: ${reward}`,
    bonusPack ? "Bonus drop: points equivalent to 1 free pack." : "Bonus drop: none",
    `Loop state: open packs -> collect -> PvE -> rewards -> open more packs`,
  ].join("\n");
}

function renderAll() {
  const loggedIn = Boolean(state.currentUser);
  el.userSection.classList.toggle("hidden", !loggedIn);
  el.packSection.classList.toggle("hidden", !loggedIn);
  el.collectionSection.classList.toggle("hidden", !loggedIn);
  el.pveSection.classList.toggle("hidden", !loggedIn);

  el.authState.textContent = loggedIn ? `Active user: ${state.currentUser.username}` : "No active user";

  if (!loggedIn) return;

  renderProfile();
  renderCollection();
  renderTeamPicker();
}

async function init() {
  const rawCards = await fetch("../mcg_base_cards.json").then((r) => r.json());
  state.cards = rawCards.filter((c) => c.isEligible !== false);
  state.byId = new Map(state.cards.map((c) => [c.baseCardId, c]));

  const factions = [...new Set(state.cards.map((c) => c.faction).filter(Boolean))].sort();
  el.factionFilter.innerHTML += factions.map((f) => `<option value="${f}">${f}</option>`).join("");

  const sessionUser = localStorage.getItem(SESSION_KEY);
  if (sessionUser) {
    state.currentUser = getUserRecord(sessionUser);
  }

  el.loginBtn.addEventListener("click", () => {
    const username = el.usernameInput.value.trim();
    if (!username) return;
    state.currentUser = getUserRecord(username);
    state.selectedTeam.clear();
    setSession(username);
    renderAll();
  });

  el.logoutBtn.addEventListener("click", () => {
    state.currentUser = null;
    clearSession();
    state.selectedTeam.clear();
    renderAll();
  });

  el.openPackBtn.addEventListener("click", openPack);
  el.collectionSearch.addEventListener("input", renderCollection);
  el.factionFilter.addEventListener("change", renderCollection);
  el.startPveBtn.addEventListener("click", runPveBattle);

  renderAll();
}

init();
