const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/costs-and-units.js");
loadScript("logic/core/recipe-printing.js");

const PRINT = global.FormulaRecipePrinting;

// ─── Helpers de construction ─────────────────────────────────────────────────

function makeBase(id, name, opts) {
  const o = opts || {};
  return {
    id: id,
    name: name,
    recipeType: "base",
    categories: ["X"],
    outputQuantity: o.outputQuantity != null ? o.outputQuantity : 1,
    outputUnit: o.outputUnit || "Kg",
    covers: o.covers != null ? o.covers : 1,
    procedure: o.procedure || "",
    directIngredients: o.directIngredients || [],
    baseComponents: o.baseComponents || [],
    wasteCoeff: 0,
  };
}

function ingLine(id, name, quantity, unit, pricePerUnit) {
  return {
    ingredientId: id,
    name: name,
    quantity: quantity,
    unit: unit,
    unitPrice: unit,
    pricePerUnit: pricePerUnit != null ? pricePerUnit : 10,
    wasteCoeff: 0,
  };
}

function baseRef(id, name, quantity, unit) {
  return { baseRecipeId: id, name: name, quantity: quantity, unit: unit, usageMode: "quantity" };
}

// ─── Structure du module ─────────────────────────────────────────────────────

function testModuleExpose() {
  assert.ok(PRINT, "FormulaRecipePrinting doit être exposé");
  assert.strictEqual(typeof PRINT.computeLocalMultiplier, "function");
  assert.strictEqual(typeof PRINT.collectRecipeUsages, "function");
  assert.strictEqual(typeof PRINT.buildPrintableRecipeBlock, "function");
  assert.strictEqual(typeof PRINT.buildAllPrintableBlocks, "function");
}

// ─── computeLocalMultiplier ──────────────────────────────────────────────────

function testMultiplierQuantite() {
  // Sous-recette qui produit 200g, on en utilise 50g → multiplier = 0.25
  const sub = makeBase(10, "Insert", { outputQuantity: 200, outputUnit: "Gramme" });
  const comp = baseRef(10, "Insert", 50, "Gramme");
  const m = PRINT.computeLocalMultiplier(comp, sub);
  assert.strictEqual(m, 0.25);
}

function testMultiplierPortion() {
  // Sous-recette pour 4 couverts, on en utilise 2 portions → multiplier = 0.5
  const sub = makeBase(20, "Mousse", { covers: 4 });
  const comp = { baseRecipeId: 20, name: "Mousse", usageMode: "portion", portionCount: 2 };
  const m = PRINT.computeLocalMultiplier(comp, sub);
  assert.strictEqual(m, 0.5);
}

function testMultiplierQuantiteUnitesConvertibles() {
  // Sous-recette produit 1 Kg, on utilise 250g → multiplier = 0.25
  const sub = makeBase(30, "Sauce", { outputQuantity: 1, outputUnit: "Kg" });
  const comp = baseRef(30, "Sauce", 250, "Gramme");
  const m = PRINT.computeLocalMultiplier(comp, sub);
  assert.strictEqual(m, 0.25);
}

function testMultiplierNullSiDonneesIncompletes() {
  assert.strictEqual(PRINT.computeLocalMultiplier(null, null), null);
  assert.strictEqual(PRINT.computeLocalMultiplier({}, null), null);
  // Unités incompatibles : composant en Gramme, sous-recette en Pièce → conversion impossible → null
  const sub = makeBase(10, "X", { outputQuantity: 1, outputUnit: "Pièce" });
  const comp = baseRef(10, "X", 50, "Gramme");
  assert.strictEqual(PRINT.computeLocalMultiplier(comp, sub), null);
}

// ─── collectRecipeUsages ─────────────────────────────────────────────────────

function testCollectRecipeUsagesSeule() {
  // Recette sans sous-recette → topologicalOrder = [root], multiplier = 1
  const root = makeBase(1, "Solo", { directIngredients: [ingLine(1, "A", 100, "Gramme")] });
  const { totalMultipliers, topologicalOrder } = PRINT.collectRecipeUsages(root, [root], 1);
  assert.strictEqual(topologicalOrder.length, 1);
  assert.strictEqual(topologicalOrder[0].id, 1);
  assert.strictEqual(totalMultipliers.get(1), 1);
}

