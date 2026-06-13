const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/merge.js");

const { normalizeMergeName, analyzeMerge, applyMerge, mergePrixRecettes } = window.FormulaMerge;

// Données de base réutilisées dans plusieurs tests
const ING_BEURRE  = { id: 1, name: "Beurre",    price: 8.50, supplier: "Metro" };
const ING_FARINE  = { id: 2, name: "Farine T55", price: 1.20, supplier: "Metro" };
const REC_TARTE   = { id: 10, name: "Tarte aux pommes", recipeType: "final" };
const REC_SAUCE   = { id: 11, name: "Sauce tomate",     recipeType: "base"  };
const SUP_METRO   = { id: 20, name: "Metro" };

// ─── normalizeMergeName ───────────────────────────────────────────────────────

function testNormalizeMergeNameMinuscules() {
  assert.strictEqual(normalizeMergeName("Beurre"), "beurre");
}

function testNormalizeMergeNameAccents() {
  assert.strictEqual(normalizeMergeName("Crème fraîche"), "creme fraiche");
}

function testNormalizeMergeNameEspaces() {
  assert.strictEqual(normalizeMergeName("  Sel  "), "sel");
}

function testNormalizeMergeNameNullRetourneVide() {
  assert.strictEqual(normalizeMergeName(null), "");
  assert.strictEqual(normalizeMergeName(undefined), "");
  assert.strictEqual(normalizeMergeName(""), "");
}

// ─── analyzeMerge — ingrédients ───────────────────────────────────────────────

function testAnalyzeIngredientNouveauAjoute() {
  const result = analyzeMerge({
    importedData: { ingredients: [{ id: 99, name: "Sel", price: 0.5, supplier: "Bio" }], recipes: [], suppliers: [], exportedAt: null },
    existingIngredients: [ING_BEURRE],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.newIngredients.length, 1);
  assert.strictEqual(result.newIngredients[0].name, "Sel");
  assert.strictEqual(result.ingredientConflicts.length, 0);
}

function testAnalyzeIngredientMemeNomMemePrixIgnore() {
  const result = analyzeMerge({
    importedData: { ingredients: [{ id: 99, name: "Beurre", price: 8.50, supplier: "Metro" }], recipes: [], suppliers: [], exportedAt: null },
    existingIngredients: [ING_BEURRE],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.newIngredients.length, 0);
  assert.strictEqual(result.ingredientConflicts.length, 0);
}

function testAnalyzeIngredientPrixDifferentConflict() {
  const result = analyzeMerge({
    importedData: { ingredients: [{ id: 99, name: "Beurre", price: 9.20, supplier: "Metro" }], recipes: [], suppliers: [], exportedAt: null },
    existingIngredients: [ING_BEURRE],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.ingredientConflicts.length, 1);
  assert.strictEqual(result.ingredientConflicts[0].imported.price, 9.20);
  assert.strictEqual(result.ingredientConflicts[0].existing.price, 8.50);
}

function testAnalyzeIngredientFournisseurDifferentConflict() {
  const result = analyzeMerge({
    importedData: { ingredients: [{ id: 99, name: "Beurre", price: 8.50, supplier: "Transgourmet" }], recipes: [], suppliers: [], exportedAt: null },
    existingIngredients: [ING_BEURRE],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.ingredientConflicts.length, 1);
}

function testAnalyzeIngredientNomAvecAccentNormalise() {
  // "Crème" importé vs "creme" existant → même ingrédient, même prix/fournisseur → ignoré
  const result = analyzeMerge({
    importedData: { ingredients: [{ id: 99, name: "Crème", price: 2.0, supplier: "Bio" }], recipes: [], suppliers: [], exportedAt: null },
    existingIngredients: [{ id: 1, name: "creme", price: 2.0, supplier: "Bio" }],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.newIngredients.length, 0);
  assert.strictEqual(result.ingredientConflicts.length, 0);
}

// ─── analyzeMerge — recettes ──────────────────────────────────────────────────

function testAnalyzeRecetteNouvelleAjoutee() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [{ id: 99, name: "Blanquette de veau" }], suppliers: [], exportedAt: null },
    existingIngredients: [],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [],
  });
  assert.strictEqual(result.newRecipes.length, 1);
  assert.strictEqual(result.recipeConflicts.length, 0);
}

function testAnalyzeRecetteMemeNomConflict() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [{ id: 99, name: "Tarte aux pommes", recipeType: "final" }], suppliers: [], exportedAt: null },
    existingIngredients: [],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipeConflicts.length, 1);
  assert.strictEqual(result.newRecipes.length, 0);
}

