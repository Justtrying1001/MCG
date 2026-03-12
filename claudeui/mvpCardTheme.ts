// mvpCardTheme.ts
// MCG Card Design System — v2
// Drop-in replacement for components/ui/mvpCardTheme.ts

export type RarityCode = 'B' | 'A' | 'S' | 'S+'
export type EditionCode = 'BASE' | 'REVERSE' | 'BRILLANTE' | 'HOLOGRAPHIQUE' | 'MCG_ART'

export interface RarityTheme {
  code: RarityCode
  label: string
  // CSS variable values injected on the card root
  accent: string
  glowCol: string
  borderOut: string
  borderIn: string
  wire: string
  wireAcc: string
  bgCard: string
  bgHeader: string
  bgFooter: string
  txtName: string
  txtSub: string
  txtFlavor: string
  // Corner SVG stroke color
  cornerStroke: string
  // Whether to render the small square + dot in corners (S/S+ only)
  cornerDetail: boolean
  cornerDot: boolean
}

export interface EditionTheme {
  code: EditionCode
  label: string
  badgeLabel: string
  // CSS classes to add on the card root
  cardClass: string
  // Whether this edition needs special DOM layers
  needsReverseLayers: boolean
  needsBrillanteLayer: boolean
  needsHoloLayer: boolean
  needsMcgArtLayer: boolean
}

// ─────────────────────────────────────────
// RARITY THEMES
// One slate base palette — rarity = glow intensity + wire brightness
// ─────────────────────────────────────────

export const RARITY_THEMES: Record<RarityCode, RarityTheme> = {
  'B': {
    code: 'B',
    label: 'Common',
    accent:      '#3d4a5c',
    glowCol:     'rgba(61, 74, 92, 0)',
    borderOut:   '#181e27',
    borderIn:    '#1f2733',
    wire:        'rgba(255,255,255,0.05)',
    wireAcc:     'rgba(255,255,255,0.07)',
    bgCard:      '#11111b',
    bgHeader:    '#0d0d16',
    bgFooter:    '#0b0b14',
    txtName:     '#c8d0dc',
    txtSub:      '#2e3848',
    txtFlavor:   '#4a5568',
    cornerStroke: '#2a3545',
    cornerDetail: false,
    cornerDot:    false,
  },
  'A': {
    code: 'A',
    label: 'Uncommon',
    accent:      '#5a7a8a',
    glowCol:     'rgba(90, 122, 138, 0.12)',
    borderOut:   '#1e2d38',
    borderIn:    '#253545',
    wire:        'rgba(90,122,138,0.10)',
    wireAcc:     'rgba(90,122,138,0.18)',
    bgCard:      '#0d1418',
    bgHeader:    '#0a1014',
    bgFooter:    '#090e12',
    txtName:     '#d4dde6',
    txtSub:      '#3a5060',
    txtFlavor:   '#556070',
    cornerStroke: '#3a5060',
    cornerDetail: false,
    cornerDot:    false,
  },
  'S': {
    code: 'S',
    label: 'Rare',
    accent:      '#7090b8',
    glowCol:     'rgba(112, 144, 184, 0.22)',
    borderOut:   '#243050',
    borderIn:    '#2d3d60',
    wire:        'rgba(112,144,184,0.12)',
    wireAcc:     'rgba(112,144,184,0.22)',
    bgCard:      '#0d1220',
    bgHeader:    '#0a0f1a',
    bgFooter:    '#090d16',
    txtName:     '#dce6f4',
    txtSub:      '#4a6080',
    txtFlavor:   '#607080',
    cornerStroke: '#4a6888',
    cornerDetail: true,
    cornerDot:    false,
  },
  'S+': {
    code: 'S+',
    label: 'Legendary',
    accent:      '#b89a60',
    glowCol:     'rgba(184, 154, 96, 0.35)',
    borderOut:   '#3a2e18',
    borderIn:    '#4a3c22',
    wire:        'rgba(184,154,96,0.12)',
    wireAcc:     'rgba(184,154,96,0.25)',
    bgCard:      '#0e0b04',
    bgHeader:    '#0b0802',
    bgFooter:    '#090703',
    txtName:     '#ece0c8',
    txtSub:      '#7a6040',
    txtFlavor:   '#806a50',
    cornerStroke: '#8a7040',
    cornerDetail: true,
    cornerDot:    true,
  },
}

