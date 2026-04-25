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
  checkUnitCatalogConsistency,
} = window.ArpegeCostsAndUnits;

function testConversionCompatible() {
  const converted = convertQuantity(1, 'Kg', 'Gramme');
  assert.strictEqual(converted, 1000);
}

function testConversionIncompatible() {
  const converted = convertQuantity(1, 'Kg', 'Litre');
  assert.strictEqual(converted, null);
}

function testCoutIngredient() {
  const cost = calculateIngredientCost({ quantity: 0.5, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 1.1 });
  assert.strictEqual(cost, 5.5);
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
      { ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 1 },
      { ingredientId: 2, name: 'B', quantity: 500, unit: 'Gramme', unitPrice: 'Kg', pricePerUnit: 4, wasteCoeff: 1 },
    ],
    baseComponents: [],
    wasteCoeff: 1,
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
    directIngredients: [{ ingredientId: 1, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 1 }],
    baseComponents: [],
    wasteCoeff: 1,
    outputQuantity: 1,
    outputUnit: 'Kg',
    covers: 1,
  };

  const finalRecipe = {
    id: 2,
    recipeType: 'final',
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1, name: 'Base A', quantity: 1, unit: 'Litre' }],
    wasteCoeff: 1,
    outputQuantity: 1,
    outputUnit: 'Portion',
    covers: 1,
  };

  const status = getCostStatus(finalRecipe, [baseRecipe, finalRecipe]);
  assert.strictEqual(status.valid, false);
}

function testCoutUtilisePrixCatalogueIngredient() {
  const line = { ingredientId: 5, name: 'Tomate', quantity: 2, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 3, wasteCoeff: 1 };
  const ingredientsCatalog = [{ id: 5, name: 'Tomate', price: 10, unit: 'Kg' }];
  const cost = calculateIngredientCost(line, ingredientsCatalog);
  assert.strictEqual(cost, 20);
}

function testCoutRecetteChangeQuandPrixCatalogueChange() {
  const recipe = {
    id: 20,
    recipeType: 'base',
    directIngredients: [{ ingredientId: 8, name: 'A', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 1 }],
    baseComponents: [],
    wasteCoeff: 1,
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
  const line = { ingredientId: 99, name: 'X', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 7, wasteCoeff: 1 };
  const cost = calculateIngredientCost(line, [{ id: 1, name: 'Autre', price: 2, unit: 'Kg' }]);
  assert.strictEqual(cost, 7);
}

function testCoutInvalideSiIngredientIntrouvableSansFallback() {
  const line = { ingredientId: 99, name: 'X', quantity: 1, unit: 'Kg', wasteCoeff: 1 };
  const cost = calculateIngredientCost(line, [{ id: 1, name: 'Autre', price: 2, unit: 'Kg' }]);
  assert.strictEqual(cost, null);
}

function testCompatibiliteAppelsSansCatalogue() {
  const line = { quantity: 0.5, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 10, wasteCoeff: 1 };
  const cost = calculateIngredientCost(line);
  assert.strictEqual(cost, 5);
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
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
