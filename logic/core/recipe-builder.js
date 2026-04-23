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
  }) {
    if (!baseRecipe) return null;
    return {
      baseRecipeId: Number(baseRecipeId ?? baseRecipe.id),
      name: baseRecipe.name,
      quantity: toNumberOrDefault(quantity, 0),
      unit: unit || baseRecipe.outputUnit || "Gramme",
    };
  }

  global.ArpegeRecipeBuilder = {
    buildDirectIngredientLine,
    buildBaseComponentLine,
  };
})(window);
