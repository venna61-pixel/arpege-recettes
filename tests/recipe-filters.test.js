const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/recipe-filters.js");

const {
  filterRecipesForList,
  filterIngredientsForPicker,
  filterBaseRecipesForPicker,
  sortRecipes,
} = window.FormulaRecipeFilters;

function recipesFixture() {
  return [
    { id: 1, recipeType: "base", name: "Sauce tomate", categories: ["Entrée"] },
    { id: 2, recipeType: "final", name: "Pasta tomate", categories: ["Plat"] },
    { id: 3, recipeType: "final", name: "Salade verte", categories: ["Salade"] },
    { id: 4, recipeType: "base", name: "Fond brun", categories: ["Plat"] },
  ];
}

function ingredientsFixture() {
  return [
    { id: 1, name: "Crème fraîche" },
    { id: 2, name: "Tomate" },
    { id: 3, name: "Oignon" },
  ];
}

function testRechercheParNomRecette() {
  const result = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "pasta",
    sectionType: "final",
    categoryFilter: "Tous",
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, "Pasta tomate");
}

function testRechercheParCategorieDansListing() {
  const result = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "salade",
    sectionType: "final",
    categoryFilter: "Tous",
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, "Salade verte");
}

function testFiltreTypeBaseFinal() {
  const baseResult = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "",
    sectionType: "base",
    categoryFilter: "Tous",
  });
  const finalResult = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "",
    sectionType: "final",
    categoryFilter: "Tous",
  });
  assert.strictEqual(baseResult.every((r) => r.recipeType === "base"), true);
  assert.strictEqual(finalResult.every((r) => r.recipeType === "final"), true);
}

function testFiltreCategorieTousVsPrecise() {
  const all = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "",
    sectionType: "final",
    categoryFilter: "Tous",
  });
  const onlyPlat = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "",
    sectionType: "final",
    categoryFilter: "Plat",
  });
  assert.strictEqual(all.length, 2);
  assert.strictEqual(onlyPlat.length, 1);
  assert.strictEqual(onlyPlat[0].name, "Pasta tomate");
}

function testCumulRechercheTypeCategorie() {
  const result = filterRecipesForList({
    recipes: recipesFixture(),
    searchTerm: "tomate",
    sectionType: "final",
    categoryFilter: "Plat",
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 2);
}

function testIngredientsPickerMatchPartielCaseInsensitiveEtVide() {
  const partial = filterIngredientsForPicker({
    ingredients: ingredientsFixture(),
    searchText: "tom",
  });
  const caseInsensitive = filterIngredientsForPicker({
    ingredients: ingredientsFixture(),
    searchText: "CRÈME",
  });
  const emptySearch = filterIngredientsForPicker({
    ingredients: ingredientsFixture(),
    searchText: "",
  });
  assert.strictEqual(partial.length, 1);
  assert.strictEqual(partial[0].name, "Tomate");
  assert.strictEqual(caseInsensitive.length, 1);
  assert.strictEqual(caseInsensitive[0].name, "Crème fraîche");
  assert.strictEqual(emptySearch.length, 3);
}

function testBasePickerExclutFinalesFiltreCategorieTexteEtCombinaison() {
  const excludedFinal = filterBaseRecipesForPicker({
    recipes: recipesFixture(),
    searchText: "",
    categoryFilter: "Tous",
  });
  const byCategory = filterBaseRecipesForPicker({
    recipes: recipesFixture(),
    searchText: "",
    categoryFilter: "Plat",
  });
  const byText = filterBaseRecipesForPicker({
    recipes: recipesFixture(),
    searchText: "sauce",
    categoryFilter: "Tous",
  });
  const combined = filterBaseRecipesForPicker({
    recipes: recipesFixture(),
    searchText: "fond",
    categoryFilter: "Plat",
  });
  assert.strictEqual(excludedFinal.every((r) => r.recipeType === "base"), true);
  assert.strictEqual(byCategory.length, 1);
  assert.strictEqual(byCategory[0].name, "Fond brun");
  assert.strictEqual(byText.length, 1);
  assert.strictEqual(byText[0].name, "Sauce tomate");
  assert.strictEqual(combined.length, 1);
  assert.strictEqual(combined[0].name, "Fond brun");
}

function testSortRecipesParNomAZ() {
  const recipes = [
    { id: 1, name: "Zucchini", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: 2, name: "Abricot", createdAt: "2024-06-01T00:00:00.000Z" },
    { id: 3, name: "Melon", createdAt: "2024-03-01T00:00:00.000Z" },
  ];
  const result = sortRecipes({ recipes, sortBy: "name", sortDir: "asc" });
  assert.strictEqual(result[0].name, "Abricot");
  assert.strictEqual(result[1].name, "Melon");
  assert.strictEqual(result[2].name, "Zucchini");
}

function testSortRecipesParNomZA() {
  const recipes = [
    { id: 1, name: "Abricot", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: 2, name: "Zucchini", createdAt: "2024-06-01T00:00:00.000Z" },
  ];
  const result = sortRecipes({ recipes, sortBy: "name", sortDir: "desc" });
  assert.strictEqual(result[0].name, "Zucchini");
  assert.strictEqual(result[1].name, "Abricot");
}

function testSortRecipesParDateDesc() {
  const recipes = [
    { id: 1, name: "A", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: 2, name: "B", createdAt: "2024-06-01T00:00:00.000Z" },
    { id: 3, name: "C", createdAt: "2024-03-01T00:00:00.000Z" },
  ];
  const result = sortRecipes({ recipes, sortBy: "date", sortDir: "desc" });
  assert.strictEqual(result[0].id, 2);
  assert.strictEqual(result[1].id, 3);
  assert.strictEqual(result[2].id, 1);
}

function testSortRecipesParDateAsc() {
  const recipes = [
    { id: 1, name: "A", createdAt: "2024-06-01T00:00:00.000Z" },
    { id: 2, name: "B", createdAt: "2024-01-01T00:00:00.000Z" },
  ];
  const result = sortRecipes({ recipes, sortBy: "date", sortDir: "asc" });
  assert.strictEqual(result[0].id, 2);
  assert.strictEqual(result[1].id, 1);
}

function testSortRecipesNeModifiePasOriginal() {
  const recipes = [
    { id: 1, name: "Z", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: 2, name: "A", createdAt: "2024-06-01T00:00:00.000Z" },
  ];
  sortRecipes({ recipes, sortBy: "name", sortDir: "asc" });
  assert.strictEqual(recipes[0].name, "Z");
}

function runAll() {
  const tests = [
    testRechercheParNomRecette,
    testRechercheParCategorieDansListing,
    testFiltreTypeBaseFinal,
    testFiltreCategorieTousVsPrecise,
    testCumulRechercheTypeCategorie,
    testIngredientsPickerMatchPartielCaseInsensitiveEtVide,
    testBasePickerExclutFinalesFiltreCategorieTexteEtCombinaison,
    testSortRecipesParNomAZ,
    testSortRecipesParNomZA,
    testSortRecipesParDateDesc,
    testSortRecipesParDateAsc,
    testSortRecipesNeModifiePasOriginal,
  ];
  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