function testCollectRecipeUsagesDeuxNiveaux() {
  // Biscuit (id=1) utilise 50g d'Insert (id=2, produit 200g) → multiplier Insert = 0.25
  // Ordre topologique attendu : [Insert, Biscuit]
  const insert = makeBase(2, "Insert", {
    outputQuantity: 200,
    outputUnit: "Gramme",
    directIngredients: [ingLine(1, "Pistache", 200, "Gramme")],
  });
  const biscuit = makeBase(1, "Biscuit", {
    outputQuantity: 500,
    outputUnit: "Gramme",
    directIngredients: [ingLine(2, "Farine", 250, "Gramme")],
    baseComponents: [baseRef(2, "Insert", 50, "Gramme")],
  });
  const all = [biscuit, insert];

  const { totalMultipliers, topologicalOrder } = PRINT.collectRecipeUsages(biscuit, all, 1);
  assert.strictEqual(topologicalOrder.length, 2);
  assert.strictEqual(topologicalOrder[0].id, 2, "Insert doit être en premier (feuille)");
  assert.strictEqual(topologicalOrder[1].id, 1, "Biscuit doit être en dernier (racine)");
  assert.strictEqual(totalMultipliers.get(1), 1);
  assert.strictEqual(totalMultipliers.get(2), 0.25);
}

function testCollectRecipeUsagesTroisNiveaux() {
  // Praliné (id=3, produit 100g) — Insert (id=2, produit 200g, utilise 30g de praliné)
  //                              — Biscuit (id=1, utilise 50g d'insert)
  // Multipliers :
  //   Biscuit = 1
  //   Insert = 50/200 = 0.25
  //   Praliné via Insert = 0.25 × 30/100 = 0.075
  const praline = makeBase(3, "Praline", { outputQuantity: 100, outputUnit: "Gramme" });
  const insert = makeBase(2, "Insert", {
    outputQuantity: 200,
    outputUnit: "Gramme",
    baseComponents: [baseRef(3, "Praline", 30, "Gramme")],
  });
  const biscuit = makeBase(1, "Biscuit", {
    baseComponents: [baseRef(2, "Insert", 50, "Gramme")],
  });
  const all = [biscuit, insert, praline];

  const { totalMultipliers, topologicalOrder } = PRINT.collectRecipeUsages(biscuit, all, 1);
  assert.strictEqual(topologicalOrder.length, 3);
  assert.strictEqual(topologicalOrder[0].id, 3, "Praliné en premier");
  assert.strictEqual(topologicalOrder[1].id, 2, "Insert en deuxième");
  assert.strictEqual(topologicalOrder[2].id, 1, "Biscuit en dernier");
  assert.strictEqual(totalMultipliers.get(1), 1);
  assert.strictEqual(totalMultipliers.get(2), 0.25);
  // 0.25 × 0.3 = 0.075 (avec une tolérance pour le flottant)
  assert.ok(Math.abs(totalMultipliers.get(3) - 0.075) < 1e-9);
}

