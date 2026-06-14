// Calcule l'état global des données Formula (compteurs par type, dernière
// sauvegarde automatique, taille de stockage). Module pur : les entrées
// (datasets, safety backup parsé, paires clé/valeur du localStorage) sont
// fournies par l'appelant pour rester testable sans dépendance à window.

(function (global) {
  function countByType(datasets) {
    var safe = datasets || {};
    var ingredients = Array.isArray(safe.ingredients) ? safe.ingredients : [];
    var recipes = Array.isArray(safe.recipes) ? safe.recipes : [];
    var suppliers = Array.isArray(safe.suppliers) ? safe.suppliers : [];

    // `recipeType` peut être absent sur d'anciennes recettes (fallback "base"
    // appliqué partout ailleurs via normalizeRecipe). On reproduit la même
    // règle ici pour rester cohérent avec le reste du système.
    var baseRecipes = recipes.filter(function (r) {
      return (r && r.recipeType ? r.recipeType : "base") !== "final";
    }).length;
    var finalRecipes = recipes.filter(function (r) {
      return r && r.recipeType === "final";
    }).length;

    return {
      ingredients: ingredients.length,
      baseRecipes: baseRecipes,
      finalRecipes: finalRecipes,
      suppliers: suppliers.length,
    };
  }

  function getLastBackupTimestamp(safetyBackup) {
    if (!safetyBackup || typeof safetyBackup !== "object") return null;
    var ts = safetyBackup.timestamp;
    if (typeof ts !== "string" || ts.trim() === "") return null;
    var date = new Date(ts);
    if (Number.isNaN(date.getTime())) return null;
    return ts;
  }

  // entries: { [cle]: valeur } — l'appelant collecte les paires depuis le
  // localStorage (filtrées sur "arpege_*" pour mesurer ce qui appartient à
  // Formula). Bytes UTF-16 car c'est l'encodage interne du DOMString
  // localStorage : 2 octets par caractère.
  function estimateStorageBytes(entries) {
    if (!entries || typeof entries !== "object") return 0;
    var total = 0;
    for (var key in entries) {
      if (Object.prototype.hasOwnProperty.call(entries, key)) {
        var value = entries[key];
        total += String(key).length;
        total += value == null ? 0 : String(value).length;
      }
    }
    return total * 2;
  }

  function formatBytes(bytes) {
    var n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return "0 o";
    if (n < 1024) return Math.round(n) + " o";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " Ko";
    return (n / (1024 * 1024)).toFixed(2) + " Mo";
  }

  function formatBackupTimestamp(isoTimestamp) {
    if (!isoTimestamp) return "Aucune";
    var date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return "Aucune";
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear()
      + " à " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function buildDataStatus(input) {
    var safe = input || {};
    var counts = countByType(safe.datasets);
    var lastBackupAt = getLastBackupTimestamp(safe.safetyBackup);
    var storageBytes = estimateStorageBytes(safe.storageEntries);
    return {
      counts: counts,
      lastBackupAt: lastBackupAt,
      lastBackupLabel: formatBackupTimestamp(lastBackupAt),
      storageBytes: storageBytes,
      storageLabel: formatBytes(storageBytes),
    };
  }

  global.FormulaDataStatus = {
    countByType: countByType,
    getLastBackupTimestamp: getLastBackupTimestamp,
    estimateStorageBytes: estimateStorageBytes,
    formatBytes: formatBytes,
    formatBackupTimestamp: formatBackupTimestamp,
    buildDataStatus: buildDataStatus,
  };
})(window);
