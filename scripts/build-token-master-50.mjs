import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, 'MCG_Set1_Edition1_v3.csv');
const BASE_PATH = path.join(ROOT, 'mcg_base_cards.json');
const PROJECTS_PATH = path.join(ROOT, 'mcg_projects.json');
const VARIANTS_PATH = path.join(ROOT, 'mcg_card_variants.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'token-master-50.json');

const EXCLUDED_CSV_COINGECKO_IDS = new Set([
  'terra-luna',
  'banana-gun',
  'sats-ordinals',
]);

const PREFERRED_REPLACEMENT_COINGECKO_IDS = [
  'pump-fun',
  'pippin',
  'dogwifcoin',
];

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line, idx) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    row.__csvRow = idx + 2;
    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function byKeyMulti(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const v = normalize(row[key]);
    if (!v) continue;
    const list = map.get(v) ?? [];
    list.push(row);
    map.set(v, list);
  }
  return map;
}

function parseSetOrder(cardNumber, fallback) {
  const m = String(cardNumber).match(/-(\d+)$/);
  if (m) return Number.parseInt(m[1], 10);
  return fallback;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function pickDefaultVariant(variants) {
  if (!variants || variants.length === 0) return null;
  return variants.find((v) => Boolean(v.isDefaultVariant)) ?? variants[0];
}

function rankValue(row) {
  return Number.isFinite(row?.marketCapRank) ? row.marketCapRank : Number.MAX_SAFE_INTEGER;
}

function csvReplacementRowFromBase(baseRow, order, note) {
  return {
    cardNumber: `S01-${String(order).padStart(3, '0')}`,
    masterCardId: `MCG-RPL-${String(order).padStart(3, '0')}`,
    coingeckoId: baseRow.coingeckoId,
    name: baseRow.name,
    symbol: baseRow.symbol,
    cardTitle: baseRow.name,
    cardSubtitle: 'Replacement slot (auto-filled)',
    flavorText: 'Auto-filled replacement token for canonical MVP50 mapping integrity.',
    setCode: 'S01',
    collectionCode: 'GENESIS',
    edition: 'Edition 1',
    artist: 'TBD',
    visualIdentityCore: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    heroFocus: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    allowedMotifs: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    forbiddenMotifs: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    colorCues: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    artTone: 'AUTO_FILLED_FROM_LEGACY_SOURCE',
    archetype: 'REPLACEMENT',
    cardworthiness: 'AUTO',
    primaryChain: baseRow.primaryChain ?? 'Other',
    __csvRow: null,
    __replacement: {
      source: 'legacy_top_ranked_clean_match',
      reason: note,
      replacedProblematicCoingeckoIds: [...EXCLUDED_CSV_COINGECKO_IDS],
    },
  };
}

function collectCandidates({ csv, baseIdx, projectIdx }) {
  const candidates = [];
  const cg = normalize(csv.coingeckoId);
  const sym = normalize(csv.symbol);
  const name = normalize(csv.name);

  const byCg = baseIdx.coingeckoId.get(cg) ?? [];
  if (byCg.length === 1) return { match: byCg[0], strategy: 'coingeckoId', confidence: 'high', candidates };
  if (byCg.length > 1) {
    return {
      match: null,
      strategy: 'coingeckoId',
      confidence: 'low',
      candidates: byCg.map((r) => ({ source: 'base', reason: 'coingeckoId', coingeckoId: r.coingeckoId, projectId: r.projectId, baseCardId: r.baseCardId, name: r.name, symbol: r.symbol }))
    };
  }

  // strict fallback: same symbol AND same name in base
  const bySym = baseIdx.symbol.get(sym) ?? [];
  const symName = bySym.filter((r) => normalize(r.name) === name);
  if (symName.length === 1) return { match: symName[0], strategy: 'symbol+name', confidence: 'medium', candidates };

  // candidate hints for manual review
  const byName = baseIdx.name.get(name) ?? [];
  candidates.push(
    ...bySym.slice(0, 8).map((r) => ({ source: 'base', reason: 'symbol', coingeckoId: r.coingeckoId, projectId: r.projectId, baseCardId: r.baseCardId, name: r.name, symbol: r.symbol })),
    ...byName.slice(0, 8).map((r) => ({ source: 'base', reason: 'name', coingeckoId: r.coingeckoId, projectId: r.projectId, baseCardId: r.baseCardId, name: r.name, symbol: r.symbol }))
  );

  const projCg = projectIdx.coingeckoId.get(cg) ?? [];
  candidates.push(
    ...projCg.slice(0, 5).map((r) => ({ source: 'projects', reason: 'coingeckoId', coingeckoId: r.coingeckoId, projectId: r.projectId, name: r.name, symbol: r.symbol }))
  );

  return { match: null, strategy: 'manual', confidence: 'low', candidates };
}

function main() {
  const csvRowsRaw = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const baseCards = JSON.parse(readFileSync(BASE_PATH, 'utf8'));
  const projects = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8'));
  const variants = JSON.parse(readFileSync(VARIANTS_PATH, 'utf8'));

  const csvRows = csvRowsRaw.filter((row) => !EXCLUDED_CSV_COINGECKO_IDS.has(normalize(row.coingeckoId)));
  const removedRows = csvRowsRaw.filter((row) => EXCLUDED_CSV_COINGECKO_IDS.has(normalize(row.coingeckoId)));

  const baseIdx = {
    coingeckoId: byKeyMulti(baseCards, 'coingeckoId'),
    symbol: byKeyMulti(baseCards, 'symbol'),
    name: byKeyMulti(baseCards, 'name'),
  };

  const projectIdx = {
    coingeckoId: byKeyMulti(projects, 'coingeckoId'),
  };

  const projectById = new Map(projects.map((p) => [p.projectId, p]));

  const existingCoingecko = new Set(csvRows.map((row) => normalize(row.coingeckoId)));
  const eligibleBaseSorted = baseCards
    .filter((row) => row?.isEligible !== false)
    .sort((a, b) => {
      const ra = rankValue(a);
      const rb = rankValue(b);
      if (ra !== rb) return ra - rb;
      return String(a.slug ?? a.name).localeCompare(String(b.slug ?? b.name));
    });

  const replacementRows = [];

  for (const preferred of PREFERRED_REPLACEMENT_COINGECKO_IDS) {
    const candidate = eligibleBaseSorted.find((row) => normalize(row.coingeckoId) === normalize(preferred));
    if (!candidate) continue;
    if (existingCoingecko.has(normalize(candidate.coingeckoId))) continue;
    replacementRows.push(
      csvReplacementRowFromBase(
        candidate,
        csvRows.length + replacementRows.length + 1,
        `preferred_replacement:${preferred}`,
      ),
    );
    existingCoingecko.add(normalize(candidate.coingeckoId));
    if (replacementRows.length >= removedRows.length) break;
  }

  if (replacementRows.length < removedRows.length) {
    for (const candidate of eligibleBaseSorted) {
      const cg = normalize(candidate.coingeckoId);
      if (!cg || existingCoingecko.has(cg)) continue;
      replacementRows.push(
        csvReplacementRowFromBase(
          candidate,
          csvRows.length + replacementRows.length + 1,
          'fallback_top_ranked_clean_match',
        ),
      );
      existingCoingecko.add(cg);
      if (replacementRows.length >= removedRows.length) break;
    }
  }

  const workingRows = [...csvRows, ...replacementRows]
    .slice(0, 50)
    .sort((a, b) => parseSetOrder(a.cardNumber, Number.MAX_SAFE_INTEGER) - parseSetOrder(b.cardNumber, Number.MAX_SAFE_INTEGER));

  if (workingRows.length !== 50) {
    throw new Error(`Expected 50 working rows after replacement, got ${workingRows.length}`);
  }
  const variantsByBaseCardId = new Map();
  for (const row of variants) {
    const list = variantsByBaseCardId.get(row.baseCardId) ?? [];
    list.push(row);
    variantsByBaseCardId.set(row.baseCardId, list);
  }

  const tokens = workingRows.map((csv, idx) => {
    const mapping = collectCandidates({ csv, baseIdx, projectIdx });
    const base = mapping.match;
    const project = base?.projectId ? projectById.get(base.projectId) : null;
    const baseVariants = base ? variantsByBaseCardId.get(base.baseCardId) ?? [] : [];
    const defaultVariant = pickDefaultVariant(baseVariants);

    const migrationStatus = base ? 'AUTO_MAPPED' : 'REVIEW_REQUIRED';
    const manualReviewRequired = !base;
    const manualReviewReason = base
      ? null
      : `No unique deterministic match from CSV row using coingeckoId/symbol+name strategy (coingeckoId=${csv.coingeckoId}).`;

    const resolvedSlug = base?.slug ?? project?.slug ?? slugify(csv.name);

    return {
      tokenId: `tok_${resolvedSlug}`,
      setOrder: parseSetOrder(csv.cardNumber, idx + 1),
      sourceCsvRow: csv.__csvRow,

      displayName: csv.name,
      symbol: csv.symbol,
      slug: resolvedSlug,
      coingeckoId: csv.coingeckoId,
      projectId: base?.projectId ?? project?.projectId ?? null,
      baseCardId: base?.baseCardId ?? null,

      imageUrl: base?.image ?? project?.image ?? null,
      primaryChain: base?.primaryChain ?? project?.primaryChain ?? csv.primaryChain ?? null,
      faction: base?.faction ?? project?.faction ?? null,
      marketCapRank: Number.isFinite(base?.marketCapRank) ? base.marketCapRank : (Number.isFinite(project?.marketCapRank) ? project.marketCapRank : null),
      projectTier: base?.projectTier ?? null,
      isMvpEligible: base?.isEligible ?? project?.isEligible ?? true,

      editorial: {
        cardNumber: csv.cardNumber,
        masterCardId: csv.masterCardId,
        cardTitle: csv.cardTitle,
        cardSubtitle: csv.cardSubtitle,
        flavorText: csv.flavorText,
        setCode: csv.setCode,
        collectionCode: csv.collectionCode,
        editionLabel: csv.edition,
        artist: csv.artist,
        visualIdentityCore: csv.visualIdentityCore,
        heroFocus: csv.heroFocus,
        allowedMotifs: csv.allowedMotifs,
        forbiddenMotifs: csv.forbiddenMotifs,
        colorCues: csv.colorCues,
        artTone: csv.artTone,
        archetype: csv.archetype,
        cardworthiness: csv.cardworthiness,
        heroArtworkPrompt: csv.heroArtworkPrompt,
      },

      replacementMeta: csv.__replacement ?? null,

      legacyVariantBridge: defaultVariant
        ? {
            variantId: defaultVariant.variantId,
            variantType: defaultVariant.variantType,
            variantRarity: defaultVariant.variantRarity,
            frameStyle: defaultVariant.frameStyle,
            isDefaultVariant: Boolean(defaultVariant.isDefaultVariant),
          }
        : null,

      migrationStatus,
      mappingConfidence: mapping.confidence,
      mappingStrategy: mapping.strategy,
      manualReviewRequired,
      manualReviewReason,
      candidateMatches: mapping.candidates,

      fieldSources: {
        displayName: 'csv.name',
        symbol: 'csv.symbol',
        coingeckoId: 'csv.coingeckoId',
        slug: base?.slug ? 'mcg_base_cards.json.slug' : (project?.slug ? 'mcg_projects.json.slug' : 'derived_from_csv_name'),
        projectId: base?.projectId ? 'mcg_base_cards.json.projectId' : (project?.projectId ? 'mcg_projects.json.projectId' : 'unresolved'),
        baseCardId: base?.baseCardId ? 'mcg_base_cards.json.baseCardId' : 'unresolved',
        imageUrl: base?.image ? 'mcg_base_cards.json.image' : (project?.image ? 'mcg_projects.json.image' : 'unresolved'),
        primaryChain: base?.primaryChain ? 'mcg_base_cards.json.primaryChain' : (project?.primaryChain ? 'mcg_projects.json.primaryChain' : 'csv.primaryChain'),
        faction: base?.faction ? 'mcg_base_cards.json.faction' : (project?.faction ? 'mcg_projects.json.faction' : 'unresolved'),
        marketCapRank: Number.isFinite(base?.marketCapRank) ? 'mcg_base_cards.json.marketCapRank' : (Number.isFinite(project?.marketCapRank) ? 'mcg_projects.json.marketCapRank' : 'unresolved'),
        projectTier: base?.projectTier ? 'mcg_base_cards.json.projectTier' : 'unresolved',
        isMvpEligible: base?.isEligible !== undefined ? 'mcg_base_cards.json.isEligible' : (project?.isEligible !== undefined ? 'mcg_projects.json.isEligible' : 'default_true'),
      },
    };
  }).sort((a, b) => a.setOrder - b.setOrder);

  const summary = {
    total: tokens.length,
    autoMapped: tokens.filter((t) => t.migrationStatus === 'AUTO_MAPPED').length,
    reviewRequired: tokens.filter((t) => t.manualReviewRequired).length,
    highConfidence: tokens.filter((t) => t.mappingConfidence === 'high').length,
    mediumConfidence: tokens.filter((t) => t.mappingConfidence === 'medium').length,
    lowConfidence: tokens.filter((t) => t.mappingConfidence === 'low').length,
    problematicTokens: tokens
      .filter((t) => t.manualReviewRequired)
      .map((t) => ({ setOrder: t.setOrder, displayName: t.displayName, coingeckoId: t.coingeckoId, reason: t.manualReviewReason })),
    excludedProblematicFromCsv: removedRows.map((row) => ({
      sourceCsvRow: row.__csvRow,
      coingeckoId: row.coingeckoId,
      name: row.name,
      symbol: row.symbol,
    })),
    replacementsAdded: replacementRows.map((row) => ({
      coingeckoId: row.coingeckoId,
      name: row.name,
      symbol: row.symbol,
      reason: row.__replacement?.reason ?? null,
    })),
  };

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    inputSources: {
      csv: path.basename(CSV_PATH),
      baseCardsJson: path.basename(BASE_PATH),
      projectsJson: path.basename(PROJECTS_PATH),
      variantsJson: path.basename(VARIANTS_PATH),
    },
    matchingPolicy: {
      primaryKey: 'coingeckoId',
      fallback: 'symbol+name exact',
      ambiguousHandling: 'manual_review_required',
    },
    summary,
    tokens,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log('[token-master-50] wrote', OUTPUT_PATH);
  console.log('[token-master-50] summary', JSON.stringify(summary));
}

main();
