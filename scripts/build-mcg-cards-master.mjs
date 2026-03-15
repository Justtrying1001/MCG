/**
 * build-mcg-cards-master.mjs
 *
 * Consolidates all 4 source files into a single flat data/mcg-cards-master.json
 * with one entry per token (50 entries).
 *
 * Sources:
 *   MCG_Set1_Edition1_v3.csv        → editorial / art fields
 *   mcg_base_cards.json             → imageUrl, slug, projectId, baseCardId, primaryChain, faction, marketCapRank, projectTier
 *   mcg_projects.json               → fallback for base_cards misses
 *   mcg_card_variants.json          → variantType, frameStyle, isDefaultVariant
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_PATH      = path.join(ROOT, 'MCG_Set1_Edition1_v3.csv');
const BASE_PATH     = path.join(ROOT, 'mcg_base_cards.json');
const PROJECTS_PATH = path.join(ROOT, 'mcg_projects.json');
const VARIANTS_PATH = path.join(ROOT, 'mcg_card_variants.json');
const TOKEN_MASTER  = path.join(ROOT, 'data', 'token-master-50.json');
const OUTPUT_PATH   = path.join(ROOT, 'data', 'mcg-cards-master.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalize(v) { return String(v ?? '').trim().toLowerCase(); }

function byKey(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const v = normalize(row[key]);
    if (v) map.set(v, row);
  }
  return map;
}

function pickDefaultVariant(variants) {
  if (!variants || variants.length === 0) return null;
  return variants.find(v => v.isDefaultVariant) ?? variants[0];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // ── Load sources ──────────────────────────────────────────────────────────
  const csvRows  = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const baseCards = JSON.parse(readFileSync(BASE_PATH, 'utf8'));
  const projects  = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8'));
  const variants  = JSON.parse(readFileSync(VARIANTS_PATH, 'utf8'));

  // Load already-resolved token-master-50.json so we reuse its coingeckoId→base
  // mapping (which handles excluded tokens + replacements)
  const tokenMaster = JSON.parse(readFileSync(TOKEN_MASTER, 'utf8'));
  const masterTokens = tokenMaster.tokens;

  // ── Index source files ────────────────────────────────────────────────────
  const baseByCgId       = byKey(baseCards, 'coingeckoId');
  const baseByBaseCardId = byKey(baseCards, 'baseCardId');
  const projectByCgId    = byKey(projects,  'coingeckoId');
  const projectByProjId  = byKey(projects,  'projectId');
  const csvByCgId        = byKey(csvRows,   'coingeckoId');

  // variants by baseCardId → list
  const variantsByBaseCardId = new Map();
  for (const v of variants) {
    const list = variantsByBaseCardId.get(v.baseCardId) ?? [];
    list.push(v);
    variantsByBaseCardId.set(v.baseCardId, list);
  }

  // ── Build consolidated entries ────────────────────────────────────────────
  const cards = masterTokens.map(tok => {
    const cgId   = tok.coingeckoId;
    // Primary lookup by coingeckoId; fall back to baseCardId for tokens matched
    // via symbol+name in token-master (e.g. hachiko has cgId='hachiko' but
    // its base entry key is 'hachiko-3').
    const base   = baseByCgId.get(normalize(cgId))
                ?? (tok.baseCardId ? baseByBaseCardId.get(normalize(tok.baseCardId)) : null)
                ?? null;
    const proj   = projectByCgId.get(normalize(cgId))
                ?? (tok.projectId ? projectByProjId.get(normalize(tok.projectId)) : null)
                ?? null;
    const csv    = csvByCgId.get(normalize(cgId))     ?? null;

    // Editorial — prefer CSV row when available, fall back to tok.editorial
    const ed = {
      cardNumber:      csv?.cardNumber      ?? tok.editorial?.cardNumber      ?? null,
      masterCardId:    csv?.masterCardId    ?? null,
      cardTitle:       csv?.cardTitle       ?? tok.editorial?.cardTitle       ?? tok.displayName,
      cardSubtitle:    csv?.cardSubtitle    ?? tok.editorial?.cardSubtitle    ?? null,
      flavorText:      csv?.flavorText      ?? tok.editorial?.flavorText      ?? null,
      setCode:         csv?.setCode         ?? tok.editorial?.setCode         ?? 'S01',
      collectionCode:  csv?.collectionCode  ?? tok.editorial?.collectionCode  ?? 'GENESIS',
      editionLabel:    csv?.edition         ?? tok.editorial?.editionLabel    ?? 'Edition 1',
      artist:          csv?.artist          ?? tok.editorial?.artist          ?? null,
      visualIdentityCore: csv?.visualIdentityCore ?? tok.editorial?.visualIdentityCore ?? null,
      heroFocus:       csv?.heroFocus       ?? tok.editorial?.heroFocus       ?? null,
      allowedMotifs:   csv?.allowedMotifs   ?? tok.editorial?.allowedMotifs   ?? null,
      forbiddenMotifs: csv?.forbiddenMotifs ?? tok.editorial?.forbiddenMotifs ?? null,
      colorCues:       csv?.colorCues       ?? tok.editorial?.colorCues       ?? null,
      artTone:         csv?.artTone         ?? tok.editorial?.artTone         ?? null,
      archetype:       csv?.archetype       ?? tok.editorial?.archetype       ?? null,
      cardworthiness:  csv?.cardworthiness  ?? tok.editorial?.cardworthiness  ?? null,
      heroArtworkPrompt: csv?.heroArtworkPrompt ?? tok.editorial?.heroArtworkPrompt ?? null,
    };

    // Variant
    const baseVariants = base ? (variantsByBaseCardId.get(base.baseCardId) ?? []) : [];
    const defVariant   = pickDefaultVariant(baseVariants);

    // Field sources (flat, one-liner per field)
    const src = (field, baseField, projField) => {
      if (base?.[baseField] !== undefined && base[baseField] !== null) return 'mcg_base_cards.json';
      if (proj?.[projField] !== undefined && proj[projField] !== null) return 'mcg_projects.json';
      return 'unresolved';
    };

    const fieldSources = {
      tokenId:           'derived',
      setOrder:          'MCG_Set1_Edition1_v3.csv (cardNumber)',
      displayName:       'MCG_Set1_Edition1_v3.csv',
      symbol:            'MCG_Set1_Edition1_v3.csv',
      slug:              base?.slug    ? 'mcg_base_cards.json' : (proj?.slug    ? 'mcg_projects.json' : 'derived'),
      coingeckoId:       'MCG_Set1_Edition1_v3.csv',
      imageUrl:          base?.image   ? 'mcg_base_cards.json' : (proj?.image   ? 'mcg_projects.json' : 'unresolved'),
      primaryChain:      base?.primaryChain ? 'mcg_base_cards.json' : (proj?.primaryChain ? 'mcg_projects.json' : (csv?.primaryChain ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved')),
      faction:           base?.faction      ? 'mcg_base_cards.json' : (proj?.faction      ? 'mcg_projects.json' : 'unresolved'),
      marketCapRank:     Number.isFinite(base?.marketCapRank) ? 'mcg_base_cards.json' : (Number.isFinite(proj?.marketCapRank) ? 'mcg_projects.json' : 'unresolved'),
      projectTier:       base?.projectTier  ? 'mcg_base_cards.json' : 'unresolved',
      projectId:         base?.projectId    ? 'mcg_base_cards.json' : (proj?.projectId    ? 'mcg_projects.json' : 'unresolved'),
      baseCardId:        base?.baseCardId   ? 'mcg_base_cards.json' : 'unresolved',
      cardNumber:        csv ? 'MCG_Set1_Edition1_v3.csv' : 'token-master-50.json (auto-filled)',
      cardTitle:         csv ? 'MCG_Set1_Edition1_v3.csv' : 'token-master-50.json (auto-filled)',
      cardSubtitle:      csv ? 'MCG_Set1_Edition1_v3.csv' : 'token-master-50.json (auto-filled)',
      flavorText:        csv ? 'MCG_Set1_Edition1_v3.csv' : 'token-master-50.json (auto-filled)',
      heroArtworkPrompt: csv?.heroArtworkPrompt ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      visualIdentityCore: csv?.visualIdentityCore && csv.visualIdentityCore !== 'AUTO_FILLED_FROM_LEGACY_SOURCE' ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      colorCues:         csv?.colorCues && csv.colorCues !== 'AUTO_FILLED_FROM_LEGACY_SOURCE' ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      artTone:           csv?.artTone   && csv.artTone   !== 'AUTO_FILLED_FROM_LEGACY_SOURCE' ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      allowedMotifs:     csv?.allowedMotifs && csv.allowedMotifs !== 'AUTO_FILLED_FROM_LEGACY_SOURCE' ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      forbiddenMotifs:   csv?.forbiddenMotifs && csv.forbiddenMotifs !== 'AUTO_FILLED_FROM_LEGACY_SOURCE' ? 'MCG_Set1_Edition1_v3.csv' : 'unresolved',
      variantType:       defVariant ? 'mcg_card_variants.json' : 'unresolved',
      frameStyle:        defVariant ? 'mcg_card_variants.json' : 'unresolved',
    };

    // Auto-filled flag for replacement tokens
    const isReplacement = !!tok.replacementMeta;
    const needsReview = isReplacement || !ed.heroArtworkPrompt || ed.heroArtworkPrompt === 'AUTO_FILLED_FROM_LEGACY_SOURCE';

    return {
      tokenId:        tok.tokenId,
      setOrder:       tok.setOrder,
      displayName:    tok.displayName,
      symbol:         tok.symbol,
      slug:           tok.slug,
      coingeckoId:    cgId,
      projectId:      tok.projectId  ?? null,
      baseCardId:     tok.baseCardId ?? null,
      imageUrl:       base?.image  ?? proj?.image  ?? null,
      primaryChain:   base?.primaryChain  ?? proj?.primaryChain  ?? csv?.primaryChain ?? null,
      faction:        base?.faction       ?? proj?.faction       ?? null,
      marketCapRank:  base?.marketCapRank ?? proj?.marketCapRank ?? null,
      projectTier:    base?.projectTier   ?? null,
      // editorial (flat)
      cardNumber:        ed.cardNumber,
      masterCardId:      ed.masterCardId,
      cardTitle:         ed.cardTitle,
      cardSubtitle:      ed.cardSubtitle,
      flavorText:        ed.flavorText,
      setCode:           ed.setCode,
      collectionCode:    ed.collectionCode,
      editionLabel:      ed.editionLabel,
      artist:            ed.artist,
      heroArtworkPrompt: ed.heroArtworkPrompt,
      visualIdentityCore: ed.visualIdentityCore,
      heroFocus:         ed.heroFocus,
      colorCues:         ed.colorCues,
      artTone:           ed.artTone,
      allowedMotifs:     ed.allowedMotifs,
      forbiddenMotifs:   ed.forbiddenMotifs,
      archetype:         ed.archetype,
      cardworthiness:    ed.cardworthiness,
      // variant (flat, default variant only)
      variantType:        defVariant?.variantType  ?? null,
      variantRarity:      defVariant?.variantRarity ?? null,
      frameStyle:         defVariant?.frameStyle    ?? null,
      isDefaultVariant:   defVariant ? Boolean(defVariant.isDefaultVariant) : null,
      // meta
      isReplacement,
      needsManualReview:  needsReview,
      replacementReason:  tok.replacementMeta?.reason ?? null,
      fieldSources,
    };
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  const totalTokens          = cards.length;
  const withImageUrl         = cards.filter(c => c.imageUrl).length;
  const withoutImageUrl      = totalTokens - withImageUrl;
  const withArtworkPrompt    = cards.filter(c => c.heroArtworkPrompt && c.heroArtworkPrompt !== 'AUTO_FILLED_FROM_LEGACY_SOURCE').length;
  const withoutArtworkPrompt = totalTokens - withArtworkPrompt;
  const needsReview          = cards.filter(c => c.needsManualReview);
  const replacements         = cards.filter(c => c.isReplacement);

  const report = {
    generatedAt:          new Date().toISOString(),
    totalTokens,
    imageUrl: {
      resolved:  withImageUrl,
      missing:   withoutImageUrl,
      missingList: cards.filter(c => !c.imageUrl).map(c => ({ tokenId: c.tokenId, coingeckoId: c.coingeckoId })),
    },
    heroArtworkPrompt: {
      nonEmpty: withArtworkPrompt,
      missing:  withoutArtworkPrompt,
      missingList: cards.filter(c => !c.heroArtworkPrompt || c.heroArtworkPrompt === 'AUTO_FILLED_FROM_LEGACY_SOURCE')
                       .map(c => ({ tokenId: c.tokenId, coingeckoId: c.coingeckoId, reason: c.isReplacement ? 'replacement_token_no_editorial' : 'no_artwork_prompt_in_csv' })),
    },
    manualReview: {
      total: needsReview.length,
      tokens: needsReview.map(c => ({ tokenId: c.tokenId, coingeckoId: c.coingeckoId, reason: c.isReplacement ? `replacement: ${c.replacementReason}` : 'missing_heroArtworkPrompt' })),
    },
    replacementTokens: {
      total: replacements.length,
      tokens: replacements.map(c => ({ tokenId: c.tokenId, coingeckoId: c.coingeckoId, reason: c.replacementReason })),
    },
    fieldSourceMap: {
      imageUrl:          'mcg_base_cards.json (primary) → mcg_projects.json (fallback)',
      primaryChain:      'mcg_base_cards.json (primary) → mcg_projects.json (fallback) → MCG_Set1_Edition1_v3.csv',
      faction:           'mcg_base_cards.json (primary) → mcg_projects.json (fallback)',
      marketCapRank:     'mcg_base_cards.json (primary) → mcg_projects.json (fallback)',
      projectTier:       'mcg_base_cards.json only',
      projectId:         'mcg_base_cards.json (primary) → mcg_projects.json (fallback)',
      baseCardId:        'mcg_base_cards.json only',
      slug:              'mcg_base_cards.json (primary) → mcg_projects.json (fallback) → derived from name',
      cardNumber:        'MCG_Set1_Edition1_v3.csv',
      cardTitle:         'MCG_Set1_Edition1_v3.csv',
      cardSubtitle:      'MCG_Set1_Edition1_v3.csv',
      flavorText:        'MCG_Set1_Edition1_v3.csv',
      heroArtworkPrompt: 'MCG_Set1_Edition1_v3.csv',
      visualIdentityCore:'MCG_Set1_Edition1_v3.csv',
      colorCues:         'MCG_Set1_Edition1_v3.csv',
      artTone:           'MCG_Set1_Edition1_v3.csv',
      allowedMotifs:     'MCG_Set1_Edition1_v3.csv',
      forbiddenMotifs:   'MCG_Set1_Edition1_v3.csv',
      variantType:       'mcg_card_variants.json (default variant)',
      frameStyle:        'mcg_card_variants.json (default variant)',
    },
  };

  // ── Write output ──────────────────────────────────────────────────────────
  const payload = {
    version:      1,
    generatedAt:  new Date().toISOString(),
    description:  'Consolidated master card data — one flat entry per token (50 tokens). Merges MCG_Set1_Edition1_v3.csv + mcg_base_cards.json + mcg_projects.json + mcg_card_variants.json.',
    inputSources: {
      csv:          'MCG_Set1_Edition1_v3.csv',
      baseCards:    'mcg_base_cards.json',
      projects:     'mcg_projects.json',
      variants:     'mcg_card_variants.json',
      tokenMaster:  'data/token-master-50.json',
    },
    report,
    cards,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log('[mcg-cards-master] wrote', OUTPUT_PATH);

  // Print report to stdout
  console.log('\n=== AUDIT REPORT ===');
  console.log(`Total tokens: ${totalTokens}`);
  console.log(`imageUrl resolved: ${withImageUrl}/${totalTokens} | missing: ${withoutImageUrl}`);
  console.log(`heroArtworkPrompt non-empty: ${withArtworkPrompt}/${totalTokens} | missing: ${withoutArtworkPrompt}`);
  console.log(`Tokens needing manual review: ${needsReview.length}`);
  if (needsReview.length > 0) {
    needsReview.forEach(c => console.log(`  - ${c.tokenId} (${c.coingeckoId}): ${c.isReplacement ? 'replacement token' : 'missing artwork prompt'}`));
  }
  console.log(`Replacement tokens: ${replacements.length}`);
  replacements.forEach(c => console.log(`  - ${c.tokenId} (${c.coingeckoId}): ${c.replacementReason}`));
  console.log('\nField source map:');
  for (const [field, src] of Object.entries(report.fieldSourceMap)) {
    console.log(`  ${field.padEnd(20)} ← ${src}`);
  }
}

main();
