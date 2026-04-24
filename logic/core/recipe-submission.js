(function (global) {
  function validateRecipeDraft(formData) {
    const hasDirectIngredients = Array.isArray(formData?.directIngredients) && formData.directIngredients.length > 0;
    const hasBaseComponents = Array.isArray(formData?.baseComponents) && formData.baseComponents.length > 0;
    const isFinalRecipe = formData?.recipeType === "final";

    if (!hasDirectIngredients && (!isFinalRecipe || !hasBaseComponents)) {
      return { valid: false, message: "Ajoute au moins un ingrédient ou une recette de base." };
    }
    return { valid: true, message: "" };
  }

  function buildRecipePayload(formData, normalizeRecipe) {
    return normalizeRecipe({ ...formData });
  }

  function upsertRecipe(recipes, payload, editingId) {
    if (editingId) {
      return recipes.map((r) => Number(r.id) === Number(editingId) ? { ...payload, id: editingId } : r);
    }
    const nextId = Math.max(...recipes.map((r) => Number(r.id)), 0) + 1;
    return [...recipes, { ...payload, id: nextId }];
  }

  global.ArpegeRecipeSubmission = {
    validateRecipeDraft,
    buildRecipePayload,
    upsertRecipe,
  };
})(window);
