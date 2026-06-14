const fs = require('fs');
const assert = require('assert');

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, 'utf8'));
}

loadScript('logic/core/data-status.js');

const {
  countByType,
  getLastBackupTimestamp,
  estimateStorageBytes,
  formatBytes,
  formatBackupTimestamp,
  buildDataStatus,
} = window.FormulaDataStatus;

function testCountByTypeRepartit() {
  const datasets = {
    ingredients: [{ id: 1 }, { id: 2 }, { id: 3 }],
    recipes: [
      { id: 10, recipeType: 'base' },
      { id: 11, recipeType: 'base' },
      { id: 12, recipeType: 'final' },
    ],
    suppliers: [{ id: 100 }],
  };
  const counts = countByType(datasets);
  assert.strictEqual(counts.ingredients, 3);
  assert.strictEqual(counts.baseRecipes, 2);
  assert.strictEqual(counts.finalRecipes, 1);
  assert.strictEqual(counts.suppliers, 1);
}

function testCountByTypeRecetteSansTypeCompteCommeBase() {
  // Reproduit le fallback de normalizeRecipe : recipeType absent → "base".
  const datasets = { recipes: [{ id: 1 }, { id: 2, recipeType: 'final' }] };
  const counts = countByType(datasets);
  assert.strictEqual(counts.baseRecipes, 1);
  assert.strictEqual(counts.finalRecipes, 1);
}

function testCountByTypeDatasetsVides() {
  const counts = countByType({});
  assert.strictEqual(counts.ingredients, 0);
  assert.strictEqual(counts.baseRecipes, 0);
  assert.strictEqual(counts.finalRecipes, 0);
  assert.strictEqual(counts.suppliers, 0);
}

function testCountByTypeDatasetsNull() {
  const counts = countByType(null);
  assert.strictEqual(counts.ingredients, 0);
  assert.strictEqual(counts.baseRecipes, 0);
  assert.strictEqual(counts.finalRecipes, 0);
  assert.strictEqual(counts.suppliers, 0);
}

function testCountByTypeChampsNonTableauxIgnoreSilencieusement() {
  const counts = countByType({ ingredients: "pasUnTableau", recipes: null, suppliers: 42 });
  assert.strictEqual(counts.ingredients, 0);
  assert.strictEqual(counts.baseRecipes, 0);
  assert.strictEqual(counts.finalRecipes, 0);
  assert.strictEqual(counts.suppliers, 0);
}

function testGetLastBackupTimestampValide() {
  const backup = { version: 1, timestamp: '2026-06-12T14:32:10.000Z', data: {} };
  const ts = getLastBackupTimestamp(backup);
  assert.strictEqual(ts, '2026-06-12T14:32:10.000Z');
}

function testGetLastBackupTimestampNull() {
  assert.strictEqual(getLastBackupTimestamp(null), null);
}

function testGetLastBackupTimestampObjetSansTimestamp() {
  assert.strictEqual(getLastBackupTimestamp({ version: 1 }), null);
}

function testGetLastBackupTimestampVide() {
  assert.strictEqual(getLastBackupTimestamp({ timestamp: '   ' }), null);
}

function testGetLastBackupTimestampInvalide() {
  assert.strictEqual(getLastBackupTimestamp({ timestamp: 'pas-une-date' }), null);
}

function testEstimateStorageBytesCalculUTF16() {
  // "ab"=2 chars + "xyz"=3 chars = 5 chars * 2 (UTF-16) = 10 octets.
  const bytes = estimateStorageBytes({ ab: 'xyz' });
  assert.strictEqual(bytes, 10);
}

function testEstimateStorageBytesValeursMultiples() {
  const bytes = estimateStorageBytes({ a: '12', bb: '345' });
  // "a" (1) + "12" (2) + "bb" (2) + "345" (3) = 8 chars * 2 = 16.
  assert.strictEqual(bytes, 16);
}

function testEstimateStorageBytesVide() {
  assert.strictEqual(estimateStorageBytes({}), 0);
}

function testEstimateStorageBytesNull() {
  assert.strictEqual(estimateStorageBytes(null), 0);
}

function testEstimateStorageBytesValeurNulleNeCompteQueLaCle() {
  const bytes = estimateStorageBytes({ abc: null });
  // "abc" (3) + null (0) = 3 chars * 2 = 6.
  assert.strictEqual(bytes, 6);
}

