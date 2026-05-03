# Mememon Branding Sweep Report

## Search terms
- `MCG`
- `Meme Card Game`
- `MemeCardGame`
- `Meme Card`

## Scope reviewed
- Investor-visible app routes/components (home, nav, footer, packs, redirects).
- Demo documentation pages.

## Remaining occurrences classification
1. **Internal technical name**: package name, CSS classes (`mcg-*`), schema identifiers.
2. **Historical docs/tests**: older docs under `docs/gitbook-updated/*` not shown in investor flow.
3. **Data identifiers**: `MCG-*` card ids and source CSV names (required for existing data pipeline compatibility).

## User-facing copy changes made
- Metadata, nav, footer, hero copy, packs copy, docs/twitter redirect labels updated to Mememon TCG.
- Demo entry copy added: `Enter Demo (No Wallet)`.

## Allowed residual brand strings
- Internal file names, enums, card IDs, schema fields, and legacy docs not used in investor walkthrough.

## Files changed in this sweep
- `app/layout.tsx`
- `components/layout/SiteShell.tsx`
- `components/layout/Footer.tsx`
- `components/home/HomeHeroLanding.tsx`
- `components/home/HeroDrop.tsx`
- `components/home/StatsBar.tsx`
- `components/home/PlayerDashboardHeader.tsx`
- `app/packs/page.tsx`
- `app/docs/page.tsx`
- `app/twitter/page.tsx`
