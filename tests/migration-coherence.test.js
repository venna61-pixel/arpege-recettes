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
  const migrationResult = window.ArpegeLegacyMigration.migrateLegacyData(legacy);
  const shadowReport = window.ArpegeMigrationReport.buildMigrationReport(migrationResult);
  return { migrationResult, shadowReport };
}

function testMigrationSimpleValide() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [{ id: 10, recipeType: 'base', categories: ['Plat'], name: 'Base tomate', covers: 4, outputQuantity: 1, outputUnit: 'Kg', directIngredients: [{ ingredientId: 1, quantity: 0.5, unit: 'Kg' }], baseComponents: [] }],
  };

  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const persistResult = window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });

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
  const persistResult = window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });

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
  const persistResult = window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });

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

function testV1Absente() {
  const legacy = {
    ingredients: [{ id: 1, category: 'Légumes', name: 'Tomate', price: 2, unit: 'Kg', supplier: 'Primeur' }],
    recipes: [],
  };
  const { migrationResult } = runMigration(legacy);
  const storage = new MemoryStorage();
  const v1Data = window.ArpegeParallelRead.readV1Data(storage);
  const report = window.ArpegeParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

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
  window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });

  const v1Data = window.ArpegeParallelRead.readV1Data(storage);
  const report = window.ArpegeParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

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
  window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });

  storage.setItem(window.ArpegeVersionedStorage.TARGET_KEYS.ingredients, JSON.stringify([]));

  const v1Data = window.ArpegeParallelRead.readV1Data(storage);
  const report = window.ArpegeParallelRead.buildCrossCheckReport({ legacyData: legacy, migrationResult, v1Data });

  assert.strictEqual(report.status, 'not_coherent');
  assert.ok(report.discrepancies.some((d) => d.type === 'COUNT_MISMATCH'));
}

function testFeatureFlagDesactiveParDefaut() {
  const storage = new MemoryStorage();
  const flags = window.ArpegeParallelRead.getFeatureFlags(storage);
  assert.strictEqual(flags.readV1Enabled, false);
}

function testFeatureFlagActiveSansImpactVisible() {
  const storage = new MemoryStorage({
    [window.ArpegeParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const flags = window.ArpegeParallelRead.getFeatureFlags(storage);
  assert.strictEqual(flags.readV1Enabled, true);
}

function testCanaryFlagOffLegacyOnly() {
  const legacyIngredients = [{ supplier: 'Primeur' }];
  const result = window.ArpegeParallelRead.resolveCanarySuppliersSource({
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
  const result = window.ArpegeParallelRead.resolveCanarySuppliersSource({
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
  const result = window.ArpegeParallelRead.resolveCanarySuppliersSource({
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
  const result = window.ArpegeParallelRead.resolveCanarySuppliersSource({
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
    [window.ArpegeParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const persistResult = window.ArpegeVersionedStorage.persistVersionedData({ migrationResult, storage });
  assert.strictEqual(persistResult.status, 'written');
  assert.ok(persistResult.writtenKeys.includes(window.ArpegeVersionedStorage.TARGET_KEYS.ingredients));
}

function testRuntimeSourceLegacyParDefaut() {
  const storage = new MemoryStorage();
  const runtime = window.ArpegeRuntimeDataSource.resolveDataSourcesRuntime({
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
    [window.ArpegeParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
    [window.ArpegeVersionedStorage.TARGET_KEYS.fournisseurs]: JSON.stringify([{ nom: 'V1 Fournisseur' }]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.ingredients]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.recettesBase]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.platsFinals]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.lignesRecetteIngredient]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.lignesPlatSousRecette]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.lignesPlatIngredientDirect]: JSON.stringify([]),
    [window.ArpegeVersionedStorage.TARGET_KEYS.schemaVersion]: JSON.stringify(1),
  });

  const runtime = window.ArpegeRuntimeDataSource.resolveDataSourcesRuntime({
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
    [window.ArpegeParallelRead.FEATURE_FLAGS.READ_V1_ENABLED]: 'true',
  });
  const runtime = window.ArpegeRuntimeDataSource.resolveDataSourcesRuntime({
    legacyIngredients: [{ supplier: 'Primeur' }],
    storage,
    crossCheckReport: { severity: 'high' },
    switchReadiness: { ready: false },
  });

  assert.strictEqual(runtime.suppliers.source, 'legacy');
  assert.strictEqual(runtime.suppliers.reason, 'V1_ABSENT');
}

function runAll() {
  const tests = [
    testMigrationSimpleValide,
    testReferenceIngredientManquante,
    testReferenceSousRecetteManquante,
    testCycleDetecte,
    testLigneInvalideExclue,
    testFallbackExpliciteApplique,
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
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
