const SLOT_TYPES = ["STANDARD", "STANDARD", "STANDARD", "EDITION_BOOST", "RARITY_HIT"];

const RARITY_MULTIPLIERS = {
  STANDARD: { COMMON: 1.4, UNCOMMON: 1.1, RARE: 0.6, EPIC: 0.25, LEGENDARY: 0.1 },
  EDITION_BOOST: { COMMON: 1, UNCOMMON: 1, RARE: 1.1, EPIC: 1.2, LEGENDARY: 1.3 },
  RARITY_HIT: { COMMON: 0.1, UNCOMMON: 0.35, RARE: 1.4, EPIC: 2.4, LEGENDARY: 3.6 },
};

const EDITION_MULTIPLIERS = {
  STANDARD: { BASE: 1.3, REVERSE: 1, BRILLANTE: 0.8, HOLO: 0.6, FULL_ART: 0.4 },
  EDITION_BOOST: { BASE: 0.3, REVERSE: 1.1, BRILLANTE: 1.3, HOLO: 1.6, FULL_ART: 2 },
  RARITY_HIT: { BASE: 1, REVERSE: 1.1, BRILLANTE: 1.2, HOLO: 1.3, FULL_ART: 1.4 },
};

const ORIGIN_V1_MATRIX = {
  COMMON: { BASE: 520, REVERSE: 160, BRILLANTE: 60, HOLO: 20, FULL_ART: 6 },
  UNCOMMON: { BASE: 260, REVERSE: 95, BRILLANTE: 42, HOLO: 16, FULL_ART: 5 },
  RARE: { BASE: 130, REVERSE: 52, BRILLANTE: 24, HOLO: 10, FULL_ART: 4 },
  EPIC: { BASE: 60, REVERSE: 24, BRILLANTE: 12, HOLO: 6, FULL_ART: 3 },
  LEGENDARY: { BASE: 26, REVERSE: 11, BRILLANTE: 6, HOLO: 4, FULL_ART: 2 },
};

const V2_LOW_MATRIX = {
  COMMON: { BASE: 420, REVERSE: 100, BRILLANTE: 60, HOLO: 32, FULL_ART: 12 },
  UNCOMMON: { BASE: 230, REVERSE: 66, BRILLANTE: 50, HOLO: 30, FULL_ART: 10 },
  RARE: { BASE: 125, REVERSE: 38, BRILLANTE: 32, HOLO: 22, FULL_ART: 8 },
  EPIC: { BASE: 68, REVERSE: 22, BRILLANTE: 20, HOLO: 14, FULL_ART: 5 },
  LEGENDARY: { BASE: 18, REVERSE: 7, BRILLANTE: 6, HOLO: 5, FULL_ART: 3 },
};

const FINAL_80K_MATRIX = {
  COMMON: { BASE: 730, REVERSE: 130, BRILLANTE: 45, HOLO: 20, FULL_ART: 5 },
  UNCOMMON: { BASE: 240, REVERSE: 50, BRILLANTE: 20, HOLO: 8, FULL_ART: 2 },
  RARE: { BASE: 130, REVERSE: 30, BRILLANTE: 12, HOLO: 6, FULL_ART: 2 },
  EPIC: { BASE: 80, REVERSE: 18, BRILLANTE: 7, HOLO: 4, FULL_ART: 1 },
  LEGENDARY: { BASE: 45, REVERSE: 8, BRILLANTE: 3, HOLO: 3, FULL_ART: 1 },
};

function sumSupplyPerToken(matrix) {
  return Object.values(matrix)
    .flatMap((byEdition) => Object.values(byEdition))
    .reduce((sum, value) => sum + value, 0);
}

function expectedDistribution(matrix, packsOpened) {
  const rarityTotals = new Map();
  const editionTotals = new Map();

  for (const slotType of SLOT_TYPES) {
    const rows = [];

    for (const [rarityCode, byEdition] of Object.entries(matrix)) {
      for (const [editionCode, supply] of Object.entries(byEdition)) {
        const weight =
          supply *
          (RARITY_MULTIPLIERS[slotType][rarityCode] ?? 1) *
          (EDITION_MULTIPLIERS[slotType][editionCode] ?? 1);

        rows.push({ rarityCode, editionCode, weight });
      }
    }

    const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
    for (const row of rows) {
      const expectedCount = totalWeight > 0 ? (row.weight / totalWeight) * packsOpened : 0;
      rarityTotals.set(row.rarityCode, (rarityTotals.get(row.rarityCode) ?? 0) + expectedCount);
      editionTotals.set(row.editionCode, (editionTotals.get(row.editionCode) ?? 0) + expectedCount);
    }
  }

  return {
    rarity: Object.fromEntries([...rarityTotals.entries()].map(([k, v]) => [k, Number(v.toFixed(2))])),
    edition: Object.fromEntries([...editionTotals.entries()].map(([k, v]) => [k, Number(v.toFixed(2))])),
  };
}

function runScenario(label, matrix) {
  const perToken = sumSupplyPerToken(matrix);
  const global = perToken * 50;

  console.log(`\n=== ${label} ===`);
  console.log(`planned supply per token: ${perToken}`);
  console.log(`planned global supply (50 tokens): ${global}`);

  for (const packsOpened of [1000, 10000]) {
    const expected = expectedDistribution(matrix, packsOpened);
    console.log(`\n-- expected draws for ${packsOpened} opened packs (${packsOpened * 5} cards) --`);
    console.log("rarity:", expected.rarity);
    console.log("edition:", expected.edition);
  }
}

runScenario("ORIGIN_V1_MATRIX", ORIGIN_V1_MATRIX);
runScenario("V2_LOW_MATRIX", V2_LOW_MATRIX);
runScenario("FINAL_80K_MATRIX", FINAL_80K_MATRIX);
