(function (global) {
  function toNumberOrDefault(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildDirectIngredientLine({
    ingredient,
    ingredientId,
    quantity,
    unit,
    wasteCoeff,
  }) {
    if (!ingredient) return null;
    return {
      ingredientId: Number(ingredientId ?? ingredient.id),
      name: ingredient.name,
      quantity: toNumberOrDefault(quantity, 0),
      unit: unit || ingredient.unit || "Gramme",
      wasteCoeff: toNumberOrDefault(wasteCoeff, 1),
      pricePerUnit: ingredient.price,
      unitPrice: ingredient.unit,
    };
  }

  function buildBaseComponentLine({
    baseRecipe,
    baseRecipeId,
    quantity,
    unit,
    usageMode,
    portionCount,
  }) {
    if (!baseRecipe) return null;
    const mode = usageMode === "portion" ? "portion" : "quantity";
    const line = {
      baseRecipeId: Number(baseRecipeId ?? baseRecipe.id),
      name: baseRecipe.name,
      quantity: toNumberOrDefault(quantity, 0),
      unit: unit || baseRecipe.outputUnit || "Gramme",
    };
    if (mode === "portion") {
      line.usageMode = "portion";
      line.portionCount = toNumberOrDefault(portionCount, 0);
    }
    return line;
  }

  global.ArpegeRecipeBuilder = {
    buildDirectIngredientLine,
    buildBaseComponentLine,
  };
})(window);
