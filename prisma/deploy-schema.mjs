import { readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";

const LOCK_TIMEOUT_CODE = "P1002";
const LOCK_TIMEOUT_MARKER = "pg_advisory_lock";
const MAX_DEPLOY_ATTEMPTS = Number.parseInt(process.env.PRISMA_DEPLOY_RETRIES ?? "3", 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.PRISMA_DEPLOY_RETRY_DELAY_MS ?? "5000", 10);
const MAX_P3009_RETRIES = 5;

const MIGRATION_NAME_PATTERN = /Migration name:\s*([\w]+)/i;
const AUTO_RECOVERABLE_FAILED_MIGRATIONS = new Set([
  "20260322000000_repair_user_x_user_id_drift",
]);


function runPrisma(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["prisma", ...args], {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status === 0) {
    process.stdout.write(output);
    return { ok: true, output };
  }

  return { ok: false, output, status: result.status ?? 1 };
}

function getMigrationDirectories() {
  const migrationsRoot = join(process.cwd(), "prisma", "migrations");
  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function markApplied(migrationName) {
  const resolve = runPrisma(["migrate", "resolve", "--applied", migrationName]);
  if (!resolve.ok) {
    process.stderr.write(resolve.output);
    process.exit(resolve.status);
  }
}


function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isAdvisoryLockTimeout(output) {
  return output.includes(LOCK_TIMEOUT_CODE) && output.includes(LOCK_TIMEOUT_MARKER);
}

/**
 * Parse the failed migration name from a P3009 error message.
 * Example: "The `20260315000003_remove_settlement_plan_approved_enum` migration started at ..."
 */
function parseP3009FailedMigration(output) {
  const match = output.match(/The `([\w]+)` migration started at/);
  return match ? match[1] : null;
}

function parseMigrationNameFromP3018(output) {
  const match = output.match(MIGRATION_NAME_PATTERN);
  return match?.[1] ?? null;
}

function isDuplicateObjectError(output) {
  return output.includes('already exists') || output.includes('duplicate key value');
}

/**
 * Run cleanup SQL via `prisma db execute` to undo partial DDL state
 * left by a partially-applied migration (e.g. leftover enum types).
 */
function runCleanupSql(sql) {
  const tmpFile = join(tmpdir(), `mcg-cleanup-${randomBytes(6).toString("hex")}.sql`);
  try {
    writeFileSync(tmpFile, sql, "utf8");
    const result = runPrisma(["db", "execute", "--file", tmpFile, "--schema", "prisma/schema.prisma"]);
    if (!result.ok) {
      console.warn("[deploy-schema] Cleanup SQL warning:", result.output.trim());
    }
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Per-migration cleanup: drop any partial state left by an interrupted
 * enum-swap migration so it can be safely retried.
 */
function cleanupPartialState(migrationName) {
  if (migrationName.includes("remove_settlement_plan_approved_enum")) {
    runCleanupSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestSettlementPlanStatus_new')
           AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestSettlementPlanStatus') THEN
          DROP TYPE "ContestSettlementPlanStatus_new";
        END IF;
      END $$;
    `);
    return true;
  }

  if (migrationName.includes("remove_contest_entry_status_locked")) {
    runCleanupSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestEntryStatus_new')
           AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestEntryStatus') THEN
          DROP TYPE "ContestEntryStatus_new";
        END IF;
      END $$;
    `);
    return true;
  }

  return AUTO_RECOVERABLE_FAILED_MIGRATIONS.has(migrationName);
}

async function deployWithLockRetry() {
  const attempts = Math.max(1, MAX_DEPLOY_ATTEMPTS);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const migrate = runPrisma(["migrate", "deploy"]);
    if (migrate.ok || !isAdvisoryLockTimeout(migrate.output) || attempt === attempts) {
      return migrate;
    }

    const backoffMs = RETRY_DELAY_MS * attempt;
    console.warn(
      `Prisma migrate deploy timed out while waiting for advisory lock. Retrying in ${backoffMs}ms (${attempt}/${attempts}).`
    );
    await sleep(backoffMs);
  }

  return { ok: false, output: "Unexpected retry failure.", status: 1 };
}

async function main() {
  // ── P3009 loop: resolve stuck (failed) migrations then retry ─────────────
  for (let p3009Attempt = 1; p3009Attempt <= MAX_P3009_RETRIES; p3009Attempt++) {
    const migrate = await deployWithLockRetry();

    if (migrate.ok) {
      console.log("Prisma migrate deploy succeeded.");
      return;
    }

    // ── P1002 advisory lock timeout after all retries: fail rather than
    // continue the build without confirmed schema changes.
    if (isAdvisoryLockTimeout(migrate.output)) {
      console.error(
        "[deploy-schema] Advisory lock timeout persisted after retries. Failing deploy so migrations are not skipped during a concurrent build. Re-run the deploy once the lock holder finishes."
      );
      process.stderr.write(migrate.output);
      process.exit(migrate.status);
    }

    // ── P3009: failed migration blocking deploy ───────────────────────────
    if (migrate.output.includes("P3009")) {
      const failedName = parseP3009FailedMigration(migrate.output);
      if (!failedName) {
        console.error("[deploy-schema] P3009 but could not parse migration name. Output:\n", migrate.output);
        process.exit(migrate.status);
      }

      console.warn(`[deploy-schema] P3009 — stuck migration detected: ${failedName} (attempt ${p3009Attempt}/${MAX_P3009_RETRIES})`);
      const canAutoRecover = cleanupPartialState(failedName);
      if (!canAutoRecover) {
        console.error(
          `[deploy-schema] Refusing to auto-resolve failed migration ${failedName}. This database needs manual Prisma recovery before another deploy. Review the _prisma_migrations row, inspect any partial schema changes, then run prisma migrate resolve explicitly.`
        );
        process.stderr.write(migrate.output);
        process.exit(migrate.status);
      }

      const resolve = runPrisma(["migrate", "resolve", "--rolled-back", failedName]);
      if (!resolve.ok) {
        console.error("[deploy-schema] Could not resolve failed migration:\n", resolve.output);
        process.exit(resolve.status);
      }
      console.log(`[deploy-schema] Marked ${failedName} as rolled-back — retrying deploy`);
      continue; // retry the outer loop
    }

    // ── P3018 duplicate-object on existing pre-provisioned DB ─────────────
    if (migrate.output.includes("P3018") && isDuplicateObjectError(migrate.output)) {
      const failedName = parseMigrationNameFromP3018(migrate.output);
      const migrations = getMigrationDirectories();

      // Safe auto-baseline only when a single migration exists (squashed init)
      // and the target database already has schema objects.
      if (failedName && migrations.length === 1 && failedName === migrations[0]) {
        console.warn(
          `[deploy-schema] P3018 duplicate-object on single init migration (${failedName}). Marking as applied for pre-provisioned database, then retrying deploy.`
        );

        markApplied(failedName);
        const redeploy = await deployWithLockRetry();
        if (!redeploy.ok) {
          process.stderr.write(redeploy.output);
          process.exit(redeploy.status);
        }

        console.log("Prisma migrate deploy succeeded after P3018 baseline recovery.");
        return;
      }
    }

    // ── P3005: database schema is not empty but has no migration history ──
    if (migrate.output.includes("P3005")) {
      console.error(
        "[deploy-schema] Prisma migrate deploy reported P3005: target database is not empty but has no Prisma migration history. Refusing to auto-baseline because it can silently skip required schema changes and cause runtime drift. Baseline this database manually, then rerun deploy."
      );
      process.stderr.write(migrate.output);
      process.exit(migrate.status);
    }

    // ── Unknown error ─────────────────────────────────────────────────────
    process.stderr.write(migrate.output);
    process.exit(migrate.status);
  }

  console.error(`[deploy-schema] Failed to apply migrations after ${MAX_P3009_RETRIES} P3009 resolution attempts`);
  process.exit(1);
}

main();
