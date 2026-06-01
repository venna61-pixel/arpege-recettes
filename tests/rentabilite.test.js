const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/constants.js");
loadScript("logic/core/pricing.js");

const { calcByCoefficient, calcByMargeBruteHT, calcByMargeNetteTTC, calcByPrixTTC } = global.FormulaPricing;
const { COUNTRIES, TVA_RATES_BY_COUNTRY, getTVARates, getDefaultTVARate } = global.FormulaConstants;

// ─── calcByCoefficient ────────────────────────────────────────────────────────

function testCoefficientCasNominal() {
  // coût=1, coeff=2, TVA=0 → valeurs exactes sans arrondi problématique
  const r = calcByCoefficient(1.0, 2.0, 0);
  assert.strictEqual(r.prixHT,           2.0);
  assert.strictEqual(r.prixTTC,          2.0);
  assert.strictEqual(r.coefficient,      2.0);
  assert.strictEqual(r.margeHTEur,  1.0);
  assert.strictEqual(r.margeHTPct,  50.0);
  assert.strictEqual(r.margeTTCEur, 1.0);
  assert.strictEqual(r.margeTTCPct, 50.0);
}

function testCoefficientAvecTVA() {
  const r = calcByCoefficient(1.0, 4.0, 10);
  assert.strictEqual(r.prixHT,  4.0);
  assert.strictEqual(r.prixTTC, 4.4);
  assert.strictEqual(r.margeHTEur, 3.0);
  assert.strictEqual(r.margeHTPct, 75.0);
  assert.strictEqual(r.margeTTCEur, 3.4);
}

function testCoefficientA1MargeNulle() {
  const r = calcByCoefficient(1.0, 1.0, 0);
  assert.strictEqual(r.prixHT,           1.0);
  assert.strictEqual(r.margeHTEur,  0.0);
  assert.strictEqual(r.margeHTPct,  0.0);
  assert.strictEqual(r.margeTTCEur, 0.0);
  assert.strictEqual(r.margeTTCPct, 0.0);
}

function testCoefficientTVAZero() {
  const r = calcByCoefficient(1.0, 3.5, 0);
  assert.strictEqual(r.prixHT,  r.prixTTC, "TVA=0 : prix HT doit égaler prix TTC");
  assert.strictEqual(r.margeHTPct, r.margeTTCPct);
}

// ─── calcByMargeBruteHT ───────────────────────────────────────────────────────

function testMargeBruteHTCasNominal() {
  // marge=75%, TVA=0 → prixHT = 1/0.25 = 4
  const r = calcByMargeBruteHT(1.0, 75, 0);
  assert.strictEqual(r.prixHT,          4.0);
  assert.strictEqual(r.prixTTC,         4.0);
  assert.strictEqual(r.coefficient,     4.0);
  assert.strictEqual(r.margeHTEur, 3.0);
  assert.strictEqual(r.margeHTPct, 75.0);
}

function testMargeBruteHTAvecTVA() {
  const r = calcByMargeBruteHT(1.0, 75, 10);
  assert.strictEqual(r.prixHT,  4.0);
  assert.strictEqual(r.prixTTC, 4.4);
  assert.strictEqual(r.coefficient, 4.0);
}

function testMargeBruteHTCibleZero() {
  const r = calcByMargeBruteHT(1.0, 0, 0);
  assert.strictEqual(r.prixHT,          1.0);
  assert.strictEqual(r.coefficient,     1.0);
  assert.strictEqual(r.margeHTEur, 0.0);
  assert.strictEqual(r.margeHTPct, 0.0);
}

function testMargeBruteHTCible99() {
  const r = calcByMargeBruteHT(1.0, 99, 0);
  assert.strictEqual(r.prixHT, 100.0);
  assert.strictEqual(r.coefficient, 100.0);
}

// ─── calcByMargeNetteTTC ──────────────────────────────────────────────────────

function testMargeNetteTTCCasNominal() {
  // marge=75%, TVA=0 → prixTTC = 1/0.25 = 4
  const r = calcByMargeNetteTTC(1.0, 75, 0);
  assert.strictEqual(r.prixTTC,          4.0);
  assert.strictEqual(r.prixHT,           4.0);
  assert.strictEqual(r.coefficient,      4.0);
  assert.strictEqual(r.margeTTCEur, 3.0);
  assert.strictEqual(r.margeTTCPct, 75.0);
}

function testMargeNetteTTCAvecTVA() {
  const r = calcByMargeNetteTTC(1.0, 75, 10);
  assert.strictEqual(r.prixTTC, 4.0);
  // prixHT = 4.0 / 1.10 = 3.636... → round2 = 3.64
  assert.strictEqual(r.prixHT, 3.64);
}

function testMargeNetteTTCCibleZero() {
  const r = calcByMargeNetteTTC(1.0, 0, 0);
  assert.strictEqual(r.prixTTC,          1.0);
  assert.strictEqual(r.margeTTCEur, 0.0);
  assert.strictEqual(r.margeTTCPct, 0.0);
}

