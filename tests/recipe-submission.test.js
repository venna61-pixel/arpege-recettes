const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/recipe-submission.js");

const { validateRecipeDraft, detectBaseComponentCycle, buildRecipePayload, upsertRecipe } = window.FormulaRecipeSubmission;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validBaseRecipe() {
  return {
    recipeType: "base",
    name: "Sauce béchamel",
    categories: ["Sauce"],
    outputQuantity: 1,
    outputUnit: "Kg",
    wasteCoeff: 0,
    directIngredients: [{ ingredientId: 1, quantity: 100, unit: "Gramme" }],
    baseComponents: [],
  };
}

function validFinalRecipe() {
  return {
    recipeType: "final",
    name: "Quiche lorraine",
    categories: ["Plat"],
    covers: 4,
    wasteCoeff: 0,
    directIngredients: [{ ingredientId: 1, quantity: 100, unit: "Gramme" }],
    baseComponents: [],
  };
}

function hasError(errors, field) {
  return errors.some((e) => e.field === field);
}

// ─── Groupe A — Structure de la réponse ───────────────────────────────────────

function testValidRetourneErrorsVide() {
  const result = validateRecipeDraft(validBaseRecipe());
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.errors, []);
}

function testInvalidRetourneErrorsTableau() {
  const result = validateRecipeDraft({});
  assert.strictEqual(result.valid, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
}

function testChaqueErreurContientFieldEtMessage() {
  const result = validateRecipeDraft({});
  for (const err of result.errors) {
    assert.ok(typeof err.field === "string" && err.field.length > 0, `field manquant: ${JSON.stringify(err)}`);
    assert.ok(typeof err.message === "string" && err.message.length > 0, `message manquant: ${JSON.stringify(err)}`);
  }
}

// ─── Groupe B — Type de recette ───────────────────────────────────────────────

function testRecipeTypeNonReconnuInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), recipeType: "dessert" });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "recipeType"));
}

function testRecipeTypeManquantInvalide() {
  const recipe = validBaseRecipe();
  delete recipe.recipeType;
  const result = validateRecipeDraft(recipe);
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "recipeType"));
}

// ─── Groupe C — Nom ───────────────────────────────────────────────────────────

function testNomVideInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), name: "" });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "name"));
}

function testNomBlancInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), name: "   " });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "name"));
}

function testNomManquantInvalide() {
  const recipe = validBaseRecipe();
  delete recipe.name;
  const result = validateRecipeDraft(recipe);
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "name"));
}

// ─── Groupe D — Catégorie ─────────────────────────────────────────────────────

function testCategoriesVideInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), categories: [] });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "categories"));
}

function testCategoriesUniquementBlancsInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), categories: ["", "   "] });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "categories"));
}

function testCategoriesManquantesInvalide() {
  const recipe = validBaseRecipe();
  delete recipe.categories;
  const result = validateRecipeDraft(recipe);
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "categories"));
}

// ─── Groupe E — Couverts (recettes finales) ───────────────────────────────────

function testCouvertsZeroFinaleInvalide() {
  const result = validateRecipeDraft({ ...validFinalRecipe(), covers: 0 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "covers"));
}

function testCouvertsNegatifFinaleInvalide() {
  const result = validateRecipeDraft({ ...validFinalRecipe(), covers: -3 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "covers"));
}

function testCouvertsPositifFinaleValide() {
  const result = validateRecipeDraft({ ...validFinalRecipe(), covers: 6 });
  assert.strictEqual(result.valid, true);
}

function testBaseAvecCouvertsZeroAccepte() {
  // covers est ignoré pour les recettes de base — on ne valide que pour finales
  const result = validateRecipeDraft({ ...validBaseRecipe(), covers: 0 });
  assert.strictEqual(result.valid, true);
}

// ─── Groupe F — Rendement (recettes de base) ──────────────────────────────────

function testOutputQuantityZeroBaseInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), outputQuantity: 0 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "outputQuantity"));
}

function testOutputQuantityNegatifBaseInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), outputQuantity: -1 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "outputQuantity"));
}

function testOutputUnitManquanteBaseInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), outputUnit: "" });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "outputUnit"));
}

function testRendementBaseValide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), outputQuantity: 2.5, outputUnit: "Litre" });
  assert.strictEqual(result.valid, true);
}

function testFinaleSansRendementValide() {
  const recipe = validFinalRecipe();
  // pas d'outputQuantity ni outputUnit — c'est optionnel pour les finales
  const result = validateRecipeDraft(recipe);
  assert.strictEqual(result.valid, true);
}

