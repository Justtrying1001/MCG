#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT_DIRS = ["app", "components", "lib", "styles"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".mdx"]);

const forbiddenPatterns = [
  /\bDétails?\b/i,
  /\bdetail\s+du\s+score\b/i,
  /\bSuccès\b/i,
  /\bErreur\b/i,
  /\bConnexion\b/i,
  /\bDéconnexion\b/i,
  /\bJoueur\b/i,
  /\bCarte(s)?\b/i,
  /\bRécompense(s)?\b/i,
  /\bClassement\b/i,
  /\bTerminé\b/i,
  /\bChargement\b/i,
  /\bEn cours\b/i,
  /\bSauvegarder\b/i,
  /\bSupprimer\b/i,
  /\bModifier\b/i,
  /\bvoir détail\b/i,
  /\bcôté user\b/i,
  /\bAjoute\b/i,
];

const skipDirNames = new Set(["node_modules", ".next", ".git"]);

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirNames.has(entry.name)) walk(path.join(dir, entry.name), acc);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!FILE_EXTENSIONS.has(ext)) continue;
    acc.push(path.join(dir, entry.name));
  }
}

const files = [];
for (const dir of ROOT_DIRS) walk(dir, files);

const findings = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, idx) => {
    const matched = forbiddenPatterns.find((pattern) => pattern.test(line));
    if (matched) {
      findings.push({ file, lineNumber: idx + 1, line: line.trim() });
    }
  });
}

if (findings.length > 0) {
  console.error("❌ Non-English (French) UI text detected. Replace with English:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.lineNumber} -> ${finding.line}`);
  }
  process.exit(1);
}

console.log(`✅ Language check passed (${files.length} files scanned).`);
