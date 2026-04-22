(function (global) {
  function countByType(items) {
    return (items || []).reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
  }

  function buildMigrationReport(migrationResult) {
    const report = migrationResult.report || { warnings: [], errors: [], notes: [], stats: {}, policies: {} };

    const categoryNotes = report.notes.filter((n) => n.type === "MULTI_CATEGORY");
    const cycleErrors = report.errors.filter((e) => e.type === "RECIPE_CYCLE_DETECTED");

    const multiCategoryRecommendation = categoryNotes.length > 0
      ? "Le modèle actuel utilise plusieurs catégories par recette. Une catégorie unique simplifierait fortement le modèle si ce besoin métier est jugé non essentiel."
      : "Aucune recette multi-catégorie détectée. Une catégorie unique pourrait être envisagée plus tard pour simplifier le modèle.";

    const cycleExample = cycleErrors.length > 0
      ? { type: "RECIPE_CYCLE_DETECTED", exampleCyclePath: cycleErrors[0].cyclePath }
      : null;

    return {
      summary: {
        stats: report.stats,
        warningCount: report.warnings.length,
        errorCount: report.errors.length,
        noteCount: report.notes.length,
      },
      warnings: report.warnings,
      errors: report.errors,
      notes: report.notes,
      warningTypes: countByType(report.warnings),
      errorTypes: countByType(report.errors),
      noteTypes: countByType(report.notes),
      policies: report.policies || {},
      approximations: report.notes.filter((n) => n.type === "DEFAULT_TVA_APPLIED" || n.type === "DEFAULT_QUANTITE_REFERENCE_PRIX_APPLIED" || n.type === "MULTI_CATEGORY"),
      recommendations: {
        categories: multiCategoryRecommendation,
      },
      cycleExample,
    };
  }

  function printMigrationReport(shadowReport) {
    console.group("[Shadow Migration] Rapport legacy -> cible v1");
    console.info("Résumé:", shadowReport.summary);
    if (shadowReport.errorTypes && Object.keys(shadowReport.errorTypes).length) console.error("Erreurs par type:", shadowReport.errorTypes);
    if (shadowReport.warningTypes && Object.keys(shadowReport.warningTypes).length) console.warn("Warnings par type:", shadowReport.warningTypes);
    if (shadowReport.noteTypes && Object.keys(shadowReport.noteTypes).length) console.log("Notes par type:", shadowReport.noteTypes);
    if (shadowReport.cycleExample) console.error("Exemple cycle détecté:", shadowReport.cycleExample);
    console.log("Policies:", shadowReport.policies);
    console.log("Recommandations:", shadowReport.recommendations);
    console.groupEnd();
  }

  global.ArpegeMigrationReport = {
    buildMigrationReport,
    printMigrationReport,
  };
})(window);
