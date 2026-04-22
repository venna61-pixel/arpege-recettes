(function (global) {
  const schema = global.ArpegeSchema;

  const KNOWN_UNITS = new Set([
    "Bac", "Bib", "Barquette", "Bidon", "Bobine", "Bocal", "Boîte", "Boîte 1/4", "Boîte 1/8",
    "Boîte 2/1", "Boîte 3/1", "Boîte 3/4", "Boîte 4/4", "Boîte 5/1", "Bombe", "Botte", "Bouteille",
    "Brick", "Coffret", "Colis", "Distribute", "Étui", "Flacon", "Fut", "Kg", "Lot", "Litre", "Pack",
    "Pain", "Paire", "Paquet", "Pièce", "Plaque", "Plateau", "Poche", "Pot", "Rouleau", "Sac", "Sachet",
    "Seau", "Tablette", "Terrine", "Tube", "Tubo", "Unité", "Carton", "Cl", "Part", "Portion", "Gramme", "Ml",
  ]);

  const FALLBACKS = {
    unit: "Unité",
    category: "Non classé",
    recetteBaseUnknownType: "base",
  };

  const REFERENCE_POLICY = {
    missingIngredientReference: "KEEP_WITH_STATUS_INVALID_REFERENCE",
    missingRecipeReference: "KEEP_WITH_STATUS_INVALID_REFERENCE",
    invalidLineData: "EXCLUDE_LINE",
  };

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeSupplierKey(name) {
    return normalizeText(name).toLocaleLowerCase("fr");
  }

  function createIssue(report, level, type, payload) {
    const issue = {
      type,
      ...payload,
    };
    if (level === "error") report.errors.push(issue);
    else if (level === "warning") report.warnings.push(issue);
    else report.notes.push(issue);
  }

  function parseId(value, report, context) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      createIssue(report, "error", "INVALID_ID", { context, rawValue: value, policy: "EXCLUDE_RECORD" });
      return null;
    }
    return parsed;
  }

  function parseNumber(value, report, context, options = {}) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      createIssue(report, "error", "INVALID_NUMBER", { context, rawValue: value, policy: options.policyOnInvalid || "EXCLUDE_RECORD" });
      return null;
    }
    if (options.gtZero && parsed <= 0) {
      createIssue(report, "error", "INVALID_POSITIVE_NUMBER", { context, rawValue: value, policy: options.policyOnInvalid || "EXCLUDE_RECORD" });
      return null;
    }
    return parsed;
  }

  function parseUnit(value, report, context, { fallbackAllowed = false } = {}) {
    const unit = normalizeText(value);
    if (!unit) {
      if (fallbackAllowed) {
        createIssue(report, "warning", "EMPTY_UNIT_FALLBACK", { context, fallback: FALLBACKS.unit, policy: "KEEP_WITH_FALLBACK" });
        return FALLBACKS.unit;
      }
      createIssue(report, "error", "EMPTY_UNIT", { context, policy: "EXCLUDE_RECORD" });
      return null;
    }

    if (!KNOWN_UNITS.has(unit)) {
      createIssue(report, "warning", "UNKNOWN_UNIT", { context, unit, policy: fallbackAllowed ? "KEEP_AS_IS" : "KEEP_AS_IS" });
    }
    return unit;
  }

  function parseCategories(rawValue, report, context) {
    const categories = schema.helpers.ensureCategoriesArray(rawValue);
    if (!categories.length) {
      createIssue(report, "warning", "EMPTY_CATEGORIES_FALLBACK", { context, fallback: [FALLBACKS.category], policy: "KEEP_WITH_FALLBACK" });
      return [FALLBACKS.category];
    }
    if (categories.length > 1) {
      createIssue(report, "note", "MULTI_CATEGORY", { context, categories, policy: "KEEP_MULTIPLE_CATEGORIES" });
    }
    return categories;
  }

  function mapLegacyIngredient(legacyIngredient, supplierIdByKey, report, index) {
    const ingredientId = parseId(legacyIngredient.id, report, { entity: "Ingredient", field: "id", index });
    if (ingredientId == null) return null;

    const nom = normalizeText(legacyIngredient.name);
    if (!nom) {
      createIssue(report, "warning", "EMPTY_INGREDIENT_NAME", { ingredientId, policy: "KEEP_WITH_FALLBACK" });
    }

    const prixAchat = parseNumber(legacyIngredient.price, report, { entity: "Ingredient", field: "price", ingredientId }, { gtZero: true, policyOnInvalid: "EXCLUDE_RECORD" });
    if (prixAchat == null) {
      createIssue(report, "error", "INGREDIENT_EXCLUDED_INVALID_PRICE", { ingredientId, policy: "EXCLUDE_RECORD" });
      return null;
    }

    const unit = parseUnit(legacyIngredient.unit, report, { entity: "Ingredient", field: "unit", ingredientId }, { fallbackAllowed: true });
    const supplierName = normalizeText(legacyIngredient.supplier);
    const supplierKey = normalizeSupplierKey(supplierName);
    const fournisseur_id = supplierKey ? (supplierIdByKey.get(supplierKey) || null) : null;

    if (!supplierName) {
      createIssue(report, "warning", "INGREDIENT_WITHOUT_SUPPLIER", { ingredientId, ingredientName: legacyIngredient.name || "", policy: "KEEP_WITH_NULL_SUPPLIER" });
    }

    createIssue(report, "note", "DEFAULT_QUANTITE_REFERENCE_PRIX_APPLIED", {
      ingredientId,
      quantite_reference_prix: schema.defaults.quantite_reference_prix,
      convention: "1 unité de unite_par_defaut",
      policy: "KEEP_WITH_DEFAULT",
    });

    return {
      id: ingredientId,
      nom: nom || `Ingrédient #${ingredientId}`,
      famille: normalizeText(legacyIngredient.category) || FALLBACKS.category,
      unite_par_defaut: unit,
      prix_achat: prixAchat,
      quantite_reference_prix: schema.defaults.quantite_reference_prix,
      fournisseur_id,
      actif: true,
    };
  }

  function inferRendementReference(legacyRecipe, report, recipeId, recipeKind) {
    const outputUnit = parseUnit(legacyRecipe.outputUnit, report, { entity: recipeKind, field: "outputUnit", recipeId }, { fallbackAllowed: true });
    const qty = parseNumber(
      legacyRecipe.outputQuantity,
      report,
      { entity: recipeKind, field: "outputQuantity", recipeId },
      { gtZero: true, policyOnInvalid: "KEEP_WITH_FALLBACK" }
    );

    if (qty == null) {
      const fallbackQty = parseNumber(legacyRecipe.covers, report, { entity: recipeKind, field: "coversAsRendementFallback", recipeId }, { gtZero: true, policyOnInvalid: "KEEP_WITH_FALLBACK" }) || 1;
      createIssue(report, "warning", "RENDEMENT_FALLBACK_APPLIED", {
        recipeId,
        fallback: { quantite: fallbackQty, unite: outputUnit || FALLBACKS.unit },
        policy: "KEEP_WITH_FALLBACK",
      });
      return { quantite: fallbackQty, unite: outputUnit || FALLBACKS.unit };
    }

    return { quantite: qty, unite: outputUnit || FALLBACKS.unit };
  }

  function mapLegacyRecipeBase(legacyRecipe, report, recipeId) {
    const categories = parseCategories(legacyRecipe.categories || legacyRecipe.category, report, { entity: "RecetteBase", recipeId });
    const covers = legacyRecipe.covers == null ? undefined : parseNumber(legacyRecipe.covers, report, { entity: "RecetteBase", field: "covers", recipeId }, { gtZero: true, policyOnInvalid: "KEEP_AS_UNDEFINED" });
    const rendementReference = inferRendementReference(legacyRecipe, report, recipeId, "RecetteBase");

    createIssue(report, "note", "DEFAULT_TVA_APPLIED", {
      recipeId,
      entity: "RecetteBase",
      tva_percent: schema.defaults.tva_percent,
      policy: "KEEP_WITH_DEFAULT",
    });

    return {
      id: recipeId,
      nom: normalizeText(legacyRecipe.name) || `Recette base #${recipeId}`,
      categorie: categories,
      nombre_couverts_reference: covers == null ? undefined : covers,
      rendement_reference: rendementReference,
      processus: legacyRecipe.procedure || "",
      tva_percent: schema.defaults.tva_percent,
      coeff_perte_global: Number(legacyRecipe.wasteCoeff || schema.defaults.coeff_perte_global),
      actif: true,
    };
  }

  function mapLegacyPlatFinal(legacyRecipe, report, recipeId) {
    const categories = parseCategories(legacyRecipe.categories || legacyRecipe.category, report, { entity: "PlatFinal", recipeId });

    const covers = parseNumber(legacyRecipe.covers, report, { entity: "PlatFinal", field: "covers", recipeId }, { gtZero: true, policyOnInvalid: "KEEP_WITH_FALLBACK" });
    const coversFinal = covers == null ? 1 : covers;
    if (covers == null) {
      createIssue(report, "warning", "FINAL_COVERS_FORCED", {
        recipeId,
        fallback: 1,
        policy: "KEEP_WITH_FALLBACK",
      });
    }

    const rendementReference = inferRendementReference(legacyRecipe, report, recipeId, "PlatFinal");

    createIssue(report, "note", "DEFAULT_TVA_APPLIED", {
      recipeId,
      entity: "PlatFinal",
      tva_percent: schema.defaults.tva_percent,
      policy: "KEEP_WITH_DEFAULT",
    });

    return {
      id: recipeId,
      nom: normalizeText(legacyRecipe.name) || `Plat final #${recipeId}`,
      categorie: categories,
      nombre_couverts_reference: coversFinal,
      rendement_reference: rendementReference,
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
          createIssue(report, "note", "SUPPLIER_NAME_VARIANT", {
            canonical: canonical.nom,
            variant: rawName,
            policy: "MERGED_BY_NORMALIZED_KEY",
          });
        }
        continue;
      }

      supplierIdByKey.set(key, nextId);
      suppliers.push({ id: nextId, nom: rawName, contact: {}, actif: true });
      nextId += 1;
    }

    return { suppliers, supplierIdByKey };
  }

  function createLineIdGenerator() {
    let lineId = 1;
    return () => lineId++;
  }

  function addRecipeEdge(adjacency, fromId, toId) {
    if (!adjacency.has(fromId)) adjacency.set(fromId, new Set());
    adjacency.get(fromId).add(toId);
  }

  function detectRecipeCycles(adjacency, report) {
    const visiting = new Set();
    const visited = new Set();
    const stack = [];

    function dfs(node) {
      if (visiting.has(node)) {
        const cycleStart = stack.indexOf(node);
        const cyclePath = stack.slice(cycleStart).concat(node);
        createIssue(report, "error", "RECIPE_CYCLE_DETECTED", {
          cyclePath,
          policy: "KEEP_BUT_MARK_GRAPH_INVALID",
        });
        return;
      }
      if (visited.has(node)) return;

      visiting.add(node);
      stack.push(node);

      const neighbors = adjacency.get(node) || new Set();
      for (const n of neighbors) dfs(n);

      stack.pop();
      visiting.delete(node);
      visited.add(node);
    }

    for (const node of adjacency.keys()) dfs(node);
  }

  function normalizeRecipeType(rawType, report, recipeId) {
    const type = normalizeText(rawType);
    if (type === "base" || type === "final") return type;

    createIssue(report, "warning", "RECIPE_TYPE_UNKNOWN_FALLBACK", {
      recipeId,
      rawRecipeType: rawType,
      fallback: FALLBACKS.recetteBaseUnknownType,
      policy: "KEEP_WITH_FALLBACK",
    });
    return FALLBACKS.recetteBaseUnknownType;
  }

  function mapDirectIngredientLine({ ingLine, recipeId, targetType, ingredientsById, nextLineId, report }) {
    const ingredientId = parseId(ingLine.ingredientId, report, {
      entity: targetType,
      field: "ingredientId",
      recipeId,
    });
    const quantity = parseNumber(ingLine.quantity, report, { entity: targetType, field: "quantity", recipeId, ingredientId: ingLine.ingredientId }, { gtZero: true, policyOnInvalid: REFERENCE_POLICY.invalidLineData });
    const unit = parseUnit(ingLine.unit, report, { entity: targetType, field: "unit", recipeId, ingredientId: ingLine.ingredientId }, { fallbackAllowed: false });

    if (ingredientId == null || quantity == null || unit == null) {
      createIssue(report, "warning", "DIRECT_INGREDIENT_LINE_EXCLUDED", {
        recipeId,
        rawLine: ingLine,
        policy: REFERENCE_POLICY.invalidLineData,
      });
      return null;
    }

    const hasMissingReference = !ingredientsById.has(ingredientId);
    if (hasMissingReference) {
      createIssue(report, "warning", "MISSING_INGREDIENT_REFERENCE", {
        recipeId,
        ingredientId,
        policy: REFERENCE_POLICY.missingIngredientReference,
      });
    }

    const base = {
      id: nextLineId(),
      ingredient_id: ingredientId,
      quantite: quantity,
      unite: unit,
      coeff_perte_ligne: Number(ingLine.wasteCoeff || 1),
      migration_status: hasMissingReference ? "invalid_reference" : "valid",
    };

    return targetType === "RecetteBase"
      ? { ...base, recette_base_id: recipeId }
      : { ...base, plat_final_id: recipeId };
  }

  function mapBaseComponentLine({ baseLine, recipeId, recipeIdSet, nextLineId, report, adjacency }) {
    const sourceRecipeId = parseId(baseLine.baseRecipeId, report, {
      entity: "LignePlatSousRecette",
      field: "baseRecipeId",
      recipeId,
    });
    const quantity = parseNumber(baseLine.quantity, report, { entity: "LignePlatSousRecette", field: "quantity", recipeId, baseRecipeId: baseLine.baseRecipeId }, { gtZero: true, policyOnInvalid: REFERENCE_POLICY.invalidLineData });
    const unit = parseUnit(baseLine.unit, report, { entity: "LignePlatSousRecette", field: "unit", recipeId, baseRecipeId: baseLine.baseRecipeId }, { fallbackAllowed: false });

    if (sourceRecipeId == null || quantity == null || unit == null) {
      createIssue(report, "warning", "BASE_COMPONENT_LINE_EXCLUDED", {
        recipeId,
        rawLine: baseLine,
        policy: REFERENCE_POLICY.invalidLineData,
      });
      return null;
    }

    addRecipeEdge(adjacency, recipeId, sourceRecipeId);

    const hasMissingReference = !recipeIdSet.has(sourceRecipeId);
    if (hasMissingReference) {
      createIssue(report, "warning", "MISSING_BASE_RECIPE_REFERENCE", {
        recipeId,
        recette_source_id: sourceRecipeId,
        policy: REFERENCE_POLICY.missingRecipeReference,
      });
    }

    return {
      id: nextLineId(),
      plat_final_id: recipeId,
      recette_source_id: sourceRecipeId,
      quantite_utilisee: quantity,
      unite_utilisee: unit,
      migration_status: hasMissingReference ? "invalid_reference" : "valid",
    };
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
      policies: REFERENCE_POLICY,
    };

    const { suppliers, supplierIdByKey } = buildSuppliersFromIngredients(legacy.ingredients || [], report);
    const ingredients = (legacy.ingredients || [])
      .map((ing, idx) => mapLegacyIngredient(ing, supplierIdByKey, report, idx))
      .filter(Boolean);

    const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
    const recettesBase = [];
    const platsFinals = [];
    const lignesRecetteIngredient = [];
    const lignesPlatSousRecette = [];
    const lignesPlatIngredientDirect = [];

    const nextLineId = createLineIdGenerator();
    const recipeIdSet = new Set((legacy.recipes || []).map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0));
    const adjacency = new Map();

    for (const legacyRecipe of legacy.recipes || []) {
      const recipeId = parseId(legacyRecipe.id, report, { entity: "Recipe", field: "id", rawRecipe: legacyRecipe });
      if (recipeId == null) {
        createIssue(report, "warning", "RECIPE_EXCLUDED_INVALID_ID", {
          rawRecipe: legacyRecipe,
          policy: "EXCLUDE_RECORD",
        });
        continue;
      }

      const recipeType = normalizeRecipeType(legacyRecipe.recipeType, report, recipeId);

      if (recipeType === "base") {
        recettesBase.push(mapLegacyRecipeBase(legacyRecipe, report, recipeId));

        for (const ingLine of legacyRecipe.directIngredients || []) {
          const mapped = mapDirectIngredientLine({
            ingLine,
            recipeId,
            targetType: "RecetteBase",
            ingredientsById,
            nextLineId,
            report,
          });
          if (mapped) lignesRecetteIngredient.push(mapped);
        }

        for (const baseLine of legacyRecipe.baseComponents || []) {
          const sourceRecipeId = parseId(baseLine.baseRecipeId, report, {
            entity: "RecetteBase",
            field: "baseRecipeId",
            recipeId,
          });
          const quantity = parseNumber(baseLine.quantity, report, { entity: "RecetteBase", field: "baseComponentQuantity", recipeId, baseRecipeId: baseLine.baseRecipeId }, { gtZero: true, policyOnInvalid: REFERENCE_POLICY.invalidLineData });
          const unit = parseUnit(baseLine.unit, report, { entity: "RecetteBase", field: "baseComponentUnit", recipeId, baseRecipeId: baseLine.baseRecipeId }, { fallbackAllowed: false });

          if (sourceRecipeId == null || quantity == null || unit == null) {
            createIssue(report, "warning", "BASE_COMPONENT_IN_BASE_RECIPE_EXCLUDED", {
              recipeId,
              rawLine: baseLine,
              policy: REFERENCE_POLICY.invalidLineData,
            });
            continue;
          }

          addRecipeEdge(adjacency, recipeId, sourceRecipeId);
          createIssue(report, "warning", "BASE_COMPONENT_IN_BASE_RECIPE_IGNORED", {
            recipeId,
            recette_source_id: sourceRecipeId,
            policy: "EDGE_USED_FOR_CYCLE_DETECTION_ONLY",
          });
        }
      } else {
        platsFinals.push(mapLegacyPlatFinal(legacyRecipe, report, recipeId));

        for (const ingLine of legacyRecipe.directIngredients || []) {
          const mapped = mapDirectIngredientLine({
            ingLine,
            recipeId,
            targetType: "PlatFinal",
            ingredientsById,
            nextLineId,
            report,
          });
          if (mapped) lignesPlatIngredientDirect.push(mapped);
        }

        for (const baseLine of legacyRecipe.baseComponents || []) {
          const mapped = mapBaseComponentLine({
            baseLine,
            recipeId,
            recipeIdSet,
            nextLineId,
            report,
            adjacency,
          });
          if (mapped) lignesPlatSousRecette.push(mapped);
        }
      }
    }

    detectRecipeCycles(adjacency, report);

    report.stats.suppliers_target = suppliers.length;
    report.stats.ingredients_target = ingredients.length;
    report.stats.recettes_base_target = recettesBase.length;
    report.stats.plats_finals_target = platsFinals.length;
    report.stats.lignes_recette_ingredient_target = lignesRecetteIngredient.length;
    report.stats.lignes_plat_sous_recette_target = lignesPlatSousRecette.length;
    report.stats.lignes_plat_ingredient_direct_target = lignesPlatIngredientDirect.length;
    report.stats.warnings = report.warnings.length;
    report.stats.errors = report.errors.length;

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
