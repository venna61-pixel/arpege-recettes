(function (global) {
  var LOGO_URL = "./logo/formula-logo.svg";

  var SERVICE_CATEGORIES = ["Entrée", "Plat", "Dessert", "Amuse-bouche", "Soupe", "Salade", "Boisson"];

  var RECIPE_TYPE_OPTIONS = [
    { value: "base", label: "Recette de base" },
    { value: "final", label: "Recette finale" },
  ];

  var UNITS = [
    "Bac", "Bib", "Barquette", "Bidon", "Bobine", "Bocal", "Boîte", "Boîte 1/4", "Boîte 1/8",
    "Boîte 2/1", "Boîte 3/1", "Boîte 3/4", "Boîte 4/4", "Boîte 5/1", "Bombe", "Botte", "Bouteille",
    "Brick", "Coffret", "Colis", "Distribute", "Étui", "Flacon", "Fut", "Kg", "Lot", "Litre", "Pack",
    "Pain", "Paire", "Paquet", "Pièce", "Plaque", "Plateau", "Poche", "Pot", "Rouleau", "Sac", "Sachet",
    "Seau", "Tablette", "Terrine", "Tube", "Tubo", "Unité", "Carton", "Cl", "Part", "Portion", "Gramme", "Ml",
  ];

  var YIELD_UNITS = ["Gramme", "Kg", "Ml", "Cl", "Litre"];

  var PRIORITY_UNITS = ["Kg", "Gramme", "Litre", "Ml", "Cl", "Pièce", "Portion", "Part", "Unité"];

  function orderUnitsForDisplay(units) {
    var list = Array.from(new Set((units || []).filter(Boolean)));
    var priority = PRIORITY_UNITS.filter(function (u) { return list.includes(u); });
    var rest = list.filter(function (u) { return !priority.includes(u); });
    return priority.concat(rest);
  }

  var DISPLAY_UNITS = orderUnitsForDisplay(UNITS);
  var DISPLAY_YIELD_UNITS = orderUnitsForDisplay(YIELD_UNITS);
  var BASE_QUANTITY_UNITS_MASS = ["Gramme", "Kg"];
  var BASE_QUANTITY_UNITS_VOLUME = ["Ml", "Cl", "Litre"];

  var CATEGORIES_ING = [
    "Laitage", "Boucherie", "Charcuterie", "Poissonnerie",
    "Fruits", "Légumes", "Épicerie", "Boulangerie",
    "Boissons", "Condiments", "Herbes", "Épices",
  ];

  var INITIAL_INGREDIENTS = [];
  var INITIAL_RECIPES = [];

  global.ArpegeConstants = {
    LOGO_URL,
    SERVICE_CATEGORIES,
    RECIPE_TYPE_OPTIONS,
    UNITS,
    YIELD_UNITS,
    PRIORITY_UNITS,
    orderUnitsForDisplay,
    DISPLAY_UNITS,
    DISPLAY_YIELD_UNITS,
    BASE_QUANTITY_UNITS_MASS,
    BASE_QUANTITY_UNITS_VOLUME,
    CATEGORIES_ING,
    INITIAL_INGREDIENTS,
    INITIAL_RECIPES,
  };
})(typeof window !== "undefined" ? window : global);
