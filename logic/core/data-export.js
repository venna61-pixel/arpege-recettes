(function (global) {
  const APP_IDENTIFIER = "formula-arpege";
  const FORMAT_VERSION = "1";

  // Entrée: données de l'application (nom restaurant + 3 listes).
  // Sortie: objet structuré prêt à être sérialisé en JSON pour téléchargement.
  // Limite: ne valide pas le contenu des listes, seulement leur présence.
  function buildExportPayload({ restaurantName, ingredients, recipes, suppliers }) {
    return {
      formatVersion: FORMAT_VERSION,
      app: APP_IDENTIFIER,
      exportedAt: new Date().toISOString(),
      restaurantName: String(restaurantName || "").trim(),
      data: {
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        recipes: Array.isArray(recipes) ? recipes : [],
        suppliers: Array.isArray(suppliers) ? suppliers : [],
      },
    };
  }

  // Entrée: objet parsé (issu de JSON.parse). Sortie: { valid, errors, data }.
  // data est non-null uniquement si valid=true.
  // Cas d'erreur: mauvais identifiant app, version inconnue, structure data absente, listes non-tableaux.
  function validateImportPayload(parsed) {
    const errors = [];

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { valid: false, errors: ["Format invalide : l'objet racine est manquant."], data: null };
    }

    if (parsed.app !== APP_IDENTIFIER) {
      errors.push(`Fichier non reconnu : identifiant attendu "${APP_IDENTIFIER}", reçu "${parsed.app}".`);
    }

    if (parsed.formatVersion !== FORMAT_VERSION) {
      errors.push(`Version non supportée : attendu "${FORMAT_VERSION}", reçu "${parsed.formatVersion}".`);
    }

    if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      errors.push("Structure invalide : la section 'data' est absente ou malformée.");
      return { valid: false, errors, data: null };
    }

    const { ingredients, recipes, suppliers } = parsed.data;

    if (!Array.isArray(ingredients)) errors.push("La liste des ingrédients est invalide ou absente.");
    if (!Array.isArray(recipes))     errors.push("La liste des recettes est invalide ou absente.");
    if (!Array.isArray(suppliers))   errors.push("La liste des fournisseurs est invalide ou absente.");

    if (errors.length > 0) return { valid: false, errors, data: null };

    return {
      valid: true,
      errors: [],
      data: {
        restaurantName: String(parsed.restaurantName || "").trim(),
        ingredients,
        recipes,
        suppliers,
        exportedAt: parsed.exportedAt || null,
      },
    };
  }

  // Entrée: chaîne JSON brute (contenu d'un fichier importé par l'utilisateur).
  // Sortie: { valid, errors, data } — gère les erreurs de parsing JSON avant validation métier.
  // Cas d'erreur: fichier vide, JSON invalide, puis toutes les validations de validateImportPayload.
  function parseImportPayload(jsonString) {
    if (!jsonString || typeof jsonString !== "string" || !jsonString.trim()) {
      return { valid: false, errors: ["Fichier vide ou illisible."], data: null };
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { valid: false, errors: ["Le fichier n'est pas une sauvegarde valide (JSON invalide)."], data: null };
    }
    return validateImportPayload(parsed);
  }

  global.FormulaDataExport = {
    APP_IDENTIFIER,
    FORMAT_VERSION,
    buildExportPayload,
    validateImportPayload,
    parseImportPayload,
  };
})(typeof window !== "undefined" ? window : global);
