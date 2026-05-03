# Mememon Secondary Market V1 Design

## Current state
Marketplace runtime is missing (no listing/sale models, no APIs, no UI).

## Proposed data models
- `MarketplaceListing`
  - id, sellerUserId, ownedCardInstanceId, status (ACTIVE/CANCELED/SOLD/EXPIRED), price, currency, feeBps, createdAt, updatedAt, expiresAt
- `MarketplaceSale`
  - id, listingId, sellerUserId, buyerUserId, grossAmount, feeAmount, netAmount, currency, completedAt
- Optional `MarketplaceAuditEvent`
  - immutable events for listing create/cancel/purchase failures.

## Card locking rules
- Listing creation sets card lock reason `MARKET_LISTED`.
- Listed cards cannot be newly submitted to locked contests.
- Cards already in locked lineup cannot be listed unless contest rules allow.

## Ownership transfer rules
- Purchase transaction is atomic:
  1. Validate listing ACTIVE and unsold.
  2. Validate seller still owns unlocked instance.
  3. Debit buyer balance / reserve funds.
  4. Transfer instance ownership seller -> buyer.
  5. Mark listing SOLD and create sale record.

## API routes
- `POST /api/marketplace/listings` (list owned card)
- `POST /api/marketplace/listings/:id/cancel`
- `POST /api/marketplace/listings/:id/buy`
- `GET /api/marketplace/listings`
- `GET /api/marketplace/me/listings`
- `GET /api/marketplace/me/history`

## UI surfaces
- Marketplace grid page with filters/sort.
- Card detail sale panel.
- My listings page.
- Purchase confirmation modal.
- Transaction history page.

## Security/abuse controls
- Enforce ownership check on every write.
- Prevent double-sell with row-level lock/version check.
- Validate price boundaries and currency enum.
- Fee computation server-side only.
- Idempotency keys for buy requests.

## Release recommendation
- **Not Alpha** (too risky and absent foundation).
- Target minimal technical slice in **Beta**, production hardening in **V1**.
- Build path: schema + core APIs + admin safety toggles -> constrained UI rollout -> public enable.