function testMargeNetteTTCCible99() {
  const r = calcByMargeNetteTTC(1.0, 99, 0);
  assert.strictEqual(r.prixTTC, 100.0);
}

// ─── calcByPrixTTC ────────────────────────────────────────────────────────────

function testPrixTTCCasNominal() {
  // coût=1, prixTTC=4, TVA=0 → prixHT=4, coeff=4, marges exactes
  const r = calcByPrixTTC(1.0, 4.0, 0);
  assert.strictEqual(r.prixTTC,     4.0);
  assert.strictEqual(r.prixHT,      4.0);
  assert.strictEqual(r.coefficient, 4.0);
  assert.strictEqual(r.margeTTCEur, 3.0);
  assert.strictEqual(r.margeTTCPct, 75.0);
  assert.strictEqual(r.margeHTEur,  3.0);
  assert.strictEqual(r.margeHTPct,  75.0);
}

function testPrixTTCAvecTVA() {
  // coût=1, prixTTC=4.4, TVA=10 → prixHT=4
  const r = calcByPrixTTC(1.0, 4.4, 10);
  assert.strictEqual(r.prixHT,  4.0);
  assert.strictEqual(r.prixTTC, 4.4);
  assert.strictEqual(r.coefficient, 4.0);
}

function testPrixTTCEgalCout() {
  // prix = coût → marges nulles
  const r = calcByPrixTTC(1.0, 1.0, 0);
  assert.strictEqual(r.margeTTCEur, 0.0);
  assert.strictEqual(r.margeTTCPct, 0.0);
}

function testPrixTTCNulRetourneNull() {
  assert.strictEqual(calcByPrixTTC(1.0, 0, 10),    null);
  assert.strictEqual(calcByPrixTTC(1.0, null, 10),  null);
  assert.strictEqual(calcByPrixTTC(null, 5.0, 10),  null);
}

// ─── Cas limites communs ──────────────────────────────────────────────────────

function testCoutNullRetourneNull() {
  assert.strictEqual(calcByCoefficient(null, 3.5, 10),   null);
  assert.strictEqual(calcByMargeBruteHT(null, 65, 10),   null);
  assert.strictEqual(calcByMargeNetteTTC(null, 55, 10),  null);
}

function testCoutZeroRetourneNull() {
  assert.strictEqual(calcByCoefficient(0, 3.5, 10),   null);
  assert.strictEqual(calcByMargeBruteHT(0, 65, 10),   null);
  assert.strictEqual(calcByMargeNetteTTC(0, 55, 10),  null);
}

function testMarge100RetourneNull() {
  assert.strictEqual(calcByMargeBruteHT(1.0, 100, 10),  null, "marge 100% impossible");
  assert.strictEqual(calcByMargeNetteTTC(1.0, 100, 10), null, "marge 100% impossible");
}

function testCoefficientNegatiefRetourneNull() {
  assert.strictEqual(calcByCoefficient(1.0, -1, 10), null);
  assert.strictEqual(calcByCoefficient(1.0, 0, 10),  null);
}

// ─── TVA par pays ─────────────────────────────────────────────────────────────

function testChaquePaysADesTauxDeTVA() {
  for (const country of COUNTRIES) {
    const rates = getTVARates(country.code);
    assert.ok(rates !== null && Array.isArray(rates) && rates.length > 0,
      `${country.code} doit avoir des taux de TVA définis`);
  }
}

function testChaquePaysAUnTauxParDefaut() {
  for (const country of COUNTRIES) {
    const def = getDefaultTVARate(country.code);
    assert.ok(def !== null && typeof def === "number" && def >= 0,
      `${country.code} doit avoir un taux de TVA par défaut numérique`);
  }
}

function testTauxParDefautFranceEst10() {
  assert.strictEqual(getDefaultTVARate("FR"), 10);
}

function testTauxParDefautSuisseEst2_6() {
  assert.strictEqual(getDefaultTVARate("CH"), 2.6);
}

function testPaysInconnuRetourneNull() {
  assert.strictEqual(getTVARates("XX"),      null);
  assert.strictEqual(getDefaultTVARate("XX"), null);
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testCoefficientCasNominal,
    testCoefficientAvecTVA,
    testCoefficientA1MargeNulle,
    testCoefficientTVAZero,
    testMargeBruteHTCasNominal,
    testMargeBruteHTAvecTVA,
    testMargeBruteHTCibleZero,
    testMargeBruteHTCible99,
    testMargeNetteTTCCasNominal,
    testMargeNetteTTCAvecTVA,
    testMargeNetteTTCCibleZero,
    testMargeNetteTTCCible99,
    testPrixTTCCasNominal,
    testPrixTTCAvecTVA,
    testPrixTTCEgalCout,
    testPrixTTCNulRetourneNull,
    testCoutNullRetourneNull,
    testCoutZeroRetourneNull,
    testMarge100RetourneNull,
    testCoefficientNegatiefRetourneNull,
    testChaquePaysADesTauxDeTVA,
    testChaquePaysAUnTauxParDefaut,
    testTauxParDefautFranceEst10,
    testTauxParDefautSuisseEst2_6,
    testPaysInconnuRetourneNull,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
