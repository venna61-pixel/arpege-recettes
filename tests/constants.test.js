const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/constants.js");

const { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode } = global.FormulaConstants;

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
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
