const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/utils.js");

const {
  roundTo,
  formatDecimal,
  normalizeUnknownPrice,
  formatPriceDisplay,
  formatProcedureLine,
  migrateProcedureMarkdownToHtml,
  sanitizePrintTitle,
} = global.FormulaUtils;

// ─── roundTo ─────────────────────────────────────────────────────────────────

function testRoundToDeuxDecimales() {
  assert.strictEqual(roundTo(3.14159, 2), 3.14);
}

function testRoundToZero() {
  assert.strictEqual(roundTo(0), 0);
}

function testRoundToSansDecimales() {
  assert.strictEqual(roundTo(2.999, 0), 3);
}

// ─── formatDecimal ────────────────────────────────────────────────────────────

function testFormatDecimalNombreEntier() {
  assert.strictEqual(typeof formatDecimal(42), "string");
  assert.ok(formatDecimal(42).includes("42"));
}

function testFormatDecimalNonFiniRetourneZero() {
  assert.strictEqual(formatDecimal(NaN), "0");
  assert.strictEqual(formatDecimal(Infinity), "0");
  assert.strictEqual(formatDecimal("abc"), "0");
}

function testFormatDecimalSansGroupement() {
  // useGrouping: false — pas de séparateur de milliers
  const result = formatDecimal(1234);
  assert.ok(!result.includes(" ") && !result.includes(",") || result === "1234", "pas de séparateur de milliers");
}

// ─── normalizeUnknownPrice ───────────────────────────────────────────────────

function testNormalizeUnknownPricePrixValide() {
  assert.strictEqual(normalizeUnknownPrice("5.50"), 5.5);
  assert.strictEqual(normalizeUnknownPrice(8), 8);
}

function testNormalizeUnknownPriceChaineVideRetourneNull() {
  assert.strictEqual(normalizeUnknownPrice(""), null);
  assert.strictEqual(normalizeUnknownPrice(null), null);
  assert.strictEqual(normalizeUnknownPrice(undefined), null);
}

function testNormalizeUnknownPriceNegatifRetourneNull() {
  assert.strictEqual(normalizeUnknownPrice("-1"), null);
}

function testNormalizeUnknownPriceZeroRetourneNull() {
  assert.strictEqual(normalizeUnknownPrice("0"), null);
  assert.strictEqual(normalizeUnknownPrice(0), null);
}

function testNormalizeUnknownPriceTexteRetourneNull() {
  assert.strictEqual(normalizeUnknownPrice("abc"), null);
}

// ─── formatPriceDisplay ──────────────────────────────────────────────────────

function testFormatPriceDisplayPrixValide() {
  const result = formatPriceDisplay(5.5);
  assert.ok(result.includes("€"), "doit contenir €");
  assert.ok(result.includes("5"), "doit contenir la valeur");
}

function testFormatPriceDisplayZeroRetournePrixInconnu() {
  assert.strictEqual(formatPriceDisplay(0), "Prix inconnu");
}

function testFormatPriceDisplayNegatifRetournePrixInconnu() {
  assert.strictEqual(formatPriceDisplay(-1), "Prix inconnu");
}

function testFormatPriceDisplayNullRetournePrixInconnu() {
  assert.strictEqual(formatPriceDisplay(null), "Prix inconnu");
}

// ─── formatProcedureLine ─────────────────────────────────────────────────────

function testFormatProcedureLineGras() {
  assert.strictEqual(formatProcedureLine("**bold**"), "<strong>bold</strong>");
}

function testFormatProcedureLineItalique() {
  assert.strictEqual(formatProcedureLine("*italic*"), "<em>italic</em>");
}

function testFormatProcedureLineSouligne() {
  assert.strictEqual(formatProcedureLine("__under__"), "<u>under</u>");
}

function testFormatProcedureLineRouge() {
  const result = formatProcedureLine("[red]texte[/red]");
  assert.ok(result.includes("#dc2626"), "doit contenir la couleur rouge");
  assert.ok(result.includes("texte"));
}

function testFormatProcedureLinePuce() {
  assert.strictEqual(formatProcedureLine("- élément"), "• élément");
}

function testFormatProcedureLineEchappementHtml() {
  const result = formatProcedureLine("<script>");
  assert.ok(!result.includes("<script>"), "ne doit pas contenir de balise non échappée");
  assert.ok(result.includes("&lt;"), "doit échapper les chevrons");
}

// ─── migrateProcedureMarkdownToHtml ─────────────────────────────────────────

function testMigrateMarkdownEnHtml() {
  const result = migrateProcedureMarkdownToHtml("ligne1\nligne2");
  assert.ok(result.includes("<p>"), "doit contenir des balises p");
  assert.ok(result.includes("ligne1"), "doit contenir le texte");
  assert.ok(result.includes("ligne2"));
}

function testMigrateMarkdownDejaHtmlPasseThrough() {
  const html = "<p>déjà du html</p>";
  assert.strictEqual(migrateProcedureMarkdownToHtml(html), html);
}

function testMigrateMarkdownVideRetourneVide() {
  assert.strictEqual(migrateProcedureMarkdownToHtml(""), "");
  assert.strictEqual(migrateProcedureMarkdownToHtml(null), "");
}

// ─── sanitizePrintTitle ──────────────────────────────────────────────────────

function testSanitizePrintTitleNomNormal() {
  assert.strictEqual(sanitizePrintTitle("Soupe au pistou", "Fiche"), "Soupe au pistou - Fiche");
}

function testSanitizePrintTitleCaracteresInterdits() {
  assert.strictEqual(sanitizePrintTitle("Recette/test:nom*spécial", "Fiche"), "Recette test nom spécial - Fiche");
}

function testSanitizePrintTitleValeurVide() {
  assert.strictEqual(sanitizePrintTitle("", "Fiche"), "Recette - Fiche");
}

function testSanitizePrintTitleValeurNull() {
  assert.strictEqual(sanitizePrintTitle(null, "Fiche adaptée"), "Recette - Fiche adaptée");
}

function testSanitizePrintTitleEspacesMultiples() {
  assert.strictEqual(sanitizePrintTitle("Nom   avec   espaces", "Fiche"), "Nom avec espaces - Fiche");
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testRoundToDeuxDecimales,
    testRoundToZero,
    testRoundToSansDecimales,
    testFormatDecimalNombreEntier,
    testFormatDecimalNonFiniRetourneZero,
    testFormatDecimalSansGroupement,
    testNormalizeUnknownPricePrixValide,
    testNormalizeUnknownPriceChaineVideRetourneNull,
    testNormalizeUnknownPriceNegatifRetourneNull,
    testNormalizeUnknownPriceZeroRetourneNull,
    testNormalizeUnknownPriceTexteRetourneNull,
    testFormatPriceDisplayPrixValide,
    testFormatPriceDisplayZeroRetournePrixInconnu,
    testFormatPriceDisplayNegatifRetournePrixInconnu,
    testFormatPriceDisplayNullRetournePrixInconnu,
    testFormatProcedureLineGras,
    testFormatProcedureLineItalique,
    testFormatProcedureLineSouligne,
    testFormatProcedureLineRouge,
    testFormatProcedureLinePuce,
    testFormatProcedureLineEchappementHtml,
    testMigrateMarkdownEnHtml,
    testMigrateMarkdownDejaHtmlPasseThrough,
    testMigrateMarkdownVideRetourneVide,
    testSanitizePrintTitleNomNormal,
    testSanitizePrintTitleCaracteresInterdits,
    testSanitizePrintTitleValeurVide,
    testSanitizePrintTitleValeurNull,
    testSanitizePrintTitleEspacesMultiples,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
