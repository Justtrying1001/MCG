import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

function main() {
  const migrate = runPrisma(["migrate", "deploy"]);
  if (migrate.ok) {
    console.log("Prisma migrate deploy succeeded.");
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

  const redeploy = runPrisma(["migrate", "deploy"]);
  if (!redeploy.ok) {
    process.stderr.write(redeploy.output);
    process.exit(redeploy.status);
  }

  console.log("Prisma migrate deploy succeeded after baseline recovery.");
}

main();
