// MvpCardTile.tsx
// MCG Card Design System — v2
// Drop-in replacement for components/ui/MvpCardTile.tsx
//
// Dependencies:
//   - mvpCardTheme.ts (same folder)
//   - mvp-card.css (import once in your layout or globals)
//   - Google Fonts: Rajdhani:wght@700, DM+Mono:wght@300;400, Lora:ital@1
//     Add to your <head> or next/font setup:
//     https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=DM+Mono:ital,wght@0,300;0,400;1,300&family=Lora:ital@1

import React from 'react'
import { MvpCardView } from '@/types/cards'
import {
  resolveRarity,
  resolveEdition,
  getRarityVars,
} from './mvpCardTheme'

// MCG logo base64 (white on transparent, 48x32px tile)
const MCG_LOGO_B64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAABfUlEQVR4nO2Wa07DMBCEv3GSFqjE/a/IBYCmcZYfXuMQAWrjVAjJI0VJto539jHrQkNDQ0NDBXTPzc2sdx8RQNK8t4/dAzCzAGTihpMHDm47S4o/fH4z+r02AjCzgUR0BC6SzO0CZuARmChBVWO3AJzkkN8lmdsAOlJgE6kquyHsuRnw7nsezUxegQAcSQHM7Jh9uI8GeuABuFCyHQH7FyLOcD0YELMW3P7F51Iny3XXYnMAZtYB85rAYnSapGmxPlA0cqFMqUBqrbBcfy1qRGxOaFxlL64z6VkPwOhBdv6e9dBLGreQqGqh3A5bSu+VyphJFbt5n81TyFviV/LLfl89B0rygl+HLTxuroAT6fwa/R6/0UImNrufjtQymfxMasMn4AxMW6bUVg2IctKuhZfFKUqCBEhS9AREioDfqBixtRp4Bk4UMU5OaCAdaif38Uo6G3pf2wGdpJca/1AfQG6lz3+c+Ehc3PNvXf7MbYOk1xr/DQ0NDQ0NDX+ND3LlsB6hJmdVAAAAAElFTkSuQmCC'

interface Props {
  card: MvpCardView
  quantity?: number
}

// Corner SVG — L-bracket, with optional small square and dot
function Corner({
  stroke,
  detail,
  dot,
}: {
  stroke: string
  detail: boolean
  dot: boolean
}) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 13V1H13" stroke={stroke} strokeWidth={dot ? '1' : '0.9'} />
      {detail && (
        <rect
          x="1" y="1" width="3" height="3"
          stroke={stroke} strokeWidth="0.6" opacity="0.7"
          fill="none"
        />
      )}
      {dot && (
        <circle cx="2.5" cy="2.5" r="0.7" fill={stroke} opacity="0.6" />
      )}
    </svg>
  )
}

export default function MvpCardTile({ card, quantity = 1 }: Props) {
  const rarity   = resolveRarity(card.rarity ?? 'B')
  const edition  = resolveEdition(card.edition ?? 'BASE')

  // Card number display
  const cardNumber =
    card.cardNumber ??
    (card.setOrder != null ? `S01-${String(card.setOrder).padStart(3, '0')}` : null)

  // Supply display
  const supplyLabel =
    card.issuedSupply != null && card.plannedSupply != null
      ? `${String(card.issuedSupply).padStart(3, '0')} / ${card.plannedSupply}`
      : null

  const rarityVars = getRarityVars(rarity)

  const cornerProps = {
    stroke: rarity.cornerStroke,
    detail: rarity.cornerDetail,
    dot:    rarity.cornerDot,
  }

  return (
    <article
      className={`mvp-card ${edition.cardClass}`}
      style={rarityVars}
    >
      {/* ── Always-present layers ── */}
      <div className="mvp-grain" aria-hidden="true" />

      {/* ── Edition-specific layers ── */}

      {edition.needsReverseLayers && (
        <>
          <div className="mvp-reverse-foil" aria-hidden="true" />
          {/* Art re-render on top of foil mask */}
          <div className="mvp-reverse-art-mask" aria-hidden="true" />
          <div className="mvp-reverse-art-reveal" aria-hidden="true">
            {card.imageUrl && (
              <img src={card.imageUrl} alt="" />
            )}
          </div>
        </>
      )}

      {edition.needsBrillanteLayer && (
        <>
          <div className="mvp-brill-foil"    aria-hidden="true" />
          <div className="mvp-brill-glitter" aria-hidden="true" />
          <div className="mvp-brill-sweep"   aria-hidden="true" />
        </>
      )}

      {edition.needsHoloLayer && (
        <>
          <div className="mvp-holo-layer" aria-hidden="true" />
          <div className="mvp-holo-lines" aria-hidden="true" />
        </>
      )}

      {edition.needsMcgArtLayer && (
        <>
          <div
            className="mvp-mcgart-pattern"
            style={{ backgroundImage: `url('${MCG_LOGO_B64}')` }}
            aria-hidden="true"
          />
          <div className="mvp-mcgart-art-mask"   aria-hidden="true" />
          <div className="mvp-mcgart-art-reveal"  aria-hidden="true">
            {card.imageUrl && (
              <img src={card.imageUrl} alt="" />
            )}
          </div>
        </>
      )}

      {/* ── Corner ornaments ── */}
      <span className="mvp-co mvp-co-tl" aria-hidden="true"><Corner {...cornerProps} /></span>
      <span className="mvp-co mvp-co-tr" aria-hidden="true"><Corner {...cornerProps} /></span>
      <span className="mvp-co mvp-co-bl" aria-hidden="true"><Corner {...cornerProps} /></span>
      <span className="mvp-co mvp-co-br" aria-hidden="true"><Corner {...cornerProps} /></span>

      {/* ══ ZONE 1 — HEADER ══ */}
      <div className="mvp-header">
        <div className="mvp-header-left">
          <span className="mvp-name">{card.displayName}</span>
          <span className="mvp-ticker">${card.symbol}</span>
        </div>
        <div className="mvp-header-right">
          <span className="mvp-badge-rarity">{rarity.code}</span>
          {edition.code !== 'BASE' && (
            <span className="mvp-badge-edition">{edition.badgeLabel}</span>
          )}
        </div>
      </div>

      {/* ══ ZONE 2 — ARTWORK ══ */}
      {/* Hidden when MCG Art or Reverse (art rendered via absolute layer) */}
      <div
        className="mvp-art"
        style={
          edition.needsMcgArtLayer || edition.needsReverseLayers
            ? { visibility: 'hidden' }
            : undefined
        }
      >
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.displayName} />
        ) : (
          <div className="mvp-art-placeholder">
            {card.faction === 'ANIMALS' ? '🐾'
              : card.faction === 'PANTHEON' ? '⚡'
              : card.faction === 'CHARACTERS' ? '🎭'
              : card.faction === 'CONCEPTS' ? '💡'
              : '🃏'}
          </div>
        )}
      </div>

      {/* ══ ZONE 3 — TEXTBOX ══ */}
      <div className="mvp-textbox">
        <p>{card.cardText ?? card.flavorText ?? `${card.symbol} · ${card.faction ?? ''}`}</p>
      </div>

      {/* ══ ZONE 4 — FOOTER ══ */}
      <div className="mvp-footer">
        <span className="mvp-footer-code">{cardNumber ?? '—'}</span>
        <div className="mvp-footer-sep" />
        <span className="mvp-footer-set">
          {card.setCode ?? 'GENESIS'} · {supplyLabel ?? `ED.${card.editionNumber ?? 1}`}
        </span>
      </div>
    </article>
  )
}
