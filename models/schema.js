(function (global) {
  const ENTITY_DEFINITIONS = {
    Ingredient: {
      description: "quantite_reference_prix=1 signifie explicitement 1 unité de unite_par_defaut (convention legacy).",
      fields: {
        id: { type: "number", required: true },
        nom: { type: "string", required: true },
        famille: { type: "string", required: true },
        unite_par_defaut: { type: "string", required: true },
        prix_achat: { type: "number", required: true },
        quantite_reference_prix: { type: "number", required: true },
        fournisseur_id: { type: "number|null", required: false },
        actif: { type: "boolean", required: false, default: true },
        created_at: { type: "string", required: false },
        updated_at: { type: "string", required: false },
      },
      computed_non_persisted: ["prix_unitaire_reference", "groupe_unite"],
    },
    Fournisseur: {
      fields: {
        id: { type: "number", required: true },
        nom: { type: "string", required: true },
        contact: { type: "object", required: false },
        actif: { type: "boolean", required: false, default: true },
        created_at: { type: "string", required: false },
        updated_at: { type: "string", required: false },
      },
      computed_non_persisted: ["nb_ingredients_associes"],
    },
    RecetteBase: {
      fields: {
        id: { type: "number", required: true },
        nom: { type: "string", required: true },
        categorie: { type: "string[]", required: true },
        nombre_couverts_reference: { type: "number", required: false },
        rendement_reference: { type: "object", required: true },
        processus: { type: "string", required: false },
        tva_percent: { type: "number", required: true },
        coeff_perte_global: { type: "number", required: false, default: 1 },
        actif: { type: "boolean", required: false, default: true },
        created_at: { type: "string", required: false },
        updated_at: { type: "string", required: false },
      },
      computed_non_persisted: ["cout_total_ht", "cout_par_couvert_ht", "statut_validation_unites"],
    },
    PlatFinal: {
      fields: {
        id: { type: "number", required: true },
        nom: { type: "string", required: true },
        categorie: { type: "string[]", required: true },
        nombre_couverts_reference: { type: "number", required: true },
        rendement_reference: { type: "object", required: false },
        tva_percent: { type: "number", required: true },
        processus: { type: "string", required: false },
        coeff_perte_global: { type: "number", required: false, default: 1 },
        actif: { type: "boolean", required: false, default: true },
        created_at: { type: "string", required: false },
        updated_at: { type: "string", required: false },
      },
      computed_non_persisted: ["cout_total_ht", "cout_total_ttc", "cout_par_couvert_ht", "cout_par_couvert_ttc", "poids_total_calcule"],
    },
    LigneRecetteIngredient: {
      fields: {
        id: { type: "number", required: true },
        recette_base_id: { type: "number", required: true },
        ingredient_id: { type: "number", required: true },
        quantite: { type: "number", required: true },
        unite: { type: "string", required: true },
        coeff_perte_ligne: { type: "number", required: false, default: 1 },
      },
      computed_non_persisted: ["quantite_convertie_reference", "cout_ligne_ht"],
    },
    LignePlatSousRecette: {
      fields: {
        id: { type: "number", required: true },
        plat_final_id: { type: "number", required: true },
        recette_source_id: { type: "number", required: true },
        quantite_utilisee: { type: "number", required: true },
        unite_utilisee: { type: "string", required: true },
      },
      computed_non_persisted: ["quantite_convertie_vers_rendement_recette_source", "cout_prorate_ht"],
    },
    LignePlatIngredientDirect: {
      fields: {
        id: { type: "number", required: true },
        plat_final_id: { type: "number", required: true },
        ingredient_id: { type: "number", required: true },
        quantite: { type: "number", required: true },
        unite: { type: "string", required: true },
        coeff_perte_ligne: { type: "number", required: false, default: 1 },
      },
      computed_non_persisted: ["quantite_convertie_reference", "cout_ligne_ht"],
    },
  };

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function ensureCategoriesArray(value) {
    if (Array.isArray(value)) {
      return value.filter((v) => isNonEmptyString(v)).map((v) => v.trim());
    }
    if (isNonEmptyString(value)) return [value.trim()];
    return [];
  }

  const Schema = {
    ENTITY_DEFINITIONS,
    defaults: {
      tva_percent: 10,
      coeff_perte_global: 1,
      quantite_reference_prix: 1,
      actif: true,
    },
    helpers: {
      isNonEmptyString,
      ensureCategoriesArray,
    },
  };

  global.ArpegeSchema = Schema;
})(window);
