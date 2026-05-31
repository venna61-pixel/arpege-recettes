(function (global) {
  function toLowerText(value) {
    return String(value || "").toLowerCase();
  }

  function filterRecipesForList({ recipes, searchTerm, sectionType, categoryFilter }) {
    const search = toLowerText(searchTerm);
    return (recipes || []).filter((recipe) => {
      const nameText = toLowerText(recipe?.name);
      const categories = Array.isArray(recipe?.categories) ? recipe.categories : [];
      const categoriesText = toLowerText(categories.join(" "));
      const matchSearch = nameText.includes(search) || categoriesText.includes(search);
      const matchType = recipe?.recipeType === sectionType;
      const matchCategory = categoryFilter === "Tous" || categories.includes(categoryFilter);
      return matchSearch && matchType && matchCategory;
    });
  }

  function filterIngredientsForPicker({ ingredients, searchText }) {
    const search = toLowerText(searchText);
    return (ingredients || []).filter((ing) => toLowerText(ing?.name).includes(search));
  }

  function filterBaseRecipesForPicker({ recipes, searchText, categoryFilter }) {
    const search = toLowerText(searchText);
    return (recipes || []).filter((recipe) => {
      if (recipe?.recipeType !== "base") return false;
      const categories = Array.isArray(recipe?.categories) ? recipe.categories : [];
      if (categoryFilter !== "Tous" && !categories.includes(categoryFilter)) return false;
      return toLowerText(recipe?.name).includes(search);
    });
  }

  function sortRecipes({ recipes, sortBy, sortDir }) {
    const arr = [...recipes];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = toLowerText(a.name).localeCompare(toLowerText(b.name), "fr");
      } else {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }

  global.FormulaRecipeFilters = {
    filterRecipesForList,
    filterIngredientsForPicker,
    filterBaseRecipesForPicker,
    sortRecipes,
  };
})(window);
