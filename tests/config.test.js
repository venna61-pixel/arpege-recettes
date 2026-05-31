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

const { CONFIG_KEY, getConfig, saveConfig } = global.ArpegeConfig;

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

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testGetConfigRetourneNullSiAbsent,
    testGetConfigRetourneNullSiJsonInvalide,
    testSaveConfigEtGetConfigDonnentLeMemeObjet,
    testSaveConfigEcraseLAncienneConfig,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
