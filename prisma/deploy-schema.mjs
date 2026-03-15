import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const LOCK_TIMEOUT_CODE = "P1002";
const LOCK_TIMEOUT_MARKER = "pg_advisory_lock";
const MAX_DEPLOY_ATTEMPTS = Number.parseInt(process.env.PRISMA_DEPLOY_RETRIES ?? "3", 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.PRISMA_DEPLOY_RETRY_DELAY_MS ?? "5000", 10);

const FAILED_MIGRATION_CODE = "P3009";
const FAILED_MIGRATION_NAME_PATTERN = /The `([^`]+)` migration[^\n]*failed/i;

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

function markRolledBack(migrationName) {
  const resolve = runPrisma(["migrate", "resolve", "--rolled-back", migrationName]);
  if (!resolve.ok) {
    process.stderr.write(resolve.output);
    process.exit(resolve.status);
  }
}

function extractFailedMigrationName(output) {
  const match = output.match(FAILED_MIGRATION_NAME_PATTERN);
  return match?.[1] ?? null;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isAdvisoryLockTimeout(output) {
  return output.includes(LOCK_TIMEOUT_CODE) && output.includes(LOCK_TIMEOUT_MARKER);
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
  const migrate = await deployWithLockRetry();
  if (migrate.ok) {
    console.log("Prisma migrate deploy succeeded.");
    return;
  }

  if (migrate.output.includes(FAILED_MIGRATION_CODE)) {
    const failedMigration = extractFailedMigrationName(migrate.output);
    if (!failedMigration) {
      process.stderr.write(migrate.output);
      process.exit(migrate.status);
    }

    console.warn(`Prisma migrate deploy reported ${FAILED_MIGRATION_CODE} on ${failedMigration}. Marking it rolled back and retrying deploy.`);
    markRolledBack(failedMigration);

    const retryAfterRollback = await deployWithLockRetry();
    if (!retryAfterRollback.ok) {
      process.stderr.write(retryAfterRollback.output);
      process.exit(retryAfterRollback.status);
    }

    console.log("Prisma migrate deploy succeeded after failed-migration recovery.");
    return;
  }

  if (!migrate.output.includes("P3005")) {
    process.stderr.write(migrate.output);
    process.exit(migrate.status);
  }

  const migrations = getMigrationDirectories();
  if (migrations.length <= 1) {
    process.stderr.write(migrate.output);
    process.exit(migrate.status);
  }

  const migrationsToBaseline = migrations.slice(0, -1);
  console.warn(
    `Prisma migrate deploy reported P3005. Baselining ${migrationsToBaseline.length} historical migration(s), then retrying deploy.`
  );

  for (const migrationName of migrationsToBaseline) {
    markApplied(migrationName);
  }

  const redeploy = await deployWithLockRetry();
  if (!redeploy.ok) {
    process.stderr.write(redeploy.output);
    process.exit(redeploy.status);
  }

  console.log("Prisma migrate deploy succeeded after baseline recovery.");
}

main();
