const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/storage-keys.js");

const KEYS = global.FormulaStorageKeys;

// ─── Structure du module ─────────────────────────────────────────────────────

function testModuleExpose() {
  assert.ok(KEYS, "FormulaStorageKeys doit être exposé sur window");
}

function testCategoriesAttendues() {
  const expected = ["DATA", "SESSION", "CONFIG", "SAFETY", "MIGRATIONS", "V1", "FEATURE_FLAGS", "PREFS"];
  for (const cat of expected) {
    assert.ok(KEYS[cat] && typeof KEYS[cat] === "object", `Catégorie manquante : ${cat}`);
  }
}

// ─── Validité des valeurs ────────────────────────────────────────────────────

// Catégories à valeurs statiques (chaînes). PREFS est exclu car ses entrées
// sont des fonctions qui construisent une clé à partir d'un sectionType.
const STATIC_CATEGORIES = ["DATA", "SESSION", "CONFIG", "SAFETY", "MIGRATIONS", "V1", "FEATURE_FLAGS"];

function flattenAllKeys() {
  const all = [];
  for (const cat of STATIC_CATEGORIES) {
    for (const name of Object.keys(KEYS[cat])) {
      all.push({ category: cat, name, value: KEYS[cat][name] });
    }
  }
  return all;
}

function testToutesLesClesSontDesStringsNonVides() {
  for (const { category, name, value } of flattenAllKeys()) {
    assert.strictEqual(typeof value, "string", `${category}.${name} doit être une string`);
    assert.ok(value.length > 0, `${category}.${name} ne doit pas être vide`);
  }
}

function testPrefixeArpegeOuFormula() {
  for (const { category, name, value } of flattenAllKeys()) {
    const ok = value.startsWith("arpege_") || value.startsWith("formula_");
    assert.ok(ok, `${category}.${name} = "${value}" doit commencer par arpege_ ou formula_`);
  }
}

function testAucuneCleEnDouble() {
  const all = flattenAllKeys();
  const seen = new Map();
  for (const { category, name, value } of all) {
    if (seen.has(value)) {
      const prev = seen.get(value);
      assert.fail(`Doublon : "${value}" défini en ${prev} et ${category}.${name}`);
    }
    seen.set(value, `${category}.${name}`);
  }
}

// ─── Régression : valeurs précises attendues ─────────────────────────────────
// Ces tests verrouillent les chaînes effectivement écrites sur disque par
// les utilisateurs existants. Tout changement ici doit s'accompagner d'une
// migration explicite des données déjà persistées.

function testValeursDataLegacy() {
  assert.strictEqual(KEYS.DATA.INGREDIENTS, "arpege_ingredients");
  assert.strictEqual(KEYS.DATA.RECIPES, "arpege_recipes");
  assert.strictEqual(KEYS.DATA.SUPPLIERS, "arpege_suppliers");
  assert.strictEqual(KEYS.DATA.PRIX_RECETTES, "formula_prix_recettes");
}

function testValeurSession() {
  assert.strictEqual(KEYS.SESSION.USER, "arpege_user");
}

function testValeursConfig() {
  assert.strictEqual(KEYS.CONFIG.RESTAURANT_CONFIG, "arpege_restaurant_config");
  assert.strictEqual(KEYS.CONFIG.RESTAURANT_LOGO, "arpege_restaurant_logo");
}

function testValeurSafety() {
  assert.strictEqual(KEYS.SAFETY.SAFETY_BACKUP, "arpege_safety_backup");
}

function testValeurMigrations() {
  assert.strictEqual(KEYS.MIGRATIONS.WASTE_PCT_V2, "arpege_waste_pct_v2");
}

function testValeursV1() {
  assert.strictEqual(KEYS.V1.FOURNISSEURS, "arpege_v1_fournisseurs");
  assert.strictEqual(KEYS.V1.INGREDIENTS, "arpege_v1_ingredients");
  assert.strictEqual(KEYS.V1.RECETTES_BASE, "arpege_v1_recettes_base");
  assert.strictEqual(KEYS.V1.PLATS_FINALS, "arpege_v1_plats_finals");
  assert.strictEqual(KEYS.V1.LIGNES_RECETTE_INGREDIENT, "arpege_v1_lignes_recette_ingredient");
  assert.strictEqual(KEYS.V1.LIGNES_PLAT_SOUS_RECETTE, "arpege_v1_lignes_plat_sous_recette");
  assert.strictEqual(KEYS.V1.LIGNES_PLAT_INGREDIENT_DIRECT, "arpege_v1_lignes_plat_ingredient_direct");
  assert.strictEqual(KEYS.V1.SCHEMA_VERSION, "arpege_schema_version");
}

function testValeurFeatureFlags() {
  assert.strictEqual(KEYS.FEATURE_FLAGS.READ_V1_ENABLED, "arpege_feature_read_v1_enabled");
}

// ─── PREFS : builders de clés dynamiques ─────────────────────────────────────

function testPrefsToutesLesEntriesSontDesFonctions() {
  for (const name of Object.keys(KEYS.PREFS)) {
    assert.strictEqual(typeof KEYS.PREFS[name], "function", `PREFS.${name} doit être une fonction`);
  }
}

function testPrefsRecipesSortByConstruitLaCle() {
  assert.strictEqual(KEYS.PREFS.recipesSortBy("base"),    "arpege_recipes_sortBy_base");
  assert.strictEqual(KEYS.PREFS.recipesSortBy("finales"), "arpege_recipes_sortBy_finales");
}

function testPrefsRecipesSortDirConstruitLaCle() {
  assert.strictEqual(KEYS.PREFS.recipesSortDir("base"),    "arpege_recipes_sortDir_base");
  assert.strictEqual(KEYS.PREFS.recipesSortDir("finales"), "arpege_recipes_sortDir_finales");
}

function testPrefsRecipesViewModeConstruitLaCle() {
  assert.strictEqual(KEYS.PREFS.recipesViewMode("base"),    "arpege_recipes_viewMode_base");
  assert.strictEqual(KEYS.PREFS.recipesViewMode("finales"), "arpege_recipes_viewMode_finales");
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testModuleExpose,
    testCategoriesAttendues,
    testToutesLesClesSontDesStringsNonVides,
    testPrefixeArpegeOuFormula,
    testAucuneCleEnDouble,
    testValeursDataLegacy,
    testValeurSession,
    testValeursConfig,
    testValeurSafety,
    testValeurMigrations,
    testValeursV1,
    testValeurFeatureFlags,
    testPrefsToutesLesEntriesSontDesFonctions,
    testPrefsRecipesSortByConstruitLaCle,
    testPrefsRecipesSortDirConstruitLaCle,
    testPrefsRecipesViewModeConstruitLaCle,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
