const fs = require('fs');
const assert = require('assert');

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, 'utf8'));
}

loadScript('logic/core/costs-and-units.js');
loadScript('logic/core/recipe-scaling.js');

const { computePivotMultiplier, buildAdaptedRecipe, computeAdaptedMetrics } = window.ArpegeRecipeScaling;
const { calculateRecipeTotalCost, getCostStatus } = window.ArpegeCostsAndUnits;

function sampleRecipe() {
  return {
    id: 1,
    recipeType: 'final',
    categories: ['Plat'],
    name: 'Test',
    covers: 4,
    outputQuantity: 4,
    outputUnit: 'Portion',
    directIngredients: [
      { ingredientId: 1, name: 'A', quantity: 2, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 4, wasteCoeff: 1 },
      { ingredientId: 2, name: 'B', quantity: 1, unit: 'Litre', unitPrice: 'Litre', pricePerUnit: 3, wasteCoeff: 1 },
    ],
    baseComponents: [
      { baseRecipeId: 10, name: 'Base', quantity: 2, unit: 'Kg' },
    ],
    wasteCoeff: 1,
  };
}

function sampleBaseRecipe() {
  return {
    id: 10,
    recipeType: 'base',
    categories: ['Base'],
    name: 'Base',
    covers: 2,
    outputQuantity: 2,
    outputUnit: 'Kg',
    directIngredients: [
      { ingredientId: 3, name: 'C', quantity: 1, unit: 'Kg', unitPrice: 'Kg', pricePerUnit: 2, wasteCoeff: 1 },
    ],
    baseComponents: [],
    wasteCoeff: 1,
  };
}

function testPivotParCouverts() {
  const normalizedRecipe = sampleRecipe();
  const result = computePivotMultiplier({ pivotType: 'covers', pivotValue: '8', normalizedRecipe, baseCost: 20, selectedIngredientIndex: 0 });
  assert.strictEqual(result.multiplier, 2);
}

function testPivotParQuantiteGlobale() {
  const normalizedRecipe = sampleRecipe();
  const result = computePivotMultiplier({ pivotType: 'globalQuantity', pivotValue: '10', normalizedRecipe, baseCost: 20, selectedIngredientIndex: 0 });
  // totalDirectQty = 2 + 1 + 2 = 5
  assert.strictEqual(result.multiplier, 2);
}

function testPivotParBudget() {
  const normalizedRecipe = sampleRecipe();
  const result = computePivotMultiplier({ pivotType: 'budget', pivotValue: '50', normalizedRecipe, baseCost: 25, selectedIngredientIndex: 0 });
  assert.strictEqual(result.multiplier, 2);
}

function testPivotParLignePivot() {
  const normalizedRecipe = sampleRecipe();
  const result = computePivotMultiplier({ pivotType: 'ingredientQuantity', pivotValue: '4', normalizedRecipe, baseCost: 20, selectedIngredientIndex: 0 });
  // selected line quantity = 2
  assert.strictEqual(result.multiplier, 2);
}

function testPivotParLignePivotBaseComponent() {
  const normalizedRecipe = sampleRecipe();
  // La liste UI fusionne directIngredients puis baseComponents.
  // Index 2 => premier baseComponent (direct has length 2).
  const result = computePivotMultiplier({ pivotType: 'ingredientQuantity', pivotValue: '4', normalizedRecipe, baseCost: 20, selectedIngredientIndex: 2 });
  // base component quantity = 2
  assert.strictEqual(result.multiplier, 2);
  assert.strictEqual(result.valid, true);
}

function testCasInvalideValeurAbsente() {
  const normalizedRecipe = sampleRecipe();
  const result = computePivotMultiplier({ pivotType: 'covers', pivotValue: '', normalizedRecipe, baseCost: 20, selectedIngredientIndex: 0 });
  assert.strictEqual(result.multiplier, 1);
  assert.strictEqual(result.valid, false);
}

function testRecalculRecetteAdapteeEtStatut() {
  const recipe = sampleRecipe();
  const base = sampleBaseRecipe();
  const scaling = computePivotMultiplier({ pivotType: 'covers', pivotValue: '8', normalizedRecipe: recipe, baseCost: 20, selectedIngredientIndex: 0 });
  const { adaptedRecipe } = buildAdaptedRecipe({ normalizedRecipe: recipe, multiplier: scaling.multiplier });
  const { adaptedCostStatus } = computeAdaptedMetrics({
    adaptedRecipe,
    recipes: [recipe, base],
    calculateRecipeTotalCost,
    getCostStatus,
  });
  assert.strictEqual(adaptedRecipe.covers, 8);
  assert.strictEqual(adaptedCostStatus.valid, true);
}

function runAll() {
  const tests = [
    testPivotParCouverts,
    testPivotParQuantiteGlobale,
    testPivotParBudget,
    testPivotParLignePivot,
    testPivotParLignePivotBaseComponent,
    testCasInvalideValeurAbsente,
    testRecalculRecetteAdapteeEtStatut,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
