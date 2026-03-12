# MVP Packs/Cards Cloud Bootstrap Runbook

## Purpose

Ensure GENESIS / Edition 1 packs/cards runtime data exists and remains valid on cloud databases used by Vercel deployments.

## Why this is required

`prisma db push` creates/updates schema only. It does **not** create MVP business bootstrap data (`CardSet`, `PackDefinition`, `CardTemplate`, etc.).

## Commands

### Strict manual bootstrap (operators)

```bash
npm run bootstrap:mvp:cloud
```

Runs:
1. `seed:mvp:controlled-emission`
2. `check:mvp:bootstrap`

Use this for first-time environment preparation and incident remediation when inventory should still have remaining supply.

### Deploy-safe bootstrap (CI/Vercel)

```bash
npm run bootstrap:mvp:cloud:deploy
```

Runs:
1. `seed:mvp:controlled-emission`
2. `check:mvp:bootstrap:allow-exhausted`

This validates required structures while allowing legitimate fully exhausted inventory states.

## Vercel integration

`npm run vercel-build` now runs:

```bash
prisma generate && prisma db push && npm run bootstrap:mvp:cloud:deploy && next build
```

This makes cloud deploys idempotently enforce MVP pack/card bootstrap presence.

## Runtime symptoms when missing

- `MVP sale pack is not available`
- `missing MVP card set`

These indicate schema exists but business bootstrap data is missing/drifted.

## Expected MVP targets

- Card set: `MVP_SET_V1`
- Packs:
  - `mvp_sale_pack` (SALE, planned 11,000)
  - `mvp_reward_pack` (REWARD, planned 5,000)
- 5 cards/pack
- 50 token projects
- 5 rarities × 5 editions
- 1,250 active templates with planned supply

## Safety notes

- Seed is idempotent and preserves live counters (`CardTemplate.issuedSupply`, `PackDefinition.openedPackCount`) on existing rows.
- `--allow-exhausted` should be used only for deploy-time structural validation; use strict checks for operational readiness reviews.