// ─── Groupe G — Coefficient de perte ──────────────────────────────────────────

function testWasteCoeffNegatifInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), wasteCoeff: -5 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "wasteCoeff"));
}

function testWasteCoeffCentInvalide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), wasteCoeff: 100 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "wasteCoeff"));
}

function testWasteCoeffNormalValide() {
  const result = validateRecipeDraft({ ...validBaseRecipe(), wasteCoeff: 15 });
  assert.strictEqual(result.valid, true);
}

function testWasteCoeffAbsentValide() {
  const recipe = validBaseRecipe();
  delete recipe.wasteCoeff;
  const result = validateRecipeDraft(recipe);
  assert.strictEqual(result.valid, true);
}

// ─── Groupe H — Au moins un composant (règle historique préservée) ────────────

function testBaseSansIngredientDirectInvalide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [],
    baseComponents: [],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "components"));
}

function testFinaleSansDirectNiBaseInvalide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "components"));
}

function testFinaleAvecBaseValide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, quantity: 200, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, true);
}

function testBaseAvecIngredientDirectValide() {
  const result = validateRecipeDraft(validBaseRecipe());
  assert.strictEqual(result.valid, true);
}

// ─── Groupe I — Validation par ligne : ingrédients directs ────────────────────

function testIngredientSansIdInvalide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [{ ingredientId: "", quantity: 100, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "directIngredients[0].ingredientId"));
}

function testIngredientQuantiteZeroInvalide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [{ ingredientId: 1, quantity: 0, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "directIngredients[0].quantity"));
}

function testIngredientQuantiteNegativeInvalide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [{ ingredientId: 1, quantity: -5, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "directIngredients[0].quantity"));
}

function testIngredientUniteVideInvalide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [{ ingredientId: 1, quantity: 100, unit: "" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "directIngredients[0].unit"));
}

function testIngredientPlusieursLignesAvecErreursDifferentes() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [
      { ingredientId: 1, quantity: 100, unit: "Gramme" }, // valide
      { ingredientId: "", quantity: 100, unit: "Gramme" }, // sans id
      { ingredientId: 3, quantity: 0, unit: "Gramme" }, // quantité 0
    ],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "directIngredients[1].ingredientId"));
  assert.ok(hasError(result.errors, "directIngredients[2].quantity"));
  // pas d'erreur sur la ligne 0 qui est valide
  assert.ok(!result.errors.some((e) => e.field.startsWith("directIngredients[0]")));
}

// ─── Groupe J — Validation par ligne : composants de base ─────────────────────

function testBaseComponentSansIdInvalide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: "", quantity: 200, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents[0].baseRecipeId"));
}

function testBaseComponentQuantityZeroInvalide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, quantity: 0, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents[0].quantity"));
}

function testBaseComponentUniteVideInvalide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, quantity: 200, unit: "" }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents[0].unit"));
}

function testBaseComponentPortionModePortionCountZeroInvalide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, usageMode: "portion", portionCount: 0 }],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents[0].portionCount"));
}

function testBaseComponentPortionModeValide() {
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, usageMode: "portion", portionCount: 4 }],
  });
  assert.strictEqual(result.valid, true);
}

function testBaseComponentPortionModeIgnoreQuantityEtUnit() {
  // En mode portion, la quantité/unité n'est pas validée
  const result = validateRecipeDraft({
    ...validFinalRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, usageMode: "portion", portionCount: 2, quantity: 0, unit: "" }],
  });
  assert.strictEqual(result.valid, true);
}

// ─── Groupe L — Imbrication : recette de base avec sous-recettes ──────────────
// Depuis 2026-06-26, une recette de base peut être composée uniquement de
// sous-recettes (cas pâtissier : biscuit composé d'un insert + un sirop, sans
// ingrédient direct). Avant, ce cas était rejeté par la validation.

function testBaseAvecUniquementBaseComponentsValide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, quantity: 200, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
}

function testBaseAvecBaseComponentsEnPortionValide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, usageMode: "portion", portionCount: 2 }],
  });
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
}

function testBaseAvecIngredientEtSousRecetteValide() {
  const result = validateRecipeDraft({
    ...validBaseRecipe(),
    directIngredients: [{ ingredientId: 1, quantity: 100, unit: "Gramme" }],
    baseComponents: [{ baseRecipeId: 2, quantity: 50, unit: "Gramme" }],
  });
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
}

