# Pack Reward Flow Audit

**Date:** 2026-03-16
**Scope:** Contest settlement → pack supply tracking, quest/milestone pack rewards

---

## 1. Contest → Settlement → Pack Supply Flow

### Flow trace

```
Contest.SETTLED
  └─ ContestSettlementPlanRuntime.executeSettlementPlan()
       ├─ For each POINTS component → rewardGrant.create(type=POINTS)
       ├─ For each XP component     → rewardGrant.create(type=XP)
       └─ For each PACK component   → grantRewardPackByDefinitionTx(tx, { userId, packDefinitionId, sourceContestSettlementId })
```

### `grantRewardPackByDefinitionTx` (lib/domain/acquisition/open-pack.ts:395)

1. Validates pack: exists, `source === REWARD`, `isActive === true`
2. Calls `reservePackStock(tx, pack)` → atomically increments `PackDefinition.openedPackCount` by 1; throws 409 if exhausted
3. Calls `reserveRewardPackSupply(tx, pack)` → upserts `RewardPackSupply` row and atomically increments `distributed` by 1; throws 409 if exhausted
4. Creates `RewardGrant` with `type=PACK`, `packDefinitionId`, `sourceContestSettlementId`

### Verification checklist

| Check | Status |
|---|---|
| RewardGrant created when contest settles | ✅ Yes — `grantRewardPackByDefinitionTx` creates the row |
| RewardPackSupply.distributed incremented | ✅ Yes — `reserveRewardPackSupply` does `{ distributed: { increment: 1 } }` |
| PackDefinition.openedPackCount incremented at attribution (not opening) | ⚠️ Yes — incremented at **grant time** not claim time (naming is misleading but consistent) |
| Supply admin page reflects correct states | ✅ Yes — `getPackSupplySummary` counts RewardGrant rows for attributed/claimed |

### Note on `openedPackCount` naming

`PackDefinition.openedPackCount` is incremented by `reservePackStock` at **grant time**, not when the user physically opens the pack. The pack is "opened" from a supply-reservation perspective. The actual card distribution happens later at claim time (`claimRewardPackGrantDbNative`).

---

## 2. `reserveRewardPackSupply` Analysis

**Location:** `lib/domain/acquisition/open-pack.ts:145`

```ts
async function reserveRewardPackSupply(tx, pack) {
  // Upsert: on create → sets distributed = count of existing RewardGrants for this pack
  await tx.rewardPackSupply.upsert({ ... });

  // Atomic decrement check
  const reserve = await tx.rewardPackSupply.updateMany({
    where: { id: pack.code, distributed: { lt: totalSupply } },
    data: { distributed: { increment: 1 } },
  });

  if (reserve.count !== 1) throw PackOpenRuntimeError("Reward pack supply exhausted", 409);
}
```

**Status:** ✅ Correct. The function atomically reserves supply and prevents over-distribution.

**Edge case:** On first call for a pack, the `upsert` creates the row with `distributed = existing RewardGrant count` (self-healing bootstrap). This prevents double-counting if grants were created outside this function.

---

## 3. Supply Page Admin State

`GET /api/admin/packs/supply` → `getPackSupplySummary()`

| Field | Source |
|---|---|
| `attributed` | COUNT of `RewardGrant` rows with `type=PACK` and `packDefinition.source=REWARD` |
| `claimed` | COUNT of `RewardGrant` rows where `claimedAt IS NOT NULL OR sourcePackOpeningEventId IS NOT NULL` |
| `reserved` | `attributed - claimed` |
| `remaining` | `totalSupply - attributed` |

**Status:** ✅ Correctly reflects all states.

---

## 4. Changes Made (this session)

### Part 0 — Remove booster ghost pack
- Migration `20260316000002_disable_booster_packs`: sets `isActive=false, plannedPackCount=0` for any pack matching `LIKE '%booster%'`
- Supply API filter updated to only show packs with `isActive=true OR plannedPackCount > 0`

### Part 3 — Quest PACK rewards
- Schema: added `rewardPackDefinitionId` and `rewardPackQuantity` to `QuestDefinition`
- Migration `20260316000003_quest_pack_rewards`
- Runtime: pack granted on auto-completion, manual approval, and milestone auto-completion
- Admin quest builder: pack selector dropdown with REWARD-source packs
- `QuestForUserRow` type extended with `rewardPackCode` and `rewardPackQuantity`

### Part 4 — Milestone PACK rewards
- `MilestoneSeedDefinition` type: added optional `rewardPackDefinitionCode` and `rewardPackQuantity`
- Milestones with pack rewards: `ms_contests_won_1` and `ms_cw_5`
- Seed updated to resolve pack codes to IDs and upsert pack reward fields

### Part 5 — User display
- `formatReward()` helper: shows `+N pts + 🎁 K pack` when a pack is attached
- QuestCard and completed social quest badges use `formatReward()`
- MilestoneBadge extended to show pack reward

### New endpoint
- `GET /api/internal/rewards/pack-grants/recent` — returns last N PACK RewardGrant rows
