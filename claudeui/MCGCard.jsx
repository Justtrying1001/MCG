import { useState, useEffect } from "react";

const RARITY_CONFIG = {
  COMMON: {
    label: "COMMON",
    gradient: "linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%)",
    border: "linear-gradient(135deg, #4a4a6a, #2a2a4a, #4a4a6a)",
    glow: "rgba(100, 100, 180, 0.3)",
    foil: false,
    badge: null,
    shine: "#6666aa",
  },
  RARE: {
    label: "RARE",
    gradient: "linear-gradient(135deg, #0d2137 0%, #0a1628 100%)",
    border: "linear-gradient(135deg, #1e90ff, #0055cc, #1e90ff)",
    glow: "rgba(30, 144, 255, 0.4)",
    foil: false,
    badge: null,
    shine: "#1e90ff",
  },
  EPIC: {
    label: "EPIC",
    gradient: "linear-gradient(135deg, #1a0a2e 0%, #0d0618 100%)",
    border: "linear-gradient(135deg, #9b59b6, #6c3483, #c39bd3, #6c3483, #9b59b6)",
    glow: "rgba(155, 89, 182, 0.6)",
    foil: true,
    badge: "EPIC",
    shine: "#c39bd3",
  },
  LEGENDARY: {
    label: "LEGENDARY",
    gradient: "linear-gradient(135deg, #1a1000 0%, #0d0a00 100%)",
    border: "linear-gradient(135deg, #f39c12, #f1c40f, #fff8dc, #f1c40f, #f39c12)",
    glow: "rgba(241, 196, 15, 0.7)",
    foil: true,
    badge: "LEGENDARY",
    shine: "#f1c40f",
  },
};

const ARCHETYPE_ICONS = {
  PANTHEON: "⚡",
  ANIMALS: "🐾",
  CHARACTERS: "🎭",
  CONCEPTS: "💡",
  WILDCARD: "🃏",
};

function CardBadge({ rarity }) {
  const config = RARITY_CONFIG[rarity];
  if (!config.badge) return null;

  const colors = {
    EPIC: { bg: "#6c3483", text: "#e8d5f5", border: "#9b59b6" },
    LEGENDARY: { bg: "#7d6608", text: "#fff8dc", border: "#f1c40f" },
  };
  const c = colors[rarity];

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 9,
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: c.text,
        zIndex: 10,
        boxShadow: `0 0 8px ${c.border}60`,
      }}
    >
      {config.badge}
    </div>
  );
}

function FullArtBadge({ isFullArt }) {
  if (!isFullArt) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 30,
        right: 10,
        background: "#111",
        border: "1px solid #555",
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 8,
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "#aaa",
        zIndex: 10,
      }}
    >
      FULL ART
    </div>
  );
}

function FoilShimmer({ rarity }) {
  const config = RARITY_CONFIG[rarity];
  if (!config.foil) return null;
  return (
    <div
      className="foil-shimmer"
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 12,
        pointerEvents: "none",
        zIndex: 5,
        background: `linear-gradient(
          105deg,
          transparent 20%,
          ${config.shine}18 45%,
          ${config.shine}30 50%,
          ${config.shine}18 55%,
          transparent 80%
        )`,
        animation: "shimmer 3s ease-in-out infinite",
      }}
    />
  );
}

function MCGCard({
  name = "Brett",
  ticker = "BRETT",
  rarity = "EPIC",
  archetype = "CHARACTERS",
  flavor = "Brett just vibes.",
  setId = "S01-027",
  edition = 1,
  print = 1,
  maxPrint = 3,
  imageUrl = null,
  isFullArt = true,
  isNew = false,
}) {
  const [hovered, setHovered] = useState(false);
  const config = RARITY_CONFIG[rarity];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 200,
        borderRadius: 14,
        padding: 2,
        background: config.border,
        boxShadow: hovered
          ? `0 0 30px ${config.glow}, 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${config.shine}40`
          : `0 0 12px ${config.glow}80, 0 4px 16px rgba(0,0,0,0.5)`,
        transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {/* Inner card */}
      <div
        style={{
          borderRadius: 12,
          background: config.gradient,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <FoilShimmer rarity={rarity} />

        {/* Header zone */}
        <div
          style={{
            padding: "10px 12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            position: "relative",
            zIndex: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div
                style={{
                  fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                  fontSize: 20,
                  letterSpacing: "0.04em",
                  color: "#ffffff",
                  lineHeight: 1,
                  textShadow: `0 0 12px ${config.shine}80`,
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  color: config.shine,
                  letterSpacing: "0.12em",
                  marginTop: 1,
                  opacity: 0.8,
                }}
              >
                ${ticker}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <CardBadge rarity={rarity} />
            </div>
          </div>
          {isFullArt && (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 7,
                color: "#888",
                letterSpacing: "0.08em",
                textAlign: "right",
                marginTop: -2,
              }}
            >
              FULL ART
            </div>
          )}
        </div>

        {/* Hero artwork zone */}
        <div
          style={{
            margin: "0 10px",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
            height: 160,
            background: imageUrl ? "transparent" : "#111",
            border: `1px solid ${config.shine}30`,
            boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)`,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
                opacity: 0.3,
              }}
            >
              {ARCHETYPE_ICONS[archetype] || "🎴"}
            </div>
          )}
          {/* Archetype corner tag */}
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              background