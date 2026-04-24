(function (global) {
  const storageApi = global.ArpegeVersionedStorage;

  const FEATURE_FLAGS = {
    READ_V1_ENABLED: "arpege_feature_read_v1_enabled",
  };

  const FALLBACK_TYPES = new Set([
    "EMPTY_UNIT_FALLBACK",
    "EMPTY_CATEGORIES_FALLBACK",
    "RENDEMENT_FALLBACK_APPLIED",
    "FINAL_COVERS_FORCED",
    "RECIPE_TYPE_UNKNOWN_FALLBACK",
  ]);

  const EXCLUSION_TYPES = new Set([
    "DIRECT_INGREDIENT_LINE_EXCLUDED",
    "BASE_COMPONENT_LINE_EXCLUDED",
    "BASE_COMPONENT_IN_BASE_RECIPE_EXCLUDED",
    "INGREDIENT_EXCLUDED_INVALID_PRICE",
    "RECIPE_EXCLUDED_INVALID_ID",
  ]);

  function parseJSONSafe(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function isFeatureEnabled(storage, key) {
    const raw = storage.getItem(key);
    return raw === "1" || raw === "true";
  }

  function getFeatureFlags(storage = global.localStorage) {
    return {
      readV1Enabled: isFeatureEnabled(storage, FEATURE_FLAGS.READ_V1_ENABLED),
    };
  }

  function readV1Data(storage = global.localStorage) {
    const keys = storageApi.TARGET_KEYS;
    const data = {
      fournisseurs: parseJSONSafe(storage.getItem(keys.fournisseurs), null),
      ingredients: parseJSONSafe(storage.getItem(keys.ingredients), null),
      recettesBase: parseJSONSafe(storage.getItem(keys.recettesBase), null),
      platsFinals: parseJSONSafe(storage.getItem(keys.platsFinals), null),
      lignesRecetteIngredient: parseJSONSafe(storage.getItem(keys.lignesRecetteIngredient), null),
      lignesPlatSousRecette: parseJSONSafe(storage.getItem(keys.lignesPlatSousRecette), null),
      lignesPlatIngredientDirect: parseJSONSafe(storage.getItem(keys.lignesPlatIngredientDirect), null),
      schemaVersion: parseJSONSafe(storage.getItem(keys.schemaVersion), null),
    };

    const presentKeys = Object.entries(keys)
      .map(([name, key]) => ({ name, key, present: storage.getItem(key) != null }))
      .filter((entry) => entry.present)
      .map((entry) => entry.key);

    return {
      exists: presentKeys.length > 0,
      presentKeys,
      data,
    };
  }

  function countLegacyVolumes(legacy, migrationResult) {
    return {
      legacyIngredients: (legacy.ingredients || []).length,
      legacyRecipes: (legacy.recipes || []).length,
      migratedIngredients: (migrationResult.ingredients || []).length,
      migratedRecettesBase: (migrationResult.recettesBase || []).length,
      migratedPlatsFinals: (migrationResult.platsFinals || []).length,
      migratedLignesRecetteIngredient: (migrationResult.lignesRecetteIngredient || []).length,
      migratedLignesPlatSousRecette: (migrationResult.lignesPlatSousRecette || []).length,
      migratedLignesPlatIngredientDirect: (migrationResult.lignesPlatIngredientDirect || []).length,
    };
  }

  function countV1Volumes(v1Data) {
    const v = v1Data.data;
    return {
      v1Ingredients: Array.isArray(v.ingredients) ? v.ingredients.length : 0,
      v1RecettesBase: Array.isArray(v.recettesBase) ? v.recettesBase.length : 0,
      v1PlatsFinals: Array.isArray(v.platsFinals) ? v.platsFinals.length : 0,
      v1LignesRecetteIngredient: Array.isArray(v.lignesRecetteIngredient) ? v.lignesRecetteIngredient.length : 0,
      v1LignesPlatSousRecette: Array.isArray(v.lignesPlatSousRecette) ? v.lignesPlatSousRecette.length : 0,
      v1LignesPlatIngredientDirect: Array.isArray(v.lignesPlatIngredientDirect) ? v.lignesPlatIngredientDirect.length : 0,
      schemaVersion: v.schemaVersion,
    };
  }

  function collectMigrationSignals(report) {
    const warnings = report?.warnings || [];
    const errors = report?.errors || [];

    return {
      missingReferences: warnings.filter((w) => w.type === "MISSING_INGREDIENT_REFERENCE" || w.type === "MISSING_BASE_RECIPE_REFERENCE"),
      exclusions: [...warnings, ...errors].filter((i) => EXCLUSION_TYPES.has(i.type)),
      fallbacks: warnings.filter((w) => FALLBACK_TYPES.has(w.type)),
      errors,
      warnings,
    };
  }

  function detectV1ReferenceIssues(v1Data) {
    const issues = [];
    const v = v1Data.data;
    const ingredientIds = new Set((v.ingredients || []).map((i) => i.id));
    const recipeIds = new Set([...(v.recettesBase || []).map((r) => r.id), ...(v.platsFinals || []).map((p) => p.id)]);

    for (const line of v.lignesRecetteIngredient || []) {
      if (!ingredientIds.has(line.ingredient_id)) {
        issues.push({ severity: "high", type: "V1_MISSING_INGREDIENT_REFERENCE", lineId: line.id, ingredient_id: line.ingredient_id });
      }
    }

    for (const line of v.lignesPlatIngredientDirect || []) {
      if (!ingredientIds.has(line.ingredient_id)) {
        issues.push({ severity: "high", type: "V1_MISSING_INGREDIENT_REFERENCE", lineId: line.id, ingredient_id: line.ingredient_id });
      }
    }

    for (const line of v.lignesPlatSousRecette || []) {
      if (!recipeIds.has(line.recette_source_id)) {
        issues.push({ severity: "high", type: "V1_MISSING_RECIPE_REFERENCE", lineId: line.id, recette_source_id: line.recette_source_id });
      }
    }

    return issues;
  }

  function buildVolumeDiffs(migratedVolumes, v1Volumes) {
    return [
      { field: "ingredients", migrated: migratedVolumes.migratedIngredients, v1: v1Volumes.v1Ingredients },
      { field: "recettesBase", migrated: migratedVolumes.migratedRecettesBase, v1: v1Volumes.v1RecettesBase },
      { field: "platsFinals", migrated: migratedVolumes.migratedPlatsFinals, v1: v1Volumes.v1PlatsFinals },
      { field: "lignesRecetteIngredient", migrated: migratedVolumes.migratedLignesRecetteIngredient, v1: v1Volumes.v1LignesRecetteIngredient },
      { field: "lignesPlatSousRecette", migrated: migratedVolumes.migratedLignesPlatSousRecette, v1: v1Volumes.v1LignesPlatSousRecette },
      { field: "lignesPlatIngredientDirect", migrated: migratedVolumes.migratedLignesPlatIngredientDirect, v1: v1Volumes.v1LignesPlatIngredientDirect },
    ].map((d) => ({ ...d, delta: d.v1 - d.migrated, severity: d.v1 === d.migrated ? "info" : "medium" }));
  }

  function evaluateSwitchReadiness(crossCheckReport) {
    const discrepancies = crossCheckReport.discrepancies || [];
    const high = discrepancies.filter((d) => d.severity === "high");
    const medium = discrepancies.filter((d) => d.severity === "medium");

    const ready = high.length === 0 && medium.length === 0;

    return {
      ready,
      blocking: {
        highSeverity: high,
        mediumSeverity: medium,
      },
      tolerable: {
        infoOnly: discrepancies.filter((d) => d.severity === "info"),
      },
      criteria: {
        requiresNoHighSeverityDiscrepancy: true,
        requiresNoMediumSeverityDiscrepancy: true,
        allowsInfoDiscrepancies: true,
      },
    };
  }

  function resolveCanarySuppliersSource({ legacyIngredients = [], v1Data, featureFlags, switchReadiness, crossCheckReport }) {
    const legacySuppliers = Array.from(new Set((legacyIngredients || []).map((ing) => (ing.supplier || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));

    if (!featureFlags?.readV1Enabled) {
      return { source: "legacy", canaryActive: false, suppliers: legacySuppliers, reason: "FLAG_DISABLED" };
    }

    if (!v1Data?.exists) {
      return { source: "legacy", canaryActive: false, suppliers: legacySuppliers, reason: "V1_ABSENT" };
    }

    if (!switchReadiness?.ready) {
      return { source: "legacy", canaryActive: false, suppliers: legacySuppliers, reason: "READINESS_BLOCKED" };
    }

    if (crossCheckReport?.severity === "high") {
      return { source: "legacy", canaryActive: false, suppliers: legacySuppliers, reason: "CRITICAL_DISCREPANCY" };
    }

    const fournisseurs = v1Data?.data?.fournisseurs;
    if (!Array.isArray(fournisseurs)) {
      return { source: "legacy", canaryActive: false, suppliers: legacySuppliers, reason: "V1_REQUIRED_DATA_MISSING" };
    }

    const canarySuppliers = fournisseurs
      .map((f) => (f?.nom || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));

    return { source: "v1_canary", canaryActive: true, suppliers: canarySuppliers, reason: "CANARY_ENABLED_SAFE" };
  }

  function buildCrossCheckReport({ legacyData, migrationResult, v1Data }) {
    const migratedVolumes = countLegacyVolumes(legacyData, migrationResult);
    const migrationSignals = collectMigrationSignals(migrationResult.report || {});

    if (!v1Data.exists) {
      return {
        coherent: false,
        status: "v1_absent",
        severity: "medium",
        message: "Aucune donnée v1 persistée à comparer.",
        migratedVolumes,
        v1Volumes: null,
        discrepancies: [{ severity: "medium", type: "V1_NOT_AVAILABLE" }],
        migrationSignals,
      };
    }

    const v1Volumes = countV1Volumes(v1Data);
    const volumeDiffs = buildVolumeDiffs(migratedVolumes, v1Volumes)
      .filter((d) => d.delta !== 0)
      .map((d) => ({ severity: d.severity, type: "COUNT_MISMATCH", ...d }));

    const v1RefIssues = detectV1ReferenceIssues(v1Data);
    const missingRefs = migrationSignals.missingReferences.map((m) => ({ severity: "high", type: m.type, ...m }));
    const exclusions = migrationSignals.exclusions.map((e) => ({ severity: "medium", type: e.type, ...e }));
    const fallbacks = migrationSignals.fallbacks.map((f) => ({ severity: "info", type: f.type, ...f }));

    const discrepancies = [
      ...volumeDiffs,
      ...v1RefIssues,
      ...missingRefs,
      ...exclusions,
      ...fallbacks,
    ];

    const hasHigh = discrepancies.some((d) => d.severity === "high");
    const hasMedium = discrepancies.some((d) => d.severity === "medium");

    return {
      coherent: !hasHigh && !hasMedium,
      status: !hasHigh && !hasMedium ? "coherent" : "not_coherent",
      severity: hasHigh ? "high" : hasMedium ? "medium" : "info",
      message: !hasHigh && !hasMedium ? "Comparaison legacy ↔ v1 cohérente." : "Écarts détectés entre legacy et v1.",
      migratedVolumes,
      v1Volumes,
      discrepancies,
      migrationSignals,
    };
  }

  global.ArpegeParallelRead = {
    FEATURE_FLAGS,
    getFeatureFlags,
    readV1Data,
    buildCrossCheckReport,
    evaluateSwitchReadiness,
    resolveCanarySuppliersSource,
  };
})(window);
