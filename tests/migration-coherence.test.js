const fs = require('fs');
const assert = require('assert');

global.window = global;

function loadScript(path) {
  const code = fs.readFileSync(path, 'utf8');
  eval(code);
}

class MemoryStorage {
  constructor(initial = {}) {
    this.data = { ...initial };
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  removeItem(key) {
    delete this.data[key];
  }
}

loadScript('models/schema.js');
loadScript('logic/migration/legacy-to-v1.js');
loadScript('logic/migration/report.js');
loadScript('logic/migration/versioned-storage.js');
loadScript('logic/migration/parallel-read.js');
loadScript('logic/runtime/data-source.js');

function runMigration(legacy) {
  const migrationResult = window.FormulaLegacyMigration.migrateLegacyData(legacy);
  const shadowReport = window.FormulaMigrationReport.buildMigrationReport(migrationResult);
  return { migrationResult, shadowReport };
}

function testMigrationSimpleValide() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 10, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };

  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const persistResult = window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });

  assert.strictEqual(persistResult.status, 'written');
  assert.ok(persistResult.writtenKeys.includes('arpege_v1_ingredients'));
}

function testReferenceIngredientManquante() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 11, recipeType: 'final', categories: ['Plat'], name: 'Final', covers: 2, outputQuantity: 2, outputUnit: 'Portion', directIngredients: [{ ingredientId: 999, quantity: 1, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const persistResult = window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });

  assert.strictEqual(persistResult.status, 'not_written');
  assert.ok(persistResult.decision.blockingWarnings.some((w) => w.type === 'MISSING_INGREDIENT_REFERENCE'));
}

function testReferenceSousRecetteManquante() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 12, recipeType: 'final', categories: ['Plat'], name: 'Final', covers: 2, outputQuantity: 2, outputUnit: 'Portion', directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg' }], baseComponents: [{ baseRecipeId: 404, quantity: 1, unit: 'Kg' }] }],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const persistResult = window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });

  assert.strictEqual(persistResult.status, 'not_written');
  assert.ok(persistResult.decision.blockingWarnings.some((w) => w.type === 'MISSING_BASE_RECIPE_REFERENCE'));
}

function testCycleDetecte() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [
      { id: 20, recipeType: 'base', categories: ['Plat'], name: 'A', covers: 1, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg' }], baseComponents: [{ baseRecipeId: 21, quantity: 1, unit: 'Kg' }] },
      { id: 21, recipeType: 'final', categories: ['Plat'], name: 'B', covers: 1, outputQuantity: 1, outputUnit: 'Portion', directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg' }], baseComponents: [{ baseRecipeId: 20, quantity: 1, unit: 'Kg' }] },
    ],
  };
  const { migrationResult } = runMigration(legacy);

  assert.ok(migrationResult.report.errors.some((e) => e.type === 'RECIPE_CYCLE_DETECTED'));
}

function testLigneInvalideExclue() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 30, recipeType: 'base', categories: ['Plat'], name: 'A', covers: 1, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 'abc', unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);

  assert.strictEqual(migrationResult.lignesRecetteIngredient.length, 0);
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'DIRECT_INGREDIENT_LINE_EXCLUDED'));
}

function testFallbackExpliciteApplique() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 40, recipeType: 'final', categories: [], name: 'A', covers: 0, outputQuantity: null, outputUnit: '', directIngredients: [{ ingredientId: 1, quantity: 1, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);

  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'RENDEMENT_FALLBACK_APPLIED'));
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'FINAL_COVERS_FORCED'));
}

function testIngredientSansPrixConserveAvecWarning() {
  const legacy = {
    ingredients: [{ id: 2, category: 'Épicerie', name: 'Épice', price: '', unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 41, recipeType: 'base', categories: ['Plat'], name: 'A', covers: 1, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 2, quantity: 1, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);
  assert.strictEqual(migrationResult.ingredients.length, 1);
  assert.strictEqual(migrationResult.ingredients[0].prix_achat, null);
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'INGREDIENT_PRICE_MISSING'));
  assert.ok(!migrationResult.report.errors.some((e) => e.type === 'INGREDIENT_EXCLUDED_INVALID_PRICE'));
}

function testV1Absente() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const v1Data = window.FormulaParallelRead.readV1Data(storage);
  const report = window.FormulaParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

  assert.strictEqual(report.status, 'v1_absent');
  assert.strictEqual(report.coherent, false);
}

function testV1PresenteEtCoherente() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 10, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });

  const v1Data = window.FormulaParallelRead.readV1Data(storage);
  const report = window.FormulaParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

  assert.strictEqual(report.status, 'coherent');
  assert.strictEqual(report.coherent, true);
}