function testFormatBytesOctets() {
  assert.strictEqual(formatBytes(500), '500 o');
}

function testFormatBytesKo() {
  // 1500 / 1024 ≈ 1.46 → toFixed(1) = "1.5"
  assert.strictEqual(formatBytes(1500), '1.5 Ko');
}

function testFormatBytesMo() {
  // 1_500_000 / 1_048_576 ≈ 1.43 → toFixed(2) = "1.43"
  assert.strictEqual(formatBytes(1500000), '1.43 Mo');
}

function testFormatBytesZero() {
  assert.strictEqual(formatBytes(0), '0 o');
}

function testFormatBytesValeurInvalide() {
  assert.strictEqual(formatBytes('abc'), '0 o');
  assert.strictEqual(formatBytes(null), '0 o');
  assert.strictEqual(formatBytes(-10), '0 o');
}

function testFormatBackupTimestampFormatFrancais() {
  // On vérifie le format général (regex) car l'heure locale dépend du fuseau
  // de la machine — pas de comparaison stricte de l'heure ici.
  const label = formatBackupTimestamp('2026-06-12T14:32:10.000Z');
  assert.ok(/^\d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/.test(label), `Format inattendu: ${label}`);
}

function testFormatBackupTimestampNullRetourneAucune() {
  assert.strictEqual(formatBackupTimestamp(null), 'Aucune');
}

function testFormatBackupTimestampInvalideRetourneAucune() {
  assert.strictEqual(formatBackupTimestamp('pas-une-date'), 'Aucune');
}

function testFormatBackupTimestampVideRetourneAucune() {
  assert.strictEqual(formatBackupTimestamp(''), 'Aucune');
}

function testBuildDataStatusAgregatComplet() {
  const status = buildDataStatus({
    datasets: {
      ingredients: [{}, {}],
      recipes: [{ recipeType: 'base' }, { recipeType: 'final' }],
      suppliers: [{}],
    },
    safetyBackup: { timestamp: '2026-06-12T14:32:10.000Z' },
    storageEntries: { ab: 'xyz' },
  });
  assert.strictEqual(status.counts.ingredients, 2);
  assert.strictEqual(status.counts.baseRecipes, 1);
  assert.strictEqual(status.counts.finalRecipes, 1);
  assert.strictEqual(status.counts.suppliers, 1);
  assert.strictEqual(status.lastBackupAt, '2026-06-12T14:32:10.000Z');
  assert.ok(/^\d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/.test(status.lastBackupLabel));
  assert.strictEqual(status.storageBytes, 10);
  assert.strictEqual(status.storageLabel, '10 o');
}

function testBuildDataStatusSansSauvegardeNiDonnees() {
  const status = buildDataStatus({});
  assert.strictEqual(status.counts.ingredients, 0);
  assert.strictEqual(status.lastBackupAt, null);
  assert.strictEqual(status.lastBackupLabel, 'Aucune');
  assert.strictEqual(status.storageBytes, 0);
  assert.strictEqual(status.storageLabel, '0 o');
}

function runAll() {
  const tests = [
    testCountByTypeRepartit,
    testCountByTypeRecetteSansTypeCompteCommeBase,
    testCountByTypeDatasetsVides,
    testCountByTypeDatasetsNull,
    testCountByTypeChampsNonTableauxIgnoreSilencieusement,
    testGetLastBackupTimestampValide,
    testGetLastBackupTimestampNull,
    testGetLastBackupTimestampObjetSansTimestamp,
    testGetLastBackupTimestampVide,
    testGetLastBackupTimestampInvalide,
    testEstimateStorageBytesCalculUTF16,
    testEstimateStorageBytesValeursMultiples,
    testEstimateStorageBytesVide,
    testEstimateStorageBytesNull,
    testEstimateStorageBytesValeurNulleNeCompteQueLaCle,
    testFormatBytesOctets,
    testFormatBytesKo,
    testFormatBytesMo,
    testFormatBytesZero,
    testFormatBytesValeurInvalide,
    testFormatBackupTimestampFormatFrancais,
    testFormatBackupTimestampNullRetourneAucune,
    testFormatBackupTimestampInvalideRetourneAucune,
    testFormatBackupTimestampVideRetourneAucune,
    testBuildDataStatusAgregatComplet,
    testBuildDataStatusSansSauvegardeNiDonnees,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
