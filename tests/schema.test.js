const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("models/schema.js");

const { ENTITY_DEFINITIONS, defaults } = global.FormulaSchema;

// ─── RestaurantConfig ─────────────────────────────────────────────────────────

function testRestaurantConfigEstDefinie() {
  assert.ok(ENTITY_DEFINITIONS.RestaurantConfig, "RestaurantConfig doit être définie dans le schéma");
}

function testRestaurantConfigALesChampsCles() {
  const fields = ENTITY_DEFINITIONS.RestaurantConfig.fields;
  assert.ok(fields.restaurantName,      "restaurantName doit être défini");
  assert.ok(fields.chefPasswordHash,    "chefPasswordHash doit être défini");
  assert.ok(fields.employePasswordHash, "employePasswordHash doit être défini");
  assert.ok(fields.countryCode,         "countryCode doit être défini");
  assert.ok(fields.currencySymbol,      "currencySymbol doit être défini");
}

function testRestaurantNameEstRequis() {
  assert.strictEqual(ENTITY_DEFINITIONS.RestaurantConfig.fields.restaurantName.required, true);
}

function testCountryCodeAUneValeurParDefaut() {
  assert.strictEqual(ENTITY_DEFINITIONS.RestaurantConfig.fields.countryCode.default, "FR");
}

function testCurrencySymbolAUneValeurParDefaut() {
  assert.strictEqual(ENTITY_DEFINITIONS.RestaurantConfig.fields.currencySymbol.default, "€");
}


// ─── defaults globaux ─────────────────────────────────────────────────────────

function testDefaultsContientCountryCode() {
  assert.strictEqual(defaults.countryCode, "FR");
}

function testDefaultsContientCurrencySymbol() {
  assert.strictEqual(defaults.currencySymbol, "€");
}

function testDefaultsContientTvaPercent() {
  assert.strictEqual(defaults.tva_percent, 10);
}

// ─── Entités existantes non altérées ─────────────────────────────────────────

function testIngredientEstToujousDefini() {
  assert.ok(ENTITY_DEFINITIONS.Ingredient, "Ingredient ne doit pas avoir disparu du schéma");
}

function testPlatFinalEstToujoursDefini() {
  assert.ok(ENTITY_DEFINITIONS.PlatFinal, "PlatFinal ne doit pas avoir disparu du schéma");
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testRestaurantConfigEstDefinie,
    testRestaurantConfigALesChampsCles,
    testRestaurantNameEstRequis,
    testCountryCodeAUneValeurParDefaut,
    testCurrencySymbolAUneValeurParDefaut,
    testDefaultsContientCountryCode,
    testDefaultsContientCurrencySymbol,
    testDefaultsContientTvaPercent,
    testIngredientEstToujousDefini,
    testPlatFinalEstToujoursDefini,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
