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

  console.warn("Prisma migrate deploy reported P3005 (non-empty non-baselined DB). Falling back to prisma db push.");

  const push = runPrisma(["db", "push"]);
  if (!push.ok) {
    process.stderr.write(push.output);
    process.exit(push.status);
  }

  console.log("Prisma db push fallback succeeded.");
}

main();
