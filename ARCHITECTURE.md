# Architecture de Formula

Ce document complète le [README](README.md) (qui décrit *quoi*) en répondant à *comment* et *pourquoi*. Il s'adresse aux développeurs (humains ou agents) qui rejoignent le projet : objectif = comprendre les décisions structurantes et les flux de données en moins de 10 minutes.

---

## 1. Vue d'ensemble en 3 phrases

Formula est une application React mono-fichier (`index.html`) qui orchestre des modules JavaScript globaux (`window.FormulaXxx`) chargés via `<script>` dans un ordre précis. Toutes les données vivent dans `localStorage` ; aucun serveur, aucun bundler. La logique métier est isolée dans `logic/core/`, testée par des scripts Node sans framework — `index.html` n'est qu'une couche d'affichage et d'orchestration.

---

## 2. Décisions structurantes

### Pas de bundler (CDN + Babel standalone)

React/ReactDOM/Babel/Tailwind sont chargés via CDN. Babel compile le JSX en runtime dans le navigateur. C'est inefficace en production mais permet à Vanessa d'éditer un seul fichier et de double-cliquer pour voir le résultat — pas de toolchain Node à installer côté restaurant. **Migration vers Vite prévue Phase 5** (version commerciale). Avant ça, pas de bundler.

### Modules globaux `window.FormulaXxx`

Chaque module dans `logic/` est une IIFE qui expose un objet sur `window` (par convention `Formula` + nom du module). Pattern voulu : permet de charger les modules indépendamment via `<script src="...">` sans système d'imports, tout en gardant des frontières claires. Le coût : chaque consommateur doit vérifier la présence du module avec un `throw` explicite (voir `index.html:159` pour `FormulaConstants`).

### localStorage et pas IndexedDB

Toutes les données rentrent largement dans le quota de 5 Mo par origine. Le format synchrone simplifie tout le code React (pas de promesses partout). Limite assumée : pas de stockage de gros médias (logos limités à 2 Mo, voir `index.html:3987`). Si on dépasse un jour, c'est la migration vers IndexedDB qui fait sens, pas un serveur — la philosophie reste local-first.

### Migration v1 qui cohabite avec le legacy

Les données ont une structure historique (`arpege_ingredients`, `arpege_recipes`, etc.) qui sert toujours de source de vérité. Une nouvelle structure v1 (`arpege_v1_*`, voir `models/schema.js`) est progressivement déployée en lecture canary derrière un feature flag (`arpege_feature_read_v1_enabled`). Tant que la migration n'est pas terminée, le runtime décide à chaque démarrage quelle source utiliser — voir flux ci-dessous.

---

## 3. Flux de données

### Démarrage : quelle source de données lire ?

`FormulaRuntimeDataSource.resolveDataSourcesRuntime` (dans `logic/runtime/data-source.js`) prend en entrée les ingrédients legacy + les rapports de cross-check et de switch-readiness, et décide pour chaque type d'entité (aujourd'hui : suppliers) si on lit la source legacy ou v1. Trois conditions pour activer v1 :
1. Le module `FormulaParallelRead` est chargé.
2. Le feature flag `arpege_feature_read_v1_enabled` est à `true`.
3. Le cross-check legacy↔v1 ne signale pas de divergence bloquante.

Si une condition manque, retour silencieux à `legacy` avec une `reason` exploitable côté UI. Ce mécanisme est pensé pour activer la migration **un type d'entité à la fois** sans risque.

### Calcul de coût d'une recette

Chaîne d'appel principale, toute dans `logic/core/costs-and-units.js` :

```
calculateRecipeTotalCost(recipe, allRecipes, visited, ingredientsCatalog)
  ├─ pour chaque ligne directe :
  │   calculateIngredientCost(line, catalog)
  │     ├─ resolveIngredientPricing(line, catalog)   ← id catalogue → fallback nom → fallback legacy
  │     └─ convertQuantity(qty, lineUnit, pricingUnit) ← null si groupes différents
  └─ pour chaque sous-recette :
      computeBaseComponentCost({ component, baseRecipe, baseCost })
        └─ resolveEffectiveYield(baseRecipe)  ← actual > legacy > theoretical
```

Règle clef : un seul `null` intermédiaire (prix manquant, conversion impossible, sous-recette introuvable) coupe tout le calcul. `getCostStatus(recipe, allRecipes, catalog)` parcourt la même structure pour produire un message d'erreur **localisé** ("Conversion impossible entre X et Y pour Z") quand le calcul échoue.

Un avertissement préventif est rendu au formulaire via `checkLineUnitConvertibility` (même module) — il pointe le problème **avant** que le chef ne découvre un coût "N/A".

### Import et export

Flux unique pour l'import :

```
fichier choisi (FileReader.readAsText)
  └─ FormulaDataExport.parseImportPayload(jsonString)
       ├─ JSON.parse + early returns sur null/vide/JSON invalide
       └─ validateImportPayload(parsed)
            ├─ vérifie app + formatVersion + structure data
            ├─ vérifie que chaque liste est un tableau (erreurs cumulées)
            └─ fallback prixRecettes à [] si absent ou mal formé
```

Côté écriture (dans `ParametresView`, `index.html:4306+`), **avant** tout `setIngredients/setRecipes/setSuppliers/setPrixRecettes`, on appelle `writeSafetyBackup(createSafetyBackup(...), localStorage)`. Ce filet de sécurité permet à l'utilisateur de cliquer "Restaurer" si l'import s'avère être une erreur. Une seule sauvegarde conservée à la fois (limite assumée — voir l'en-tête de `safety-backup.js`).

