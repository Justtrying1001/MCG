import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'data', 'sources');
const CSV_PATH = path.join(SOURCES_DIR, 'MCG_Set1_Edition1_v3.csv');
const BASE_PATH = path.join(SOURCES_DIR, 'mcg_base_cards.json');
const PROJECTS_PATH = path.join(SOURCES_DIR, 'mcg_projects.json');
const VARIANTS_PATH = path.join(SOURCES_DIR, 'mcg_card_variants.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'token-master-25.json');

const TARGET_COINGECKO_IDS = new Set([
  'dogecoin', 'shiba-inu', 'pepe', 'official-trump', 'bonk',
  'pudgy-penguins', 'fartcoin', 'floki', 'mog-coin', 'dogelon-mars',
  'dogwifcoin', 'pump-fun', 'ape-and-pepe', 'turbo', 'spx6900',
  'baby-doge-coin', 'cheems-token', 'pippin', 'peanut-the-squirrel', 'toshi',
  'popcat', 'memecore', 'based-brett', 'melania-meme', 'pepe-unchained',
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
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

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = { __lineNumber: index + 2 };
    headers.forEach((header, i) => {
      row[header] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function byKey(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = normalize(row[key]);
    if (value) map.set(value, row);
  }
  return map;
}

function pickDefaultVariant(variantsByBaseId, baseCardId) {
  if (!baseCardId) return null;
  const variants = variantsByBaseId.get(baseCardId) ?? [];
  return variants.find((entry) => entry.isDefaultVariant) ?? variants[0] ?? null;
}

function toCardNumber(setOrder) {
  return `G01-${String(setOrder).padStart(3, '0')}`;
}

function main() {
  const csvRows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const baseCards = JSON.parse(readFileSync(BASE_PATH, 'utf8'));
  const projects = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8'));
  const variants = JSON.parse(readFileSync(VARIANTS_PATH, 'utf8'));

  const selectedRows = csvRows.filter((row) => TARGET_COINGECKO_IDS.has(normalize(row.coingeckoId)));

  if (selectedRows.length !== 25) {
    throw new Error(`Expected 25 selected CSV rows, got ${selectedRows.length}.`);
  }

  const baseByCgId = byKey(baseCards, 'coingeckoId');
  const projectByCgId = byKey(projects, 'coingeckoId');

  const variantsByBaseCardId = new Map();
  for (const variant of variants) {
    const baseCardId = variant.baseCardId;
    const list = variantsByBaseCardId.get(baseCardId) ?? [];
    list.push(variant);
    variantsByBaseCardId.set(baseCardId, list);
  }

  const tokens = selectedRows
    .sort((a, b) => a.__lineNumber - b.__lineNumber)
    .map((csvRow, index) => {
      const setOrder = index + 1;
      const coingeckoId = normalize(csvRow.coingeckoId);
      const base = baseByCgId.get(coingeckoId) ?? null;
      const project = projectByCgId.get(coingeckoId) ?? null;
      const defaultVariant = pickDefaultVariant(variantsByBaseCardId, base?.baseCardId ?? null);

      const slug = base?.slug ?? project?.slug ?? coingeckoId;

      return {
        tokenId: `tok_${slug}`,
        setOrder,
        sourceCsvRow: csvRow.__lineNumber,
        displayName: csvRow.name,
        symbol: csvRow.symbol,
        slug,
        coingeckoId,
        projectId: base?.projectId ?? project?.projectId ?? null,
        baseCardId: base?.baseCardId ?? null,
        imageUrl: base?.image ?? project?.image ?? null,
        primaryChain: base?.primaryChain ?? project?.primaryChain ?? csvRow.primaryChain ?? null,
        faction: base?.faction ?? project?.faction ?? null,
        marketCapRank: base?.marketCapRank ?? project?.marketCapRank ?? null,
        projectTier: base?.projectTier ?? null,
        isMvpEligible: base?.isEligible !== false,
        editorial: {
          cardNumber: toCardNumber(setOrder),
          masterCardId: csvRow.masterCardId || null,
          cardTitle: csvRow.cardTitle || csvRow.name,
          cardSubtitle: csvRow.cardSubtitle || null,
          flavorText: csvRow.flavorText || null,
          setCode: csvRow.setCode || 'S01',
          collectionCode: csvRow.collectionCode || 'GENESIS',
          editionLabel: csvRow.edition || 'Edition 1',
          artist: csvRow.artist || null,
          visualIdentityCore: csvRow.visualIdentityCore || null,
          heroFocus: csvRow.heroFocus || null,
          allowedMotifs: csvRow.allowedMotifs || null,
          forbiddenMotifs: csvRow.forbiddenMotifs || null,
          colorCues: csvRow.colorCues || null,
          artTone: csvRow.artTone || null,
          archetype: csvRow.archetype || null,
          cardworthiness: csvRow.cardworthiness || null,
          heroArtworkPrompt: csvRow.heroArtworkPrompt || null,
        },
        replacementMeta: null,
        legacyVariantBridge: defaultVariant
          ? {
              variantId: defaultVariant.variantId ?? null,
              variantType: defaultVariant.variantType ?? null,
              variantRarity: defaultVariant.variantRarity ?? null,
              frameStyle: defaultVariant.frameStyle ?? null,
              isDefaultVariant: defaultVariant.isDefaultVariant ?? true,
            }
          : null,
        migrationStatus: 'AUTO_MAPPED',
        mappingConfidence: 'high',
        mappingStrategy: 'csv+coingeckoId',
        manualReviewRequired: false,
        manualReviewReason: null,
        candidateMatches: [],
        fieldSources: {
          displayName: 'csv.name',
          symbol: 'csv.symbol',
          coingeckoId: 'csv.coingeckoId',
          slug: base?.slug ? 'mcg_base_cards.json.slug' : (project?.slug ? 'mcg_projects.json.slug' : 'derived'),
          projectId: base?.projectId ? 'mcg_base_cards.json.projectId' : (project?.projectId ? 'mcg_projects.json.projectId' : 'unresolved'),
          baseCardId: base?.baseCardId ? 'mcg_base_cards.json.baseCardId' : 'unresolved',
          imageUrl: base?.image ? 'mcg_base_cards.json.image' : (project?.image ? 'mcg_projects.json.image' : 'unresolved'),
          primaryChain: base?.primaryChain ? 'mcg_base_cards.json.primaryChain' : (project?.primaryChain ? 'mcg_projects.json.primaryChain' : 'csv.primaryChain'),
          faction: base?.faction ? 'mcg_base_cards.json.faction' : (project?.faction ? 'mcg_projects.json.faction' : 'unresolved'),
          marketCapRank: Number.isFinite(base?.marketCapRank) ? 'mcg_base_cards.json.marketCapRank' : (Number.isFinite(project?.marketCapRank) ? 'mcg_projects.json.marketCapRank' : 'unresolved'),
          projectTier: base?.projectTier ? 'mcg_base_cards.json.projectTier' : 'unresolved',
          isMvpEligible: 'mcg_base_cards.json.isEligible',
        },
      };
    });

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      total: tokens.length,
      source: 'MCG_Set1_Edition1_v3.csv',
      selection: 'fixed-25-target-coingecko-ids',
      autoMapped: tokens.length,
      reviewRequired: 0,
    },
    tokens,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log('[token-master-25] wrote', OUTPUT_PATH, 'with', tokens.length, 'tokens');
}

main();
