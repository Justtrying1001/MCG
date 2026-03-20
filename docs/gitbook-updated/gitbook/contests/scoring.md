# Scoring

Your score in a contest reflects how well your chosen cards performed during the market window. It combines real market signals with your cards' rarity and edition multipliers.

---

## How scoring works — the big picture

At the start of a contest (when it moves to LOCKED), a **snapshot** is taken of each token's market data from CoinGecko. At settlement, a second snapshot is taken. The difference between the two is what your score is built on.

MCG looks at multiple market signals — not just price. Volume, market cap, and relative rank all play a role. This means a token doesn't have to moon to score well: strong volume momentum or improving rank can contribute meaningfully.

---

## Token score

Each token in your roster receives a **token score** based on its market performance during the contest window.

Four signals are measured and combined with the following weights:

| Signal | Weight |
|---|---|
| Price change | 40% |
| Volume change | 30% |
| Market cap change | 15% |
| Rank change | 15% |

Each signal is normalized to a 0–100 scale (50 = neutral / no change). A score above 50 means positive performance; below 50 means negative.

A **momentum bonus** is applied on top when both volume and rank show positive movement simultaneously — rewarding tokens that are moving with conviction.

The final token score is capped at **105**.

> If market data is missing for a signal, that signal defaults to 50 (neutral). Missing data is flagged in the score breakdown.

---

## Card score

Your card's **final score** is the token score amplified by the card itself.

Each card carries two multipliers:

- **Rarity multiplier** — LEGENDARY cards amplify score more than COMMON cards
- **Edition multiplier** — special editions (HOLO, FULL_ART) add further amplification

**Card Score = Token Score × Rarity Multiplier × Edition Multiplier**

A LEGENDARY FULL_ART card performing the same as a COMMON BASE card will score meaningfully higher.

---

## Multiplier reference

**Rarity**

| Rarity | Multiplier |
|---|---|
| COMMON | ×1.00 |
| UNCOMMON | ×1.03 |
| RARE | ×1.07 |
| EPIC | ×1.12 |
| LEGENDARY | ×1.18 |

**Edition**

| Edition | Multiplier |
|---|---|
| BASE | ×1.00 |
| REVERSE | ×1.03 |
| BRILLANTE | ×1.05 |
| HOLO | ×1.08 |
| FULL_ART | ×1.11 |

---

## Roster score

Your total contest score is the **sum of all card scores** across your roster. There's no averaging — every card contributes.

This rewards depth: a strong roster with solid performers across the board will outperform a single great card surrounded by weak ones.

---

## Tiebreaking

When two players have the same total score, ties are resolved in order:

1. Sum of raw token scores
2. Number of tokens that scored above 50
3. Best single token score
4. Lexicographic user ID (last resort)

---

## A note on scoring evolution

The scoring system is designed to reward both market knowledge and card strategy. The specifics may be tuned as MCG develops — see the [Preamble](../preamble.md) for context on how the game evolves.
