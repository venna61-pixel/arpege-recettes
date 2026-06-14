const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/constants.js");

const { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode, MESSAGES } = global.FormulaConstants;

// ─── COUNTRIES ───────────────────────────────────────────────────────────────

function testCountriesEstUnTableau() {
  assert.ok(Array.isArray(COUNTRIES), "COUNTRIES doit être un tableau");
}

function testCountriesContientAuMoinsUnPays() {
  assert.ok(COUNTRIES.length >= 1, "COUNTRIES doit contenir au moins un pays");
}

function testChaquePaysALesChampsRequis() {
  for (const country of COUNTRIES) {
    assert.ok(typeof country.code === "string" && country.code.length > 0, `code manquant pour ${JSON.stringify(country)}`);
    assert.ok(typeof country.name === "string" && country.name.length > 0, `name manquant pour ${country.code}`);
    assert.ok(typeof country.currencySymbol === "string" && country.currencySymbol.length > 0, `currencySymbol manquant pour ${country.code}`);
    assert.ok(typeof country.currencyCode === "string" && country.currencyCode.length > 0, `currencyCode manquant pour ${country.code}`);
  }
}

function testCodesPaysSontUniques() {
  const codes = COUNTRIES.map((c) => c.code);
  const unique = new Set(codes);
  assert.strictEqual(unique.size, codes.length, "Chaque code pays doit être unique");
}

function testFranceEstPresente() {
  const fr = COUNTRIES.find((c) => c.code === "FR");
  assert.ok(fr, "La France doit être dans COUNTRIES");
  assert.strictEqual(fr.currencySymbol, "€");
  assert.strictEqual(fr.currencyCode, "EUR");
}

function testSuisseEstPresente() {
  const ch = COUNTRIES.find((c) => c.code === "CH");
  assert.ok(ch, "La Suisse doit être dans COUNTRIES");
  assert.strictEqual(ch.currencySymbol, "CHF");
  assert.strictEqual(ch.currencyCode, "CHF");
}

// ─── DEFAULT_COUNTRY_CODE ─────────────────────────────────────────────────────

function testDefaultCountryCodeEstFR() {
  assert.strictEqual(DEFAULT_COUNTRY_CODE, "FR", "Le pays par défaut doit être FR");
}

function testDefaultCountryCodeExisteDansLaListe() {
  const found = COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE);
  assert.ok(found, "Le pays par défaut doit exister dans COUNTRIES");
}

// ─── getCountryByCode ─────────────────────────────────────────────────────────

function testGetCountryByCodeRetourneLeBonPays() {
  const result = getCountryByCode("FR");
  assert.ok(result, "doit retourner un objet pour FR");
  assert.strictEqual(result.code, "FR");
  assert.strictEqual(result.name, "France");
}

function testGetCountryByCodeRetourneNullSiInconnu() {
  const result = getCountryByCode("XX");
  assert.strictEqual(result, null, "doit retourner null pour un code inconnu");
}

function testGetCountryByCodeRetourneNullSiVide() {
  assert.strictEqual(getCountryByCode(""), null);
  assert.strictEqual(getCountryByCode(null), null);
  assert.strictEqual(getCountryByCode(undefined), null);
}

function testGetCountryByCodeEstCaseSensible() {
  assert.strictEqual(getCountryByCode("fr"), null, "le code doit être en majuscules");
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

function testMessagesEstUnObjet() {
  assert.ok(MESSAGES && typeof MESSAGES === "object" && !Array.isArray(MESSAGES));
}

function testMessageImpressionPdfPresent() {
  assert.ok(typeof MESSAGES.IMPRESSION_PDF_IMPOSSIBLE === "string");
  assert.ok(MESSAGES.IMPRESSION_PDF_IMPOSSIBLE.length > 0);
}

function testMessagesRespectentLeStandardPhrase() {
  // Vérifie qu'aucun message ne dérive du standard documenté dans constants.js :
  // - non vide
  // - finit par un point
  // - pas de majuscule "Désolé"/"Désole" (ton non blâmant)
  for (const key in MESSAGES) {
    const msg = MESSAGES[key];
    assert.strictEqual(typeof msg, "string", `${key} doit être une string`);
    assert.ok(msg.trim().length > 0, `${key} ne doit pas être vide`);
    assert.ok(/[.!?]$/.test(msg.trim()), `${key} doit finir par un point/!/?, reçu : "${msg}"`);
    assert.ok(!/^Désol(é|e)/i.test(msg.trim()), `${key} ne doit pas commencer par "Désolé"`);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testCountriesEstUnTableau,
    testCountriesContientAuMoinsUnPays,
    testChaquePaysALesChampsRequis,
    testCodesPaysSontUniques,
    testFranceEstPresente,
    testSuisseEstPresente,
    testDefaultCountryCodeEstFR,
    testDefaultCountryCodeExisteDansLaListe,
    testGetCountryByCodeRetourneLeBonPays,
    testGetCountryByCodeRetourneNullSiInconnu,
    testGetCountryByCodeRetourneNullSiVide,
    testGetCountryByCodeEstCaseSensible,
    testMessagesEstUnObjet,
    testMessageImpressionPdfPresent,
    testMessagesRespectentLeStandardPhrase,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
