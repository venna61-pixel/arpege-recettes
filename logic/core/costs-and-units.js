(function (global) {
  const MASS_UNITS = { "Kg": 1000, "Gramme": 1 };
  const VOLUME_UNITS = { "Litre": 1000, "Ml": 1, "Cl": 10 };
  const COUNT_UNITS = [
    "Pièce", "Unité", "Part", "Portion", "Bac", "Bib", "Barquette", "Bidon", "Bobine", "Bocal", "Boîte",
    "Boîte 1/4", "Boîte 1/8", "Boîte 2/1", "Boîte 3/1", "Boîte 3/4", "Boîte 4/4", "Boîte 5/1", "Bombe",
    "Botte", "Bouteille", "Brick", "Coffret", "Colis", "Distribute", "Étui", "Flacon", "Fut", "Lot", "Pack",
    "Pain", "Paire", "Paquet", "Plaque", "Plateau", "Poche", "Pot", "Rouleau", "Sac", "Sachet", "Seau",
    "Tablette", "Terrine", "Tube", "Tubo", "Carton"
  ];
  const LOGIC_UNITS = Array.from(new Set([
    ...Object.keys(MASS_UNITS),
    ...Object.keys(VOLUME_UNITS),
    ...COUNT_UNITS,
  ]));
  const COST_DEBUG_FLAG = "__ARPEGE_COST_DEBUG__";

  const getUnitGroup = (unit) => MASS_UNITS[unit] ? "mass" : VOLUME_UNITS[unit] ? "volume" : COUNT_UNITS.includes(unit) ? "count" : "unknown";

  const convertQuantity = (quantity, fromUnit, toUnit) => {
    if (quantity == null || !fromUnit || !toUnit || fromUnit === toUnit) return quantity;
    const fromGroup = getUnitGroup(fromUnit);
    const toGroup = getUnitGroup(toUnit);
    if (fromGroup !== toGroup) return null;
    if (fromGroup === "mass") return quantity * MASS_UNITS[fromUnit] / MASS_UNITS[toUnit];
    if (fromGroup === "volume") return quantity * VOLUME_UNITS[fromUnit] / VOLUME_UNITS[toUnit];
    if (fromGroup === "count") return quantity;
    return null;
  };

  const getIngredientById = (ingredientsCatalog, ingredientId) => {
    if (!Array.isArray(ingredientsCatalog)) return null;
    return ingredientsCatalog.find((ing) => Number(ing.id) === Number(ingredientId)) || null;
  };

  const getIngredientByName = (ingredientsCatalog, ingredientName) => {
    if (!Array.isArray(ingredientsCatalog)) return null;
    const expected = String(ingredientName || "").trim().toLowerCase();
    if (!expected) return null;
    return ingredientsCatalog.find((ing) => String(ing?.name || "").trim().toLowerCase() === expected) || null;
  };

  const logPricingPath = (reason, payload = {}) => {
    if (!global?.[COST_DEBUG_FLAG]) return;
    console.debug(`[Costs] Pricing path=${reason}`, payload);
  };

  const resolveIngredientPricing = (ingredientLine, ingredientsCatalog) => {
    const ingredientId = ingredientLine?.ingredientId;
    const sourceIngredient = getIngredientById(ingredientsCatalog, ingredientId);
    if (sourceIngredient) {
      const parsedPrice = Number(sourceIngredient.price);
      logPricingPath("catalog", { ingredientId, name: ingredientLine?.name, sourceIngredientId: sourceIngredient.id });
      return {
        pricePerUnit: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null,
        pricingUnit: String(sourceIngredient.unit || "").trim() || null,
        source: "catalog",
      };
    }

    if (ingredientId != null && ingredientId !== "") {
      logPricingPath("id mismatch", { ingredientId, name: ingredientLine?.name });
    } else {
      logPricingPath("missing ingredientId", { name: ingredientLine?.name });
    }
    const sourceByName = getIngredientByName(ingredientsCatalog, ingredientLine?.name);
    if (sourceByName) {
      const parsedPrice = Number(sourceByName.price);
      logPricingPath("catalog", { ingredientId: sourceByName.id, name: ingredientLine?.name, via: "name" });
      return {
        pricePerUnit: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null,
        pricingUnit: String(sourceByName.unit || "").trim() || null,
        source: "catalog",
      };
    }

    const legacyPrice = ingredientLine?.pricePerUnit;
    const hasLegacyPrice = legacyPrice !== undefined && legacyPrice !== null && String(legacyPrice).trim() !== "";
    const parsedLegacyPrice = hasLegacyPrice ? Number(legacyPrice) : null;
    logPricingPath("fallback legacy", { ingredientId, name: ingredientLine?.name, hasLegacyPrice });
    return {
      pricePerUnit: Number.isFinite(parsedLegacyPrice) && parsedLegacyPrice > 0 ? parsedLegacyPrice : null,
      pricingUnit: resolvePricingUnit(ingredientLine),
      source: "legacy",
    };
  };

  const calculateIngredientCost = (ingredientLine, ingredientsCatalog = null) => {
    const recipeQty = Number(ingredientLine.quantity || 0);
    const pricing = resolveIngredientPricing(ingredientLine, ingredientsCatalog);
    const pricingUnit = pricing.pricingUnit;
    if (!Number.isFinite(pricing.pricePerUnit)) return null;
    if (!pricingUnit) return null;
    const convertedQty = convertQuantity(recipeQty, ingredientLine.unit, pricingUnit);
    if (convertedQty == null) return null;
    const wastePct = Number(ingredientLine.wasteCoeff ?? 0);
    const wasteFactor = wastePct >= 100 ? 1 : 100 / (100 - wastePct);
    return convertedQty * Number(pricing.pricePerUnit || 0) * wasteFactor;
  };

  const resolvePricingUnit = (ingredientLine) => {
    const explicitPricingUnit = String(ingredientLine?.unitPrice || "").trim();
    if (explicitPricingUnit) return explicitPricingUnit;
    const recipeUnit = String(ingredientLine?.unit || "").trim();
    return recipeUnit || null;
  };

  const computeTheoreticalYieldFromDirectIngredients = (recipe) => {
    const current = normalizeRecipe(recipe);
    const lines = current.directIngredients || [];
    if (lines.length === 0) return null;

    const firstLine = lines.find((line) => Number.isFinite(Number(line?.quantity)) && Number(line?.quantity) >= 0);
    if (!firstLine || !firstLine.unit) return null;
    const referenceUnit = firstLine.unit;
    const referenceGroup = getUnitGroup(referenceUnit);
    if (referenceGroup === "unknown") return null;

    let total = 0;
    for (const line of lines) {
      const qty = Number(line?.quantity);
      if (!Number.isFinite(qty) || qty < 0) return null;
      const group = getUnitGroup(line?.unit);
      if (group !== referenceGroup) return null;
      const converted = convertQuantity(qty, line.unit, referenceUnit);
      if (converted == null) return null;
      total += Number(converted || 0);
    }

    return { quantity: total, unit: referenceUnit, source: "theoretical" };
  };

  const isValidYield = (yieldValue) => {
    if (!yieldValue) return false;
    return Number.isFinite(Number(yieldValue.quantity)) && Number(yieldValue.quantity) > 0 && !!String(yieldValue.unit || "").trim();
  };

  // Entrée: une recette (legacy/normalisée). Sortie: rendement exploitable priorisé (actual > legacy > theoretical) ou null.
  // Cas fallback: si une source est absente/invalide, on tente la suivante. Limite: retourne null si aucune source cohérente.
  const resolveEffectiveYield = (recipe) => {
    const current = normalizeRecipe(recipe);
    const actualYield = {
      quantity: Number(current.actualOutputQuantity),
      unit: current.actualOutputUnit,
      source: "actual",
    };
    if (isValidYield(actualYield)) return actualYield;

    const legacyYield = {
      quantity: Number(current.outputQuantity),
      unit: current.outputUnit,
      source: "legacy",
    };
    if (isValidYield(legacyYield)) return legacyYield;

    const theoreticalYield = computeTheoreticalYieldFromDirectIngredients(current);
    if (isValidYield(theoreticalYield)) return theoreticalYield;
    return null;
  };

  const resolveUsageMode = (component) => (component?.usageMode === "portion" ? "portion" : "quantity");

  const computeBaseComponentCost = ({ component, baseRecipe, baseCost }) => {
    const effectiveYield = resolveEffectiveYield(baseRecipe);
    if (!effectiveYield) return null;

    const usageMode = resolveUsageMode(component);
    if (usageMode === "portion") {
      const portionCount = Number(component?.portionCount ?? component?.quantity ?? 0);
      const basePortions = Number(baseRecipe?.covers);
      if (!Number.isFinite(portionCount) || portionCount <= 0 || !Number.isFinite(basePortions) || basePortions <= 0) return null;
      return baseCost * (portionCount / basePortions);
    }

    const converted = convertQuantity(Number(component?.quantity || 0), component?.unit, effectiveYield.unit);
    if (converted == null || Number(effectiveYield.quantity || 0) <= 0) return null;
    return baseCost * (converted / Number(effectiveYield.quantity));
  };

  // Entrée: une ligne d'ingrédient saisie au formulaire + catalogue ingrédients.
  // Sortie: { valid, message } cohérent avec getCostStatus.
  // valid:false uniquement quand on peut prouver l'incompatibilité (groupes mass/volume/count
  // différents). On reste silencieux quand on manque d'éléments pour décider — la validation
  // des champs obligatoires reste l'affaire de validateRecipeDraft.
  const checkLineUnitConvertibility = (ingredientLine, ingredientsCatalog = null) => {
    const lineUnit = String(ingredientLine?.unit || "").trim();
    if (!lineUnit) return { valid: true, message: null };

    const pricing = resolveIngredientPricing(ingredientLine, ingredientsCatalog);
    const pricingUnit = pricing?.pricingUnit ? String(pricing.pricingUnit).trim() : null;
    if (!pricingUnit) return { valid: true, message: null };

    if (lineUnit === pricingUnit) return { valid: true, message: null };

    const lineGroup = getUnitGroup(lineUnit);
    const pricingGroup = getUnitGroup(pricingUnit);
    if (lineGroup === "unknown" || pricingGroup === "unknown") {
      return { valid: true, message: null };
    }

    if (lineGroup !== pricingGroup) {
      const ingredientLabel = String(ingredientLine?.name || "").trim() || "cet ingrédient";
      return {
        valid: false,
        message: `L'unité « ${lineUnit} » n'est pas convertible vers l'unité d'achat « ${pricingUnit} » de ${ingredientLabel}.`,
      };
    }

    return { valid: true, message: null };
  };

  const checkUnitCatalogConsistency = (uiUnits = []) => {
    const uiSet = new Set((uiUnits || []).map((u) => String(u || "").trim()).filter(Boolean));
    const logicSet = new Set(LOGIC_UNITS);

    const missingInUI = LOGIC_UNITS.filter((u) => !uiSet.has(u));
    const extraInUI = Array.from(uiSet).filter((u) => !logicSet.has(u));

    return {
      isConsistent: missingInUI.length === 0 && extraInUI.length === 0,
      missingInUI,
      extraInUI,
    };
  };

  // Entrée: recette potentiellement partielle/hétérogène (fields legacy + champs manquants).
  // Sortie: objet recette normalisé avec valeurs par défaut stables pour le calcul.
  // Limite: n'effectue pas de validation métier stricte, elle prépare seulement des valeurs "calculables".
  const normalizeRecipe = (recipe) => {
    const categories = Array.isArray(recipe.categories)
      ? recipe.categories
      : recipe.category
        ? [recipe.category]
        : [];

    return {
      ...recipe,
      recipeType: recipe.recipeType || "base",
      categories,
      directIngredients: recipe.directIngredients || recipe.ingredients || [],
      baseComponents: recipe.baseComponents || [],
      outputQuantity: Number(recipe.outputQuantity || recipe.covers || 1),
      outputUnit: recipe.outputUnit || (recipe.recipeType === "final" ? "Portion" : "Kg"),
      covers: Number(recipe.covers || 1),
      wasteCoeff: Number(recipe.wasteCoeff ?? 0),
      createdAt: recipe.createdAt || new Date().toISOString(),
    };
  };

  const getRecipeById = (recipes, id) => recipes.find(r => Number(r.id) === Number(id));

  const getRecipeByName = (recipes, name) => {
    if (!Array.isArray(recipes)) return null;
    const expected = String(name || "").trim().toLowerCase();
    if (!expected) return null;
    return recipes.find(r => String(r?.name || "").trim().toLowerCase() === expected) || null;
  };

  // Entrées: recette cible, référentiel des recettes, set anti-cycle, catalogue ingrédients optionnel.
  // Sortie: coût total numérique (avec pertes) ou null si données insuffisantes/inconvertibles/cycle détecté.
  // Cas null/fallback: fallback prix legacy géré en amont; ici toute conversion/référence invalide coupe le calcul.
  // Limite: un seul "null" intermédiaire invalide l'ensemble du coût pour garder un résultat conservateur.
  const calculateRecipeTotalCost = (recipe, allRecipes, visited = new Set(), ingredientsCatalog = null) => {
    const current = normalizeRecipe(recipe);
    if (visited.has(current.id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(current.id);

    let total = 0;
    for (const ing of current.directIngredients) {
      const lineCost = calculateIngredientCost(ing, ingredientsCatalog);
      if (lineCost == null) return null;
      total += lineCost;
    }

    for (const component of current.baseComponents || []) {
      const baseRecipe = getRecipeById(allRecipes, component.baseRecipeId)
        || getRecipeByName(allRecipes, component.name);
      if (!baseRecipe) return null;
      const normalizedBase = normalizeRecipe(baseRecipe);
      const baseCost = calculateRecipeTotalCost(normalizedBase, allRecipes, nextVisited, ingredientsCatalog);
      if (baseCost == null) return null;
      const componentCost = computeBaseComponentCost({ component, baseRecipe: normalizedBase, baseCost });
      if (componentCost == null) return null;
      total += componentCost;
    }

    const globalWastePct = Number(current.wasteCoeff ?? 0);
    const globalWasteFactor = globalWastePct >= 100 ? 1 : 100 / (100 - globalWastePct);
    return total * globalWasteFactor;
  };

  // Entrées : recette à diagnostiquer, référentiel complet des recettes, catalogue ingrédients,
  // visited (anti-cycle, ne pas fournir au premier appel).
  // Sortie : { valid, message } expliquant pourquoi le coût ne peut pas être calculé.
  // Pour une recette finale, descend récursivement dans chaque sous-recette de base afin que
  // l'absence de prix sur un ingrédient profond soit nommée explicitement plutôt que masquée
  // par un "Calcul du coût impossible" générique. Le message des sous-recettes est préfixé
  // par le nom de la sous-recette concernée, ce qui reste lisible sur plusieurs niveaux.
  const getCostStatus = (recipe, allRecipes, ingredientsCatalog = null, visited = new Set()) => {
    const current = normalizeRecipe(recipe);
    if (visited.has(current.id)) {
      return { valid: false, message: `Cycle détecté impliquant « ${current.name || "cette recette"} »` };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(current.id);

    for (const ing of current.directIngredients) {
      const pricing = resolveIngredientPricing(ing, ingredientsCatalog);
      if (!Number.isFinite(pricing.pricePerUnit) || Number(pricing.pricePerUnit) <= 0) {
        return { valid: false, message: `Prix manquant : ${ing.name || "ingrédient inconnu"}` };
      }
      const pricingUnit = pricing.pricingUnit;
      if (!pricingUnit) {
        return { valid: false, message: `Unité de prix manquante pour ${ing.name}` };
      }
      const convertedQty = convertQuantity(Number(ing.quantity || 0), ing.unit, pricingUnit);
      if (convertedQty == null) {
        return { valid: false, message: `Conversion impossible entre ${ing.unit} et ${pricingUnit} pour ${ing.name}` };
      }
    }

    for (const component of current.baseComponents || []) {
      const baseRecipe = getRecipeById(allRecipes, component.baseRecipeId)
        || getRecipeByName(allRecipes, component.name);
      if (!baseRecipe) {
        return { valid: false, message: `Recette de base introuvable : ${component.name}` };
      }
      const normalizedBase = normalizeRecipe(baseRecipe);

      // Vérifier que la sous-recette est intrinsèquement calculable avant de regarder
      // le joint (rendement, conversion, portions). Le message remonte enrichi.
      const subStatus = getCostStatus(normalizedBase, allRecipes, ingredientsCatalog, nextVisited);
      if (!subStatus.valid) {
        const subLabel = normalizedBase.name || component.name || "sous-recette";
        return { valid: false, message: `« ${subLabel} » → ${subStatus.message}` };
      }

      const effectiveYield = resolveEffectiveYield(normalizedBase);
      if (!effectiveYield) {
        return { valid: false, message: `Rendement invalide pour ${normalizedBase.name || component.name}` };
      }
      const usageMode = resolveUsageMode(component);
      if (usageMode === "portion") {
        const portionCount = Number(component?.portionCount ?? component?.quantity ?? 0);
        const basePortions = Number(normalizedBase?.covers);
        if (!Number.isFinite(portionCount) || portionCount <= 0 || !Number.isFinite(basePortions) || basePortions <= 0) {
          return { valid: false, message: `Couverts de référence invalides pour ${component.name}` };
        }
      } else {
        const convertedQty = convertQuantity(Number(component.quantity || 0), component.unit, effectiveYield.unit);
        if (convertedQty == null) {
          return { valid: false, message: `Conversion impossible entre ${component.unit} et ${effectiveYield.unit} pour ${component.name}` };
        }
      }
    }

    const totalCost = calculateRecipeTotalCost(current, allRecipes, new Set(), ingredientsCatalog);
    if (totalCost == null) return { valid: false, message: "Calcul du coût impossible" };
    return { valid: true, message: "" };
  };

  global.FormulaCostsAndUnits = {
    MASS_UNITS,
    VOLUME_UNITS,
    COUNT_UNITS,
    LOGIC_UNITS,
    getUnitGroup,
    convertQuantity,
    getIngredientById,
    resolveIngredientPricing,
    resolvePricingUnit,
    computeTheoreticalYieldFromDirectIngredients,
    resolveEffectiveYield,
    resolveUsageMode,
    computeBaseComponentCost,
    calculateIngredientCost,
    normalizeRecipe,
    getRecipeById,
    calculateRecipeTotalCost,
    getCostStatus,
    checkLineUnitConvertibility,
    checkUnitCatalogConsistency,
  };
})(window);