function testV1PresenteMaisIncoherente() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 10, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });

  storage.setItem(window.FormulaVersionedStorage.TARGET_KEYS.ingredients, JSON.stringify([]));

  const v1Data = window.FormulaParallelRead.readV1Data(storage);
  const report = window.FormulaParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

  assert.strictEqual(report.status, 'not_coherent');
  assert.ok(report.discrepancies.some((d) => d.type === 'COUNT_MISMATCH'));
}

function testFeatureFlagDesactiveParDefaut() {
  const storage = new MemoryStorage();
  const flags = window.FormulaParallelRead.getFeatureFlags(storage);
  assert.strictEqual(flags.readV1Enabled, false);
}

function testFeatureFlagActiveSansImpactVisible() {
  const storage = new MemoryStorage({
    [window.FormulaParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const flags = window.FormulaParallelRead.getFeatureFlags(storage);
  assert.strictEqual(flags.readV1Enabled, true);
}

function testCanaryFlagOffLegacyOnly() {
  const legacyIngredients = [{ supplier: 'Primeur' }];
  const result = window.FormulaParallelRead.resolveCanarySuppliersSource({
    legacyIngredients,
    v1Data: { exists: true, data: { fournisseurs: [{ nom: 'V1 Fournisseur' }] } },
    featureFlags: { readV1Enabled: false },
    switchReadiness: { ready: true },
    crossCheckReport: { severity: 'info' },
  });

  assert.strictEqual(result.canaryActive, false);
  assert.strictEqual(result.source, 'legacy');
  assert.deepStrictEqual(result.suppliers, ['Primeur']);
}

function testCanaryFlagOnV1Coherente() {
  const legacyIngredients = [{ supplier: 'Primeur' }];
  const result = window.FormulaParallelRead.resolveCanarySuppliersSource({
    legacyIngredients,
    v1Data: { exists: true, data: { fournisseurs: [{ nom: 'V1 Fournisseur' }] } },
    featureFlags: { readV1Enabled: true },
    switchReadiness: { ready: true },
    crossCheckReport: { severity: 'info' },
  });

  assert.strictEqual(result.canaryActive, true);
  assert.strictEqual(result.source, 'v1_canary');
  assert.deepStrictEqual(result.suppliers, ['V1 Fournisseur']);
}

function testCanaryFlagOnV1AbsenteFallbackLegacy() {
  const legacyIngredients = [{ supplier: 'Primeur' }];
  const result = window.FormulaParallelRead.resolveCanarySuppliersSource({
    legacyIngredients,
    v1Data: { exists: false, data: {} },
    featureFlags: { readV1Enabled: true },
    switchReadiness: { ready: true },
    crossCheckReport: { severity: 'info' },
  });

  assert.strictEqual(result.canaryActive, false);
  assert.strictEqual(result.source, 'legacy');
  assert.strictEqual(result.reason, 'V1_ABSENT');
}

function testCanaryFlagOnV1IncoherenteFallbackLegacy() {
  const legacyIngredients = [{ supplier: 'Primeur' }];
  const result = window.FormulaParallelRead.resolveCanarySuppliersSource({
    legacyIngredients,
    v1Data: { exists: true, data: { fournisseurs: [{ nom: 'V1 Fournisseur' }] } },
    featureFlags: { readV1Enabled: true },
    switchReadiness: { ready: false },
    crossCheckReport: { severity: 'high' },
  });

  assert.strictEqual(result.canaryActive, false);
  assert.strictEqual(result.source, 'legacy');
}

function testCanarySansImpactEcritureExistante() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 10, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage({
    [window.FormulaParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const persistResult = window.FormulaVersionedStorage.persistVersionedData({ migrationResult, storage });
  assert.strictEqual(persistResult.status, 'written');
  assert.ok(persistResult.writtenKeys.includes(window.FormulaVersionedStorage.TARGET_KEYS.ingredients));
}

function testRuntimeSourceLegacyParDefaut() {
  const storage = new MemoryStorage();
  const runtime = window.FormulaRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients: [{ supplier: 'Primeur' }],
    storage,
    crossCheckReport: null,
    switchReadiness: { ready: false },
  });

  assert.strictEqual(runtime.suppliers.source, 'legacy');
  assert.strictEqual(runtime.suppliers.canaryActive, false);
}

function testRuntimeCanaryAutorise() {
  const storage = new MemoryStorage({
    [window.FormulaParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
    [window.FormulaVersionedStorage.TARGET_KEYS.fournisseurs]: JSON.stringify([{ nom: 'V1 Fournisseur' }]),
    [window.FormulaVersionedStorage.TARGET_KEYS.ingredients]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.recettesBase]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.platsFinals]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesRecetteIngredient]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesPlatSousRecette]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesPlatIngredientDirect]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.schemaVersion]: JSON.stringify(1),
  });

  const runtime = window.FormulaRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients: [{ supplier: 'Primeur' }],
    storage,
    crossCheckReport: { severity: 'info' },
    switchReadiness: { ready: true },
  });

  assert.strictEqual(runtime.suppliers.source, 'v1_canary');
  assert.strictEqual(runtime.suppliers.canaryActive, true);
}

