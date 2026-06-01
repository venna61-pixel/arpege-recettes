const fs = require("fs");
const assert = require("assert");

// Faux localStorage pour les tests (Node.js n'en a pas)
function makeLocalStorage() {
  const store = {};
  return {
    getItem: (key) => (store[key] !== undefined ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

global.localStorage = makeLocalStorage();
global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/config.js");

const { CONFIG_KEY, getConfig, saveConfig, getCurrencySymbol, getCountryCode } = global.FormulaConfig;

// ─── getConfig ───────────────────────────────────────────────────────────────

function testGetConfigRetourneNullSiAbsent() {
  global.localStorage.clear();
  assert.strictEqual(getConfig(), null);
}

function testGetConfigRetourneNullSiJsonInvalide() {
  global.localStorage.setItem(CONFIG_KEY, "ceci_nest_pas_du_json{{{");
  assert.strictEqual(getConfig(), null, "doit retourner null si le JSON est corrompu");
}

// ─── saveConfig / getConfig ───────────────────────────────────────────────────

function testSaveConfigEtGetConfigDonnentLeMemeObjet() {
  global.localStorage.clear();
  const config = { restaurantName: "Le Bistro", chefPasswordHash: "abc123" };
  saveConfig(config);
  const result = getConfig();
  assert.strictEqual(result.restaurantName, "Le Bistro");
  assert.strictEqual(result.chefPasswordHash, "abc123");
}

function testSaveConfigEcraseLAncienneConfig() {
  global.localStorage.clear();
  saveConfig({ restaurantName: "Premier" });
  saveConfig({ restaurantName: "Deuxième" });
  const result = getConfig();
  assert.strictEqual(result.restaurantName, "Deuxième", "la deuxième sauvegarde doit remplacer la première");
}

// ─── getCurrencySymbol ────────────────────────────────────────────────────────

function testGetCurrencySymbolRetourneEuroParDefautSiPasDeConfig() {
  global.localStorage.clear();
  assert.strictEqual(getCurrencySymbol(), "€", "doit retourner € si aucune config");
}

function testGetCurrencySymbolRetourneEuroSiChampsAbsent() {
  global.localStorage.clear();
  saveConfig({ restaurantName: "Test" });
  assert.strictEqual(getCurrencySymbol(), "€", "doit retourner € si currencySymbol absent de la config");
}

function testGetCurrencySymbolRetourneLaValeurSauvegardee() {
  global.localStorage.clear();
  saveConfig({ restaurantName: "Test", currencySymbol: "CHF" });
  assert.strictEqual(getCurrencySymbol(), "CHF");
}

function testGetCurrencySymbolRetourneEuroPourFrance() {
  global.localStorage.clear();
  saveConfig({ countryCode: "FR", currencySymbol: "€" });
  assert.strictEqual(getCurrencySymbol(), "€");
}

// ─── getCountryCode ───────────────────────────────────────────────────────────

function testGetCountryCodeRetourneFRParDefautSiPasDeConfig() {
  global.localStorage.clear();
  assert.strictEqual(getCountryCode(), "FR", "doit retourner FR si aucune config");
}

function testGetCountryCodeRetourneFRSiChampsAbsent() {
  global.localStorage.clear();
  saveConfig({ restaurantName: "Test" });
  assert.strictEqual(getCountryCode(), "FR", "doit retourner FR si countryCode absent de la config");
}

function testGetCountryCodeRetourneLaValeurSauvegardee() {
  global.localStorage.clear();
  saveConfig({ countryCode: "CH", currencySymbol: "CHF" });
  assert.strictEqual(getCountryCode(), "CH");
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testGetConfigRetourneNullSiAbsent,
    testGetConfigRetourneNullSiJsonInvalide,
    testSaveConfigEtGetConfigDonnentLeMemeObjet,
    testSaveConfigEcraseLAncienneConfig,
    testGetCurrencySymbolRetourneEuroParDefautSiPasDeConfig,
    testGetCurrencySymbolRetourneEuroSiChampsAbsent,
    testGetCurrencySymbolRetourneLaValeurSauvegardee,
    testGetCurrencySymbolRetourneEuroPourFrance,
    testGetCountryCodeRetourneFRParDefautSiPasDeConfig,
    testGetCountryCodeRetourneFRSiChampsAbsent,
    testGetCountryCodeRetourneLaValeurSauvegardee,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
