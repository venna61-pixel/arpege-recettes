(function (global) {
  // Renvoie { valid, errors } — errors est un tableau de { field, message }.
  // Permet de remonter toutes les erreurs à la fois pour éviter à l'utilisateur
  // une saisie "corriger une erreur → soumettre → erreur suivante → corriger → etc.".
  //
  // Volontairement hors périmètre (déléguer à d'autres couches) :
  // - validation de référence d'ingrédients (ingredientId pointe sur un ingrédient
  //   existant) — nécessite le catalogue ingrédients
  // - validation de cohérence d'unités (l'unité saisie doit être convertible vers
  //   l'unité d'achat) — signalée au formulaire via FormulaCostsAndUnits.checkLineUnitConvertibility
  //   (avertissement non bloquant) et confirmée au calcul de coût par getCostStatus
  //
  // Param options (tous optionnels — rétro-compatibilité préservée) :
  //   - allRecipes : référentiel complet des recettes pour la détection de cycle.
  //                  Sans lui, la validation reste structurelle (signature historique).
  //   - editingId  : id de la recette en cours d'édition (null pour une création).
  //                  Indispensable pour détecter un cycle vers la recette éditée.
  function validateRecipeDraft(formData, options) {
    const errors = [];
    const data = formData || {};
    const opts = options || {};
    const allRecipes = Array.isArray(opts.allRecipes) ? opts.allRecipes : null;
    const editingId = opts.editingId == null ? null : Number(opts.editingId);

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
    // Règle uniforme depuis 2026-06-26 : toute recette (base ou finale) doit avoir
    // au moins un composant. Avant, les recettes de base devaient obligatoirement
    // avoir des ingrédients directs — limitation levée pour permettre l'imbrication
    // (ex. biscuit composé d'un insert pistache + un sirop, sans ingrédient direct).
    const hasDirectIngredients = Array.isArray(data.directIngredients) && data.directIngredients.length > 0;
    const hasBaseComponents = Array.isArray(data.baseComponents) && data.baseComponents.length > 0;

    if (!hasDirectIngredients && !hasBaseComponents) {
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

    // ─── Détection de cycle dans les sous-recettes ──────────────────────────
    // Seulement si on a reçu allRecipes + editingId (création d'une recette
    // n'a pas d'id donc pas de cycle possible vers elle-même).
    if (allRecipes && editingId != null && Array.isArray(data.baseComponents)) {
      const cycle = detectBaseComponentCycle(editingId, data.baseComponents, allRecipes);
      if (cycle) {
        errors.push({
          field: "baseComponents",
          message: `Cycle détecté : la sous-recette « ${cycle.name || "?"} » contient déjà cette recette (directement ou via une autre sous-recette).`,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Détection de cycle ───────────────────────────────────────────────────
  // Retourne le baseComponent fautif ({ baseRecipeId, name }) si la recette
  // éditée est atteinte transitivement, sinon null. Le `visited` Set assure
  // une terminaison même si le référentiel `allRecipes` contient déjà un
  // cycle (cas d'un import de données corrompues).

  // Vrai si en suivant les baseComponents depuis currentId on retombe sur targetId.
  // Le visited Set empêche une boucle infinie si le référentiel contient déjà
  // un cycle non relié à targetId (cas d'un import de données corrompues).
  // Important : on vérifie l'égalité AVANT le visited.has — sans ça, si target
  // est revisité on retournerait false alors qu'on tient justement le cycle.
  function reachesRecipeId(currentId, targetId, allRecipes, visited) {
    const cur = Number(currentId);
    const tgt = Number(targetId);
    if (!Number.isFinite(cur) || !Number.isFinite(tgt)) return false;
    if (cur === tgt) return true;
    if (visited.has(cur)) return false;
    visited.add(cur);

    const recipe = allRecipes.find((r) => Number(r?.id) === cur);
    if (!recipe) return false;

    const subs = Array.isArray(recipe.baseComponents) ? recipe.baseComponents : [];
    for (const sub of subs) {
      const subId = Number(sub?.baseRecipeId);
      if (!Number.isFinite(subId)) continue;
      if (reachesRecipeId(subId, tgt, allRecipes, visited)) return true;
    }
    return false;
  }

  function detectBaseComponentCycle(editingId, baseComponents, allRecipes) {
    const target = Number(editingId);
    if (!Number.isFinite(target)) return null;
    if (!Array.isArray(baseComponents) || baseComponents.length === 0) return null;
    if (!Array.isArray(allRecipes)) return null;

    for (const component of baseComponents) {
      const subId = Number(component?.baseRecipeId);
      if (!Number.isFinite(subId)) continue;
      // Cycle direct : on essaie d'inclure la recette éditée comme sa propre sous-recette.
      if (subId === target) {
        return { baseRecipeId: subId, name: component.name || "" };
      }
      // Cycle indirect : on descend dans la sous-recette et on cherche target.
      const visited = new Set();
      if (reachesRecipeId(subId, target, allRecipes, visited)) {
        return { baseRecipeId: subId, name: component.name || "" };
      }
    }
    return null;
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
    detectBaseComponentCycle,
    buildRecipePayload,
    upsertRecipe,
  };
})(window);
