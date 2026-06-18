const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/storage-keys.js");
loadScript("logic/core/safety-backup.js");

const SAFETY_KEY = window.FormulaStorageKeys.SAFETY.SAFETY_BACKUP;
const {
  SAFETY_VERSION,
  createSafetyBackup,
  writeSafetyBackup,
  readSafetyBackup,
  hasSafetyBackup,
  clearSafetyBackup,
} = window.FormulaSafetyBackup;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage(initial) {
  const data = { ...(initial || {}) };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _all: () => ({ ...data }),
  };
}

function sampleSnapshot() {
  return {
    ingredients: [{ id: 1, name: "Beurre", price: 10 }],
    recipes: [{ id: 1, name: "Béchamel", recipeType: "base" }],
    suppliers: [{ id: 1, name: "Métro" }],
    prixRecettes: [{ id: "p1", recipeId: 1, prixTTC: 25 }],
  };
}

// ─── Groupe A — Constantes exposées ───────────────────────────────────────────

function testSafetyVersionExpose() {
  assert.strictEqual(typeof SAFETY_VERSION, "number");
  assert.ok(SAFETY_VERSION >= 1);
}

// ─── Groupe B — createSafetyBackup ────────────────────────────────────────────

function testCreateSafetyBackupContientVersion() {
  const backup = createSafetyBackup(sampleSnapshot(), "import");
  assert.strictEqual(backup.version, SAFETY_VERSION);
}

function testCreateSafetyBackupContientTimestampISO() {
  const before = new Date().toISOString();
  const backup = createSafetyBackup(sampleSnapshot(), "import");
  const after = new Date().toISOString();
  assert.ok(typeof backup.timestamp === "string");
  assert.ok(backup.timestamp >= before);
  assert.ok(backup.timestamp <= after);
  // Format ISO 8601 vérifié par construction (toISOString)
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(backup.timestamp));
}

function testCreateSafetyBackupConserveSourceImport() {
  const backup = createSafetyBackup(sampleSnapshot(), "import");
  assert.strictEqual(backup.source, "import");
}

function testCreateSafetyBackupConserveSourceMerge() {
  const backup = createSafetyBackup(sampleSnapshot(), "merge");
  assert.strictEqual(backup.source, "merge");
}

function testCreateSafetyBackupContientLes4DatasetsMetier() {
  const snapshot = sampleSnapshot();
  const backup = createSafetyBackup(snapshot, "import");
  assert.deepStrictEqual(backup.data.ingredients, snapshot.ingredients);
  assert.deepStrictEqual(backup.data.recipes, snapshot.recipes);
  assert.deepStrictEqual(backup.data.suppliers, snapshot.suppliers);
  assert.deepStrictEqual(backup.data.prixRecettes, snapshot.prixRecettes);
}

function testCreateSafetyBackupGereDatasetsManquants() {
  // Si un dataset est absent, on stocke un tableau vide (pas d'undefined)
  const backup = createSafetyBackup({ ingredients: [{ id: 1 }] }, "import");
  assert.deepStrictEqual(backup.data.ingredients, [{ id: 1 }]);
  assert.deepStrictEqual(backup.data.recipes, []);
  assert.deepStrictEqual(backup.data.suppliers, []);
  assert.deepStrictEqual(backup.data.prixRecettes, []);
}

// ─── Groupe C — writeSafetyBackup ─────────────────────────────────────────────

function testWriteSafetyBackupStockeSousLaCleAttendue() {
  const storage = makeStorage();
  const backup = createSafetyBackup(sampleSnapshot(), "import");
  writeSafetyBackup(backup, storage);
  const raw = storage.getItem(SAFETY_KEY);
  assert.ok(raw, "rien n'a été écrit sous SAFETY_KEY");
  const parsed = JSON.parse(raw);
  assert.strictEqual(parsed.version, SAFETY_VERSION);
}

