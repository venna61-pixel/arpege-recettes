const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/allergenes.js");

const { normalizeIngredientName, detectAllergenes, computeAllergenesFromNames, computeRecipeAllergeneSummary } = window.FormulaAllergenes;

// Normalisation : casse, accents, pluriels
function testNormalisationCasse() {
  const n1 = normalizeIngredientName("Beurre");
  const n2 = normalizeIngredientName("beurre");
  const n3 = normalizeIngredientName("BEURRE");
  const n4 = normalizeIngredientName("beurres");
  assert.strictEqual(n1, n2, "Beurre vs beurre");
  assert.strictEqual(n2, n3, "beurre vs BEURRE");
  assert.strictEqual(n4, n2, "beurres vs beurre (pluriel)");
}

function testNormalisationAccents() {
  const n1 = normalizeIngredientName("Crème fraîche");
  const n2 = normalizeIngredientName("creme fraiche");
  assert.strictEqual(n1, n2, "accents supprimés");
}

function testNormalisationPlurielOeuf() {
  const n1 = normalizeIngredientName("Oeuf");
  const n2 = normalizeIngredientName("Oeufs");
  assert.strictEqual(n1, n2, "Oeuf / Oeufs même résultat");
}

// Détection : ingrédients connus
function testDetectionBeurre() {
  const result = detectAllergenes("Beurre");
  assert.deepStrictEqual(result, ["Lait/Lactose"]);
}

function testDetectionCremeFraiche() {
  const result = detectAllergenes("Crème fraîche");
  assert.deepStrictEqual(result, ["Lait/Lactose"]);
}

function testDetectionOeuf() {
  const result = detectAllergenes("Oeuf");
  assert.ok(result.includes("Œufs"), "Oeuf contient Œufs");
}

function testDetectionFarine() {
  const result = detectAllergenes("Farine");
  assert.ok(result.includes("Gluten"), "Farine contient Gluten");
}

function testDetectionCrevette() {
  const result = detectAllergenes("Crevette");
  assert.ok(result.includes("Crustacés"), "Crevette contient Crustacés");
}

function testDetectionSaumon() {
  const result = detectAllergenes("Saumon");
  assert.ok(result.includes("Poisson"), "Saumon contient Poisson");
}

function testDetectionNoisette() {
  const result = detectAllergenes("Noisette");
  assert.ok(result.includes("Fruits à coque"), "Noisette contient Fruits à coque");
}

// Détection : pluriel
function testDetectionPluriels() {
  const single = detectAllergenes("Crevette");
  const plural = detectAllergenes("Crevettes");
  assert.deepStrictEqual(single, plural, "Crevette vs Crevettes");
}

function testDetectionBeurres() {
  const result = detectAllergenes("beurres");
  assert.deepStrictEqual(result, ["Lait/Lactose"], "beurres → Lait/Lactose");
}

// Détection : ingrédients inconnus ou sans allergène
function testIngredientInconnu() {
  const result = detectAllergenes("Pomme de terre");
  assert.deepStrictEqual(result, [], "Pomme de terre → tableau vide");
}

function testIngredientSansAllergeneDeclare() {
  const result = detectAllergenes("Carotte");
  assert.deepStrictEqual(result, [], "Carotte → tableau vide");
}

function testIngredientHuileOlive() {
  const result = detectAllergenes("Huile d'olive");
  assert.deepStrictEqual(result, [], "Huile d'olive → tableau vide");
}

// Cas limites
function testCasLimiteNomVide() {
  assert.deepStrictEqual(detectAllergenes(""), []);
}

function testCasLimiteNull() {
  assert.deepStrictEqual(detectAllergenes(null), []);
}

function testCasLimiteUndefined() {
  assert.deepStrictEqual(detectAllergenes(undefined), []);
}

function testCasLimiteCaracteresSpeciaux() {
  assert.deepStrictEqual(detectAllergenes("!@#$%^"), []);
}

function testNormalisationNull() {
  assert.strictEqual(normalizeIngredientName(null), "");
  assert.strictEqual(normalizeIngredientName(undefined), "");
  assert.strictEqual(normalizeIngredientName(""), "");
}

// Idempotence
function testIdempotence() {
  const r1 = detectAllergenes("Beurre");
  const r2 = detectAllergenes("Beurre");
  assert.deepStrictEqual(r1, r2, "Même résultat appelé deux fois");
}

function testIdempotenceNormalisation() {
  const n1 = normalizeIngredientName("Crème fraîche");
  const n2 = normalizeIngredientName("Crème fraîche");
  assert.strictEqual(n1, n2);
}

// Cumul allergènes sur une recette
function testCumulAllergenesRecette() {
  const noms = ["Beurre", "Farine", "Oeuf"];
  const result = computeAllergenesFromNames(noms);
  assert.ok(result.includes("Lait/Lactose"), "Beurre → Lait/Lactose");
  assert.ok(result.includes("Gluten"), "Farine → Gluten");
  assert.ok(result.includes("Œufs"), "Oeuf → Œufs");
}

function testCumulDeduplication() {
  // Beurre ET Crème → toutes deux Lait/Lactose → une seule fois dans le résultat
  const result = computeAllergenesFromNames(["Beurre", "Creme fraiche"]);
  const laitCount = result.filter((a) => a === "Lait/Lactose").length;
  assert.strictEqual(laitCount, 1, "Lait/Lactose dédupliqué");
}

