const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/recipe-submission.js");

const { validateRecipeDraft, buildRecipePayload, upsertRecipe } = window.ArpegeRecipeSubmission;

function testBaseSansIngredientDirectInvalide() {
  const result = validateRecipeDraft({
    recipeType: "base",
    directIngredients: [],
    baseComponents: [],
  });
  assert.strictEqual(result.valid, false);
}

function testFinaleSansDirectNiBaseInvalide() {
  const result = validateRecipeDraft({
    recipeType: "final",
    directIngredients: [],
    baseComponents: [],
  });
  assert.strictEqual(result.valid, false);
}

function testFinaleAvecBaseValide() {
  const result = validateRecipeDraft({
    recipeType: "final",
    directIngredients: [],
    baseComponents: [{ baseRecipeId: 1 }],
  });
  assert.strictEqual(result.valid, true);
}

function testBaseAvecIngredientDirectValide() {
  const result = validateRecipeDraft({
    recipeType: "base",
    directIngredients: [{ ingredientId: 1 }],
    baseComponents: [],
  });
  assert.strictEqual(result.valid, true);
}

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
  assert.deepStrictEqual(updated, [{ id: 1, name: "A" }, { id: 2, name: "B2" }]);
}

function testComparaisonRobusteIdStringEtNumber() {
  const recipes = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
  const payload = { name: "B-string-id" };
  const updated = upsertRecipe(recipes, payload, "2");
  assert.deepStrictEqual(updated, [{ id: 1, name: "A" }, { id: "2", name: "B-string-id" }]);
}

function runAll() {
  const tests = [
    testBaseSansIngredientDirectInvalide,
    testFinaleSansDirectNiBaseInvalide,
    testFinaleAvecBaseValide,
    testBaseAvecIngredientDirectValide,
    testBuildRecipePayloadAppelleNormalizeRecipe,
    testUpsertRecipeCreateMaxIdPlusUn,
    testUpsertRecipeMetAJourBonneRecette,
    testComparaisonRobusteIdStringEtNumber,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
