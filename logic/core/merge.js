(function (global) {
  // Normalise un nom pour la comparaison : minuscules, sans accents, sans espaces superflus.
  function normalizeMergeName(s) {
    if (!s || typeof s !== "string") return "";
    return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Analyse un fichier importé par rapport aux données existantes.
  // Entrée : { importedData, existingIngredients, existingRecipes, existingSuppliers }
  // Sortie : { newIngredients, ingredientConflicts, newRecipes, recipeConflicts, newSuppliers, exportedAt }
  //   - newXxx           : éléments absents de l'existant → à ajouter sans question
  //   - ingredientConflicts : { imported, existing } → même nom mais prix ou fournisseur différent
  //   - recipeConflicts     : { imported, existing } → même nom
  function analyzeMerge({ importedData, existingIngredients, existingRecipes, existingSuppliers }) {
    const existingIngMap = new Map(existingIngredients.map(function (i) {
      return [normalizeMergeName(i.name), i];
    }));
    const newIngredients = [];
    const ingredientConflicts = [];

    for (const ing of importedData.ingredients) {
      const existing = existingIngMap.get(normalizeMergeName(ing.name));
      if (!existing) {
        newIngredients.push(ing);
      } else {
        const priceDiffers = String(ing.price ?? "") !== String(existing.price ?? "");
        const supplierDiffers = normalizeMergeName(String(ing.supplier || "")) !== normalizeMergeName(String(existing.supplier || ""));
        if (priceDiffers || supplierDiffers) {
          ingredientConflicts.push({ imported: ing, existing });
        }
      }
    }

    const existingRecipeMap = new Map(existingRecipes.map(function (r) {
      return [normalizeMergeName(r.name), r];
    }));
    const newRecipes = [];
    const recipeConflicts = [];

    for (const rec of importedData.recipes) {
      const key = normalizeMergeName(rec.name);
      if (!existingRecipeMap.has(key)) {
        newRecipes.push(rec);
      } else {
        recipeConflicts.push({ imported: rec, existing: existingRecipeMap.get(key) });
      }
    }

    const existingSupplierMap = new Map(existingSuppliers.map(function (s) {
      return [normalizeMergeName(s.name), s];
    }));
    const newSuppliers = [];

    for (const sup of importedData.suppliers) {
      if (!existingSupplierMap.has(normalizeMergeName(sup.name))) {
        newSuppliers.push(sup);
      }
    }

    return {
      newIngredients,
      ingredientConflicts,
      newRecipes,
      recipeConflicts,
      newSuppliers,
      exportedAt: importedData.exportedAt || null,
    };
  }

  // Applique la fusion : ajoute les nouveaux éléments et remplace ceux sélectionnés par l'utilisateur.
  // selectedRecipeNames et selectedIngredientNames : tableaux de noms (comparés après normalisation).
  // Les IDs existants sont conservés pour ne pas casser les références internes.
  function applyMerge({ analysis, selectedRecipeNames, selectedIngredientNames, existingIngredients, existingRecipes, existingSuppliers }) {
    const selectedRecipeSet = new Set(selectedRecipeNames.map(normalizeMergeName));
    const selectedIngredientSet = new Set(selectedIngredientNames.map(normalizeMergeName));

    const updatedIngredients = existingIngredients.map(function (ing) {
      if (selectedIngredientSet.has(normalizeMergeName(ing.name))) {
        const conflict = analysis.ingredientConflicts.find(function (c) {
          return normalizeMergeName(c.imported.name) === normalizeMergeName(ing.name);
        });
        return conflict ? Object.assign({}, conflict.imported, { id: ing.id }) : ing;
      }
      return ing;
    });
    const mergedIngredients = updatedIngredients.concat(analysis.newIngredients);

    const updatedRecipes = existingRecipes.map(function (rec) {
      if (selectedRecipeSet.has(normalizeMergeName(rec.name))) {
        const conflict = analysis.recipeConflicts.find(function (c) {
          return normalizeMergeName(c.imported.name) === normalizeMergeName(rec.name);
        });
        return conflict ? Object.assign({}, conflict.imported, { id: rec.id }) : rec;
      }
      return rec;
    });
    const mergedRecipes = updatedRecipes.concat(analysis.newRecipes);

    const mergedSuppliers = existingSuppliers.concat(analysis.newSuppliers);

    // Recalibrage des références par nom : après fusion, les recettes importées
    // peuvent pointer vers des IDs qui n'existent pas sur cet appareil.
    // On corrige ingredientId et baseRecipeId en cherchant par nom.
    const ingredientNameToId = new Map(mergedIngredients.map(function (i) {
      return [normalizeMergeName(i.name), i.id];
    }));
    const recipeNameToId = new Map(mergedRecipes.map(function (r) {
      return [normalizeMergeName(r.name), r.id];
    }));

    const remappedRecipes = mergedRecipes.map(function (recipe) {
      const directIngredients = (recipe.directIngredients || []).map(function (ing) {
        const localId = ingredientNameToId.get(normalizeMergeName(ing.name));
        return localId !== undefined ? Object.assign({}, ing, { ingredientId: localId }) : ing;
      });
      const baseComponents = (recipe.baseComponents || []).map(function (comp) {
        const localId = recipeNameToId.get(normalizeMergeName(comp.name));
        return localId !== undefined ? Object.assign({}, comp, { baseRecipeId: localId }) : comp;
      });
      return Object.assign({}, recipe, { directIngredients: directIngredients, baseComponents: baseComponents });
    });

    return {
      ingredients: mergedIngredients,
      recipes: remappedRecipes,
      suppliers: mergedSuppliers,
    };
  }

  global.FormulaMerge = {
    normalizeMergeName,
    analyzeMerge,
    applyMerge,
  };
})(typeof window !== "undefined" ? window : global);
