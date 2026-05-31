const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/procedure.js");

const { detectProcedureWarnings, buildProcedureWarningHtml } = window.FormulaProcedure;

// detectProcedureWarnings — texte vide ou null
function testProcedureVide() {
  const result = detectProcedureWarnings("");
  assert.deepStrictEqual(result.dimensions, []);
  assert.deepStrictEqual(result.cookingTimes, []);
  assert.strictEqual(result.hasWarnings, false);
}

function testProcedureNull() {
  const result = detectProcedureWarnings(null);
  assert.strictEqual(result.hasWarnings, false);
}

// detectProcedureWarnings — détection de dimensions
function testDetectionDimensionCm() {
  const result = detectProcedureWarnings("Étaler sur une plaque de 30×20 cm.");
  assert.ok(result.dimensions.length > 0, "doit détecter 30×20 cm");
  assert.strictEqual(result.hasWarnings, true);
}

function testDetectionDimensionMm() {
  const result = detectProcedureWarnings("Couper en tranches de 5 mm d'épaisseur.");
  assert.ok(result.dimensions.length > 0, "doit détecter 5 mm");
  assert.strictEqual(result.hasWarnings, true);
}

function testPasDeDimensionSansMesure() {
  const result = detectProcedureWarnings("Mélanger doucement jusqu'à obtenir une texture lisse.");
  assert.deepStrictEqual(result.dimensions, []);
}

// detectProcedureWarnings — détection de temps
function testDetectionTempsMinutes() {
  const result = detectProcedureWarnings("Cuire 25 minutes à 180°C.");
  assert.ok(result.cookingTimes.length > 0, "doit détecter 25 minutes");
  assert.strictEqual(result.hasWarnings, true);
}

function testDetectionTempsHeures() {
  const result = detectProcedureWarnings("Laisser reposer 2h au réfrigérateur.");
  assert.ok(result.cookingTimes.length > 0, "doit détecter 2h");
  assert.strictEqual(result.hasWarnings, true);
}

function testDetectionTempsHeureMinute() {
  const result = detectProcedureWarnings("Cuire 1h30 à feu doux.");
  assert.ok(result.cookingTimes.length > 0, "doit détecter 1h30");
}

function testPasDeTempsSansMesure() {
  const result = detectProcedureWarnings("Assaisonner selon le goût.");
  assert.deepStrictEqual(result.cookingTimes, []);
}

// detectProcedureWarnings — déduplication
function testDeduplication() {
  const result = detectProcedureWarnings("Cuire 25 minutes, puis encore 25 minutes.");
  assert.strictEqual(result.cookingTimes.length, 1, "25 minutes dédupliqué");
}

// buildProcedureWarningHtml — cas sans avertissement
function testWarningHtmlVide() {
  const html = buildProcedureWarningHtml({ multiplierValue: 2, dimensions: [], cookingTimes: [] });
  assert.strictEqual(html, "", "aucun avertissement si rien détecté");
}

function testWarningHtmlMultiplierUn() {
  const html = buildProcedureWarningHtml({ multiplierValue: 1, dimensions: ["30×20 cm"], cookingTimes: ["25 minutes"] });
  assert.strictEqual(html, "", "aucun avertissement si coefficient = 1");
}

// buildProcedureWarningHtml — cas avec avertissement
function testWarningHtmlAvecDimensions() {
  const html = buildProcedureWarningHtml({ multiplierValue: 3, dimensions: ["30×20 cm"], cookingTimes: [] });
  assert.ok(html.includes("warning-box"), "contient warning-box");
  assert.ok(html.includes("30×20 cm"), "contient la dimension");
  assert.ok(html.includes("Dimensions détectées"), "contient le label dimensions");
}

function testWarningHtmlAvecTemps() {
  const html = buildProcedureWarningHtml({ multiplierValue: 2, dimensions: [], cookingTimes: ["25 minutes"] });
  assert.ok(html.includes("Temps de cuisson détectés"), "contient le label temps");
  assert.ok(html.includes("25 minutes"), "contient le temps");
}

function testWarningHtmlEchappementHtml() {
  const html = buildProcedureWarningHtml({ multiplierValue: 2, dimensions: ["<script>"], cookingTimes: [] });
  assert.ok(!html.includes("<script>"), "les caractères spéciaux sont échappés");
  assert.ok(html.includes("&lt;script&gt;"), "échappement HTML correct");
}

function runAll() {
  const tests = [
    testProcedureVide,
    testProcedureNull,
    testDetectionDimensionCm,
    testDetectionDimensionMm,
    testPasDeDimensionSansMesure,
    testDetectionTempsMinutes,
    testDetectionTempsHeures,
    testDetectionTempsHeureMinute,
    testPasDeTempsSansMesure,
    testDeduplication,
    testWarningHtmlVide,
    testWarningHtmlMultiplierUn,
    testWarningHtmlAvecDimensions,
    testWarningHtmlAvecTemps,
    testWarningHtmlEchappementHtml,
  ];

  for (const testFn of tests) {
    testFn();
    console.log("PASS " + testFn.name);
  }
  console.log("\nTous les tests procedure passent.");
}

runAll();
