(function (global) {
  // Renvoie { valid, errors } — errors est un tableau de { field, message }.
  // Permet de remonter toutes les erreurs à la fois pour éviter à l'utilisateur
  // une saisie "corriger une erreur → soumettre → erreur suivante → corriger → etc.".
  //
  // Volontairement hors périmètre (déléguer à d'autres couches) :
  // - validation de références (ingredientId pointe sur un ingrédient existant,
  //   baseRecipeId sur une recette existante) — nécessite le contexte ingrédients/recettes
  // - validation de cohérence d'unités (l'unité saisie doit être convertible vers
  //   l'unité d'achat) — signalée au formulaire via FormulaCostsAndUnits.checkLineUnitConvertibility
  //   (avertissement non bloquant) et confirmée au calcul de coût par getCostStatus
  function validateRecipeDraft(formData) {
    const errors = [];
    const data = formData || {};

    // ─── Champs racine ──────────────────────────────────────────────────────
    const recipeType = data.recipeType;
    if (recipeType !== "base" && recipeType !== "final") {
      errors.push({ field: "recipeType", message: "Le type de recette doit être 'base' ou 'final'." });
    }

    if (typeof data.name !== "string" || data.name.trim() === "") {
      errors.push({ field: "name", message: "Le nom de la recette est obligatoire." });
    }

    const validCategories = Array.isArray(data.categories)
      ? data.categories.filter((c) => typeof c === "string" && c.trim() !== "")
      : [];
    if (validCategories.length === 0) {
      errors.push({ field: "categories", message: "Au moins une catégorie est obligatoire." });
    }

    // ─── Couverts : requis pour les recettes finales ────────────────────────
    if (recipeType === "final") {
      const covers = Number(data.covers);
      if (!Number.isFinite(covers) || covers <= 0) {
        errors.push({ field: "covers", message: "Le nombre de couverts doit être supérieur à 0." });
      }
    }

    // ─── Rendement : requis pour les recettes de base ───────────────────────
    if (recipeType === "base") {
      const outputQty = Number(data.outputQuantity);
      if (!Number.isFinite(outputQty) || outputQty <= 0) {
        errors.push({ field: "outputQuantity", message: "La quantité de rendement doit être supérieure à 0." });
      }
      if (typeof data.outputUnit !== "string" || data.outputUnit.trim() === "") {
        errors.push({ field: "outputUnit", message: "L'unité de rendement est obligatoire." });
      }
    }

    // ─── Coefficient de perte : optionnel, mais entre 0 et 99 % si présent ──
    if (data.wasteCoeff !== undefined && data.wasteCoeff !== null && data.wasteCoeff !== "") {
      const wc = Number(data.wasteCoeff);
      if (!Number.isFinite(wc) || wc < 0 || wc >= 100) {
        errors.push({ field: "wasteCoeff", message: "Le coefficient de perte doit être entre 0 et 99 %." });
      }
    }

    // ─── Au moins un composant (ingrédient direct ou sous-recette) ──────────
    const hasDirectIngredients = Array.isArray(data.directIngredients) && data.directIngredients.length > 0;
    const hasBaseComponents = Array.isArray(data.baseComponents) && data.baseComponents.length > 0;
    const isFinalRecipe = recipeType === "final";

    if (!hasDirectIngredients && (!isFinalRecipe || !hasBaseComponents)) {
      errors.push({ field: "components", message: "Ajoute au moins un ingrédient ou une recette de base." });
    }

    // ─── Validation par ligne : ingrédients directs ─────────────────────────
    if (hasDirectIngredients) {
      data.directIngredients.forEach((line, idx) => {
        const lineNum = idx + 1;
        const row = line || {};
        if (row.ingredientId == null || row.ingredientId === "") {
          errors.push({
            field: `directIngredients[${idx}].ingredientId`,
            message: `Ingrédient ligne ${lineNum} : sélection obligatoire.`,
          });
        }
        const qty = Number(row.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          errors.push({
            field: `directIngredients[${idx}].quantity`,
            message: `Ingrédient ligne ${lineNum} : la quantité doit être supérieure à 0.`,
          });
        }
        if (typeof row.unit !== "string" || row.unit.trim() === "") {
          errors.push({
            field: `directIngredients[${idx}].unit`,
            message: `Ingrédient ligne ${lineNum} : unité obligatoire.`,
          });
        }
      });
    }

    // ─── Validation par ligne : composants de base ──────────────────────────
    if (hasBaseComponents) {
      data.baseComponents.forEach((line, idx) => {
        const lineNum = idx + 1;
        const row = line || {};
        if (row.baseRecipeId == null || row.baseRecipeId === "") {
          errors.push({
            field: `baseComponents[${idx}].baseRecipeId`,
            message: `Recette de base ligne ${lineNum} : sélection obligatoire.`,
          });
        }
        if (row.usageMode === "portion") {
          const pc = Number(row.portionCount);
          if (!Number.isFinite(pc) || pc <= 0) {
            errors.push({
              field: `baseComponents[${idx}].portionCount`,
              message: `Recette de base ligne ${lineNum} : le nombre de portions doit être supérieur à 0.`,
            });
          }
        } else {
          const qty = Number(row.quantity);
          if (!Number.isFinite(qty) || qty <= 0) {
            errors.push({
              field: `baseComponents[${idx}].quantity`,
              message: `Recette de base ligne ${lineNum} : la quantité doit être supérieure à 0.`,
            });
          }
          if (typeof row.unit !== "string" || row.unit.trim() === "") {
            errors.push({
              field: `baseComponents[${idx}].unit`,
              message: `Recette de base ligne ${lineNum} : unité obligatoire.`,
            });
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  function buildRecipePayload(formData, normalizeRecipe) {
    return normalizeRecipe({ ...formData });
  }

  function upsertRecipe(recipes, payload, editingId) {
    if (editingId) {
      return recipes.map((r) => Number(r.id) === Number(editingId) ? { ...payload, id: editingId } : r);
    }
    const nextId = recipes.reduce((max, r) => Math.max(max, Number(r.id)), 0) + 1;
    return [...recipes, { ...payload, id: nextId, createdAt: payload.createdAt || new Date().toISOString() }];
  }

  global.FormulaRecipeSubmission = {
    validateRecipeDraft,
    buildRecipePayload,
    upsertRecipe,
  };
})(window);
