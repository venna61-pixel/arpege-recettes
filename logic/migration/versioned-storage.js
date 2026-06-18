(function (global) {
  if (!global.FormulaStorageKeys) {
    throw new Error("Module requis: logic/core/storage-keys.js doit être chargé avant logic/migration/versioned-storage.js");
  }
  const V1 = global.FormulaStorageKeys.V1;
  const DATA = global.FormulaStorageKeys.DATA;

  const BLOCKING_WARNING_TYPES = new Set([
    "MISSING_INGREDIENT_REFERENCE",
    "MISSING_BASE_RECIPE_REFERENCE",
  ]);

  function readLegacyData(storage) {
    try {
      const rawIngredients = storage.getItem(DATA.INGREDIENTS);
      const rawRecipes = storage.getItem(DATA.RECIPES);
      return {
        ingredients: rawIngredients ? JSON.parse(rawIngredients) : [],
        recipes: rawRecipes ? JSON.parse(rawRecipes) : [],
      };
    } catch (error) {
      return { ingredients: [], recipes: [], readError: error.message };
    }
  }

  // Entrée: résultat de migration (dont report). Sortie: décision binaire d'écriture + causes de blocage.
  // Limite: la politique de blocage dépend d'une liste de warnings "bloquants" codée en dur.
  function buildWriteDecision(migrationResult) {
    const report = migrationResult?.report || { errors: [], warnings: [] };
    const blockingErrors = report.errors || [];
    const blockingWarnings = (report.warnings || []).filter((w) => BLOCKING_WARNING_TYPES.has(w.type));

    const canWrite = blockingErrors.length === 0 && blockingWarnings.length === 0;

    return {
      canWrite,
      blockingErrors,
      blockingWarnings,
      criteria: {
        requiresZeroErrors: true,
        requiresNoBlockingWarnings: Array.from(BLOCKING_WARNING_TYPES),
      },
    };
  }

  function buildPayload(migrationResult) {
    return {
      [V1.FOURNISSEURS]: migrationResult.fournisseurs || [],
      [V1.INGREDIENTS]: migrationResult.ingredients || [],
      [V1.RECETTES_BASE]: migrationResult.recettesBase || [],
      [V1.PLATS_FINALS]: migrationResult.platsFinals || [],
      [V1.LIGNES_RECETTE_INGREDIENT]: migrationResult.lignesRecetteIngredient || [],
      [V1.LIGNES_PLAT_SOUS_RECETTE]: migrationResult.lignesPlatSousRecette || [],
      [V1.LIGNES_PLAT_INGREDIENT_DIRECT]: migrationResult.lignesPlatIngredientDirect || [],
      [V1.SCHEMA_VERSION]: migrationResult.schemaVersion || 1,
    };
  }

  // Entrées: résultat de migration + storage cible. Sortie: statut d'écriture (written/not_written/failed_rolled_back).
  // Cas fallback: si décision KO => shadow_only; en erreur d'I/O => rollback des clés déjà écrites.
  // Limite: rollback best-effort limité aux clés écrites dans cette tentative.
  function persistVersionedData({ migrationResult, storage = global.localStorage }) {
    const decision = buildWriteDecision(migrationResult);
    const payload = buildPayload(migrationResult);

    if (!decision.canWrite) {
      return {
        status: "not_written",
        mode: "shadow_only",
        decision,
        writtenKeys: [],
        objectCounts: {},
        message: "Migration non exploitable pour écriture versionnée.",
      };
    }

    const writtenKeys = [];
    const objectCounts = {};

    try {
      for (const [key, value] of Object.entries(payload)) {
        storage.setItem(key, JSON.stringify(value));
        writtenKeys.push(key);
        objectCounts[key] = Array.isArray(value) ? value.length : 1;
      }

      return {
        status: "written",
        mode: "shadow_plus_persisted_v1",
        decision,
        writtenKeys,
        objectCounts,
        message: "Écriture versionnée terminée.",
      };
    } catch (error) {
      for (const key of writtenKeys) {
        storage.removeItem(key);
      }
      return {
        status: "failed_rolled_back",
        mode: "shadow_only",
        decision,
        writtenKeys: [],
        objectCounts: {},
        message: "Échec lors de l'écriture. Rollback effectué.",
        error: String(error?.message || error),
      };
    }
  }

  function buildWriteReport({ migrationResult, persistResult }) {
    return {
      schemaVersion: migrationResult?.schemaVersion || null,
      writeStatus: persistResult.status,
      mode: persistResult.mode,
      writtenKeys: persistResult.writtenKeys,
      objectCounts: persistResult.objectCounts,
      blockedByErrors: (persistResult.decision?.blockingErrors || []).map((e) => e.type),
      blockedByWarnings: (persistResult.decision?.blockingWarnings || []).map((w) => w.type),
      criteria: persistResult.decision?.criteria || {},
      message: persistResult.message,
      error: persistResult.error || null,
    };
  }

  global.FormulaVersionedStorage = {
    BLOCKING_WARNING_TYPES,
    readLegacyData,
    buildWriteDecision,
    persistVersionedData,
    buildWriteReport,
  };
})(window);
