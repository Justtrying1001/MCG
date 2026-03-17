# Gestion des migrations Prisma (audit + squash)

## 1) Audit initial du dépôt

Au moment de l'audit, le dossier `prisma/migrations/` contenait **21 migrations** (une migration par sous-dossier) :

1. `20260312114000_contest_config_phase1`
2. `20260312132000_contest_settlement_plan_phase2`
3. `20260313120000_contest_scoring_engine_phase1`
4. `20260314130500_referral_invites`
5. `20260314170000_reward_pack_supply_tracking`
6. `20260314180000_seasons_leagues_phase1`
7. `20260314180000_update_pack_supply_split`
8. `20260315000001_rename_contest_starts_at_to_live_at`
9. `20260315000002_remove_owned_card_instance_lock_state`
10. `20260315000003_remove_settlement_plan_approved_enum`
11. `20260315000004_snapshot_captured_missing_counts`
12. `20260315000005_score_breakdown_data_quality`
13. `20260315000006_reward_type_xp`
14. `20260315000007_remove_contest_entry_status_locked`
15. `20260315000008_remove_contest_rule_team_size_value`
16. `20260315000009_contest_qstash_fields`
17. `20260315001000_reward_pack_claim_tracking`
18. `20260316000001_rename_mvp_set_to_genesis`
19. `20260316000002_disable_booster_packs`
20. `20260316000002_fix_genesis_reward_pool_tracking`
21. `20260316000003_quest_pack_rewards`

### Vérification des migrations appliquées (_prisma_migrations)

Pour connaître l'état réel d'application, interroger la base connectée par `DATABASE_URL` :

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY started_at;
```

Alternative Prisma CLI :

```bash
npx prisma migrate status
```

> ⚠️ Dans un environnement sans base joignable (ex: CI sans Postgres local), cette vérification échoue avec `P1001`.

## 2) Cause probable du volume élevé de migrations

Plusieurs signaux montrent une accumulation non maîtrisée :

- Enchaînement de migrations très granulaires (rename, drop, update de données, ajustements d'enums) sur une fenêtre courte.
- Présence de timestamps dupliqués (`20260314180000_*`, `20260316000002_*`), typiques de changements parallèles/branches fusionnées.
- Le projet mélange `migrate` et `db push` dans les usages (`README`, scripts npm), ce qui peut encourager des corrections successives plutôt qu'une stratégie stable.
- Le script de déploiement contient des mécanismes de rattrapage (`P3005`, `P3009`, resolve rolled-back), signe qu'un historique complexe/friable a déjà été observé.

## 3) Stratégie de squash appliquée dans ce dépôt

### Résultat attendu

Le dossier `prisma/migrations/` est ramené à une base propre :

- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260317000000_init/migration.sql`

### Commandes exécutées

```bash
# 0) Sauvegarde locale de l'historique précédent
mkdir -p /tmp/mcg-migrations-backup
cp -a prisma/migrations /tmp/mcg-migrations-backup/migrations_before_squash

# 1) Suppression de l'historique local
rm -rf prisma/migrations
mkdir -p prisma/migrations/20260317000000_init

# 2) Génération d'une migration unique depuis le schéma actuel
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260317000000_init/migration.sql

# 3) Réinitialisation du lock Prisma
cat > prisma/migrations/migration_lock.toml <<'EOT'
provider = "postgresql"
EOT
```

### Variante locale destructive (dev uniquement)

Si vous voulez repartir de zéro **en local** avec une base de dev :

```bash
npx prisma migrate reset
npx prisma migrate dev --name init --create-only
npx prisma migrate dev
```

> ⚠️ `migrate reset` supprime les données.

### Variante sans migration (sync rapide)

```bash
npx prisma db push
```

À réserver au dev/prototypage ; pour production, privilégier des migrations versionnées.

## 4) Procédure sûre pour production

Ne supprimez jamais des migrations déjà appliquées en production sans plan explicite.

Checklist minimale :

1. Sauvegarde complète de la base de prod.
2. Fenêtre de maintenance planifiée.
3. Vérification de `_prisma_migrations` sur prod.
4. Si historique déjà appliqué :
   - soit conserver l'historique actuel,
   - soit préparer une stratégie de baseline (`prisma migrate resolve --applied ...`) avec validation préalable sur staging.
5. Exécuter `npx prisma migrate deploy` sur staging puis prod.
6. Vérifier l'intégrité applicative après déploiement.

## 5) Bonnes pratiques d'équipe

- Utiliser `prisma migrate dev` pour des lots de changements cohérents, pas pour chaque micro-ajustement.
- Éviter les migrations concurrentes générées sur plusieurs branches sans rebase/squash préalable.
- Avant merge, regrouper les migrations de feature branch si elles n'ont pas encore été déployées hors dev.
- Utiliser `prisma migrate deploy` pour les environnements partagés/CI/prod.
- Réserver `db push` au local rapide, pas au flux standard de production.
