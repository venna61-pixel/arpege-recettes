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

  const calculateIngredientCost = (ingredientLine) => {
    const recipeQty = Number(ingredientLine.quantity || 0);
    const pricingUnit = resolvePricingUnit(ingredientLine);
    if (!pricingUnit) return null;
    const convertedQty = convertQuantity(recipeQty, ingredientLine.unit, pricingUnit);
    if (convertedQty == null) return null;
    return convertedQty * Number(ingredientLine.pricePerUnit || 0) * Number(ingredientLine.wasteCoeff || 1);
  };

  const resolvePricingUnit = (ingredientLine) => {
    const explicitPricingUnit = String(ingredientLine?.unitPrice || "").trim();
    if (explicitPricingUnit) return explicitPricingUnit;
    const recipeUnit = String(ingredientLine?.unit || "").trim();
    return recipeUnit || null;
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

  const calculateRecipeTotalCost = (recipe, allRecipes, visited = new Set()) => {
    const current = normalizeRecipe(recipe);
    if (visited.has(current.id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(current.id);

    let total = 0;
    for (const ing of current.directIngredients) {
      const lineCost = calculateIngredientCost(ing);
      if (lineCost == null) return null;
      total += lineCost;
    }

    for (const component of current.baseComponents || []) {
      const baseRecipe = getRecipeById(allRecipes, component.baseRecipeId);
      if (!baseRecipe) return null;
      const normalizedBase = normalizeRecipe(baseRecipe);
      const baseCost = calculateRecipeTotalCost(normalizedBase, allRecipes, nextVisited);
      if (baseCost == null) return null;
      const converted = convertQuantity(Number(component.quantity || 0), component.unit, normalizedBase.outputUnit);
      if (converted == null || Number(normalizedBase.outputQuantity || 0) <= 0) return null;
      total += baseCost * (converted / Number(normalizedBase.outputQuantity));
    }

    return total * Number(current.wasteCoeff || 1);
  };

  const getCostStatus = (recipe, allRecipes) => {
    const current = normalizeRecipe(recipe);
    for (const ing of current.directIngredients) {
      const pricingUnit = resolvePricingUnit(ing);
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
      const convertedQty = convertQuantity(Number(component.quantity || 0), component.unit, normalizedBase.outputUnit);
      if (convertedQty == null) {
        return { valid: false, message: `Conversion impossible entre ${component.unit} et ${normalizedBase.outputUnit} pour ${component.name}` };
      }
    }

    const totalCost = calculateRecipeTotalCost(current, allRecipes);
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
    resolvePricingUnit,
    calculateIngredientCost,
    normalizeRecipe,
    getRecipeById,
    calculateRecipeTotalCost,
    getCostStatus,
    checkUnitCatalogConsistency,
  };
})(window);
