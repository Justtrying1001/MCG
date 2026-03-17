# MCG (Meme Card Game)

MCG est une plateforme Next.js de collection de cartes + contests + rewards, avec un runtime opéré via un back-office admin.

## Documentation

- **GitBook documentation (product + tokenomics + ecosystem)**: `docs/gitbook/`
- **Technical reference (repository/runtime)**: `docs/technical.md`
- **Database migrations guide (audit + squash)**: `docs/db-migrations.md`

## Démarrage rapide

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

## Commandes utiles

- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run seed:mvp:controlled-emission`
- `npm run seed:milestone:rewards`