function testCollectRecipeUsagesSousRecetteUtiliseeDeuxFois() {
  // Entremets utilise Mousse (30g de praliné) ET Glaçage (20g de praliné)
  // Praliné produit 100g, donc :
  //   - Multiplier praliné via Mousse = M_mousse × 0.3
  //   - Multiplier praliné via Glaçage = M_glaçage × 0.2
  //   - Total praliné = M_mousse × 0.3 + M_glaçage × 0.2
  // Pour Mousse et Glaçage : on dit qu'ils produisent 1Kg et que l'entremets en utilise 1Kg → M=1 pour les deux
  // Donc total praliné = 1 × 0.3 + 1 × 0.2 = 0.5
  const praline = makeBase(3, "Praline", { outputQuantity: 100, outputUnit: "Gramme" });
  const mousse = makeBase(4, "Mousse", {
    outputQuantity: 1,
    outputUnit: "Kg",
    baseComponents: [baseRef(3, "Praline", 30, "Gramme")],
  });
  const glacage = makeBase(5, "Glaçage", {
    outputQuantity: 1,
    outputUnit: "Kg",
    baseComponents: [baseRef(3, "Praline", 20, "Gramme")],
  });
  const entremets = makeBase(1, "Entremets", {
    baseComponents: [baseRef(4, "Mousse", 1, "Kg"), baseRef(5, "Glaçage", 1, "Kg")],
  });
  const all = [entremets, mousse, glacage, praline];

  const { totalMultipliers, topologicalOrder } = PRINT.collectRecipeUsages(entremets, all, 1);
  // Ordre attendu : Praliné en premier (descendant des 2 branches), puis Mousse, puis Glaçage, puis Entremets
  assert.strictEqual(topologicalOrder.length, 4);
  // Le praliné doit apparaître AVANT mousse et glaçage
  const praliIdx = topologicalOrder.findIndex((r) => r.id === 3);
  const mousseIdx = topologicalOrder.findIndex((r) => r.id === 4);
  const glacageIdx = topologicalOrder.findIndex((r) => r.id === 5);
  const entremetsIdx = topologicalOrder.findIndex((r) => r.id === 1);
  assert.ok(praliIdx < mousseIdx, "Praline avant Mousse");
  assert.ok(praliIdx < glacageIdx, "Praline avant Glaçage");
  assert.ok(mousseIdx < entremetsIdx, "Mousse avant Entremets");
  assert.ok(glacageIdx < entremetsIdx, "Glaçage avant Entremets");

  // Total multiplier praliné = 0.3 + 0.2 = 0.5 (cumul des deux usages)
  assert.ok(Math.abs(totalMultipliers.get(3) - 0.5) < 1e-9, `praliné cumulé doit être 0.5, reçu ${totalMultipliers.get(3)}`);
}

function testCollectRecipeUsagesAntiCycleNePlanrtePas() {
  // Référentiel corrompu : A → B → A. Le calcul doit terminer sans boucle infinie.
  const a = makeBase(1, "A", { baseComponents: [baseRef(2, "B", 50, "Gramme")] });
  const b = makeBase(2, "B", { outputQuantity: 100, outputUnit: "Gramme", baseComponents: [baseRef(1, "A", 30, "Gramme")] });
  const all = [a, b];

  assert.doesNotThrow(() => PRINT.collectRecipeUsages(a, all, 1));
  const { topologicalOrder } = PRINT.collectRecipeUsages(a, all, 1);
  // L'algo termine et A et B sont listés (1 fois chacun)
  assert.ok(topologicalOrder.length >= 1 && topologicalOrder.length <= 2);
}

function testCollectRecipeUsagesRootMultiplierPersonnalise() {
  // Si on imprime la version "adaptée x2", la racine a multiplier 2
  const root = makeBase(1, "Solo");
  const { totalMultipliers } = PRINT.collectRecipeUsages(root, [root], 2);
  assert.strictEqual(totalMultipliers.get(1), 2);
}

// ─── buildPrintableRecipeBlock ───────────────────────────────────────────────

function testBlockContientNomEtSections() {
  const recipe = makeBase(1, "Test recette", {
    directIngredients: [ingLine(1, "Farine", 100, "Gramme", 5)],
    procedure: "Mélanger",
  });
  const html = PRINT.buildPrintableRecipeBlock({
    recipe: recipe,
    multiplier: 1,
    isChef: true,
    ingredients: [{ id: 1, name: "Farine", unit: "Gramme", price: 5 }],
  });
  assert.ok(html.includes("Test recette"));
  assert.ok(html.includes("Ingrédients"));
  assert.ok(html.includes("Procédé"));
  assert.ok(html.includes("Farine"));
  assert.ok(html.includes("Mélanger"));
}

function testBlockSousRecettesAvantIngredientsDirects() {
  const recipe = makeBase(1, "Composée", {
    directIngredients: [ingLine(1, "Farine", 100, "Gramme")],
    baseComponents: [baseRef(99, "Sous-recette", 50, "Gramme")],
  });
  const html = PRINT.buildPrintableRecipeBlock({
    recipe: recipe,
    multiplier: 1,
    isChef: false,
  });
  const subIdx = html.indexOf("Sous-recette");
  const farineIdx = html.indexOf("Farine");
  assert.ok(subIdx > 0 && farineIdx > 0, "Les deux doivent apparaître");
  assert.ok(subIdx < farineIdx, "Sous-recette doit apparaître AVANT Farine (ordre de production)");
}

