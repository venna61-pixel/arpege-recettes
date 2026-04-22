(function (global) {
  function buildMigrationReport(migrationResult) {
    const report = migrationResult.report || { warnings: [], errors: [], notes: [], stats: {} };

    const categoryNotes = report.notes.filter((n) => n.type === "MULTI_CATEGORY_RECIPE_BASE" || n.type === "MULTI_CATEGORY_PLAT_FINAL");
    const multiCategoryRecommendation = categoryNotes.length > 0
      ? "Le modèle actuel utilise plusieurs catégories par recette. Une catégorie unique simplifierait fortement le modèle si ce besoin métier est jugé non essentiel."
      : "Aucune recette multi-catégorie détectée. Une catégorie unique pourrait être envisagée plus tard pour simplifier le modèle.";

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
      recommendations: {
        categories: multiCategoryRecommendation,
      },
    };
  }

  function printMigrationReport(shadowReport) {
    console.group("[Shadow Migration] Rapport legacy -> cible v1");
    console.info("Résumé:", shadowReport.summary);
    if (shadowReport.errors.length) console.error("Erreurs:", shadowReport.errors);
    if (shadowReport.warnings.length) console.warn("Avertissements:", shadowReport.warnings);
    if (shadowReport.notes.length) console.log("Notes:", shadowReport.notes);
    console.log("Recommandations:", shadowReport.recommendations);
    console.groupEnd();
  }

  global.ArpegeMigrationReport = {
    buildMigrationReport,
    printMigrationReport,
  };
})(window);