function testAnalyzeRecetteNomCasseInsensible() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [{ id: 99, name: "TARTE AUX POMMES" }], suppliers: [], exportedAt: null },
    existingIngredients: [],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipeConflicts.length, 1);
  assert.strictEqual(result.newRecipes.length, 0);
}

// ─── analyzeMerge — fournisseurs ──────────────────────────────────────────────

function testAnalyzeFournisseurNouveauAjoute() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [], suppliers: [{ id: 99, name: "Transgourmet" }], exportedAt: null },
    existingIngredients: [],
    existingRecipes: [],
    existingSuppliers: [SUP_METRO],
  });
  assert.strictEqual(result.newSuppliers.length, 1);
}

function testAnalyzeFournisseurExistantIgnore() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [], suppliers: [{ id: 99, name: "Metro" }], exportedAt: null },
    existingIngredients: [],
    existingRecipes: [],
    existingSuppliers: [SUP_METRO],
  });
  assert.strictEqual(result.newSuppliers.length, 0);
}

// ─── analyzeMerge — exportedAt transmis ──────────────────────────────────────

function testAnalyzeExportedAtTransmis() {
  const result = analyzeMerge({
    importedData: { ingredients: [], recipes: [], suppliers: [], exportedAt: "2025-01-15T10:00:00.000Z" },
    existingIngredients: [],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.exportedAt, "2025-01-15T10:00:00.000Z");
}

// ─── applyMerge ───────────────────────────────────────────────────────────────

function testApplyMergeAjouteNouveauxSansConflits() {
  const analysis = {
    newIngredients: [{ id: 99, name: "Sel", price: 0.5, supplier: "Bio" }],
    ingredientConflicts: [],
    newRecipes: [{ id: 99, name: "Blanquette", recipeType: "final" }],
    recipeConflicts: [],
    newSuppliers: [{ id: 99, name: "Bio Direct" }],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: [],
    existingIngredients: [ING_BEURRE],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [SUP_METRO],
  });
  assert.strictEqual(result.ingredients.length, 2);
  assert.strictEqual(result.recipes.length, 2);
  assert.strictEqual(result.suppliers.length, 2);
}

function testApplyMergeConserveExistantSiNonSelectionne() {
  const importedBeurre = { id: 99, name: "Beurre", price: 9.20, supplier: "Metro" };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [{ imported: importedBeurre, existing: ING_BEURRE }],
    newRecipes: [],
    recipeConflicts: [{ imported: { id: 99, name: "Tarte aux pommes", recipeType: "base" }, existing: REC_TARTE }],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: [],
    existingIngredients: [ING_BEURRE],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [SUP_METRO],
  });
  // Prix et recette non modifiés car rien sélectionné
  assert.strictEqual(result.ingredients[0].price, 8.50);
  assert.strictEqual(result.recipes[0].recipeType, "final");
}

function testApplyMergeRemplaceIngredientSelectionne() {
  const importedBeurre = { id: 99, name: "Beurre", price: 9.20, supplier: "Metro" };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [{ imported: importedBeurre, existing: ING_BEURRE }],
    newRecipes: [],
    recipeConflicts: [],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: ["Beurre"],
    existingIngredients: [ING_BEURRE],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.ingredients[0].price, 9.20);
  assert.strictEqual(result.ingredients[0].id, ING_BEURRE.id, "L'ID existant doit être conservé");
}

function testApplyMergeRemplaceRecetteSelectionnee() {
  const importedTarte = { id: 99, name: "Tarte aux pommes", recipeType: "base" };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [],
    newRecipes: [],
    recipeConflicts: [{ imported: importedTarte, existing: REC_TARTE }],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: ["Tarte aux pommes"],
    selectedIngredientNames: [],
    existingIngredients: [],
    existingRecipes: [REC_TARTE],
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipes[0].recipeType, "base");
  assert.strictEqual(result.recipes[0].id, REC_TARTE.id, "L'ID existant doit être conservé");
}