function testCumulTableauVide() {
  assert.deepStrictEqual(computeAllergenesFromNames([]), []);
}

function testCumulArgInvalide() {
  assert.deepStrictEqual(computeAllergenesFromNames(null), []);
  assert.deepStrictEqual(computeAllergenesFromNames(undefined), []);
}

function testCumulIngredientsSansAllergeneCumule() {
  const result = computeAllergenesFromNames(["Carotte", "Pomme de terre", "Ail"]);
  assert.deepStrictEqual(result, [], "Aucun allergène pour ces ingrédients");
}

// computeRecipeAllergeneSummary
function testSummaryRecetteSansIngredients() {
  const result = computeRecipeAllergeneSummary({ directIngredients: [], baseComponents: [] }, [], []);
  assert.deepStrictEqual(result.allergens, []);
  assert.strictEqual(result.hasIncomplete, false);
}

function testSummaryIngredientAvecAllergenesManuel() {
  // L'ingrédient a des allergènes saisis manuellement → on les utilise directement
  const ingredients = [{ id: 1, name: "Beurre maison", allergenes: ["Lait/Lactose"] }];
  const recipe = { directIngredients: [{ ingredientId: 1, name: "Beurre maison" }], baseComponents: [] };
  const result = computeRecipeAllergeneSummary(recipe, ingredients, []);
  assert.deepStrictEqual(result.allergens, ["Lait/Lactose"]);
  assert.strictEqual(result.hasIncomplete, false);
}

function testSummaryIngredientSansAllergenesManuel() {
  // Pas d'allergènes manuels → détection automatique par le nom
  const ingredients = [{ id: 2, name: "Beurre", allergenes: null }];
  const recipe = { directIngredients: [{ ingredientId: 2, name: "Beurre" }], baseComponents: [] };
  const result = computeRecipeAllergeneSummary(recipe, ingredients, []);
  assert.ok(result.allergens.includes("Lait/Lactose"), "détection auto doit trouver Lait/Lactose pour Beurre");
  assert.strictEqual(result.hasIncomplete, true, "ingrédient sans allergènes manuels = incomplet");
}

function testSummaryAvecRecetteDeBase() {
  // La recette finale contient une recette de base qui a du beurre → allergènes propagés
  const ingredients = [{ id: 3, name: "Beurre", allergenes: ["Lait/Lactose"] }];
  const baseRecipe = { id: 10, name: "Sauce beurre", directIngredients: [{ ingredientId: 3, name: "Beurre" }] };
  const recipe = { directIngredients: [], baseComponents: [{ baseRecipeId: 10 }] };
  const result = computeRecipeAllergeneSummary(recipe, ingredients, [baseRecipe]);
  assert.ok(result.allergens.includes("Lait/Lactose"), "allergènes de la recette de base propagés");
}

function testSummaryIngredientInconnu() {
  // Ingrédient inconnu (pas dans le catalogue) → marqué incomplet
  const recipe = { directIngredients: [{ ingredientId: 99, name: "Herbe mystérieuse" }], baseComponents: [] };
  const result = computeRecipeAllergeneSummary(recipe, [], []);
  assert.strictEqual(result.hasIncomplete, true);
  assert.strictEqual(result.incompleteIngredients.length, 1);
}

// ALLERGENES_14 : vérification du référentiel officiel
function testAllergenes14Complet() {
  const list = window.FormulaAllergenes.ALLERGENES_14;
  assert.strictEqual(list.length, 14, "14 allergènes officiels");
  const expected = ["Gluten", "Crustacés", "Œufs", "Poisson", "Arachides", "Soja",
    "Lait/Lactose", "Fruits à coque", "Céleri", "Moutarde", "Sésame", "Sulfites", "Lupin", "Mollusques"];
  expected.forEach((a) => {
    assert.ok(list.includes(a), `Allergène "${a}" présent`);
  });
}

function runAll() {
  const tests = [
    testNormalisationCasse,
    testNormalisationAccents,
    testNormalisationPlurielOeuf,
    testDetectionBeurre,
    testDetectionCremeFraiche,
    testDetectionOeuf,
    testDetectionFarine,
    testDetectionCrevette,
    testDetectionSaumon,
    testDetectionNoisette,
    testDetectionPluriels,
    testDetectionBeurres,
    testIngredientInconnu,
    testIngredientSansAllergeneDeclare,
    testIngredientHuileOlive,
    testCasLimiteNomVide,
    testCasLimiteNull,
    testCasLimiteUndefined,
    testCasLimiteCaracteresSpeciaux,
    testNormalisationNull,
    testIdempotence,
    testIdempotenceNormalisation,
    testCumulAllergenesRecette,
    testCumulDeduplication,
    testCumulTableauVide,
    testCumulArgInvalide,
    testCumulIngredientsSansAllergeneCumule,
    testAllergenes14Complet,
    testSummaryRecetteSansIngredients,
    testSummaryIngredientAvecAllergenesManuel,
    testSummaryIngredientSansAllergenesManuel,
    testSummaryAvecRecetteDeBase,
    testSummaryIngredientInconnu,
  ];

  for (const testFn of tests) {
    testFn();
    console.log("PASS " + testFn.name);
  }
  console.log("\nTous les tests allergenes passent.");
}

runAll();
