(function (global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function detectProcedureWarnings(procedureText) {
    var text = String(procedureText || "");
    var unique = function (items) {
      return [...new Set(items.map(function (item) { return item.trim(); }).filter(Boolean))];
    };
    var dimensionRegexes = [
      /\b\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?(?:\s*(?:mm|cm|m))?\b/gi,
      /\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|mm²|cm²|m²|mm2|cm2|m2)\b/gi,
    ];
    var timeRegexes = [
      /\b\d+\s*h\s*\d{1,2}\b/gi,
      /\b\d+\s*h\b/gi,
      /\b\d+\s*(?:min|mins|minute|minutes)\b/gi,
      /\b\d+\s*(?:heure|heures)\b/gi,
    ];
    var collectMatches = function (regexes) {
      return unique(regexes.flatMap(function (regex) { return text.match(regex) || []; }));
    };
    var dimensions = collectMatches(dimensionRegexes);
    var cookingTimes = collectMatches(timeRegexes);
    return {
      dimensions: dimensions,
      cookingTimes: cookingTimes,
      hasWarnings: dimensions.length > 0 || cookingTimes.length > 0,
    };
  }

  function buildProcedureWarningHtml(params) {
    var multiplierValue = params.multiplierValue;
    var dimensions = params.dimensions;
    var cookingTimes = params.cookingTimes;
    if (((!dimensions || dimensions.length === 0) && (!cookingTimes || cookingTimes.length === 0)) || multiplierValue === 1) return "";
    var dimensionsLine = dimensions.length > 0
      ? "<p><strong>Dimensions détectées :</strong> " + escapeHtml(dimensions.join(", ")) + "</p>"
      : "";
    var timesLine = cookingTimes.length > 0
      ? "<p><strong>Temps de cuisson détectés :</strong> " + escapeHtml(cookingTimes.join(", ")) + "</p>"
      : "";
    return "\n      <div class=\"warning-box\">\n        <p><strong>⚠️ Vérification manuelle recommandée</strong></p>\n        <p>Cette recette a été adaptée avec un coefficient de x" + escapeHtml(multiplierValue.toFixed(2)) + "</p>\n        <p>Les éléments suivants ne s'adaptent pas automatiquement :</p>\n        " + dimensionsLine + "\n        " + timesLine + "\n      </div>\n    ";
  }

  global.FormulaProcedure = {
    detectProcedureWarnings: detectProcedureWarnings,
    buildProcedureWarningHtml: buildProcedureWarningHtml,
  };
})(typeof window !== "undefined" ? window : global);
