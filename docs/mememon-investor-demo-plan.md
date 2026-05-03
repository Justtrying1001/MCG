# Mememon TCG Investor Demo Plan

## 1. Demo goal
Show a reliable closed-loop demo: login → open pack → own cards in Memedex → enter/view tournament flow.

## 2. Demo script (step-by-step)
1. Open `/` and introduce Mememon TCG brand/lobby.
2. Login with demo account (wallet/X through Privy).
3. Open `/packs` and buy/open one sale pack with internal points.
4. Show reveal modal and pulled cards.
5. Open `/collection` and verify newly owned cards appear.
6. Open `/contests` and select the prepared Genesis demo tournament.
7. Open contest detail and show rules/status/reward preview.
8. Enter lineup flow (`/contests/[contestId]/lineup`) and submit/lock lineup (if contest status allows).
9. Show ranking/reward panels (live or seeded/manual-scored state).
10. Close with admin view to show operational control (`/admin/(protected)/contests`).

## 3. Pages/routes used
- Public: `/`, `/packs`, `/collection`, `/contests`, `/contests/[contestId]`, `/contests/[contestId]/lineup`, `/profile`.
- APIs behind flow: `/api/pack/open`, `/api/pack/config`, `/api/me`, `/api/contests`, `/api/contests/[contestId]/enter`, `/api/contests/[contestId]/ranking`.
- Admin/operator: `/admin/(protected)/contests`, contest operator/scoring/settlement pages.

## 4. Required env variables
- `DATABASE_URL`
- Privy auth/session envs used by `/api/auth/privy/*`
- Admin protection envs used by `/api/admin/*`
- Optional QStash envs (scheduler degrades without them for local demo)

## 5. Required seed/demo data
- Genesis set + card templates.
- Active sale pack definition with remaining supply.
- Demo contest in OPEN/LOCKED/LIVE depending on script phase.

## 6. Required demo user/account
- One demo player account with enough internal points for at least 2 pack opens and 1 contest entry fee buffer.

## 7. Required pack definitions
- `genesis_sale_pack` active, source SALE, cardsPerPack configured, planned/opened counts valid.

## 8. Required Genesis card templates
- Templates linked to token project slug, rarity, edition, supply fields set.

## 9. Required owned cards after pack opening
- `OwnedCardInstance` rows created for pulled templates.
- `PackOpeningEvent` recorded for user and pack definition.

## 10. Required contest/tournament setup
- One Genesis Demo contest with clear status timeline and reward policy.
- Eligibility compatible with seeded/opened cards.

## 11. Admin/operator pre-demo actions
1. Run seed/bootstrap.
2. Verify pack supply and active status.
3. Verify contest exists and desired lifecycle status.
4. Optionally pre-score and settle a second contest for ranking/reward screenshots.

## 12. Known limitations to avoid showing
- Marketplace flows (not implemented).
- Real-money checkout (internal points only).
- Full-suite CI green claims (`test:full` remains red).

## 13. Fallback plan if live demo breaks
- Use pre-seeded account with existing owned cards.
- Skip live pack open and show recent pulls + collection + recorded opening history.
- Switch to pre-settled contest to demonstrate rankings/rewards without live scoring execution.
