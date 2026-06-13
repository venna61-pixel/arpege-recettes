// Filet de sécurité pour les opérations d'import et de fusion : avant chaque
// écrasement des données, on prend un snapshot du state courant et on le
// stocke dans localStorage. L'utilisateur peut le restaurer en un clic
// depuis les Réglages si l'import s'est avéré être une erreur.
//
// Limites volontaires (v1) :
// - Une seule sauvegarde conservée à la fois (la dernière). Pas d'historique
//   multi-niveaux. Restaurer puis vouloir annuler la restauration n'est pas
//   possible — acceptable car les imports/fusions sont rares et confirmés.
// - Pas de sauvegarde de la configuration restaurant (non-affectée par
//   import/fusion) ni du logo (idem) ni de l'utilisateur connecté.

(function (global) {
  var SAFETY_KEY = "arpege_safety_backup";
  var SAFETY_VERSION = 1;

  function createSafetyBackup(snapshot, source) {
    var src = snapshot || {};
    return {
      version: SAFETY_VERSION,
      timestamp: new Date().toISOString(),
      source: source,
      data: {
        ingredients:  Array.isArray(src.ingredients)  ? src.ingredients  : [],
        recipes:      Array.isArray(src.recipes)      ? src.recipes      : [],
        suppliers:    Array.isArray(src.suppliers)    ? src.suppliers    : [],
        prixRecettes: Array.isArray(src.prixRecettes) ? src.prixRecettes : [],
      },
    };
  }

  function writeSafetyBackup(backup, storage) {
    storage.setItem(SAFETY_KEY, JSON.stringify(backup));
  }

  function readSafetyBackup(storage) {
    try {
      var raw = storage.getItem(SAFETY_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function hasSafetyBackup(storage) {
    return readSafetyBackup(storage) !== null;
  }

  function clearSafetyBackup(storage) {
    storage.removeItem(SAFETY_KEY);
  }

  global.FormulaSafetyBackup = {
    SAFETY_KEY: SAFETY_KEY,
    SAFETY_VERSION: SAFETY_VERSION,
    createSafetyBackup: createSafetyBackup,
    writeSafetyBackup: writeSafetyBackup,
    readSafetyBackup: readSafetyBackup,
    hasSafetyBackup: hasSafetyBackup,
    clearSafetyBackup: clearSafetyBackup,
  };
})(typeof window !== "undefined" ? window : global);
