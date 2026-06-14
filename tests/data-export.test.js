const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/data-export.js");

const { buildExportPayload, validateImportPayload, parseImportPayload, APP_IDENTIFIER, FORMAT_VERSION } =
  window.FormulaDataExport;

// ─── buildExportPayload ───────────────────────────────────────────────────────

function testBuildExportPayloadStructureComplete() {
  const result = buildExportPayload({
    restaurantName: "Le Petit Bistro",
    ingredients: [{ id: 1, name: "Sel" }],
    recipes: [{ id: 1, name: "Sauce tomate" }],
    suppliers: [{ id: 1, name: "Métro" }],
  });
  assert.strictEqual(result.app, APP_IDENTIFIER);
  assert.strictEqual(result.formatVersion, FORMAT_VERSION);
  assert.strictEqual(result.restaurantName, "Le Petit Bistro");
  assert.strictEqual(result.data.ingredients.length, 1);
  assert.strictEqual(result.data.recipes.length, 1);
  assert.strictEqual(result.data.suppliers.length, 1);
  assert.ok(typeof result.exportedAt === "string" && result.exportedAt.length > 0,
    "exportedAt doit être une chaîne non vide");
}

function testBuildExportPayloadDonneesVides() {
  const result = buildExportPayload({ restaurantName: "", ingredients: [], recipes: [], suppliers: [] });
  assert.deepStrictEqual(result.data.ingredients, []);
  assert.deepStrictEqual(result.data.recipes, []);
  assert.deepStrictEqual(result.data.suppliers, []);
  assert.strictEqual(result.restaurantName, "");
}

function testBuildExportPayloadFallbackSiTableauxInvalides() {
  // null, undefined, string : doit fallback vers []
  const result = buildExportPayload({
    restaurantName: "Test",
    ingredients: null,
    recipes: undefined,
    suppliers: "oops",
  });
  assert.deepStrictEqual(result.data.ingredients, []);
  assert.deepStrictEqual(result.data.recipes, []);
  assert.deepStrictEqual(result.data.suppliers, []);
}

function testBuildExportPayloadNomRestaurantEspacesTrimmes() {
  const result = buildExportPayload({ restaurantName: "  Bistro  ", ingredients: [], recipes: [], suppliers: [] });
  assert.strictEqual(result.restaurantName, "Bistro");
}

// ─── validateImportPayload ────────────────────────────────────────────────────

function testValidateImportPayloadValide() {
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    restaurantName: "Bistro Test",
    data: { ingredients: [{ id: 1 }], recipes: [], suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.data.restaurantName, "Bistro Test");
  assert.strictEqual(result.data.ingredients.length, 1);
}

function testValidateImportPayloadMauvaisIdentifiantApp() {
  const payload = {
    app: "autre-application",
    formatVersion: FORMAT_VERSION,
    data: { ingredients: [], recipes: [], suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("identifiant")));
}

function testValidateImportPayloadVersionInconnue() {
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: "99",
    data: { ingredients: [], recipes: [], suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Version")));
}

function testValidateImportPayloadSectionDataManquante() {
  const payload = { app: APP_IDENTIFIER, formatVersion: FORMAT_VERSION };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("data")));
}

function testValidateImportPayloadIngredientsNonTableau() {
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: "pas un tableau", recipes: [], suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("ingrédients")));
}

function testValidateImportPayloadNull() {
  const result = validateImportPayload(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
}

// ─── parseImportPayload ───────────────────────────────────────────────────────

function testParseImportPayloadValide() {
  const payload = buildExportPayload({
    restaurantName: "Test",
    ingredients: [{ id: 1, name: "Beurre" }],
    recipes: [],
    suppliers: [],
  });
  const result = parseImportPayload(JSON.stringify(payload));
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.data.ingredients.length, 1);
}

function testParseImportPayloadJsonInvalide() {
  const result = parseImportPayload("{ ceci n'est pas du json }}}");
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("JSON")));
}

function testParseImportPayloadFichierVide() {
  const result = parseImportPayload("");
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("vide")));
}

