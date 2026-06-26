const fs = require('fs');
const assert = require('assert');

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, 'utf8'));
}

loadScript('logic/core/costs-and-units.js');

const {
  convertQuantity,
  resolvePricingUnit,
  calculateIngredientCost,
  calculateRecipeTotalCost,
  getCostStatus,
  computeTheoreticalYieldFromDirectIngredients,
  resolveEffectiveYield,
  checkLineUnitConvertibility,
  checkUnitCatalogConsistency,
} = window.FormulaCostsAndUnits;

function testConversionCompatible() {
  const converted = convertQuantity(1, 'Kg', 'Gramme');
  assert.strictEqual(converted, 1000);
}

function testConversionIncompatible() {
  const converted = convertQuantity(1, 'Kg', 'Litre');
  assert.strictEqual(converted, null);
}

function testCoutIngredient() {
  const cost = calculateIngredientCost({ quantity: 0.5, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 20 });
  assert.strictEqual(cost, 6.25);
}

function testResolvePricingUnitFallback() {
  const resolved = resolvePricingUnit({ unit: 'Kg' });
  assert.strictEqual(resolved, 'Kg');
}

function testUnitCatalogConsistencySignal() {
  const result = checkUnitCatalogConsistency(['Kg', 'Gramme', 'Litre']);
  assert.strictEqual(result.isConsistent, false);
  assert.ok(result.missingInUI.length > 0);
}

function testCoutTotalRecette() {
  const recipe = {
    id: 1,
    recipeType: 'base',
    directIngredients: [
      { ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 },
      { ingredientId: 2, name: 'B', quantity: 500, unit: 'Gramme', unitPrice: 'Kg', pricePerUnit: 4, wasteCoeff: 0 },
    ],
    baseComponents: [],
    wasteCoeff: 0,
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
  };
  const cost = calculateRecipeTotalCost(recipe, [recipe]);
  assert.strictEqual(cost, 4);
}

function testRecetteInvalideStatutInvalide() {
  const baseRecipe = {
    id: 1,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 }],
    baseComponents: [],
    wasteCoeff: 0,
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
  };

  const finalRecipe = {
    id: 2,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, name: 'Base A', quantity: 1, unit: 'Litre' }],
    wasteCoeff: 0,
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
  };

  const status = getCostStatus(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(status.valid, false);
}

function testCoutUtilisePrixCatalogueIngredient() {
  const line = { ingredientId: 5, name: 'Tomate', quantity: 2, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 3, wasteCoeff: 0 };
  const ingredientsCatalog = [{ id: 5, name: 'Tomate', price: 10, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, ingredientsCatalog);
  assert.strictEqual(cost, 20);
}

function testCoutRecetteChangeQuandPrixCatalogueChange() {
  const recipe = {
    id: 20,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 8, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 }],
    baseComponents: [],
    wasteCoeff: 0,
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
  };
  const ingredientsV1 = [{ id: 8, name: 'A', price: 2, unit: 'Kg' }];
  const ingredientsV2 = [{ id: 8, name: 'A', price: 5, unit: 'Kg' }];
  const cost1 = calculateRecipeTotalCost(recipe, [recipe], new Set(), ingredientsV1);
  const cost2 = calculateRecipeTotalCost(recipe, [recipe], new Set(), ingredientsV2);
  assert.strictEqual(cost1, 2);
  assert.strictEqual(cost2, 5);
}

function testFallbackLegacySiIngredientIntrouvable() {
  const line = { ingredientId: 99, name: 'X', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 7, wasteCoeff: 0 };
  const cost = calculateIngredientCost(line, [{ id: 1, name: 'Autre', price: 2, unit: 'Kg' }]);
  assert.strictEqual(cost, 7);
}

function testCoutInvalideSiIngredientIntrouvableSansFallback() {
  const line = { ingredientId: 99, name: 'X', quantity: 1, unit: 'Kg', wasteCoeff: 0 };
  const cost = calculateIngredientCost(line, [{ id: 1, name: 'Autre', price: 2, unit: 'Kg' }]);
  assert.strictEqual(cost, null);
}

