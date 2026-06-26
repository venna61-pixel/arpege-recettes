// Génération HTML des blocs imprimables d'une recette, organisés selon
// l'ordre de production (sous-recettes en premier, recette mère en dernier).
//
// Chantier "fiche complète au format chef" (cuisinier pilote 2026-06-26) :
// la fiche d'une recette composée doit présenter chaque préparation comme un
// bloc autonome à 2 colonnes (ingrédients à gauche, procédé à droite). Les
// sous-recettes apparaissent comme des "ingrédients" du bloc parent (avec
// leur quantité utilisée) ET dans leur propre bloc dédié (avec leurs vrais
// ingrédients adaptés au prorata).
//
// Une sous-recette utilisée plusieurs fois dans la même fiche est consolidée
// en un seul bloc avec la quantité totale (multiplier cumulé = somme des
// multipliers de chaque chemin où elle est utilisée). Évite la duplication
// et reflète le fait qu'en cuisine on prépare la quantité totale d'un coup.
//
// Aucun double comptage des coûts : chaque ingrédient n'apparaît avec un
// coût que dans le bloc où il est physiquement listé. Les références aux
// sous-recettes dans un bloc parent portent la mention "voir bloc dédié"
// dans la colonne Coût.

(function (global) {
  // Calcule le coefficient à appliquer à une sous-recette quand on en utilise
  // une certaine quantité dans une recette parente. Retourne null si la
  // donnée est incomplète (rendement invalide, unité non convertible, etc.).
  function computeLocalMultiplier(component, baseRecipe) {
    if (!component || !baseRecipe) return null;
    const Costs = global.FormulaCostsAndUnits;
    if (!Costs) return null;

    const usageMode = component.usageMode || "quantity";
    if (usageMode === "portion") {
      const pc = Number(component.portionCount || 0);
      const bc = Number(baseRecipe.covers || 0);
      return (Number.isFinite(pc) && pc > 0 && Number.isFinite(bc) && bc > 0) ? pc / bc : null;
    }

    const effYield = Costs.resolveEffectiveYield(baseRecipe);
    if (!effYield) return null;
    const conv = Costs.convertQuantity(Number(component.quantity || 0), component.unit, effYield.unit);
    if (conv == null) return null;
    const yieldQty = Number(effYield.quantity);
    return (yieldQty > 0) ? conv / yieldQty : null;
  }

  // Parcourt la recette mère et toutes ses sous-recettes (récursivement) pour :
  //   - cumuler le multiplier total par recette (somme des multipliers des
  //     chemins où elle est utilisée — gère le cas "utilisée à plusieurs
  //     endroits" en consolidant les quantités)
  //   - construire l'ordre topologique post-order (sous-recettes les plus
  //     profondes en premier, recette mère en dernier) — chaque recette
  //     listée une seule fois grâce au visited Set
  // Anti-cycle : pathStack local au chemin courant (un cycle dans le
  // référentiel n'empêche pas la fonction de se terminer).
  function collectRecipeUsages(rootRecipe, allRecipes, rootMultiplier) {
    const totalMultipliers = new Map();
    const visited = new Set();
    const topologicalOrder = [];

    if (!rootRecipe) return { totalMultipliers, topologicalOrder };
    const baseMultiplier = Number.isFinite(Number(rootMultiplier)) ? Number(rootMultiplier) : 1;

    const rootId = Number(rootRecipe.id);
    if (Number.isFinite(rootId)) {
      totalMultipliers.set(rootId, baseMultiplier);
    }

    function accumulate(currentRecipe, currentMultiplier, pathStack) {
      const curId = Number(currentRecipe.id);
      if (!Number.isFinite(curId)) return;
      if (pathStack.has(curId)) return;
      const newPath = new Set(pathStack);
      newPath.add(curId);

      for (const comp of (currentRecipe.baseComponents || [])) {
        const sub = (allRecipes || []).find((r) => Number(r && r.id) === Number(comp && comp.baseRecipeId));
        if (!sub) continue;

        const localMult = computeLocalMultiplier(comp, sub);
        if (localMult == null) continue;

        const cumulMult = currentMultiplier * localMult;
        const subId = Number(sub.id);
        if (Number.isFinite(subId)) {
          totalMultipliers.set(subId, (totalMultipliers.get(subId) || 0) + cumulMult);
        }

        accumulate(sub, cumulMult, newPath);
      }
    }

    accumulate(rootRecipe, baseMultiplier, new Set());

    function topoOrder(currentRecipe, pathStack) {
      const curId = Number(currentRecipe.id);
      if (!Number.isFinite(curId)) return;
      if (pathStack.has(curId)) return;
      const newPath = new Set(pathStack);
      newPath.add(curId);

      for (const comp of (currentRecipe.baseComponents || [])) {
        const sub = (allRecipes || []).find((r) => Number(r && r.id) === Number(comp && comp.baseRecipeId));
        if (sub) topoOrder(sub, newPath);
      }

      if (!visited.has(curId)) {
        visited.add(curId);
        topologicalOrder.push(currentRecipe);
      }
    }

    topoOrder(rootRecipe, new Set());

    return { totalMultipliers, topologicalOrder };
  }

  // Génère le HTML d'un bloc imprimable pour une recette donnée.
  // Structure : <section class="subrecipe-block"> avec 2 colonnes (grid) :
  //   - Ingrédients : sous-recettes (référence avec quantité utilisée × multiplier,
  //     SANS coût propre car déjà compté dans leur bloc dédié)
  //                  PUIS ingrédients directs (quantité × multiplier, AVEC coût)
  //   - Procédé : procédé HTML de la recette
  function buildPrintableRecipeBlock(opts) {
    const o = opts || {};
    const recipe = o.recipe;
    if (!recipe) return "";

    const escape = o.esc || ((v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
    const proc = o.procHtml || ((p) => p ? p : "<p style='color:var(--gray-500);font-style:italic;'>Aucun procédé renseigné</p>");
    const ingredients = Array.isArray(o.ingredients) ? o.ingredients : [];
    const isChef = !!o.isChef;
    const currencySymbol = o.currencySymbol || "€";
    const multiplier = Number(o.multiplier);
    if (!Number.isFinite(multiplier)) return "";

    const Costs = global.FormulaCostsAndUnits;

    // Lignes : sous-recettes en premier (ordre de production logique)
    const subRows = (recipe.baseComponents || []).map((comp) => {
      const usageMode = comp.usageMode || "quantity";
      const qtyLabel = usageMode === "portion"
        ? `${(Number(comp.portionCount || 0) * multiplier).toFixed(2)} portions/couverts`
        : `${(Number(comp.quantity || 0) * multiplier).toFixed(2)} ${escape(comp.unit || "")}`;
      const costCol = isChef ? `<td style="text-align:right;color:var(--gray-500);font-style:italic;font-size:11px;">voir bloc dédié</td>` : "";
      return `<tr><td>${escape(comp.name || "?")}</td><td>${qtyLabel}</td>${costCol}</tr>`;
    });

    // Lignes : ingrédients directs (quantités multipliées par le coefficient cumulé)
    const directRows = (recipe.directIngredients || []).map((ing) => {
      const adaptedQty = Number(ing.quantity || 0) * multiplier;
      const cost = (isChef && Costs) ? Costs.calculateIngredientCost({ ...ing, quantity: adaptedQty }, ingredients) : null;
      const costCol = isChef ? `<td style="text-align:right;">${cost == null ? "N/A" : `${cost.toFixed(2)}${currencySymbol}`}</td>` : "";
      return `<tr><td>${escape(ing.name || "?")}</td><td>${adaptedQty.toFixed(2)} ${escape(ing.unit || "")}</td>${costCol}</tr>`;
    });

    const allRows = subRows.concat(directRows).join("");
    const tbody = allRows.length > 0
      ? allRows
      : `<tr><td colspan="${isChef ? 3 : 2}" style="padding:8px;color:var(--gray-500);font-style:italic;">Aucun ingrédient</td></tr>`;

    return `
      <section class="subrecipe-block">
        <h2>${escape(o.title || recipe.name || "Sans nom")}</h2>
        <div class="grid">
          <div>
            <h3>Ingrédients</h3>
            <table>
              <thead>
                <tr>
                  <th>Ingrédient</th>
                  <th>Quantité</th>
                  ${isChef ? "<th style='text-align:right;'>Coût</th>" : ""}
                </tr>
              </thead>
              <tbody>${tbody}</tbody>
            </table>
          </div>
          <div>
            <h3>Procédé</h3>
            <div class="procedure">${proc(recipe.procedure)}</div>
          </div>
        </div>
      </section>
    `;
  }

  // Génère la concaténation de tous les blocs imprimables d'une recette,
  // dans l'ordre topologique (production). C'est la fonction de plus haut
  // niveau utilisée par les handlers d'impression.
  function buildAllPrintableBlocks(opts) {
    const o = opts || {};
    const rootRecipe = o.rootRecipe;
    if (!rootRecipe) return "";
    const allRecipes = Array.isArray(o.allRecipes) ? o.allRecipes : [];
    const rootMultiplier = Number.isFinite(Number(o.rootMultiplier)) ? Number(o.rootMultiplier) : 1;

    const { totalMultipliers, topologicalOrder } = collectRecipeUsages(rootRecipe, allRecipes, rootMultiplier);

    return topologicalOrder.map((recipe) => {
      const recipeId = Number(recipe.id);
      const multiplier = totalMultipliers.get(recipeId) || 0;
      return buildPrintableRecipeBlock({
        recipe: recipe,
        multiplier: multiplier,
        isChef: o.isChef,
        currencySymbol: o.currencySymbol,
        ingredients: o.ingredients,
        esc: o.esc,
        procHtml: o.procHtml,
      });
    }).join("");
  }

  global.FormulaRecipePrinting = {
    computeLocalMultiplier: computeLocalMultiplier,
    collectRecipeUsages: collectRecipeUsages,
    buildPrintableRecipeBlock: buildPrintableRecipeBlock,
    buildAllPrintableBlocks: buildAllPrintableBlocks,
  };
})(typeof window !== "undefined" ? window : globalThis);