function testWriteSafetyBackupEcraseLePrecedent() {
  const storage = makeStorage();
  const b1 = createSafetyBackup(sampleSnapshot(), "import");
  writeSafetyBackup(b1, storage);
  const b2 = createSafetyBackup({ ingredients: [], recipes: [], suppliers: [], prixRecettes: [] }, "merge");
  writeSafetyBackup(b2, storage);
  const parsed = JSON.parse(storage.getItem(SAFETY_KEY));
  assert.strictEqual(parsed.source, "merge");
  assert.deepStrictEqual(parsed.data.ingredients, []);
}

// ─── Groupe D — readSafetyBackup ──────────────────────────────────────────────

function testReadSafetyBackupRetourneNullSiAbsent() {
  const storage = makeStorage();
  assert.strictEqual(readSafetyBackup(storage), null);
}

function testReadSafetyBackupRetourneObjetSiPresent() {
  const storage = makeStorage();
  const backup = createSafetyBackup(sampleSnapshot(), "import");
  writeSafetyBackup(backup, storage);
  const read = readSafetyBackup(storage);
  assert.ok(read);
  assert.strictEqual(read.version, SAFETY_VERSION);
  assert.strictEqual(read.source, "import");
  assert.deepStrictEqual(read.data.ingredients, sampleSnapshot().ingredients);
}

function testReadSafetyBackupRetourneNullSiJsonCorrompu() {
  const storage = makeStorage({ [SAFETY_KEY]: "{cassé,,," });
  assert.strictEqual(readSafetyBackup(storage), null);
}

function testReadSafetyBackupRetourneNullSiStorageChainvide() {
  const storage = makeStorage({ [SAFETY_KEY]: "" });
  assert.strictEqual(readSafetyBackup(storage), null);
}

// ─── Groupe E — hasSafetyBackup ───────────────────────────────────────────────

function testHasSafetyBackupFalseSiVide() {
  assert.strictEqual(hasSafetyBackup(makeStorage()), false);
}

function testHasSafetyBackupTrueSiPresent() {
  const storage = makeStorage();
  writeSafetyBackup(createSafetyBackup(sampleSnapshot(), "import"), storage);
  assert.strictEqual(hasSafetyBackup(storage), true);
}

function testHasSafetyBackupFalseSiCorrompu() {
  // Une donnée corrompue ne doit PAS compter comme une sauvegarde valide
  const storage = makeStorage({ [SAFETY_KEY]: "n'importe quoi" });
  assert.strictEqual(hasSafetyBackup(storage), false);
}

// ─── Groupe F — clearSafetyBackup ─────────────────────────────────────────────

function testClearSafetyBackupSupprime() {
  const storage = makeStorage();
  writeSafetyBackup(createSafetyBackup(sampleSnapshot(), "import"), storage);
  clearSafetyBackup(storage);
  assert.strictEqual(storage.getItem(SAFETY_KEY), null);
  assert.strictEqual(hasSafetyBackup(storage), false);
}

function testClearSafetyBackupNoopSiAbsent() {
  const storage = makeStorage();
  clearSafetyBackup(storage); // ne doit pas throw
  assert.strictEqual(storage.getItem(SAFETY_KEY), null);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testSafetyVersionExpose,
    testCreateSafetyBackupContientVersion,
    testCreateSafetyBackupContientTimestampISO,
    testCreateSafetyBackupConserveSourceImport,
    testCreateSafetyBackupConserveSourceMerge,
    testCreateSafetyBackupContientLes4DatasetsMetier,
    testCreateSafetyBackupGereDatasetsManquants,
    testWriteSafetyBackupStockeSousLaCleAttendue,
    testWriteSafetyBackupEcraseLePrecedent,
    testReadSafetyBackupRetourneNullSiAbsent,
    testReadSafetyBackupRetourneObjetSiPresent,
    testReadSafetyBackupRetourneNullSiJsonCorrompu,
    testReadSafetyBackupRetourneNullSiStorageChainvide,
    testHasSafetyBackupFalseSiVide,
    testHasSafetyBackupTrueSiPresent,
    testHasSafetyBackupFalseSiCorrompu,
    testClearSafetyBackupSupprime,
    testClearSafetyBackupNoopSiAbsent,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