function testCompatibiliteAppelsSansCatalogue() {
  const line = { quantity: 0.5, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 };
  const cost = calculateIngredientCost(line);
  assert.strictEqual(cost, 5);
}

function testSansIngredientIdMaisNomCorrespondantUtiliseCatalogue() {
  const line = { name: 'Tomate', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 };
  const catalog = [{ id: 77, name: 'Tomate', price: 9, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, catalog);
  assert.strictEqual(cost, 9);
}

function testIdMismatchAvecFallbackNom() {
  // ID 999 n'existe pas dans le catalogue, mais le nom "Tomate" correspond → prix catalogue (9) utilisé
  const line = { ingredientId: 999, name: 'Tomate', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 };
  const catalog = [{ id: 77, name: 'Tomate', price: 9, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, catalog);
  assert.strictEqual(cost, 9);
}

function testIdMismatchSansNomCorrespondantFallbackLegacy() {
  // ID inconnu ET nom introuvable dans le catalogue → prix legacy (2) utilisé
  const line = { ingredientId: 999, name: 'Ingrédient inconnu', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 };
  const catalog = [{ id: 77, name: 'Tomate', price: 9, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, catalog);
  assert.strictEqual(cost, 2);
}

function testPrixZeroTraiteCommeInconnu() {
  const line = { ingredientId: 50, name: 'Herbes', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 0 };
  const catalog = [{ id: 50, name: 'Herbes', price: 0, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, catalog);
  assert.strictEqual(cost, null);
}

function testStatusPrixManquantExplicite() {
  const recipe = {
    id: 501,
    recipeType: 'base',
    directIngredients: [
      { ingredientId: 77, name: 'Épice test', quantity: 1, unit: 'Kg', unitPrice: 'Kg', wasteCoeff: 0 },
    ],
    baseComponents: [],
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
    wasteCoeff: 0,
  };
  const status = getCostStatus(recipe, [recipe], [{ id: 77, name: 'Épice test', price: null, unit: 'Kg' }]);
  assert.strictEqual(status.valid, false);
  assert.ok(status.message.includes('Prix manquant'));
  assert.ok(status.message.includes('Épice test'));
}

function testRendementTheoriqueCalculable() {
  const recipe = {
    id: 101,
    recipeType: 'base',
    directIngredients: [
      { quantity: 1, unit: 'Kg' },
      { quantity: 500, unit: 'Gramme' },
    ],
    baseComponents: [],
  };
  const theoretical = computeTheoreticalYieldFromDirectIngredients(recipe);
  assert.strictEqual(theoretical.quantity, 1.5);
  assert.strictEqual(theoretical.unit, 'Kg');
}

function testRendementTheoriqueNonCalculable() {
  const recipe = {
    id: 102,
    recipeType: 'base',
    directIngredients: [
      { quantity: 1, unit: 'Kg' },
      { quantity: 1, unit: 'Litre' },
    ],
    baseComponents: [],
  };
  const theoretical = computeTheoreticalYieldFromDirectIngredients(recipe);
  assert.strictEqual(theoretical, null);
}

function testRendementReelPrioritaire() {
  const recipe = {
    id: 103,
    recipeType: 'base',
    outputQuantity: 3,
    outputUnit: 'Kg',
    actualOutputQuantity: 2,
    actualOutputUnit: 'Kg',
    directIngredients: [{ quantity: 1, unit: 'Kg' }],
  };
  const effective = resolveEffectiveYield(recipe);
  assert.strictEqual(effective.source, 'actual');
  assert.strictEqual(effective.quantity, 2);
}

function testFallbackLegacyRendement() {
  const recipe = {
    id: 104,
    recipeType: 'base',
    outputQuantity: 4,
    outputUnit: 'Portion',
    directIngredients: [{ quantity: 1, unit: 'Kg' }, { quantity: 1, unit: 'Litre' }],
  };
  const effective = resolveEffectiveYield(recipe);
  assert.strictEqual(effective.source, 'legacy');
  assert.strictEqual(effective.quantity, 4);
  assert.strictEqual(effective.unit, 'Portion');
}

function testLegacyPrioritaireSurTheoriqueCalculable() {
  const recipe = {
    id: 105,
    recipeType: 'base',
    outputQuantity: 2,
    outputUnit: 'Kg',
    directIngredients: [{ quantity: 1, unit: 'Kg' }],
  };
  const effective = resolveEffectiveYield(recipe);
  assert.strictEqual(effective.source, 'legacy');
  assert.strictEqual(effective.quantity, 2);
  assert.strictEqual(effective.unit, 'Kg');
}

function testTheoriqueUtiliseSeulementSansLegacyValide() {
  const recipe = {
    id: 106,
    recipeType: 'base',
    outputQuantity: 'abc',
    outputUnit: 'Kg',
    directIngredients: [{ quantity: 1, unit: 'Kg' }, { quantity: 500, unit: 'Gramme' }],
  };
  const effective = resolveEffectiveYield(recipe);
  assert.strictEqual(effective.source, 'theoretical');
  assert.strictEqual(effective.quantity, 1.5);
}

function testUsageSousRecetteModeQuantite() {
  const baseRecipe = {
    id: 201,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 2,
    outputUnit: 'Kg',
    covers: 2,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 202,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 201, name: 'Base', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(cost, 5);
}

function testUsageSousRecetteModePortion() {
  const baseRecipe = {
    id: 211,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 2,
    outputUnit: 'Kg',
    covers: 2,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 212,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 211, name: 'Base', usageMode: 'portion', portionCount: 1, portionRef: 'covers' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(cost, 5);
}

function testModePortionIgnoreOutputQuantityUnit() {
  const baseRecipe = {
    id: 241,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 10, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 999,
    outputUnit: 'Kg',
    covers: 10,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 242,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 241, name: 'Base', usageMode: 'portion', portionCount: 2 }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(cost, 20);
}

function testCasInvalideModePortion() {
  const baseRecipe = {
    id: 221,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 2,
    outputUnit: 'Kg',
    covers: 0,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 222,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 221, name: 'Base', usageMode: 'portion', portionCount: 0, portionRef: 'covers' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const status = getCostStatus(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(status.valid, false);
}

function testCompatAncienneRecetteSansUsageMode() {
  const baseRecipe = {
    id: 231,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 8, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 4,
    outputUnit: 'Kg',
    covers: 4,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 232,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 231, name: 'Base', quantity: 2, unit: 'Kg' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(cost, 4);
}

function testBaseRecipeIdMismatchFallbackNom() {
  // baseRecipeId: 999 n'existe pas — trouvée par nom "Base fusionnée"
  const baseRecipe = {
    id: 201,
    name: 'Base fusionnée',
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 2,
    outputUnit: 'Kg',
    covers: 2,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 202,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 999, name: 'Base fusionnée', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(cost, 5);
}

// ─── Imbrication récursive (depuis 2026-06-26) ────────────────────────────────
// Verrouille le fait que calculateRecipeTotalCost descend dans N niveaux de
// sous-recettes (recette de base composée d'une autre recette de base, etc.).

function testCoutRecetteBaseImbrickee() {
  // Innermost : 1 Kg d'ingrédient à 10 €/Kg → coût 10 €, rendement 2 Kg → 5 €/Kg
  const innermost = {
    id: 301,
    name: 'Insert pistache',
    recipeType: 'base',
    directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }],
    baseComponents: [],
    outputQuantity: 2,
    outputUnit: 'Kg',
    covers: 2,
    wasteCoeff: 0,
  };
  // Middle : recette de base composée d'1 Kg de l'innermost → consomme tout (coût 5 € pour 1 Kg)
  const middle = {
    id: 302,
    name: 'Biscuit pistache',
    recipeType: 'base',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 301, name: 'Insert pistache', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
    wasteCoeff: 0,
  };
  // Cas que Vanessa décrit : recette de base qui n'a QUE des sous-recettes.
  const cost = calculateRecipeTotalCost(middle, [innermost, middle]);
  assert.strictEqual(cost, 5, '1 Kg de middle coûte 5 € (puisque innermost rend 2 Kg à 10 €, soit 5 €/Kg)');
}

function testCoutTriplementImbrickee() {
  // A (innermost) → coût 10 € pour 1 Kg ; rendement 1 Kg → 10 €/Kg
  // B utilise 1 Kg de A → coût 10 € pour 1 Kg ; rendement 1 Kg → 10 €/Kg
  // C utilise 1 Kg de B → coût 10 € pour 1 Kg
  const a = { id: 401, name: 'A', recipeType: 'base', directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 0 }], baseComponents: [], outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0 };
  const b = { id: 402, name: 'B', recipeType: 'base', directIngredients: [], baseComponents: [{ baseRecipeId: 401, name: 'A', quantity: 1, unit: 'Kg' }], outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0 };
  const c = { id: 403, name: 'C', recipeType: 'base', directIngredients: [], baseComponents: [{ baseRecipeId: 402, name: 'B', quantity: 1, unit: 'Kg' }], outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0 };
  const cost = calculateRecipeTotalCost(c, [a, b, c]);
  assert.strictEqual(cost, 10, 'coût propagé sur 3 niveaux');
}

function testCoutAvecCycleRetourneNull() {
  // Cycle direct A → A (référentiel corrompu). Doit retourner null, pas planter.
  const a = { id: 501, name: 'A', recipeType: 'base', directIngredients: [], baseComponents: [{ baseRecipeId: 501, name: 'A', quantity: 1, unit: 'Kg' }], outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0 };
  const cost = calculateRecipeTotalCost(a, [a]);
  assert.strictEqual(cost, null, 'cycle détecté, coût null');
}

function testCheckLineUnitConvertibiliteUnitesIdentiques() {
  const line = { ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg' };
  const catalog = [{ id: 1, name: 'A', price: 5, unit: 'Kg' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.message, null);
}

function testCheckLineUnitConvertibiliteMemeGroupe() {
  const line = { ingredientId: 1, name: 'A', quantity: 200, unit: 'Gramme' };
  const catalog = [{ id: 1, name: 'A', price: 5, unit: 'Kg' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.message, null);
}

function testCheckLineUnitConvertibiliteGroupesDifferents() {
  const line = { ingredientId: 1, name: 'Beurre', quantity: 200, unit: 'Gramme' };
  const catalog = [{ id: 1, name: 'Beurre', price: 5, unit: 'Litre' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, false);
  assert.ok(result.message.includes('Gramme'));
  assert.ok(result.message.includes('Litre'));
  assert.ok(result.message.includes('Beurre'));
}

function testCheckLineUnitConvertibiliteSansUniteSaisie() {
  const line = { ingredientId: 1, name: 'A', quantity: 1 };
  const catalog = [{ id: 1, name: 'A', price: 5, unit: 'Kg' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.message, null);
}

function testCheckLineUnitConvertibiliteCatalogueSansUniteAchat() {
  const line = { ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg' };
  const catalog = [{ id: 1, name: 'A', price: 5, unit: '' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.message, null);
}

function testCheckLineUnitConvertibiliteFallbackLegacyCompatible() {
  const line = { ingredientId: 99, name: 'X', quantity: 500, unit: 'Gramme', unitPrice: 'Kg', pricePerUnit: 5 };
  const result = checkLineUnitConvertibility(line, []);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.message, null);
}

function testCheckLineUnitConvertibiliteFallbackLegacyIncompatible() {
  const line = { ingredientId: 99, name: 'X', quantity: 500, unit: 'Gramme', unitPrice: 'Litre', pricePerUnit: 5 };
  const result = checkLineUnitConvertibility(line, []);
  assert.strictEqual(result.valid, false);
  assert.ok(result.message.includes('Gramme'));
  assert.ok(result.message.includes('Litre'));
}

function testCheckLineUnitConvertibiliteUniteInconnueLaissePasser() {
  // Cas hors périmètre : si l'unité est inconnue du système (ni masse, ni volume, ni count),
  // on ne peut pas conclure → on reste silencieux et on laisse passer.
  const line = { ingredientId: 1, name: 'A', quantity: 1, unit: 'UnitéBidon' };
  const catalog = [{ id: 1, name: 'A', price: 5, unit: 'Kg' }];
  const result = checkLineUnitConvertibility(line, catalog);
  assert.strictEqual(result.valid, true);
}

function testCheckLineUnitConvertibiliteSansCatalogueAvecUnitSeule() {
  // line.unit seul (pas de unitPrice) → resolvePricingUnit fallback à line.unit
  // → pricingUnit identique à lineUnit → valid:true.
  const line = { name: 'X', quantity: 1, unit: 'Kg' };
  const result = checkLineUnitConvertibility(line);
  assert.strictEqual(result.valid, true);
}

function testBaseRecipeIntrouvableRetourneNull() {
  // baseRecipeId inconnu ET nom absent du catalogue → null → N/A
  const finalRecipe = {
    id: 202,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 999, name: 'Recette supprimée', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };
  const cost = calculateRecipeTotalCost(finalRecipe, [finalRecipe]);
  assert.strictEqual(cost, null);
}

function testCostStatusFinalePropageMessageSousRecetteIngredientSansPrix() {
  // Sous-recette avec un ingrédient sans prix → la recette finale doit nommer
  // explicitement la sous-recette ET l'ingrédient incriminé, pas se contenter
  // d'un "Calcul du coût impossible" générique.
  const baseRecipe = {
    id: 501,
    name: 'Sauce hollandaise',
    recipeType: 'base',
    directIngredients: [
      { ingredientId: 1, name: 'Beurre', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: null, wasteCoeff: 0 },
    ],
    baseComponents: [],
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
    wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 502,
    name: 'Asperges sauce hollandaise',
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 501, name: 'Sauce hollandaise', quantity: 100, unit: 'Gramme' }],
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
    wasteCoeff: 0,
  };

  const status = getCostStatus(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(status.valid, false);
  assert.ok(status.message.includes('Sauce hollandaise'), `Le message doit nommer la sous-recette, reçu : "${status.message}"`);
  assert.ok(status.message.includes('Beurre'), `Le message doit nommer l'ingrédient sans prix, reçu : "${status.message}"`);
  assert.ok(status.message.includes('Prix manquant'), `Le message doit expliquer la cause, reçu : "${status.message}"`);
}

function testCostStatusPropageSurDeuxNiveauxDeSousRecettes() {
  // Profondeur : finale → sous-recette → sous-sous-recette avec ingrédient sans prix.
  // Le message remonté doit chaîner les deux niveaux de sous-recettes pour rester traçable.
  const subSub = {
    id: 611,
    name: 'Fond de veau',
    recipeType: 'base',
    directIngredients: [
      { ingredientId: 1, name: 'Os de veau', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: null, wasteCoeff: 0 },
    ],
    baseComponents: [],
    outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0,
  };
  const middle = {
    id: 612,
    name: 'Sauce demi-glace',
    recipeType: 'base',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 611, name: 'Fond de veau', quantity: 500, unit: 'Gramme' }],
    outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0,
  };
  const finalRecipe = {
    id: 613,
    name: 'Filet de bœuf demi-glace',
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 612, name: 'Sauce demi-glace', quantity: 50, unit: 'Gramme' }],
    outputQuantity: 1, outputUnit: 'Portion', covers: 1, wasteCoeff: 0,
  };

  const status = getCostStatus(finalRecipe, [subSub, middle, finalRecipe]);
  assert.strictEqual(status.valid, false);
  assert.ok(status.message.includes('Sauce demi-glace'), `Le message doit nommer le niveau intermédiaire, reçu : "${status.message}"`);
  assert.ok(status.message.includes('Fond de veau'), `Le message doit nommer la sous-sous-recette, reçu : "${status.message}"`);
  assert.ok(status.message.includes('Os de veau'), `Le message doit nommer l'ingrédient profond, reçu : "${status.message}"`);
}

function testCostStatusDetecteCycleEntreRecettes() {
  // Cycle artificiel : A référence B, B référence A. Sans anti-cycle, la récursion
  // boucle à l'infini. getCostStatus doit retourner un message lisible.
  const recipeA = {
    id: 701,
    name: 'Recette A',
    recipeType: 'base',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 702, name: 'Recette B', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0,
  };
  const recipeB = {
    id: 702,
    name: 'Recette B',
    recipeType: 'base',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 701, name: 'Recette A', quantity: 1, unit: 'Kg' }],
    outputQuantity: 1, outputUnit: 'Kg', covers: 1, wasteCoeff: 0,
  };

  const status = getCostStatus(recipeA, [recipeA, recipeB]);
  assert.strictEqual(status.valid, false);
  assert.ok(status.message.includes('Cycle'), `Le message doit annoncer un cycle, reçu : "${status.message}"`);
}

function runAll() {
  const tests = [
    testConversionCompatible,
    testConversionIncompatible,
    testCoutIngredient,
    testResolvePricingUnitFallback,
    testUnitCatalogConsistencySignal,
    testCoutTotalRecette,
    testRecetteInvalideStatutInvalide,
    testCoutUtilisePrixCatalogueIngredient,
    testCoutRecetteChangeQuandPrixCatalogueChange,
    testFallbackLegacySiIngredientIntrouvable,
    testCoutInvalideSiIngredientIntrouvableSansFallback,
    testCompatibiliteAppelsSansCatalogue,
    testSansIngredientIdMaisNomCorrespondantUtiliseCatalogue,
    testIdMismatchAvecFallbackNom,
    testIdMismatchSansNomCorrespondantFallbackLegacy,
    testPrixZeroTraiteCommeInconnu,
    testStatusPrixManquantExplicite,
    testRendementTheoriqueCalculable,
    testRendementTheoriqueNonCalculable,
    testRendementReelPrioritaire,
    testFallbackLegacyRendement,
    testLegacyPrioritaireSurTheoriqueCalculable,
    testTheoriqueUtiliseSeulementSansLegacyValide,
    testUsageSousRecetteModeQuantite,
    testUsageSousRecetteModePortion,
    testModePortionIgnoreOutputQuantityUnit,
    testCasInvalideModePortion,
    testCompatAncienneRecetteSansUsageMode,
    testBaseRecipeIdMismatchFallbackNom,
    testBaseRecipeIntrouvableRetourneNull,
    // Imbrication récursive (nouveau)
    testCoutRecetteBaseImbrickee,
    testCoutTriplementImbrickee,
    testCoutAvecCycleRetourneNull,
    testCheckLineUnitConvertibiliteUnitesIdentiques,
    testCheckLineUnitConvertibiliteMemeGroupe,
    testCheckLineUnitConvertibiliteGroupesDifferents,
    testCheckLineUnitConvertibiliteSansUniteSaisie,
    testCheckLineUnitConvertibiliteCatalogueSansUniteAchat,
    testCheckLineUnitConvertibiliteFallbackLegacyCompatible,
    testCheckLineUnitConvertibiliteFallbackLegacyIncompatible,
    testCheckLineUnitConvertibiliteUniteInconnueLaissePasser,
    testCheckLineUnitConvertibiliteSansCatalogueAvecUnitSeule,
    testCostStatusFinalePropageMessageSousRecetteIngredientSansPrix,
    testCostStatusPropageSurDeuxNiveauxDeSousRecettes,
    testCostStatusDetecteCycleEntreRecettes,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
