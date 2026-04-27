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
      logPricingPath("catalog", { ingredientId, name: ingredientLine?.name, sourceIngredientId: sourceIngredient.id });
      return {
        pricePerUnit: Number(sourceIngredient.price || 0),
        pricingUnit: String(sourceIngredient.unit || "").trim() || null,
        source: "catalog",
      };
    }

    if (ingredientId != null && ingredientId !== "") {
      logPricingPath("id mismatch", { ingredientId, name: ingredientLine?.name });
    } else {
      logPricingPath("missing ingredientId", { name: ingredientLine?.name });
      const sourceByName = getIngredientByName(ingredientsCatalog, ingredientLine?.name);
      if (sourceByName) {
        logPricingPath("catalog", { ingredientId: sourceByName.id, name: ingredientLine?.name, via: "name" });
        return {
          pricePerUnit: Number(sourceByName.price || 0),
          pricingUnit: String(sourceByName.unit || "").trim() || null,
          source: "catalog",
        };
      }
    }

    const legacyPrice = ingredientLine?.pricePerUnit;
    const hasLegacyPrice = legacyPrice !== undefined && legacyPrice !== null && String(legacyPrice).trim() !== "";
    logPricingPath("fallback legacy", { ingredientId, name: ingredientLine?.name, hasLegacyPrice });
    return {
      pricePerUnit: hasLegacyPrice ? Number(legacyPrice) : null,
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
    return convertedQty * Number(pricing.pricePerUnit || 0) * Number(ingredientLine.wasteCoeff || 1);
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
      wasteCoeff: Number(recipe.wasteCoeff || 1),
    };
  };

  const getRecipeById = (recipes, id) => recipes.find(r => Number(r.id) === Number(id));

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
      const baseRecipe = getRecipeById(allRecipes, component.baseRecipeId);
      if (!baseRecipe) return null;
      const normalizedBase = normalizeRecipe(baseRecipe);
      const baseCost = calculateRecipeTotalCost(normalizedBase, allRecipes, nextVisited, ingredientsCatalog);
      if (baseCost == null) return null;
      const componentCost = computeBaseComponentCost({ component, baseRecipe: normalizedBase, baseCost });
      if (componentCost == null) return null;
      total += componentCost;
    }

    return total * Number(current.wasteCoeff || 1);
  };

  const getCostStatus = (recipe, allRecipes, ingredientsCatalog = null) => {
    const current = normalizeRecipe(recipe);
    for (const ing of current.directIngredients) {
      const pricing = resolveIngredientPricing(ing, ingredientsCatalog);
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
      const baseRecipe = getRecipeById(allRecipes, component.baseRecipeId);
      if (!baseRecipe) {
        return { valid: false, message: `Recette de base introuvable : ${component.name}` };
      }
      const normalizedBase = normalizeRecipe(baseRecipe);
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

  global.ArpegeCostsAndUnits = {
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
    checkUnitCatalogConsistency,
  };
})(window);