// ─── Groupe M — Détection de cycle dans les sous-recettes ─────────────────────
// L'anti-cycle n'est appliqué que si options.allRecipes + options.editingId
// sont fournis. Sans contexte, la validation reste structurelle (rétro-compat).

function makeRecipeNode(id, name, baseComponents) {
  return {
    id,
    name,
    recipeType: "base",
    categories: ["X"],
    outputQuantity: 1,
    outputUnit: "Kg",
    directIngredients: [],
    baseComponents: baseComponents || [],
  };
}

function testCycleDirectAReverseDansSesPropresSousRecettes() {
  // Édition de A (id=10). Le formulaire ajoute A comme sa propre sous-recette.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 10, name: "A", quantity: 100, unit: "Gramme" }],
  };
  const allRecipes = [makeRecipeNode(10, "A", [])];
  const result = validateRecipeDraft(formData, { allRecipes, editingId: 10 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents"));
}

function testCycleIndirectABA() {
  // A (id=10) veut ajouter B (id=20). Or B contient déjà A. Cycle A→B→A.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 20, name: "B", quantity: 100, unit: "Gramme" }],
  };
  const allRecipes = [
    makeRecipeNode(10, "A", []), // ancienne version de A (sans encore B)
    makeRecipeNode(20, "B", [{ baseRecipeId: 10, name: "A" }]), // B contient A
  ];
  const result = validateRecipeDraft(formData, { allRecipes, editingId: 10 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents"));
}

function testCycleProfondABCA() {
  // A→B→C→A : cycle à 3 niveaux d'imbrication.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 20, name: "B", quantity: 100, unit: "Gramme" }],
  };
  const allRecipes = [
    makeRecipeNode(10, "A", []),
    makeRecipeNode(20, "B", [{ baseRecipeId: 30, name: "C" }]),
    makeRecipeNode(30, "C", [{ baseRecipeId: 10, name: "A" }]),
  ];
  const result = validateRecipeDraft(formData, { allRecipes, editingId: 10 });
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "baseComponents"));
}

function testPasDeCycleQuandSousRecetteIndependante() {
  // A veut ajouter B. B contient C, C ne pointe vers personne. Pas de cycle.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 20, name: "B", quantity: 100, unit: "Gramme" }],
  };
  const allRecipes = [
    makeRecipeNode(10, "A", []),
    makeRecipeNode(20, "B", [{ baseRecipeId: 30, name: "C" }]),
    makeRecipeNode(30, "C", []),
  ];
  const result = validateRecipeDraft(formData, { allRecipes, editingId: 10 });
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
}

function testSansAllRecipesPasDeDetectionCycle() {
  // Rétro-compatibilité : sans options.allRecipes, on ne lève pas d'erreur cycle
  // même si le formData en contiendrait un. La détection est opt-in.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 10, name: "A", quantity: 100, unit: "Gramme" }],
  };
  const result = validateRecipeDraft(formData); // pas d'options
  assert.strictEqual(result.valid, true);
}

function testSansEditingIdPasDeDetectionCycle() {
  // Création (editingId null) : pas de cycle possible vers une recette qui n'existe pas encore.
  const formData = {
    ...validBaseRecipe(),
    baseComponents: [{ baseRecipeId: 20, name: "B", quantity: 100, unit: "Gramme" }],
  };
  const allRecipes = [makeRecipeNode(20, "B", [])];
  const result = validateRecipeDraft(formData, { allRecipes, editingId: null });
  assert.strictEqual(result.valid, true);
}

function testDetectBaseComponentCycleAPIDirecte() {
  // Test direct de la fonction exposée — utile pour l'UI qui pourrait l'appeler
  // au moment de l'ajout d'une sous-recette (avant la soumission).
  const allRecipes = [
    makeRecipeNode(10, "A", []),
    makeRecipeNode(20, "B", [{ baseRecipeId: 10, name: "A" }]),
  ];
  const cycle = detectBaseComponentCycle(10, [{ baseRecipeId: 20, name: "B" }], allRecipes);
  assert.ok(cycle && cycle.baseRecipeId === 20);

  const noCycle = detectBaseComponentCycle(10, [{ baseRecipeId: 30, name: "C" }], allRecipes);
  assert.strictEqual(noCycle, null);
}

// ─── Groupe K — Validation cumulée et messages ────────────────────────────────

function testFormulaireVideAccumuleErreurs() {
  const result = validateRecipeDraft({});
  // On attend AU MOINS les erreurs essentielles : type, nom, catégories, composants
  assert.strictEqual(result.valid, false);
  assert.ok(hasError(result.errors, "recipeType"));
  assert.ok(hasError(result.errors, "name"));
  assert.ok(hasError(result.errors, "categories"));
  assert.ok(hasError(result.errors, "components"));
}

