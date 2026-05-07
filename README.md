# arpege-recettes

Application web (React + scripts modulaires) de gestion de recettes pour restaurant, avec une migration **legacy → v1** exécutée en mode shadow puis une bascule de lecture progressive.

## Architecture réelle du projet

```text
/
├── index.html                         # App UI React + orchestration runtime
├── models/
│   └── schema.js                      # Schéma cible v1 + defaults/validation helpers
├── logic/
│   ├── core/                          # Moteur métier recettes/coûts/validation
│   │   ├── costs-and-units.js
│   │   ├── recipe-builder.js
│   │   ├── recipe-filters.js
│   │   ├── recipe-submission.js
│   │   └── recipe-scaling.js
│   ├── migration/                     # Chaîne migration legacy -> v1 + reporting + canary
│   │   ├── legacy-to-v1.js
│   │   ├── report.js
│   │   ├── versioned-storage.js
│   │   └── parallel-read.js
│   └── runtime/
│       └── data-source.js             # Décision finale des sources de lecture en UI
└── tests/                             # Tests unitaires modules core + migration
```

## Flux de données : legacy → migration shadow → v1

### 1) Données legacy (source historique)
L’application lit d’abord les collections legacy depuis `localStorage` :
- `arpege_ingredients`
- `arpege_recipes`

Ces données alimentent le moteur de migration shadow.

### 2) Migration shadow (sans impacter immédiatement la lecture UI)
Le module `logic/migration/legacy-to-v1.js` transforme les objets legacy vers le modèle cible v1 (fournisseurs, ingrédients, recettes de base, plats finaux, lignes).

Le module `logic/migration/report.js` produit ensuite un rapport (warnings/errors/notes + recommandations) pour qualifier la qualité de migration.

### 3) Décision d’écriture v1
Le module `logic/migration/versioned-storage.js` décide si l’écriture v1 est autorisée :
- Écriture autorisée si **0 erreur bloquante** et **0 warning bloquant** (`MISSING_INGREDIENT_REFERENCE`, `MISSING_BASE_RECIPE_REFERENCE`)
- Sinon : mode **shadow_only** (pas de persistance v1)

Si autorisée, les collections v1 sont persistées dans des clés versionnées `arpege_v1_*` + version de schéma.

### 4) Lecture parallèle / cohérence / readiness
Le module `logic/migration/parallel-read.js` :
- lit les données v1 persistées,
- compare volumes et références legacy vs v1,
- calcule les écarts (`high` / `medium` / `info`),
- détermine la **switch readiness**.

### 5) Sélection de source runtime (canary)
Le module `logic/runtime/data-source.js` choisit la source réellement lue par l’UI (ex: fournisseurs), selon :
- feature flag `arpege_feature_read_v1_enabled`,
- présence des données v1,
- readiness,
- sévérité du cross-check.

La bascule vers v1 est canary et sécurisée : en cas de doute, fallback legacy.

## Schéma textuel simple du flux

```text
localStorage legacy
(arpege_ingredients, arpege_recipes)
          │
          ▼
[legacy-to-v1] transformation
          │
          ▼
[report] warnings/errors/notes
          │
          ▼
[versioned-storage] write decision
   ├── KO  -> mode shadow_only (pas d'écriture v1)
   └── OK  -> écriture arpege_v1_* + arpege_schema_version
                      │
                      ▼
              [parallel-read] cross-check + readiness
                      │
                      ▼
           [runtime/data-source] source effective UI
   ├── legacy (flag off / v1 absent / readiness bloquée / écart critique)
   └── v1_canary (flag on + v1 présent + readiness OK)
```

## Clés `localStorage` importantes

### Clés legacy (historique)
- `arpege_ingredients` : ingrédients legacy.
- `arpege_recipes` : recettes legacy (base/finales + lignes).
- `arpege_suppliers` : liste fournisseurs UI legacy.

### Clés session / pilotage
- `arpege_user` : utilisateur connecté (rôle + nom).
- `arpege_feature_read_v1_enabled` : active la lecture v1 canary (`"1"` ou `"true"`).

### Clés v1 versionnées
- `arpege_v1_fournisseurs`
- `arpege_v1_ingredients`
- `arpege_v1_recettes_base`
- `arpege_v1_plats_finals`
- `arpege_v1_lignes_recette_ingredient`
- `arpege_v1_lignes_plat_sous_recette`
- `arpege_v1_lignes_plat_ingredient_direct`
- `arpege_schema_version`

## Rôles et modules existants

## Rôles
- **chef**
  - Accès onglets : Ingrédients, Recettes de base, Recettes finales, Fournisseurs, **Coûts**.
  - Gestion complète (création/édition/suppression selon les écrans).
- **employe**
  - Accès onglets : Ingrédients, Recettes de base, Recettes finales, Fournisseurs.
  - Pas d’accès à l’onglet **Coûts**.

Comptes de démo actuels :
- `chef / chef123`
- `employe / employe123`

## Modules
- `logic/core/costs-and-units.js` : conversions d’unités, calculs coûts, rendement/cost status.
- `logic/core/recipe-builder.js` : construction normalisée de lignes ingrédients/sous-recettes.
- `logic/core/recipe-filters.js` : filtres de recherche/listing (recettes, ingrédients, sous-recettes).
- `logic/core/recipe-submission.js` : validation du draft recette, payload, upsert.
- `logic/core/recipe-scaling.js` : mise à l’échelle des quantités/rendements.
- `logic/migration/legacy-to-v1.js` : transformation modèle legacy vers modèle cible v1.
- `logic/migration/report.js` : synthèse et logs du rapport de migration shadow.
- `logic/migration/versioned-storage.js` : règles d’écriture versionnée et rollback.
- `logic/migration/parallel-read.js` : lecture v1, cross-check, readiness, stratégie canary.
- `logic/runtime/data-source.js` : décision runtime de la source de données lue par l’UI.
