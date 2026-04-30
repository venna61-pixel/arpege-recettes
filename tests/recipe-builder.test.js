const fs = require('fs');
const assert = require('assert');

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, 'utf8'));
}

loadScript('logic/core/recipe-builder.js');

const { buildDirectIngredientLine, buildBaseComponentLine } = window.ArpegeRecipeBuilder;

function testMappingIngredientComplet() {
  const ingredient = { id: 7, name: 'Farine', price: 2.4, unit: 'Kg' };
  const line = buildDirectIngredientLine({
    ingredient,
    ingredientId: 7,
    quantity: '1.5',
    unit: 'Kg',
    wasteCoeff: '1.1',
  });
  assert.deepStrictEqual(line, {
    ingredientId: 7,
    name: 'Farine',
    quantity: 1.5,
    unit: 'Kg',
    wasteCoeff: 1.1,
    pricePerUnit: 2.4,
    unitPrice: 'Kg',
  });
}

function testMappingBaseComponent() {
  const baseRecipe = { id: 12, name: 'Sauce', outputUnit: 'Litre' };
  const line = buildBaseComponentLine({
    baseRecipe,
    baseRecipeId: 12,
    quantity: '2',
    unit: 'Litre',
  });
  assert.deepStrictEqual(line, {
    baseRecipeId: 12,
    name: 'Sauce',
    quantity: 2,
    unit: 'Litre',
  });
}

function testSourceIntrouvable() {
  assert.strictEqual(buildDirectIngredientLine({ ingredient: null, quantity: 1 }), null);
  assert.strictEqual(buildBaseComponentLine({ baseRecipe: null, quantity: 1 }), null);
}

function testMappingBaseComponentModePortion() {
  const baseRecipe = { id: 44, name: 'Bouillon', outputUnit: 'Litre' };
  const line = buildBaseComponentLine({
    baseRecipe,
    baseRecipeId: 44,
    usageMode: 'portion',
    portionCount: '3',
  });
  assert.deepStrictEqual(line, {
    baseRecipeId: 44,
    name: 'Bouillon',
    quantity: 0,
    unit: 'Litre',
    usageMode: 'portion',
    portionCount: 3,
  });
}

function testValeursParDefaut() {
  const ingredient = { id: 9, name: 'Sel', price: 1.2, unit: 'Kg' };
  const directLine = buildDirectIngredientLine({
    ingredient,
    quantity: undefined,
    unit: '',
    wasteCoeff: undefined,
  });
  assert.strictEqual(directLine.quantity, 0);
  assert.strictEqual(directLine.unit, 'Kg');
  assert.strictEqual(directLine.wasteCoeff, 1);

  const baseRecipe = { id: 33, name: 'Fond', outputUnit: 'Litre' };
  const baseLine = buildBaseComponentLine({
    baseRecipe,
    quantity: undefined,
    unit: '',
  });
  assert.strictEqual(baseLine.quantity, 0);
  assert.strictEqual(baseLine.unit, 'Litre');
}

function runAll() {
  const tests = [
    testMappingIngredientComplet,
    testMappingBaseComponent,
    testMappingBaseComponentModePortion,
    testSourceIntrouvable,
    testValeursParDefaut,
  ];
  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