function testRuntimeCanaryRefuseEtFallbackAvecRaison() {
  const storage = new MemoryStorage({
    [window.FormulaParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const runtime = window.FormulaRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients: [{ supplier: 'Primeur' }],
    storage,
    crossCheckReport: { severity: 'high' },
    switchReadiness: { ready: false },
  });

  assert.strictEqual(runtime.suppliers.source, 'legacy');
  assert.strictEqual(runtime.suppliers.reason, 'V1_ABSENT');
}


function testReadLegacyDataJSONCorrompuRetourneSafeEmpty() {
  const storage = new MemoryStorage({
    [window.FormulaVersionedStorage.LEGACY_KEYS.ingredients]: '{bad-json',
    [window.FormulaVersionedStorage.LEGACY_KEYS.recipes]: 'not-json',
  });

  const legacy = window.FormulaVersionedStorage.readLegacyData(storage);
  assert.deepStrictEqual(legacy.ingredients, []);
  assert.deepStrictEqual(legacy.recipes, []);
  assert.ok(legacy.readError);
}

function testReadV1DataJSONCorrompuNeCrashPas() {
  const storage = new MemoryStorage({
    [window.FormulaVersionedStorage.TARGET_KEYS.ingredients]: '{bad-json',
  });

  const v1 = window.FormulaParallelRead.readV1Data(storage);
  assert.strictEqual(v1.exists, true);
  assert.deepStrictEqual(v1.data.ingredients, null);
}

function testChampsLegacyManquantsAppliquentFallbacks() {
  const legacy = {
    ingredients: [{ id: 3, name: 'Sans catégorie ni unité', price: 0 }],
    recipes: [{
      id: 50,
      recipeType: 'base',
      name: 'Recette partielle',
      directIngredients: [{ ingredientId: 3, quantity: 1, unit: 'Kg' }],
      baseComponents: [],
    }],
  };

  const { migrationResult } = runMigration(legacy);
  assert.strictEqual(migrationResult.ingredients[0].famille, 'Non classé');
  assert.strictEqual(migrationResult.ingredients[0].unite_par_defaut, 'Unité');
  assert.strictEqual(migrationResult.ingredients[0].prix_achat, null);
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'EMPTY_UNIT_FALLBACK'));
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'INGREDIENT_PRICE_MISSING'));
}

function testIdsMixtesStringNumberResolventReferences() {
  const legacy = {
    ingredients: [{ id: '7', category: 'Épicerie', name: 'Sel', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{
      id: '70',
      recipeType: 'base',
      categories: ['Plat'],
      name: 'Base sel',
      covers: 2,
      outputQuantity: 1,
      outputUnit: 'Kg',
      directIngredients: [{ ingredientId: '7', quantity: 0.2, unit: 'Kg' }],
      baseComponents: [],
    }],
  };

  const { migrationResult } = runMigration(legacy);
  assert.strictEqual(migrationResult.ingredients[0].id, 7);
  assert.strictEqual(migrationResult.recettesBase[0].id, 70);
  assert.strictEqual(migrationResult.lignesRecetteIngredient[0].ingredient_id, 7);
  assert.ok(!migrationResult.report.warnings.some((w) => w.type === 'MISSING_INGREDIENT_REFERENCE'));
}

function testUnitesInconnuesConserveesAvecWarning() {
  const legacy = {
    ingredients: [{ id: 8, category: 'Épicerie', name: 'Poudre X', price: 4, unit: 'Scoop', supplier: 'Lab' }],
    recipes: [{
      id: 80,
      recipeType: 'base',
      categories: ['Plat'],
      name: 'Base X',
      covers: 2,
      outputQuantity: 1,
      outputUnit: 'Scoop',
      directIngredients: [{ ingredientId: 8, quantity: 1, unit: 'Scoop' }],
      baseComponents: [],
    }],
  };

  const { migrationResult } = runMigration(legacy);
  assert.strictEqual(migrationResult.ingredients[0].unite_par_defaut, 'Scoop');
  assert.ok(migrationResult.report.warnings.some((w) => w.type === 'UNKNOWN_UNIT' && w.unit === 'Scoop'));
}

function testPrixVidesNullZeroVersPrixNullSansErreurBloquante() {
  const legacy = {
    ingredients: [
      { id: 9, category: 'Épicerie', name: 'A', price: '', unit: 'Kg', supplier: 'S1' },
      { id: 10, category: 'Épicerie', name: 'B', price: null, unit: 'Kg', supplier: 'S1' },
      { id: 11, category: 'Épicerie', name: 'C', price: 0, unit: 'Kg', supplier: 'S1' },
    ],
    recipes: [{ id: 90, recipeType: 'base', categories: ['Plat'], name: 'Base', covers: 1, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 9, quantity: 1, unit: 'Kg' }], baseComponents: [] }],
  };

  const { migrationResult } = runMigration(legacy);
  assert.deepStrictEqual(migrationResult.ingredients.map((i) => i.prix_achat), [null, null, null]);
  assert.strictEqual(migrationResult.report.warnings.filter((w) => w.type === 'INGREDIENT_PRICE_MISSING').length, 3);
  assert.ok(!migrationResult.report.errors.some((e) => e.type === 'INGREDIENT_EXCLUDED_INVALID_PRICE'));
}

