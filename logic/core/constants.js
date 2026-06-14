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

  var COUNTRIES = [
    { code: "FR", name: "France",     currencySymbol: "€",   currencyCode: "EUR" },
    { code: "CH", name: "Suisse",     currencySymbol: "CHF", currencyCode: "CHF" },
    { code: "BE", name: "Belgique",   currencySymbol: "€",   currencyCode: "EUR" },
    { code: "LU", name: "Luxembourg", currencySymbol: "€",   currencyCode: "EUR" },
  ];

  var DEFAULT_COUNTRY_CODE = "FR";

  var TVA_RATES_BY_COUNTRY = {
    FR: [
      { label: "5,5 % — Conservation / Emporter",     value: 5.5 },
      { label: "10 % — Plats sur place",               value: 10,  isDefault: true },
      { label: "20 % — Alcool",                        value: 20 },
    ],
    BE: [
      { label: "6 % — Emporter boissons non alcool",   value: 6 },
      { label: "12 % — Restauration sur place",        value: 12,  isDefault: true },
      { label: "21 % — Alcool",                        value: 21 },
    ],
    CH: [
      { label: "2,6 % — Nourriture / boissons non alcool", value: 2.6, isDefault: true },
      { label: "3,8 % — Hébergement",                  value: 3.8 },
      { label: "8,1 % — Taux normal",                  value: 8.1 },
    ],
    LU: [
      { label: "3 % — Restauration",                   value: 3,   isDefault: true },
      { label: "14 % — Intermédiaire",                 value: 14 },
      { label: "17 % — Normal",                        value: 17 },
    ],
  };

  function getTVARates(countryCode) {
    return TVA_RATES_BY_COUNTRY[countryCode] || null;
  }

  function getDefaultTVARate(countryCode) {
    var rates = TVA_RATES_BY_COUNTRY[countryCode];
    if (!rates) return null;
    var def = rates.find(function (r) { return r.isDefault; });
    return def ? def.value : rates[0].value;
  }

  function getCountryByCode(code) {
    return COUNTRIES.find(function (c) { return c.code === code; }) || null;
  }

  // Messages utilisateur : standard maison.
  //
  // Toute chaîne affichée à l'utilisateur (alert, setError, avertissement
  // inline) destinée à être réutilisée à plusieurs endroits passe ici. Un
  // message unique au monde reste en place — la centralisation a un coût.
  //
  // Style :
  // - Phrase complète, point final.
  // - Ton direct, pas de "Désolé...", pas de blâme ("vous avez").
  // - Indiquer l'action attendue quand on la connaît.
  // - Une ou deux phrases courtes max.
  //
  // Limite assumée Phase 1 : les alert() natifs cohabitent encore avec des
  // affichages inline (setError, ⚠ orange). L'unification UI (toast/modal
  // custom) est tracée pour Phase 2 — voir plan_formula_arpege_audit_lead_dev.html.
  var MESSAGES = {
    IMPRESSION_PDF_IMPOSSIBLE: "Impossible d'ouvrir l'impression PDF. Vérifiez les paramètres de votre navigateur.",
  };

  global.FormulaConstants = {
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
    COUNTRIES,
    DEFAULT_COUNTRY_CODE,
    TVA_RATES_BY_COUNTRY,
    getTVARates,
    getDefaultTVARate,
    getCountryByCode,
    MESSAGES,
  };
})(typeof window !== "undefined" ? window : global);