function testApplyMergeConserveIDExistantMemeAvecAccents() {
  const existing = { id: 5, name: "Crème fraîche", price: 2.0, supplier: "Bio" };
  const imported = { id: 99, name: "creme fraiche", price: 2.5, supplier: "Bio" };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [{ imported, existing }],
    newRecipes: [],
    recipeConflicts: [],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: ["creme fraiche"],
    existingIngredients: [existing],
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.ingredients[0].id, 5, "ID existant conservé même si les noms diffèrent en accentuation");
  assert.strictEqual(result.ingredients[0].price, 2.5);
}

function testApplyMergePasDeDuplicats() {
  // Même ingrédient sans conflit : ne doit apparaître qu'une fois
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [],
    newRecipes: [],
    recipeConflicts: [],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: [],
    existingIngredients: [ING_BEURRE, ING_FARINE],
    existingRecipes: [REC_TARTE, REC_SAUCE],
    existingSuppliers: [SUP_METRO],
  });
  assert.strictEqual(result.ingredients.length, 2);
  assert.strictEqual(result.recipes.length, 2);
  assert.strictEqual(result.suppliers.length, 1);
}

// ─── Recalibrage des références après fusion ──────────────────────────────────

function testRecalibrageIngredientIdDansNouvelleRecette() {
  // Appareil A : Beurre id=99. Appareil B : Beurre id=1 (même ingrédient, même prix).
  // La recette importée référence ingredientId=99, mais sur B Beurre est à id=1.
  // Après fusion, la recette doit référencer id=1.
  const importedRecette = {
    id: 50, name: "Tarte importée", recipeType: "final",
    directIngredients: [{ ingredientId: 99, name: "Beurre", quantity: 1, unit: "Kg" }],
    baseComponents: [],
  };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [],
    newRecipes: [importedRecette],
    recipeConflicts: [],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: [],
    existingIngredients: [ING_BEURRE], // ING_BEURRE.id = 1
    existingRecipes: [],
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipes[0].directIngredients[0].ingredientId, ING_BEURRE.id,
    "ingredientId doit être recalibré vers l'ID local");
}

function testRecalibrageIngredientIdDansRecetteRemplacee() {
  // Même scénario mais via un conflit de recette sélectionné pour remplacement.
  const importedTarte = {
    id: 99, name: "Tarte aux pommes", recipeType: "final",
    directIngredients: [{ ingredientId: 99, name: "Beurre", quantity: 0.5, unit: "Kg" }],
    baseComponents: [],
  };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [],
    newRecipes: [],
    recipeConflicts: [{ imported: importedTarte, existing: REC_TARTE }],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: ["Tarte aux pommes"],
    selectedIngredientNames: [],
    existingIngredients: [ING_BEURRE], // id=1
    existingRecipes: [REC_TARTE],      // id=10
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipes[0].directIngredients[0].ingredientId, ING_BEURRE.id,
    "ingredientId recalibré même après remplacement de recette");
}

function testRecalibrageBaseRecipeIdDansRecettefinale() {
  // La recette finale importée référence baseRecipeId=99 (Sauce tomate sur appareil A).
  // Sur appareil B, Sauce tomate est à id=11. Doit être recalibré.
  const importedFinale = {
    id: 60, name: "Plat importé", recipeType: "final",
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 99, name: "Sauce tomate", quantity: 1, unit: "Kg" }],
  };
  const analysis = {
    newIngredients: [],
    ingredientConflicts: [],
    newRecipes: [importedFinale],
    recipeConflicts: [],
    newSuppliers: [],
  };
  const result = applyMerge({
    analysis,
    selectedRecipeNames: [],
    selectedIngredientNames: [],
    existingIngredients: [],
    existingRecipes: [REC_SAUCE], // REC_SAUCE = { id: 11, name: "Sauce tomate" }
    existingSuppliers: [],
  });
  assert.strictEqual(result.recipes.find(r => r.name === "Plat importé").baseComponents[0].baseRecipeId, REC_SAUCE.id,
    "baseRecipeId doit être recalibré vers l'ID local de la recette de base");
}

// ─── Comparaison de prix robuste ─────────────────────────────────────────────

