(function (global) {
  function getPivotSourceLine(normalizedRecipe, selectedIngredientIndex) {
    const direct = normalizedRecipe.directIngredients || [];
    const base = normalizedRecipe.baseComponents || [];
    const idx = Number(selectedIngredientIndex);
    if (!Number.isInteger(idx) || idx < 0) return null;
    if (idx < direct.length) return direct[idx] || null;
    const baseIdx = idx - direct.length;
    return base[baseIdx] || null;
  }

  function computeTotalDirectQty(normalizedRecipe) {
    return normalizedRecipe.directIngredients.reduce((sum, ing) => sum + Number(ing.quantity || 0), 0)
      + normalizedRecipe.baseComponents.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
  }

  function safeDivide(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }

  function computePivotMultiplier({ pivotType, pivotValue, normalizedRecipe, baseCost, selectedIngredientIndex = 0 }) {
    const numericPivot = parseFloat(pivotValue);
    const ingredientPivotSource = getPivotSourceLine(normalizedRecipe, selectedIngredientIndex);
    const totalDirectQty = computeTotalDirectQty(normalizedRecipe);

    if (!(numericPivot > 0)) {
      return {
        multiplier: 1,
        valid: false,
        reason: "PIVOT_VALUE_INVALID",
        numericPivot,
        ingredientPivotSource,
        totalDirectQty,
      };
    }

    let ratio = null;
    if (pivotType === "covers") ratio = safeDivide(numericPivot, Number(normalizedRecipe.covers || 1));
    if (pivotType === "globalQuantity") ratio = safeDivide(numericPivot, Number(totalDirectQty || 1));
    if (pivotType === "budget") ratio = safeDivide(numericPivot, Number(baseCost || 1));
    if (pivotType === "ingredientQuantity") ratio = safeDivide(numericPivot, Number(ingredientPivotSource?.quantity || 1));

    if (ratio == null) {
      return {
        multiplier: 1,
        valid: false,
        reason: "PIVOT_DIVISION_IMPOSSIBLE",
        numericPivot,
        ingredientPivotSource,
        totalDirectQty,
      };
    }

    return {
      multiplier: ratio,
      valid: true,
      reason: "OK",
      numericPivot,
      ingredientPivotSource,
      totalDirectQty,
    };
  }

  function buildAdaptedRecipe({ normalizedRecipe, multiplier }) {
    const adaptedDirectIngredients = normalizedRecipe.directIngredients.map((ing) => ({
      ...ing,
      adaptedQuantity: Number(ing.quantity || 0) * multiplier,
    }));

    const adaptedBaseComponents = normalizedRecipe.baseComponents.map((c) => ({
      ...c,
      adaptedQuantity: Number(c.quantity || 0) * multiplier,
    }));

    const adaptedRecipe = {
      ...normalizedRecipe,
      covers: normalizedRecipe.covers * multiplier,
      directIngredients: adaptedDirectIngredients.map((i) => ({ ...i, quantity: i.adaptedQuantity })),
      baseComponents: adaptedBaseComponents.map((c) => ({ ...c, quantity: c.adaptedQuantity })),
    };

    return { adaptedDirectIngredients, adaptedBaseComponents, adaptedRecipe };
  }

  function computeAdaptedMetrics({ adaptedRecipe, recipes, calculateRecipeTotalCost, getCostStatus }) {
    const adaptedCost = calculateRecipeTotalCost(adaptedRecipe, recipes);
    const adaptedCostStatus = getCostStatus(adaptedRecipe, recipes);
    return { adaptedCost, adaptedCostStatus };
  }

  global.ArpegeRecipeScaling = {
    getPivotSourceLine,
    computeTotalDirectQty,
    computePivotMultiplier,
    buildAdaptedRecipe,
    computeAdaptedMetrics,
  };
})(window);
