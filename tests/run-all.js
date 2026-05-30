const { execSync } = require("child_process");
const path = require("path");

const tests = [
  "allergenes.test.js",
  "core-costs-and-units.test.js",
  "recipe-scaling.test.js",
  "recipe-submission.test.js",
  "recipe-builder.test.js",
  "recipe-filters.test.js",
  "migration-coherence.test.js",
  "data-export.test.js",
  "auth-helpers.test.js",
  "merge.test.js",
  "utils.test.js",
];

let passed = 0;
let failed = 0;
const failures = [];

console.log("\n=== Tests Arpège ===\n");

for (const file of tests) {
  const filePath = path.join(__dirname, file);
  try {
    const output = execSync(`node "${filePath}"`, { encoding: "utf8", cwd: path.join(__dirname, "..") });
    const lines = output.trim().split("\n").filter(l => l.startsWith("PASS") || l.includes("passent") || l.includes("OK"));
    const passCount = output.split("\n").filter(l => l.startsWith("PASS")).length;
    passed += passCount;
    console.log(`✓ ${file} (${passCount} tests)`);
  } catch (err) {
    failed++;
    failures.push({ file, error: err.stdout || err.message });
    console.log(`✗ ${file}`);
    const errorLines = (err.stdout || err.message || "").split("\n").slice(0, 8).join("\n");
    console.log(`  ${errorLines.replace(/\n/g, "\n  ")}`);
  }
}

console.log(`\n=== Résultat : ${passed} tests OK, ${failed} fichier(s) en échec ===\n`);

if (failed > 0) process.exit(1);