function testPrixTexteEtNombreIdentiquesNeGenerentPasConflict() {
  // "5.50" (string depuis un appareil) vs 5.5 (number depuis un autre) → même prix, pas de conflit
  const existing = [{ id: 1, name: "Beurre", price: 5.5, supplier: "Metro" }];
  const importedData = {
    ingredients: [{ id: 99, name: "Beurre", price: "5.50", supplier: "Metro" }],
    recipes: [], suppliers: [],
  };
  const result = analyzeMerge({ importedData, existingIngredients: existing, existingRecipes: [], existingSuppliers: [] });
  assert.strictEqual(result.ingredientConflicts.length, 0, "5.5 et '5.50' ne doivent pas créer de conflit");
}

function testPrixReellementDifferentGenereBienConflict() {
  const existing = [{ id: 1, name: "Beurre", price: 8.0, supplier: "Metro" }];
  const importedData = {
    ingredients: [{ id: 99, name: "Beurre", price: 9.5, supplier: "Metro" }],
    recipes: [], suppliers: [],
  };
  const result = analyzeMerge({ importedData, existingIngredients: existing, existingRecipes: [], existingSuppliers: [] });
  assert.strictEqual(result.ingredientConflicts.length, 1, "8.0 vs 9.5 doit créer un conflit");
}

function testPrixNullDesDeuxCotesNeGenerePasConflict() {
  const existing = [{ id: 1, name: "Beurre", price: null, supplier: "Metro" }];
  const importedData = {
    ingredients: [{ id: 99, name: "Beurre", price: null, supplier: "Metro" }],
    recipes: [], suppliers: [],
  };
  const result = analyzeMerge({ importedData, existingIngredients: existing, existingRecipes: [], existingSuppliers: [] });
  assert.strictEqual(result.ingredientConflicts.length, 0, "null vs null ne doit pas créer de conflit");
}

// ─── mergePrixRecettes — chantier #7 étape B (Option B) ──────────────────────

function testMergePrixRecettesAjouteSeulementPourNouvellesRecettes() {
  const existing = [{ id: "p1", recipeId: 10, prixHT: 20, isCurrent: true }];
  const imported = [
    { id: "p99", recipeId: 99, prixHT: 30, isCurrent: true }, // recette nouvelle
    { id: "p10", recipeId: 10, prixHT: 18, isCurrent: true }, // recette déjà locale → à ignorer
  ];
  const newRecipes = [{ id: 99, name: "Soupe importée" }];
  const result = mergePrixRecettes({ existingPrixRecettes: existing, importedPrixRecettes: imported, newRecipes });
  assert.strictEqual(result.length, 2, "On garde l'existant + le prix de la nouvelle recette");
  assert.ok(result.some(p => p.recipeId === 10 && p.prixHT === 20), "Le prix local (recette déjà présente) est conservé");
  assert.ok(result.some(p => p.recipeId === 99 && p.prixHT === 30), "Le prix du fichier pour la nouvelle recette est ajouté");
  assert.ok(!result.some(p => p.recipeId === 10 && p.prixHT === 18), "Le prix du fichier pour une recette locale est ignoré");
}

function testMergePrixRecettesAucuneNouvelleRecetteGardeUniquementExistant() {
  const existing = [{ id: "p1", recipeId: 10, prixHT: 20, isCurrent: true }];
  const imported = [{ id: "p2", recipeId: 11, prixHT: 25, isCurrent: true }];
  const result = mergePrixRecettes({ existingPrixRecettes: existing, importedPrixRecettes: imported, newRecipes: [] });
  assert.deepStrictEqual(result, existing);
}

function testMergePrixRecettesGereHistorique() {
  // Plusieurs entrées (historique + courant) pour la même nouvelle recette doivent toutes être importées.
  const existing = [];
  const imported = [
    { id: "p1", recipeId: 99, prixHT: 15, isCurrent: false },
    { id: "p2", recipeId: 99, prixHT: 18, isCurrent: true },
  ];
  const newRecipes = [{ id: 99, name: "Nouveau plat" }];
  const result = mergePrixRecettes({ existingPrixRecettes: existing, importedPrixRecettes: imported, newRecipes });
  assert.strictEqual(result.length, 2);
}

function testMergePrixRecettesTableauxVidesOuAbsents() {
  assert.deepStrictEqual(mergePrixRecettes({}), []);
  assert.deepStrictEqual(mergePrixRecettes({ existingPrixRecettes: null, importedPrixRecettes: null, newRecipes: null }), []);
}

