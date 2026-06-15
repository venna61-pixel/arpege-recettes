// Source unique des clés localStorage utilisées par l'application.
// Phase 2 — chantier "Centralisation config" du plan d'audit lead dev.
//
// Pourquoi un module dédié plutôt que d'étendre FormulaConstants ?
// - Une clé de stockage est une dépendance d'infrastructure (où sont écrits
//   les octets), pas une constante métier (unités, catégories, messages).
// - À terme (Phase 3+), certaines clés disparaîtront lors du basculement
//   complet vers le modèle v1. Les regrouper isole la cible de nettoyage.

(function (global) {
  // Données métier persistées (modèle legacy v0).
  var DATA = {
    INGREDIENTS:   "arpege_ingredients",
    RECIPES:       "arpege_recipes",
    SUPPLIERS:     "arpege_suppliers",
    PRIX_RECETTES: "formula_prix_recettes",
  };

  // Session utilisateur (rôle connecté).
  var SESSION = {
    USER: "arpege_user",
  };

  // Configuration et personnalisation du restaurant.
  var CONFIG = {
    RESTAURANT_CONFIG: "arpege_restaurant_config",
    RESTAURANT_LOGO:   "arpege_restaurant_logo",
  };

  // Filet de sécurité avant import/fusion (cf. logic/core/safety-backup.js).
  var SAFETY = {
    SAFETY_BACKUP: "arpege_safety_backup",
  };

  // Drapeaux de complétion des migrations one-shot (à ne jamais relancer).
  var MIGRATIONS = {
    WASTE_PCT_V2: "arpege_waste_pct_v2",
  };

  // Modèle de données v1 (cf. logic/migration/versioned-storage.js).
  var V1 = {
    FOURNISSEURS:                  "arpege_v1_fournisseurs",
    INGREDIENTS:                   "arpege_v1_ingredients",
    RECETTES_BASE:                 "arpege_v1_recettes_base",
    PLATS_FINALS:                  "arpege_v1_plats_finals",
    LIGNES_RECETTE_INGREDIENT:     "arpege_v1_lignes_recette_ingredient",
    LIGNES_PLAT_SOUS_RECETTE:      "arpege_v1_lignes_plat_sous_recette",
    LIGNES_PLAT_INGREDIENT_DIRECT: "arpege_v1_lignes_plat_ingredient_direct",
    SCHEMA_VERSION:                "arpege_schema_version",
  };

  // Feature flags (activation canary, expérimentations).
  var FEATURE_FLAGS = {
    READ_V1_ENABLED: "arpege_feature_read_v1_enabled",
  };

  // Préférences UI par section (clés dynamiques). Les fonctions construisent
  // la clé finale à partir du type de section ("base", "finales", etc.).
  var PREFS = {
    recipesSortBy:   function (sectionType) { return "arpege_recipes_sortBy_"   + sectionType; },
    recipesSortDir:  function (sectionType) { return "arpege_recipes_sortDir_"  + sectionType; },
    recipesViewMode: function (sectionType) { return "arpege_recipes_viewMode_" + sectionType; },
  };

  global.FormulaStorageKeys = {
    DATA,
    SESSION,
    CONFIG,
    SAFETY,
    MIGRATIONS,
    V1,
    FEATURE_FLAGS,
    PREFS,
  };
})(window);
