(function (global) {
  const TARGET_KEYS = {
    fournisseurs: "arpege_v1_fournisseurs",
    ingredients: "arpege_v1_ingredients",
    recettesBase: "arpege_v1_recettes_base",
    platsFinals: "arpege_v1_plats_finals",
    lignesRecetteIngredient: "arpege_v1_lignes_recette_ingredient",
    lignesPlatSousRecette: "arpege_v1_lignes_plat_sous_recette",
    lignesPlatIngredientDirect: "arpege_v1_lignes_plat_ingredient_direct",
    schemaVersion: "arpege_schema_version",
  };

  const LEGACY_KEYS = {
    ingredients: "arpege_ingredients",
    recipes: "arpege_recipes",
  };

  const BLOCKING_WARNING_TYPES = new Set([
    "MISSING_INGREDIENT_REFERENCE",
    "MISSING_BASE_RECIPE_REFERENCE",
  ]);

  function readLegacyData(storage) {
    try {
      const rawIngredients = storage.getItem(LEGACY_KEYS.ingredients);
      const rawRecipes = storage.getItem(LEGACY_KEYS.recipes);
      return {
        ingredients: rawIngredients ? JSON.parse(rawIngredients) : [],
        recipes: rawRecipes ? JSON.parse(rawRecipes) : [],
      };
    } catch (error) {
      return { ingredients: [], recipes: [], readError: error.message };
    }
  }

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
      [TARGET_KEYS.fournisseurs]: migrationResult.fournisseurs || [],
      [TARGET_KEYS.ingredients]: migrationResult.ingredients || [],
      [TARGET_KEYS.recettesBase]: migrationResult.recettesBase || [],
      [TARGET_KEYS.platsFinals]: migrationResult.platsFinals || [],
      [TARGET_KEYS.lignesRecetteIngredient]: migrationResult.lignesRecetteIngredient || [],
      [TARGET_KEYS.lignesPlatSousRecette]: migrationResult.lignesPlatSousRecette || [],
      [TARGET_KEYS.lignesPlatIngredientDirect]: migrationResult.lignesPlatIngredientDirect || [],
      [TARGET_KEYS.schemaVersion]: migrationResult.schemaVersion || 1,
    };
  }

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

  global.ArpegeVersionedStorage = {
    TARGET_KEYS,
    LEGACY_KEYS,
    BLOCKING_WARNING_TYPES,
    readLegacyData,
    buildWriteDecision,
    persistVersionedData,
    buildWriteReport,
  };
})(window);
