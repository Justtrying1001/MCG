# MCG (Meme Card Game)

MCG is a Next.js + Prisma web application focused on card collection and contest operations.

## Repository contents
- App Router frontend and backend routes in one codebase
- Prisma schema/migrations/seed scripts
- Domain runtime modules for packs, contests, quests, rewards, admin ops
- Tests (Vitest)

## Quick start
```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

## Main documentation
- Technical source of truth: [`docs/technical.md`](docs/technical.md)
- Product/user source of truth: [`docs/product-guide.md`](docs/product-guide.md)

## Useful commands
- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run seed:mvp:controlled-emission`
