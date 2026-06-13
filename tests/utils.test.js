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

function testMigrateMarkdownVideRetourneVide() {
  assert.strictEqual(migrateProcedureMarkdownToHtml(""), "");
  assert.strictEqual(migrateProcedureMarkdownToHtml(null), "");
}

// ─── Sanitisation HTML (correction du bypass dangereux) ─────────────────────

function testMigrateHtmlSansSanitizerEchappePourSecurite() {
  // Quand DOMPurify est absent (Node, offline...), le fallback safe est
  // d'échapper le HTML plutôt que de l'afficher tel quel.
  const result = migrateProcedureMarkdownToHtml("<p>du html</p>");
  assert.ok(!result.includes("<p>"), `le HTML ne doit pas passer brut (résultat: ${result})`);
  assert.ok(result.includes("&lt;p&gt;"), `les chevrons doivent être échappés (résultat: ${result})`);
}

function testMigrateHtmlSansSanitizerEchappeScript() {
  // Vecteur XSS classique : si DOMPurify absent, le script doit être inerte.
  const result = migrateProcedureMarkdownToHtml("<script>alert(1)</script>");
  assert.ok(!result.includes("<script>"), `<script> ne doit jamais passer brut (résultat: ${result})`);
  assert.ok(result.includes("&lt;script&gt;"), `doit être échappé (résultat: ${result})`);
}

function testMigrateHtmlAvecSanitizerAppelleLeSanitizer() {
  let received = null;
  const sanitizer = (input) => { received = input; return "<safe/>"; };
  migrateProcedureMarkdownToHtml("<p>contenu</p>", sanitizer);
  assert.strictEqual(received, "<p>contenu</p>", "le sanitizer doit recevoir le HTML brut");
}

function testMigrateHtmlAvecSanitizerRetourneSonResultat() {
  const sanitizer = () => "<p>nettoyé</p>";
  const result = migrateProcedureMarkdownToHtml("<script>dangereux</script>", sanitizer);
  assert.strictEqual(result, "<p>nettoyé</p>");
}

function testMigrateMarkdownSansSanitizerSuitLeCheminConvert() {
  // Le chemin markdown (texte sans tag HTML) reste inchangé — déjà safe.
  const result = migrateProcedureMarkdownToHtml("ligne **gras**");
  assert.ok(result.includes("<p>"), "doit emballer en <p>");
  assert.ok(result.includes("<strong>gras</strong>"), "doit convertir le markdown");
}

function testMigrateMarkdownAvecSanitizerNAppellePasLeSanitizer() {
  // Le chemin markdown n'a pas besoin du sanitizer (déjà safe via escapeHtml).
  let appele = false;
  const sanitizer = () => { appele = true; return "RIEN"; };
  const result = migrateProcedureMarkdownToHtml("texte simple", sanitizer);
  assert.strictEqual(appele, false, "le sanitizer ne doit pas être appelé pour du markdown");
  assert.ok(result.includes("<p>texte simple</p>"));
}

function testMigrateHtmlVecteurOnerror() {
  // Sans sanitizer, le tag <img> doit être neutralisé par échappement.
  // Le mot "onerror" peut rester comme texte (inoffensif) mais le tag lui-même
  // ne doit pas exister dans le DOM rendu.
  const result = migrateProcedureMarkdownToHtml('<img src=x onerror="alert(1)">');
  assert.ok(!result.includes("<img"), `<img> ne doit pas passer brut (résultat: ${result})`);
  assert.ok(result.includes("&lt;img"), `doit être échappé en texte (résultat: ${result})`);
}

function testMigrateHtmlVecteurIframe() {
  // Sans sanitizer, iframe doit être échappée.
  const result = migrateProcedureMarkdownToHtml('<iframe src="javascript:alert(1)"></iframe>');
  assert.ok(!result.includes("<iframe"), `<iframe> ne doit pas passer brut (résultat: ${result})`);
}

function testMigrateHtmlSanitizerEstAppeleUneSeuleFois() {
  let count = 0;
  const sanitizer = (s) => { count += 1; return s; };
  migrateProcedureMarkdownToHtml("<p>x</p>", sanitizer);
  assert.strictEqual(count, 1);
}

function testAllowlistInclutFontEtColorViaDomPurifyMock() {
  // Vérifie que le sanitizer par défaut passe une allowlist incluant <font>
  // et color (pour les recettes legacy enregistrées en <font color="...">).
  // On mock window.DOMPurify pour capturer la config passée.
  const originalDOMPurify = global.DOMPurify;
  let capturedConfig = null;
  global.DOMPurify = {
    sanitize: (input, config) => {
      capturedConfig = config;
      return input;
    },
  };
  try {
    migrateProcedureMarkdownToHtml('<font color="#dc2626">rouge</font>');
    assert.ok(capturedConfig, "DOMPurify.sanitize doit être appelé avec une config");
    assert.ok(capturedConfig.ALLOWED_TAGS.includes("font"), "<font> doit être dans ALLOWED_TAGS");
    assert.ok(capturedConfig.ALLOWED_TAGS.includes("span"), "<span> doit rester autorisé");
    assert.ok(capturedConfig.ALLOWED_ATTR.includes("color"), "'color' doit être dans ALLOWED_ATTR");
    assert.ok(capturedConfig.ALLOWED_ATTR.includes("style"), "'style' doit rester autorisé");
  } finally {
    global.DOMPurify = originalDOMPurify;
  }
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
    testMigrateMarkdownVideRetourneVide,
    testMigrateHtmlSansSanitizerEchappePourSecurite,
    testMigrateHtmlSansSanitizerEchappeScript,
    testMigrateHtmlAvecSanitizerAppelleLeSanitizer,
    testMigrateHtmlAvecSanitizerRetourneSonResultat,
    testMigrateMarkdownSansSanitizerSuitLeCheminConvert,
    testMigrateMarkdownAvecSanitizerNAppellePasLeSanitizer,
    testMigrateHtmlVecteurOnerror,
    testMigrateHtmlVecteurIframe,
    testMigrateHtmlSanitizerEstAppeleUneSeuleFois,
    testAllowlistInclutFontEtColorViaDomPurifyMock,
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
