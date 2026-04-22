(function (global) {
  const schema = global.ArpegeSchema;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeSupplierKey(name) {
    return normalizeText(name).toLocaleLowerCase("fr");
  }

  function mapLegacyIngredient(legacyIngredient, supplierIdByKey, report) {
    const supplierName = normalizeText(legacyIngredient.supplier);
    const supplierKey = normalizeSupplierKey(supplierName);
    const fournisseur_id = supplierKey ? (supplierIdByKey.get(supplierKey) || null) : null;

    if (!supplierName) {
      report.warnings.push({ type: "INGREDIENT_WITHOUT_SUPPLIER", ingredientId: legacyIngredient.id, ingredientName: legacyIngredient.name || "" });
    }

    return {
      id: Number(legacyIngredient.id),
      nom: normalizeText(legacyIngredient.name),
      famille: normalizeText(legacyIngredient.category),
      unite_par_defaut: normalizeText(legacyIngredient.unit),
      prix_achat: Number(legacyIngredient.price || 0),
      quantite_reference_prix: schema.defaults.quantite_reference_prix,
      fournisseur_id,
      actif: true,
    };
  }

  function mapLegacyRecipeBase(legacyRecipe, report) {
    const categories = schema.helpers.ensureCategoriesArray(legacyRecipe.categories || legacyRecipe.category);
    if (categories.length > 1) {
      report.notes.push({ type: "MULTI_CATEGORY_RECIPE_BASE", recipeId: legacyRecipe.id, categories });
    }

    return {
      id: Number(legacyRecipe.id),
      nom: normalizeText(legacyRecipe.name),
      categorie: categories,
      nombre_couverts_reference: legacyRecipe.covers != null ? Number(legacyRecipe.covers) : undefined,
      rendement_reference: {
        quantite: Number(legacyRecipe.outputQuantity || legacyRecipe.covers || 1),
        unite: normalizeText(legacyRecipe.outputUnit || "Unité"),
      },
      processus: legacyRecipe.procedure || "",
      tva_percent: schema.defaults.tva_percent,
      coeff_perte_global: Number(legacyRecipe.wasteCoeff || schema.defaults.coeff_perte_global),
      actif: true,
    };
  }

  function mapLegacyPlatFinal(legacyRecipe, report) {
    const categories = schema.helpers.ensureCategoriesArray(legacyRecipe.categories || legacyRecipe.category);
    if (categories.length > 1) {
      report.notes.push({ type: "MULTI_CATEGORY_PLAT_FINAL", recipeId: legacyRecipe.id, categories });
    }

    const covers = Number(legacyRecipe.covers || 0);
    if (covers <= 0) {
      report.warnings.push({ type: "FINAL_WITHOUT_VALID_COVERS", recipeId: legacyRecipe.id, recipeName: legacyRecipe.name || "" });
    }

    return {
      id: Number(legacyRecipe.id),
      nom: normalizeText(legacyRecipe.name),
      categorie: categories,
      nombre_couverts_reference: covers > 0 ? covers : 1,
      rendement_reference: {
        quantite: Number(legacyRecipe.outputQuantity || 1),
        unite: normalizeText(legacyRecipe.outputUnit || "Portion"),
      },
      tva_percent: schema.defaults.tva_percent,
      processus: legacyRecipe.procedure || "",
      coeff_perte_global: Number(legacyRecipe.wasteCoeff || schema.defaults.coeff_perte_global),
      actif: true,
    };
  }

  function buildSuppliersFromIngredients(legacyIngredients, report) {
    const suppliers = [];
    const supplierIdByKey = new Map();
    let nextId = 1;

    for (const ing of legacyIngredients || []) {
      const rawName = normalizeText(ing.supplier);
      if (!rawName) continue;
      const key = normalizeSupplierKey(rawName);

      if (supplierIdByKey.has(key)) {
        const canonical = suppliers.find((s) => s.id === supplierIdByKey.get(key));
        if (canonical && canonical.nom !== rawName) {
          report.notes.push({ type: "SUPPLIER_NAME_VARIANT", canonical: canonical.nom, variant: rawName });
        }
        continue;
      }

      supplierIdByKey.set(key, nextId);
      suppliers.push({ id: nextId, nom: rawName, contact: {}, actif: true });
      nextId += 1;
    }

    return { suppliers, supplierIdByKey };
  }

  function migrateLegacyData(legacy) {
    const report = {
      warnings: [],
      errors: [],
      notes: [],
      stats: {
        ingredients_legacy: (legacy.ingredients || []).length,
        recipes_legacy: (legacy.recipes || []).length,
      },
    };

    const { suppliers, supplierIdByKey } = buildSuppliersFromIngredients(legacy.ingredients || [], report);
    const ingredients = (legacy.ingredients || []).map((ing) => mapLegacyIngredient(ing, supplierIdByKey, report));

    const recettesBase = [];
    const platsFinals = [];
    const lignesRecetteIngredient = [];
    const lignesPlatSousRecette = [];
    const lignesPlatIngredientDirect = [];

    let lineId = 1;
    const recipeIdSet = new Set((legacy.recipes || []).map((r) => Number(r.id)));

    for (const legacyRecipe of legacy.recipes || []) {
      const recipeId = Number(legacyRecipe.id);
      const recipeType = legacyRecipe.recipeType || "base";

      if (recipeType === "base") {
        recettesBase.push(mapLegacyRecipeBase(legacyRecipe, report));

        for (const ingLine of legacyRecipe.directIngredients || []) {
          if (!ingredients.find((i) => i.id === Number(ingLine.ingredientId))) {
            report.warnings.push({ type: "MISSING_INGREDIENT_REFERENCE", recipeId, ingredientId: ingLine.ingredientId });
          }
          lignesRecetteIngredient.push({
            id: lineId++,
            recette_base_id: recipeId,
            ingredient_id: Number(ingLine.ingredientId),
            quantite: Number(ingLine.quantity || 0),
            unite: normalizeText(ingLine.unit),
            coeff_perte_ligne: Number(ingLine.wasteCoeff || 1),
          });
        }
      } else {
        platsFinals.push(mapLegacyPlatFinal(legacyRecipe, report));

        for (const ingLine of legacyRecipe.directIngredients || []) {
          if (!ingredients.find((i) => i.id === Number(ingLine.ingredientId))) {
            report.warnings.push({ type: "MISSING_INGREDIENT_REFERENCE", recipeId, ingredientId: ingLine.ingredientId });
          }
          lignesPlatIngredientDirect.push({
            id: lineId++,
            plat_final_id: recipeId,
            ingredient_id: Number(ingLine.ingredientId),
            quantite: Number(ingLine.quantity || 0),
            unite: normalizeText(ingLine.unit),
            coeff_perte_ligne: Number(ingLine.wasteCoeff || 1),
          });
        }

        for (const baseLine of legacyRecipe.baseComponents || []) {
          const recette_source_id = Number(baseLine.baseRecipeId);
          if (!recipeIdSet.has(recette_source_id)) {
            report.warnings.push({ type: "MISSING_BASE_RECIPE_REFERENCE", recipeId, recette_source_id });
          }
          lignesPlatSousRecette.push({
            id: lineId++,
            plat_final_id: recipeId,
            recette_source_id,
            quantite_utilisee: Number(baseLine.quantity || 0),
            unite_utilisee: normalizeText(baseLine.unit),
          });
        }
      }
    }

    report.stats.suppliers_target = suppliers.length;
    report.stats.ingredients_target = ingredients.length;
    report.stats.recettes_base_target = recettesBase.length;
    report.stats.plats_finals_target = platsFinals.length;
    report.stats.lignes_recette_ingredient_target = lignesRecetteIngredient.length;
    report.stats.lignes_plat_sous_recette_target = lignesPlatSousRecette.length;
    report.stats.lignes_plat_ingredient_direct_target = lignesPlatIngredientDirect.length;

    return {
      schemaVersion: 1,
      convention: {
        quantite_reference_prix: "Si quantite_reference_prix=1 alors cela signifie 1 unité de unite_par_defaut.",
      },
      fournisseurs: suppliers,
      ingredients,
      recettesBase,
      platsFinals,
      lignesRecetteIngredient,
      lignesPlatSousRecette,
      lignesPlatIngredientDirect,
      report,
    };
  }

  global.ArpegeLegacyMigration = {
    migrateLegacyData,
  };
})(window);
