# Page Mapping

## landing (unauthenticated)

* design: /design/landing
* route: app/page.tsx
* condition: ONLY when user is NOT authenticated
* role: onboarding / entry page

---

## home (authenticated)

* design: /design/home
* route: app/page.tsx
* condition: ONLY when user IS authenticated
* role: main dashboard

IMPORTANT:
app/page.tsx must handle BOTH states:

* unauthenticated → Landing
* authenticated → Home

---

## collection

* design: /design/collection
* route: app/collection/page.tsx
* role: card inventory + detail panel

---

## pack

* design: /design/pack
* route: app/packs/page.tsx
* role: pack opening experience

---

## contest

* design: /design/contest
* route: app/contest/page.tsx
* role: contest / battle / ranking

---

## profile

* design: /design/profile
* route: app/profile/page.tsx
* role: user profile + stats

---

## reward

* design: /design/reward
* route: app/rewards/page.tsx
* role: quests + rewards system