function testBlockReferenceSousRecetteSansCoutDedie() {
  const recipe = makeBase(1, "Test", {
    baseComponents: [baseRef(99, "Insert", 50, "Gramme")],
  });
  const html = PRINT.buildPrintableRecipeBlock({
    recipe: recipe,
    multiplier: 1,
    isChef: true,
  });
  // La ligne sous-recette ne doit pas avoir un coût numérique mais "voir bloc dédié"
  assert.ok(html.includes("voir bloc dédié"), "La référence à la sous-recette doit indiquer 'voir bloc dédié'");
}

function testBlockMultiplierAdapteLesQuantites() {
  const recipe = makeBase(1, "Test", {
    directIngredients: [ingLine(1, "Farine", 100, "Gramme", 5)],
  });
  const html = PRINT.buildPrintableRecipeBlock({
    recipe: recipe,
    multiplier: 0.5,
    isChef: false,
  });
  // 100 × 0.5 = 50.00
  assert.ok(html.includes("50.00"), "La quantité doit être multipliée (100 × 0.5 = 50)");
}

function testBlockSansChefPasDeColonneCout() {
  const recipe = makeBase(1, "Test", { directIngredients: [ingLine(1, "Farine", 100, "Gramme")] });
  const htmlChef = PRINT.buildPrintableRecipeBlock({ recipe: recipe, multiplier: 1, isChef: true });
  const htmlEmploye = PRINT.buildPrintableRecipeBlock({ recipe: recipe, multiplier: 1, isChef: false });
  assert.ok(htmlChef.includes("Coût"), "Mode chef doit contenir colonne Coût");
  assert.ok(!htmlEmploye.includes(">Coût<"), "Mode employé ne doit PAS contenir d'en-tête Coût");
}

function testBlockVideAfficheMessage() {
  const recipe = makeBase(1, "Vide");
  const html = PRINT.buildPrintableRecipeBlock({ recipe: recipe, multiplier: 1, isChef: false });
  assert.ok(html.includes("Aucun ingrédient"));
}

// ─── buildAllPrintableBlocks ─────────────────────────────────────────────────

function testBuildAllBlocksOrdreTopologique() {
  const insert = makeBase(2, "Insert", {
    outputQuantity: 200,
    outputUnit: "Gramme",
    directIngredients: [ingLine(1, "Pistache", 200, "Gramme")],
  });
  const biscuit = makeBase(1, "Biscuit", {
    directIngredients: [ingLine(2, "Farine", 250, "Gramme")],
    baseComponents: [baseRef(2, "Insert", 50, "Gramme")],
  });
  const html = PRINT.buildAllPrintableBlocks({
    rootRecipe: biscuit,
    rootMultiplier: 1,
    allRecipes: [biscuit, insert],
    ingredients: [],
    isChef: false,
  });
  const insertIdx = html.indexOf(">Insert</h2>");
  const biscuitIdx = html.indexOf(">Biscuit</h2>");
  assert.ok(insertIdx > 0, "Insert doit apparaître");
  assert.ok(biscuitIdx > 0, "Biscuit doit apparaître");
  assert.ok(insertIdx < biscuitIdx, "Insert (feuille) doit apparaître AVANT Biscuit (racine)");
}

function testBuildAllBlocksSansRoot() {
  const html = PRINT.buildAllPrintableBlocks({ rootRecipe: null, allRecipes: [] });
  assert.strictEqual(html, "");
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testModuleExpose,
    testMultiplierQuantite,
    testMultiplierPortion,
    testMultiplierQuantiteUnitesConvertibles,
    testMultiplierNullSiDonneesIncompletes,
    testCollectRecipeUsagesSeule,
    testCollectRecipeUsagesDeuxNiveaux,
    testCollectRecipeUsagesTroisNiveaux,
    testCollectRecipeUsagesSousRecetteUtiliseeDeuxFois,
    testCollectRecipeUsagesAntiCycleNePlanrtePas,
    testCollectRecipeUsagesRootMultiplierPersonnalise,
    testBlockContientNomEtSections,
    testBlockSousRecettesAvantIngredientsDirects,
    testBlockReferenceSousRecetteSansCoutDedie,
    testBlockMultiplierAdapteLesQuantites,
    testBlockSansChefPasDeColonneCout,
    testBlockVideAfficheMessage,
    testBuildAllBlocksOrdreTopologique,
    testBuildAllBlocksSansRoot,
  ];

  for (const testFn of tests) {
    testFn();
    console.log("PASS " + testFn.name);
  }
}

runAll();