function testTousLesMessagesEnFrancais() {
  const result = validateRecipeDraft({});
  for (const err of result.errors) {
    // Pas de message en anglais qui aurait fui — vérification soft mais utile
    assert.ok(!/required/i.test(err.message), `message anglais détecté: ${err.message}`);
    assert.ok(!/invalid/i.test(err.message), `message anglais détecté: ${err.message}`);
  }
}

// ─── Tests existants : buildRecipePayload et upsertRecipe ─────────────────────

function testBuildRecipePayloadAppelleNormalizeRecipe() {
  let called = false;
  const normalizeRecipe = (draft) => {
    called = true;
    return { ...draft, normalized: true };
  };
  const formData = { name: "Test", covers: 4 };
  const payload = buildRecipePayload(formData, normalizeRecipe);
  assert.strictEqual(called, true);
  assert.strictEqual(payload.normalized, true);
  assert.notStrictEqual(payload, formData);
}

function testUpsertRecipeCreateMaxIdPlusUn() {
  const recipes = [{ id: 1, name: "A" }, { id: 7, name: "B" }, { id: 3, name: "C" }];
  const payload = { name: "Nouveau" };
  const updated = upsertRecipe(recipes, payload, null);
  assert.strictEqual(updated.length, 4);
  assert.strictEqual(updated[3].id, 8);
}

function testUpsertRecipeMetAJourBonneRecette() {
  const recipes = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
  const payload = { name: "B2" };
  const updated = upsertRecipe(recipes, payload, 2);
  assert.strictEqual(updated.length, 2);
  assert.deepStrictEqual(updated[0], { id: 1, name: "A" });
  const { updatedAt, ...editedWithoutTimestamp } = updated[1];
  assert.deepStrictEqual(editedWithoutTimestamp, { id: 2, name: "B2" });
}

function testComparaisonRobusteIdStringEtNumber() {
  const recipes = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
  const payload = { name: "B-string-id" };
  const updated = upsertRecipe(recipes, payload, "2");
  assert.strictEqual(updated.length, 2);
  assert.deepStrictEqual(updated[0], { id: 1, name: "A" });
  const { updatedAt, ...editedWithoutTimestamp } = updated[1];
  assert.deepStrictEqual(editedWithoutTimestamp, { id: "2", name: "B-string-id" });
}

function testUpsertRecipeGrandeListeSansPlantage() {
  const recipes = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: `R${i + 1}` }));
  const payload = { name: "Nouvelle" };
  const updated = upsertRecipe(recipes, payload, null);
  assert.strictEqual(updated.length, 10001);
  assert.strictEqual(updated[10000].id, 10001);
}

function testUpsertRecipeCreatedAtGenereSiAbsent() {
  const before = new Date().toISOString();
  const updated = upsertRecipe([], { name: "Nouveau" }, null);
  const after = new Date().toISOString();
  assert.ok(updated[0].createdAt >= before);
  assert.ok(updated[0].createdAt <= after);
}

function testUpsertRecipeCreatedAtPreserveSiPresent() {
  const existingDate = "2023-01-01T00:00:00.000Z";
  const updated = upsertRecipe([], { name: "Nouveau", createdAt: existingDate }, null);
  assert.strictEqual(updated[0].createdAt, existingDate);
}

function testUpsertRecipeUpdateNeTouchesPasCreatedAt() {
  const recipes = [{ id: 1, name: "A", createdAt: "2023-01-01T00:00:00.000Z" }];
  const payload = { name: "A modifié", createdAt: "2023-01-01T00:00:00.000Z" };
  const updated = upsertRecipe(recipes, payload, 1);
  assert.strictEqual(updated[0].createdAt, "2023-01-01T00:00:00.000Z");
}

// À l'édition, upsertRecipe doit poser un updatedAt = maintenant pour que
// l'affichage puisse basculer sur "Modifiée le". Voir libellés dans index.html.
function testUpsertRecipeEditionPoseUpdatedAt() {
  const before = new Date().toISOString();
  const recipes = [{ id: 1, name: "A", createdAt: "2023-01-01T00:00:00.000Z" }];
  const updated = upsertRecipe(recipes, { name: "A modifié" }, 1);
  const after = new Date().toISOString();
  assert.ok(updated[0].updatedAt, "updatedAt doit être posé à l'édition");
  assert.ok(updated[0].updatedAt >= before && updated[0].updatedAt <= after);
}