// ─────────────────────────────────────────
// EDITION THEMES
// ─────────────────────────────────────────

export const EDITION_THEMES: Record<EditionCode, EditionTheme> = {
  'BASE': {
    code: 'BASE',
    label: 'Base',
    badgeLabel: '',
    cardClass: '',
    needsReverseLayers:   false,
    needsBrillanteLayer:  false,
    needsHoloLayer:       false,
    needsMcgArtLayer:     false,
  },
  'REVERSE': {
    code: 'REVERSE',
    label: 'Reverse',
    badgeLabel: 'REV',
    cardClass: 'ed-reverse',
    needsReverseLayers:   true,
    needsBrillanteLayer:  false,
    needsHoloLayer:       false,
    needsMcgArtLayer:     false,
  },
  'BRILLANTE': {
    code: 'BRILLANTE',
    label: 'Brillante',
    badgeLabel: 'BRILL',
    cardClass: 'ed-brillante',
    needsReverseLayers:   false,
    needsBrillanteLayer:  true,
    needsHoloLayer:       false,
    needsMcgArtLayer:     false,
  },
  'HOLOGRAPHIQUE': {
    code: 'HOLOGRAPHIQUE',
    label: 'Holographique',
    badgeLabel: 'HOLO',
    cardClass: 'ed-holo',
    needsReverseLayers:   false,
    needsBrillanteLayer:  false,
    needsHoloLayer:       true,
    needsMcgArtLayer:     false,
  },
  'MCG_ART': {
    code: 'MCG_ART',
    label: 'MCG Art',
    badgeLabel: 'MCG ART',
    cardClass: 'ed-mcgart',
    needsReverseLayers:   false,
    needsBrillanteLayer:  false,
    needsHoloLayer:       false,
    needsMcgArtLayer:     true,
  },
}

// ─────────────────────────────────────────
// HELPER — build CSS variables object for inline style
// ─────────────────────────────────────────

export function getRarityVars(rarity: RarityTheme): React.CSSProperties {
  return {
    '--accent':      rarity.accent,
    '--glow-col':    rarity.glowCol,
    '--border-out':  rarity.borderOut,
    '--border-in':   rarity.borderIn,
    '--wire':        rarity.wire,
    '--wire-acc':    rarity.wireAcc,
    '--bg-card':     rarity.bgCard,
    '--bg-header':   rarity.bgHeader,
    '--bg-footer':   rarity.bgFooter,
    '--txt-name':    rarity.txtName,
    '--txt-sub':     rarity.txtSub,
    '--txt-flavor':  rarity.txtFlavor,
  } as React.CSSProperties
}

// ─────────────────────────────────────────
// HELPER — map your existing rarity/edition codes to the new themes
// Adjust these mappings to match your DB enum values
// ─────────────────────────────────────────

export function resolveRarity(code: string): RarityTheme {
  const map: Record<string, RarityCode> = {
    'B': 'B', 'COMMON': 'B', 'common': 'B',
    'A': 'A', 'UNCOMMON': 'A', 'uncommon': 'A',
    'S': 'S', 'RARE': 'S', 'rare': 'S',
    'S+': 'S+', 'LEGENDARY': 'S+', 'legendary': 'S+',
  }
  return RARITY_THEMES[map[code] ?? 'B']
}

export function resolveEdition(code: string): EditionTheme {
  const map: Record<string, EditionCode> = {
    'BASE': 'BASE', 'base': 'BASE', 'STANDARD': 'BASE',
    'REVERSE': 'REVERSE', 'reverse': 'REVERSE', 'REVERSE_HOLO': 'REVERSE',
    'BRILLANTE': 'BRILLANTE', 'brillante': 'BRILLANTE', 'SHINY': 'BRILLANTE',
    'HOLOGRAPHIQUE': 'HOLOGRAPHIQUE', 'holo': 'HOLOGRAPHIQUE', 'HOLO': 'HOLOGRAPHIQUE',
    'MCG_ART': 'MCG_ART', 'mcg_art': 'MCG_ART', 'FULL_ART': 'MCG_ART',
  }
  return EDITION_THEMES[map[code] ?? 'BASE']
}