function testMigrationIdempotente() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 100, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };

  const first = window.FormulaLegacyMigration.migrateLegacyData(legacy);
  const second = window.FormulaLegacyMigration.migrateLegacyData(legacy);
  assert.deepStrictEqual(second, first);
}

function testFournisseursLegacyStringVsObjetModerne() {
  const legacyIngredients = [
    { supplier: 'Primeur' },
    { supplier: ' primeur ' },
    { supplier: 'Boucherie Martin' },
  ];

  const storage = new MemoryStorage({
    [window.FormulaParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
    [window.FormulaVersionedStorage.TARGET_KEYS.fournisseurs]: JSON.stringify([{ nom: 'Fournisseur V1' }]),
    [window.FormulaVersionedStorage.TARGET_KEYS.ingredients]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.recettesBase]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.platsFinals]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesRecetteIngredient]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesPlatSousRecette]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.lignesPlatIngredientDirect]: JSON.stringify([]),
    [window.FormulaVersionedStorage.TARGET_KEYS.schemaVersion]: JSON.stringify(1),
  });

  const legacyRuntime = window.FormulaRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients,
    storage,
    crossCheckReport: { severity: 'info' },
    switchReadiness: { ready: false },
  });
  assert.strictEqual(legacyRuntime.suppliers.source, 'legacy');
  assert.deepStrictEqual(legacyRuntime.suppliers.data, ['Boucherie Martin', 'primeur', 'Primeur']);

  const canaryRuntime = window.FormulaRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients,
    storage,
    crossCheckReport: { severity: 'info' },
    switchReadiness: { ready: true },
  });
  assert.strictEqual(canaryRuntime.suppliers.source, 'v1_canary');
  assert.deepStrictEqual(canaryRuntime.suppliers.data, ['Fournisseur V1']);
}

function runAll() {
  const tests = [
    testMigrationSimpleValide,
    testReferenceIngredientManquante,
    testReferenceSousRecetteManquante,
    testCycleDetecte,
    testLigneInvalideExclue,
    testFallbackExpliciteApplique,
    testIngredientSansPrixConserveAvecWarning,
    testV1Absente,
    testV1PresenteEtCoherente,
    testV1PresenteMaisIncoherente,
    testFeatureFlagDesactiveParDefaut,
    testFeatureFlagActiveSansImpactVisible,
    testCanaryFlagOffLegacyOnly,
    testCanaryFlagOnV1Coherente,
    testCanaryFlagOnV1AbsenteFallbackLegacy,
    testCanaryFlagOnV1IncoherenteFallbackLegacy,
    testCanarySansImpactEcritureExistante,
    testRuntimeSourceLegacyParDefaut,
    testRuntimeCanaryAutorise,
    testRuntimeCanaryRefuseEtFallbackAvecRaison,
    testReadLegacyDataJSONCorrompuRetourneSafeEmpty,
    testReadV1DataJSONCorrompuNeCrashPas,
    testChampsLegacyManquantsAppliquentFallbacks,
    testIdsMixtesStringNumberResolventReferences,
    testUnitesInconnuesConserveesAvecWarning,
    testPrixVidesNullZeroVersPrixNullSansErreurBloquante,
    testMigrationIdempotente,
    testFournisseursLegacyStringVsObjetModerne,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