function testUpsertRecipeEditionEcraseUpdatedAtPrecedent() {
  const ancienUpdatedAt = "2023-05-01T00:00:00.000Z";
  const recipes = [{ id: 1, name: "A", createdAt: "2023-01-01T00:00:00.000Z", updatedAt: ancienUpdatedAt }];
  const before = new Date().toISOString();
  const updated = upsertRecipe(recipes, { name: "A re-modifié", updatedAt: ancienUpdatedAt }, 1);
  assert.notStrictEqual(updated[0].updatedAt, ancienUpdatedAt);
  assert.ok(updated[0].updatedAt >= before);
}

function testUpsertRecipeCreationNePoseAsUpdatedAt() {
  const created = upsertRecipe([], { name: "Nouvelle" }, null);
  assert.strictEqual(created[0].updatedAt, undefined);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    // Structure
    testValidRetourneErrorsVide,
    testInvalidRetourneErrorsTableau,
    testChaqueErreurContientFieldEtMessage,
    // Type
    testRecipeTypeNonReconnuInvalide,
    testRecipeTypeManquantInvalide,
    // Nom
    testNomVideInvalide,
    testNomBlancInvalide,
    testNomManquantInvalide,
    // Catégories
    testCategoriesVideInvalide,
    testCategoriesUniquementBlancsInvalide,
    testCategoriesManquantesInvalide,
    // Couverts (final)
    testCouvertsZeroFinaleInvalide,
    testCouvertsNegatifFinaleInvalide,
    testCouvertsPositifFinaleValide,
    testBaseAvecCouvertsZeroAccepte,
    // Rendement (base)
    testOutputQuantityZeroBaseInvalide,
    testOutputQuantityNegatifBaseInvalide,
    testOutputUnitManquanteBaseInvalide,
    testRendementBaseValide,
    testFinaleSansRendementValide,
    // Coeff perte
    testWasteCoeffNegatifInvalide,
    testWasteCoeffCentInvalide,
    testWasteCoeffNormalValide,
    testWasteCoeffAbsentValide,
    // Composants (règle historique)
    testBaseSansIngredientDirectInvalide,
    testFinaleSansDirectNiBaseInvalide,
    testFinaleAvecBaseValide,
    testBaseAvecIngredientDirectValide,
    // Lignes ingrédients directs
    testIngredientSansIdInvalide,
    testIngredientQuantiteZeroInvalide,
    testIngredientQuantiteNegativeInvalide,
    testIngredientUniteVideInvalide,
    testIngredientPlusieursLignesAvecErreursDifferentes,
    // Lignes composants de base
    testBaseComponentSansIdInvalide,
    testBaseComponentQuantityZeroInvalide,
    testBaseComponentUniteVideInvalide,
    testBaseComponentPortionModePortionCountZeroInvalide,
    testBaseComponentPortionModeValide,
    testBaseComponentPortionModeIgnoreQuantityEtUnit,
    // Imbrication (nouveau)
    testBaseAvecUniquementBaseComponentsValide,
    testBaseAvecBaseComponentsEnPortionValide,
    testBaseAvecIngredientEtSousRecetteValide,
    // Anti-cycle (nouveau)
    testCycleDirectAReverseDansSesPropresSousRecettes,
    testCycleIndirectABA,
    testCycleProfondABCA,
    testPasDeCycleQuandSousRecetteIndependante,
    testSansAllRecipesPasDeDetectionCycle,
    testSansEditingIdPasDeDetectionCycle,
    testDetectBaseComponentCycleAPIDirecte,
    // Cumul
    testFormulaireVideAccumuleErreurs,
    testTousLesMessagesEnFrancais,
    // buildRecipePayload + upsertRecipe (préservés)
    testBuildRecipePayloadAppelleNormalizeRecipe,
    testUpsertRecipeCreateMaxIdPlusUn,
    testUpsertRecipeMetAJourBonneRecette,
    testComparaisonRobusteIdStringEtNumber,
    testUpsertRecipeGrandeListeSansPlantage,
    testUpsertRecipeCreatedAtGenereSiAbsent,
    testUpsertRecipeCreatedAtPreserveSiPresent,
    testUpsertRecipeUpdateNeTouchesPasCreatedAt,
    testUpsertRecipeEditionPoseUpdatedAt,
    testUpsertRecipeEditionEcraseUpdatedAtPrecedent,
    testUpsertRecipeCreationNePoseAsUpdatedAt,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