function testApplyMergeRetournePrixRecettesFusionnes() {
  const existing = { ingredients: [], recipes: [REC_TARTE], suppliers: [] };
  const importedData = {
    ingredients: [], suppliers: [],
    recipes: [{ id: 999, name: "Velouté", recipeType: "final" }],
    prixRecettes: [{ id: "pX", recipeId: 999, prixHT: 12, isCurrent: true }],
  };
  const analysis = analyzeMerge({
    importedData,
    existingIngredients: existing.ingredients,
    existingRecipes: existing.recipes,
    existingSuppliers: existing.suppliers,
  });
  const merged = applyMerge({
    analysis,
    selectedRecipeNames: [], selectedIngredientNames: [],
    existingIngredients: existing.ingredients,
    existingRecipes: existing.recipes,
    existingSuppliers: existing.suppliers,
    existingPrixRecettes: [{ id: "pLocal", recipeId: 10, prixHT: 50, isCurrent: true }],
  });
  assert.strictEqual(merged.prixRecettes.length, 2);
  assert.ok(merged.prixRecettes.some(p => p.recipeId === 10), "Prix local conservé");
  assert.ok(merged.prixRecettes.some(p => p.recipeId === 999), "Prix de la recette importée ajouté");
}

function testAnalyzeMergeExtraitImportedPrixRecettes() {
  const importedData = {
    ingredients: [], recipes: [], suppliers: [],
    prixRecettes: [{ id: "p1", recipeId: 5, prixHT: 10 }],
  };
  const result = analyzeMerge({ importedData, existingIngredients: [], existingRecipes: [], existingSuppliers: [] });
  assert.deepStrictEqual(result.importedPrixRecettes, importedData.prixRecettes);
}

function testAnalyzeMergePrixRecettesAbsentDonneTableauVide() {
  const importedData = { ingredients: [], recipes: [], suppliers: [] };
  const result = analyzeMerge({ importedData, existingIngredients: [], existingRecipes: [], existingSuppliers: [] });
  assert.deepStrictEqual(result.importedPrixRecettes, []);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testNormalizeMergeNameMinuscules,
    testNormalizeMergeNameAccents,
    testNormalizeMergeNameEspaces,
    testNormalizeMergeNameNullRetourneVide,
    testAnalyzeIngredientNouveauAjoute,
    testAnalyzeIngredientMemeNomMemePrixIgnore,
    testAnalyzeIngredientPrixDifferentConflict,
    testAnalyzeIngredientFournisseurDifferentConflict,
    testAnalyzeIngredientNomAvecAccentNormalise,
    testAnalyzeRecetteNouvelleAjoutee,
    testAnalyzeRecetteMemeNomConflict,
    testAnalyzeRecetteNomCasseInsensible,
    testAnalyzeFournisseurNouveauAjoute,
    testAnalyzeFournisseurExistantIgnore,
    testAnalyzeExportedAtTransmis,
    testApplyMergeAjouteNouveauxSansConflits,
    testApplyMergeConserveExistantSiNonSelectionne,
    testApplyMergeRemplaceIngredientSelectionne,
    testApplyMergeRemplaceRecetteSelectionnee,
    testApplyMergeConserveIDExistantMemeAvecAccents,
    testApplyMergePasDeDuplicats,
    testRecalibrageIngredientIdDansNouvelleRecette,
    testRecalibrageIngredientIdDansRecetteRemplacee,
    testRecalibrageBaseRecipeIdDansRecettefinale,
    testPrixTexteEtNombreIdentiquesNeGenerentPasConflict,
    testPrixReellementDifferentGenereBienConflict,
    testPrixNullDesDeuxCotesNeGenerePasConflict,
    testMergePrixRecettesAjouteSeulementPourNouvellesRecettes,
    testMergePrixRecettesAucuneNouvelleRecetteGardeUniquementExistant,
    testMergePrixRecettesGereHistorique,
    testMergePrixRecettesTableauxVidesOuAbsents,
    testApplyMergeRetournePrixRecettesFusionnes,
    testAnalyzeMergeExtraitImportedPrixRecettes,
    testAnalyzeMergePrixRecettesAbsentDonneTableauVide,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