### Fusion (merge)

`FormulaMerge` propose deux étapes distinctes :

1. **`analyzeMerge`** : compare l'import et la base actuelle, retourne **trois listes** : nouveautés (auto-ajoutées), ignorés (déjà identiques), conflits (à arbitrer par l'utilisateur). Le nom est normalisé (lowercase + accents retirés) pour la comparaison.
2. **`applyMerge`** : applique les choix de l'utilisateur, **recalibre les IDs** internes (`ingredientId` dans recettes, `baseRecipeId` dans recettes finales) pour pointer sur les bons enregistrements après fusion. Les prix de vente (`prixRecettes`) ne sont importés que pour les recettes **nouvelles** — les prix locaux existants restent intouchés (chantier #7 de la Phase 1).

### Authentification & récupération

`logic/core/auth-helpers.js` hashe les mots de passe en SHA-256 et gère les codes de récupération à 12 caractères (format `XXXX-XXXX-XXXX`). En cas d'oubli, un code envoyé par email permet de réinitialiser le mot de passe via EmailJS. **Limite assumée Phase 1** : SHA-256 sans sel, à remplacer par PBKDF2 ou Argon2 avant le passage SaaS (voir Phase 5 du plan).

---

## 4. Couches et responsabilités

| Couche | Responsabilité | Tests ? |
|---|---|---|
| `logic/core/` | Logique métier pure (calculs, validations, transformations). Aucun accès direct au DOM ni au `localStorage` — les données sont passées en paramètre. | ✅ Obligatoires |
| `logic/migration/` | Transition legacy → v1 : transformation des structures, rapport de migration, écriture versionnée avec rollback. | ✅ Obligatoires |
| `logic/runtime/` | Décisions de runtime (quelle source lire, à quel moment). Lit le `localStorage` et les feature flags pour décider. | ✅ Obligatoires |
| `models/schema.js` | Définition de référence des structures de données v1. Source de vérité pour tout nouveau champ. | ✅ |
| `index.html` | Composants React, hooks, orchestration des modules. **Aucune logique métier** : si une fonction calcule, transforme ou décide, elle vit dans `logic/core/`. | ⚠️ Tests UI prévus Phase 5 (Vitest) |

**Règle absolue** : avant de coder dans `index.html`, se demander *"est-ce qu'il y a de la logique ici ?"*. Si oui → module d'abord, tests ensuite, `index.html` en dernier.

---

## 5. Conventions

### Ajouter un module `logic/core/`

1. Créer `logic/core/mon-module.js` sur le pattern IIFE → `window.FormulaMonModule`.
2. Créer `tests/mon-module.test.js` (chargement via `eval`, `assert` Node, `console.log("PASS ...")`).
3. Inscrire le test dans `tests/run-all.js`.
4. Ajouter `<script src="./logic/core/mon-module.js"></script>` dans `index.html` (après ses dépendances).
5. Ajouter un guard + destructuring dans `index.html` pour échec rapide si le module manque.
6. Mettre à jour le README (arborescence, tableau modules) et la mémoire si l'avancement projet change.

### Ajouter un champ à une entité (ingrédient, recette, etc.)

1. **Modifier d'abord `models/schema.js`** : champ + type + valeur par défaut + persisté ou calculé.
2. Vérifier que le champ a un comportement défini quand il est absent (rétrocompatibilité avec les anciennes sauvegardes).
3. Si le champ entre dans un calcul, ajouter ses tests dans le module concerné avant de toucher à `index.html`.

### Ajouter un message utilisateur

- Message unique au monde : laisser inline.
- Message réutilisé à 2 endroits ou plus, ou exposé dans plusieurs contextes : ajouter dans `FormulaConstants.MESSAGES` (voir l'en-tête de `logic/core/constants.js` pour le standard maison : phrase complète, point final, ton direct, pas de "Désolé").
- Le test `testMessagesRespectentLeStandardPhrase` (dans `tests/constants.test.js`) verrouille automatiquement le standard sur tout futur ajout.

### Tests obligatoires

- Tout nouveau module métier ou nouveau champ qui entre dans un calcul vient avec ses tests.
- Tests UI hors périmètre tant que Vite n'est pas en place (Phase 5).
- `node tests/run-all.js` doit toujours passer à 100 % avant tout commit.

---

## 6. Limites connues et perspectives

Les chantiers ouverts (dette technique consciente, refactor index.html, migration v1 à finir, sécurité SaaS, etc.) sont tracés dans `plan_formula_arpege_audit_lead_dev.html` (fichier local, hors Git) :
- **Phase 0/1** : durcissement de l'existant (sécurité, validation, tests, transparence) — terminée au 14 juin 2026.
- **Phase 2** : refactorisation progressive de `index.html` en composants extraits, factorisation de l'impression PDF, système de notification unifié (remplacer les `alert()` natifs).
- **Phase 3** : migration v1 effective (bascule lecture canary → lecture v1 par défaut).
- **Phase 4** : import par IA (dépend de la fiabilité d'import durcie en Phase 1).
- **Phase 5** : version commerciale — Vite, IndexedDB si nécessaire, PBKDF2/Argon2, backend.
