(function (global) {
  function getDependencies() {
    return {
      parallelRead: global.ArpegeParallelRead,
    };
  }

  function buildLegacySuppliers(legacyIngredients = []) {
    return Array.from(new Set((legacyIngredients || []).map((ing) => (ing.supplier || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
  }

  function resolveDataSourcesRuntime({
    legacyIngredients = [],
    storage = global.localStorage,
    crossCheckReport = global.__ARPEGE_V1_CROSS_CHECK_REPORT__ || null,
    switchReadiness = global.__ARPEGE_V1_SWITCH_READINESS__ || { ready: false },
  }) {
    const deps = getDependencies();
    const legacySuppliers = buildLegacySuppliers(legacyIngredients);

    if (!deps.parallelRead) {
      return {
        suppliers: {
          source: "legacy",
          canaryActive: false,
          reason: "PARALLEL_READ_MODULE_UNAVAILABLE",
          data: legacySuppliers,
        },
        diagnostics: {
          featureFlags: { readV1Enabled: false },
          v1Exists: false,
          readiness: switchReadiness,
        },
      };
    }

    const featureFlags = deps.parallelRead.getFeatureFlags(storage);
    const v1Data = deps.parallelRead.readV1Data(storage);
    const suppliersDecision = deps.parallelRead.resolveCanarySuppliersSource({
      legacyIngredients,
      v1Data,
      featureFlags,
      switchReadiness,
      crossCheckReport,
    });

    return {
      suppliers: {
        source: suppliersDecision.source,
        canaryActive: suppliersDecision.canaryActive,
        reason: suppliersDecision.reason,
        data: suppliersDecision.suppliers,
      },
      diagnostics: {
        featureFlags,
        v1Exists: v1Data.exists,
        readiness: switchReadiness,
      },
    };
  }

  global.ArpegeRuntimeDataSource = {
    buildLegacySuppliers,
    resolveDataSourcesRuntime,
  };
})(window);
