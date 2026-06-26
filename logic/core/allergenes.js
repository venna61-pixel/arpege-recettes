(function (global) {
  const ALLERGENES_14 = [
    "Gluten",
    "Crustacés",
    "Œufs",
    "Poisson",
    "Arachides",
    "Soja",
    "Lait/Lactose",
    "Fruits à coque",
    "Céleri",
    "Moutarde",
    "Sésame",
    "Sulfites",
    "Lupin",
    "Mollusques",
  ];

  // Keys are in normalized form (lowercase, no accents, trailing 's' stripped).
  // Values are arrays of allergen names from ALLERGENES_14.
  const INGREDIENTS_ALLERGENES_MAP = {
    // Lait/Lactose
    "beurre": ["Lait/Lactose"],
    "beurre demi-sel": ["Lait/Lactose"],
    "beurre clarifié": ["Lait/Lactose"],
    "beurre clarifie": ["Lait/Lactose"],
    "beurre noisette": ["Lait/Lactose"],
    "lait": ["Lait/Lactose"],
    "lait entier": ["Lait/Lactose"],
    "lait demi-ecreme": ["Lait/Lactose"],
    "lait ecreme": ["Lait/Lactose"],
    "lait de vache": ["Lait/Lactose"],
    "creme": ["Lait/Lactose"],
    "creme fraiche": ["Lait/Lactose"],
    "creme liquide": ["Lait/Lactose"],
    "creme epaisse": ["Lait/Lactose"],
    "creme entiere": ["Lait/Lactose"],
    "creme chantilly": ["Lait/Lactose"],
    "creme patissiere": ["Lait/Lactose", "Œufs", "Gluten"],
    "bechamel": ["Lait/Lactose", "Gluten"],
    "fromage": ["Lait/Lactose"],
    "parmesan": ["Lait/Lactose"],
    "gruyere": ["Lait/Lactose"],
    "emmental": ["Lait/Lactose"],
    "camembert": ["Lait/Lactose"],
    "brie": ["Lait/Lactose"],
    "roquefort": ["Lait/Lactose"],
    "chevre": ["Lait/Lactose"],
    "mozzarella": ["Lait/Lactose"],
    "yaourt": ["Lait/Lactose"],
    "mascarpone": ["Lait/Lactose"],
    "ricotta": ["Lait/Lactose"],
    "fromage blanc": ["Lait/Lactose"],
    "cheddar": ["Lait/Lactose"],
    "comte": ["Lait/Lactose"],
    "reblochon": ["Lait/Lactose"],
    "raclette": ["Lait/Lactose"],
    "mimolette": ["Lait/Lactose"],
    "saint-nectaire": ["Lait/Lactose"],
    "livarot": ["Lait/Lactose"],
    "munster": ["Lait/Lactose"],
    "lait de coco": [],
    // Gluten
    "farine": ["Gluten"],
    "farine de ble": ["Gluten"],
    "farine de froment": ["Gluten"],
    "farine t45": ["Gluten"],
    "farine t55": ["Gluten"],
    "farine t65": ["Gluten"],
    "farine t80": ["Gluten"],
    "pain": ["Gluten"],
    "pain de mie": ["Gluten", "Lait/Lactose"],
    "baguette": ["Gluten"],
    "brioche": ["Gluten", "Lait/Lactose", "Œufs"],
    "semoule": ["Gluten"],
    "couscou": ["Gluten"],
    "chapelure": ["Gluten"],
    "panko": ["Gluten"],
    "avoine": ["Gluten"],
    "orge": ["Gluten"],
    "seigle": ["Gluten"],
    "epeautre": ["Gluten"],
    "ble": ["Gluten"],
    "biscuit": ["Gluten"],
    "pate feuilletee": ["Gluten", "Lait/Lactose"],
    "pate brisee": ["Gluten"],
    "pate a choux": ["Gluten", "Lait/Lactose", "Œufs"],
    "pate sablee": ["Gluten", "Lait/Lactose", "Œufs"],
    "croissant": ["Gluten", "Lait/Lactose", "Œufs"],
    // Œufs
    "oeuf": ["Œufs"],
    "jaune d'oeuf": ["Œufs"],
    "blanc d'oeuf": ["Œufs"],
    "meringue": ["Œufs"],
    "mayonnaise": ["Œufs"],
    "hollandaise": ["Œufs", "Lait/Lactose"],
    "sabayon": ["Œufs"],
    // Fruits à coque
    "noi": ["Fruits à coque"],          // noix → noi après strip s (noix ne finit pas en s)
    "noix": ["Fruits à coque"],
    "noisette": ["Fruits à coque"],
    "amande": ["Fruits à coque"],
    "pistache": ["Fruits à coque"],
    "noix de cajou": ["Fruits à coque"],
    "cajou": ["Fruits à coque"],
    "noix de coco": ["Fruits à coque"],
    "noix de pecan": ["Fruits à coque"],
    "pecan": ["Fruits à coque"],
    "pignon": ["Fruits à coque"],
    "pignon de pin": ["Fruits à coque"],
    "macadamia": ["Fruits à coque"],
    "praline": ["Fruits à coque"],
    "praline noisette": ["Fruits à coque"],
    "pate de noisette": ["Fruits à coque"],
    "pate d'amande": ["Fruits à coque"],
    "tant pour tant": ["Fruits à coque"],
    // Crustacés
    "crevette": ["Crustacés"],
    "homard": ["Crustacés"],
    "crabe": ["Crustacés"],
    "langouste": ["Crustacés"],
    "langoustine": ["Crustacés"],
    "ecrevisse": ["Crustacés"],
    "tourteau": ["Crustacés"],
    "araignee de mer": ["Crustacés"],
    // Mollusques
    "moule": ["Mollusques"],
    "huitre": ["Mollusques"],
    "calamar": ["Mollusques"],
    "seiche": ["Mollusques"],
    "poulpe": ["Mollusques"],
    "pieuvre": ["Mollusques"],
    "coquille saint-jacque": ["Mollusques"],
    "coquille saint-jacques": ["Mollusques"],
    "palourde": ["Mollusques"],
    "bigorneau": ["Mollusques"],
    "bulot": ["Mollusques"],
    "escargot": ["Mollusques"],
    "couteau": ["Mollusques"],
    // Poisson
    "saumon": ["Poisson"],
    "thon": ["Poisson"],
    "sole": ["Poisson"],
    "bar": ["Poisson"],
    "dorade": ["Poisson"],
    "daurade": ["Poisson"],
    "sardine": ["Poisson"],
    "maquereau": ["Poisson"],
    "cabillaud": ["Poisson"],
    "merlan": ["Poisson"],
    "anchoi": ["Poisson"],              // anchois → anchoi après strip s
    "anchois": ["Poisson"],
    "truite": ["Poisson"],
    "lotte": ["Poisson"],
    "rouget": ["Poisson"],
    "turbot": ["Poisson"],
    "colin": ["Poisson"],
    "hareng": ["Poisson"],
    "saint-pierre": ["Poisson"],
    "lieu": ["Poisson"],
    "merlu": ["Poisson"],
    "grondin": ["Poisson"],
    "pageot": ["Poisson"],
    "vivaneau": ["Poisson"],
    "filet de bar": ["Poisson"],
    "filet de saumon": ["Poisson"],
    "filet de dorade": ["Poisson"],
    "filet de sole": ["Poisson"],
    "brandade": ["Poisson", "Lait/Lactose"],
    // Arachides
    "arachide": ["Arachides"],
    "cacahuete": ["Arachides"],
    "beurre de cacahuete": ["Arachides"],
    "huile d'arachide": ["Arachides"],
    // Soja
    "soja": ["Soja"],
    "tofu": ["Soja"],
    "miso": ["Soja"],
    "sauce soja": ["Soja"],
    "edamame": ["Soja"],
    "lait de soja": ["Soja"],
    // Céleri
    "celeri": ["Céleri"],
    "celeri branche": ["Céleri"],
    "celeri rave": ["Céleri"],
    "celeri en branche": ["Céleri"],
    // Moutarde
    "moutarde": ["Moutarde"],
    "graine de moutarde": ["Moutarde"],
    "moutarde de dijon": ["Moutarde"],
    "moutarde ancienne": ["Moutarde"],
    // Sésame
    "sesame": ["Sésame"],
    "graine de sesame": ["Sésame"],
    "huile de sesame": ["Sésame"],
    "tahini": ["Sésame"],
    "tahine": ["Sésame"],
    // Sulfites
    "vin": ["Sulfites"],
    "vin blanc": ["Sulfites"],
    "vin rouge": ["Sulfites"],
    "champagne": ["Sulfites"],
    "cognac": ["Sulfites"],
    "vinaigre de vin": ["Sulfites"],
    "biere": ["Sulfites"],
    "porto": ["Sulfites"],
    "madere": ["Sulfites"],
    "muscat": ["Sulfites"],
    "calvados": ["Sulfites"],
    "armagnac": ["Sulfites"],
    // Lupin
    "lupin": ["Lupin"],
    "farine de lupin": ["Lupin", "Gluten"],
    "graine de lupin": ["Lupin"],
  };

  // Normalise un nom d'ingrédient : minuscules, sans accents, sans espace superflu,
  // et sans 's' final pour gérer les pluriels français courants.
  function removeDiacritics(str) {
    return str.normalize("NFD").split("").filter(function (ch) {
      var code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    }).join("");
  }

  function normalizeIngredientName(name) {
    if (!name || typeof name !== "string") return "";
    var n = removeDiacritics(name.trim().toLowerCase());
    n = n.replace(/[‘’]/g, "’").trim();
    if (n.endsWith("s")) n = n.slice(0, -1);
    return n;
  }

  // Prend un nom d'ingrédient et retourne les allergènes détectés (tableau vide si inconnu).
  function detectAllergenes(ingredientName) {
    const norm = normalizeIngredientName(ingredientName);
    if (!norm) return [];
    if (INGREDIENTS_ALLERGENES_MAP[norm]) return [...INGREDIENTS_ALLERGENES_MAP[norm]];
    // Fallback : essai sans le 's' supplémentaire (pour les entrées en 's' non traitées)
    const withoutS = norm.endsWith("s") ? norm.slice(0, -1) : null;
    if (withoutS && INGREDIENTS_ALLERGENES_MAP[withoutS]) return [...INGREDIENTS_ALLERGENES_MAP[withoutS]];
    return [];
  }

  // Calcule les allergènes cumulés depuis une liste de noms d'ingrédients, dédupliqués et triés.
  function computeAllergenesFromNames(ingredientNames) {
    if (!Array.isArray(ingredientNames)) return [];
    const allergenSet = new Set();
    for (const name of ingredientNames) {
      detectAllergenes(name).forEach((a) => allergenSet.add(a));
    }
    return Array.from(allergenSet).sort();
  }

  // Calcule le résumé complet des allergènes d'une recette.
  // Parcourt les ingrédients directs ET, RÉCURSIVEMENT, les ingrédients des
  // sous-recettes (N niveaux d'imbrication depuis 2026-06-26).
  // Priorité : allergènes saisis manuellement sur l'ingrédient > détection automatique par nom.
  // Le champ `fromBaseRecipe` du rapport `incompleteIngredients` désigne la
  // sous-recette immédiate qui apporte l'ingrédient (pas le chemin complet).
  // Protection anti-cycle : un visited Set sur les ids déjà parcourus empêche
  // une boucle infinie si le référentiel contient un cycle (import corrompu).
  // Retourne : { allergens, hasIncomplete, incompleteIngredients }
  function computeRecipeAllergeneSummary(recipe, allIngredients, allRecipes) {
    if (allRecipes === undefined) allRecipes = [];
    var allergenSet = new Set();
    var incompleteIngredients = [];

    function normName(s) {
      return (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    }

    function processLine(line, fromBaseRecipe) {
      if (fromBaseRecipe === undefined) fromBaseRecipe = null;
      var ingredientId = line.ingredientId;
      var name = line.name;
      var ing = allIngredients.find(function (i) { return Number(i.id) === Number(ingredientId); });
      if (!ing && name) {
        var target = normName(name);
        ing = allIngredients.find(function (i) { return normName(i.name) === target; });
      }
      if (ing && Array.isArray(ing.allergenes)) {
        ing.allergenes.forEach(function (a) { allergenSet.add(a); });
      } else {
        detectAllergenes(name).forEach(function (a) { allergenSet.add(a); });
        if (!ing || ing.allergenes == null) {
          var entry = {
            ingredientId: ing ? Number(ing.id) : Number(ingredientId),
            name: (ing && ing.name) || name || "?",
          };
          if (fromBaseRecipe) entry.fromBaseRecipe = fromBaseRecipe;
          incompleteIngredients.push(entry);
        }
      }
    }

    // Parcourt les ingrédients directs d'une recette puis descend dans ses
    // sous-recettes. sourceLabel = null pour la racine, sinon le nom de la
    // sous-recette immédiatement responsable de la ligne.
    function visitRecipe(currentRecipe, sourceLabel, visited) {
      if (!currentRecipe) return;
      var id = Number(currentRecipe.id);
      if (Number.isFinite(id)) {
        if (visited.has(id)) return;
        visited.add(id);
      }
      (currentRecipe.directIngredients || []).forEach(function (line) {
        processLine(line, sourceLabel);
      });
      (currentRecipe.baseComponents || []).forEach(function (comp) {
        var sub = allRecipes.find(function (r) { return Number(r.id) === Number(comp.baseRecipeId); });
        if (sub) visitRecipe(sub, sub.name, visited);
      });
    }

    if (recipe) {
      visitRecipe(recipe, null, new Set());
    }

    return {
      allergens: Array.from(allergenSet).sort(),
      hasIncomplete: incompleteIngredients.length > 0,
      incompleteIngredients: incompleteIngredients,
    };
  }

  global.FormulaAllergenes = {
    ALLERGENES_14,
    INGREDIENTS_ALLERGENES_MAP,
    normalizeIngredientName,
    detectAllergenes,
    computeAllergenesFromNames,
    computeRecipeAllergeneSummary,
  };
})(typeof window !== "undefined" ? window : global);