function testParseImportPayloadNull() {
  const result = parseImportPayload(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
}

// ─── Test aller-retour complet (export → import → données identiques) ─────────

function testRoundtripExportImportDonneesIdentiques() {
  const original = {
    restaurantName: "La Belle Table",
    ingredients: [{ id: 1, name: "Sel", price: 0.5, unit: "Kg", category: "Épicerie" }],
    recipes: [{ id: 1, name: "Sauce tomate", recipeType: "base" }],
    suppliers: [{ id: 1, name: "Métro" }],
  };
  const exported = buildExportPayload(original);
  const result = parseImportPayload(JSON.stringify(exported));

  assert.strictEqual(result.valid, true, "Le aller-retour doit produire un payload valide");
  assert.strictEqual(result.data.restaurantName, original.restaurantName);
  assert.deepStrictEqual(result.data.ingredients, original.ingredients);
  assert.deepStrictEqual(result.data.recipes, original.recipes);
  assert.deepStrictEqual(result.data.suppliers, original.suppliers);
}

// ─── prixRecettes — chantier #7 (préserver les prix de vente à l'import) ──────

function testBuildExportPayloadIncluePrixRecettes() {
  const prix = [{ recipeId: 1, prix: 28.5 }, { recipeId: 2, prix: 42 }];
  const result = buildExportPayload({
    restaurantName: "Test",
    ingredients: [], recipes: [], suppliers: [],
    prixRecettes: prix,
  });
  assert.deepStrictEqual(result.data.prixRecettes, prix);
}

function testValidateImportPayloadPrixRecettesAbsentDonneTableauVide() {
  // Rétrocompatibilité : anciennes sauvegardes sans prixRecettes restent valides.
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: [], recipes: [], suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.data.prixRecettes, []);
}

function testRoundtripPreservePrixRecettes() {
  const original = {
    restaurantName: "La Belle Table",
    ingredients: [], recipes: [{ id: 1, name: "Sauce" }], suppliers: [],
    prixRecettes: [{ recipeId: 1, prix: 18.9 }],
  };
  const exported = buildExportPayload(original);
  const result = parseImportPayload(JSON.stringify(exported));
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.data.prixRecettes, original.prixRecettes);
}

// ─── Non-régression : structures abîmées (chemins robustesse import) ──────────

function testValidateImportPayloadRecipesNonTableau() {
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: [], recipes: "pas un tableau", suppliers: [] },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("recettes")));
  assert.strictEqual(result.data, null);
}

function testValidateImportPayloadSuppliersNonTableau() {
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: [], recipes: [], suppliers: { erreur: true } },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("fournisseurs")));
  assert.strictEqual(result.data, null);
}

function testValidateImportPayloadErreursCumulees() {
  // Les 3 listes invalides simultanément doivent toutes ressortir, pour que le
  // chef corrige tout d'un coup au lieu de découvrir les erreurs une par une.
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: "x", recipes: 42, suppliers: null },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("ingrédients")), "Erreur ingrédients attendue");
  assert.ok(result.errors.some((e) => e.includes("recettes")), "Erreur recettes attendue");
  assert.ok(result.errors.some((e) => e.includes("fournisseurs")), "Erreur fournisseurs attendue");
  assert.ok(result.errors.length >= 3, `Au moins 3 erreurs attendues, reçu ${result.errors.length}`);
}

function testValidateImportPayloadTableauAuLieuDObjet() {
  // Un tableau JSON parsable mais pas une sauvegarde Formula : le code défend
  // déjà ce cas via Array.isArray(parsed) en sortie précoce — on verrouille.
  const result = validateImportPayload([1, 2, 3]);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.strictEqual(result.data, null);
}

function testValidateImportPayloadPrixRecettesPresentMaisNonTableau() {
  // Fallback silencieux à [] si la sauvegarde déclare prixRecettes mal formé.
  // Pas une erreur bloquante : on importe le reste sans perdre les vraies données.
  const payload = {
    app: APP_IDENTIFIER,
    formatVersion: FORMAT_VERSION,
    data: { ingredients: [], recipes: [], suppliers: [], prixRecettes: "abc" },
  };
  const result = validateImportPayload(payload);
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.data.prixRecettes, []);
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testBuildExportPayloadStructureComplete,
    testBuildExportPayloadDonneesVides,
    testBuildExportPayloadFallbackSiTableauxInvalides,
    testBuildExportPayloadNomRestaurantEspacesTrimmes,
    testValidateImportPayloadValide,
    testValidateImportPayloadMauvaisIdentifiantApp,
    testValidateImportPayloadVersionInconnue,
    testValidateImportPayloadSectionDataManquante,
    testValidateImportPayloadIngredientsNonTableau,
    testValidateImportPayloadNull,
    testParseImportPayloadValide,
    testParseImportPayloadJsonInvalide,
    testParseImportPayloadFichierVide,
    testParseImportPayloadNull,
    testRoundtripExportImportDonneesIdentiques,
    testBuildExportPayloadIncluePrixRecettes,
    testValidateImportPayloadPrixRecettesAbsentDonneTableauVide,
    testRoundtripPreservePrixRecettes,
    testValidateImportPayloadRecipesNonTableau,
    testValidateImportPayloadSuppliersNonTableau,
    testValidateImportPayloadErreursCumulees,
    testValidateImportPayloadTableauAuLieuDObjet,
    testValidateImportPayloadPrixRecettesPresentMaisNonTableau,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
