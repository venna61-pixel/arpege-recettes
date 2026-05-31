# arpege-recettes

Application web de gestion de recettes pour restaurant gastronomique. Construite avec React (sans bundler) et des modules JavaScript indépendants. Fonctionne entièrement en local, sans serveur.

## Architecture du projet

```text
/
├── index.html                         # Interface React + orchestration
├── models/
│   └── schema.js                      # Schéma de données v1 + valeurs par défaut
├── logic/
│   ├── core/                          # Logique métier
│   │   ├── constants.js               # Constantes partagées (unités, catégories, etc.)
│   │   ├── utils.js                   # Fonctions utilitaires (formatage, impression)
│   │   ├── auth-helpers.js            # Sécurité (chiffrement mot de passe, codes de récupération)
│   │   ├── costs-and-units.js         # Conversions d'unités, calcul des coûts
│   │   ├── recipe-builder.js          # Construction des lignes ingrédients/sous-recettes
│   │   ├── recipe-filters.js          # Filtres de recherche
│   │   ├── recipe-submission.js       # Validation et sauvegarde des recettes
│   │   ├── recipe-scaling.js          # Adaptation des quantités (scaling)
│   │   ├── allergenes.js              # Détection des 14 allergènes réglementaires
│   │   ├── data-export.js             # Export/import JSON des données
│   │   ├── merge.js                   # Fusion intelligente de sauvegardes
│   │   ├── config.js                  # Lecture/écriture de la configuration restaurant
│   │   ├── procedure.js               # Détection des dimensions/temps dans les procédés, avertissements d'adaptation
│   │   └── analytics.js               # Chargement conditionnel de Google Analytics (consentement RGPD)
│   ├── migration/                     # Migration legacy → v1
│   │   ├── legacy-to-v1.js            # Transformation des données historiques
│   │   ├── report.js                  # Rapport de migration (warnings/erreurs)
│   │   ├── versioned-storage.js       # Écriture versionnée avec rollback
│   │   └── parallel-read.js           # Lecture parallèle, cross-check, canary
│   └── runtime/
│       └── data-source.js             # Décision de la source de données active
├── tests/                             # Tests unitaires (Node.js, sans framework)
│   ├── run-all.js                     # Lanceur de tous les tests
│   ├── allergenes.test.js
│   ├── auth-helpers.test.js
│   ├── core-costs-and-units.test.js
│   ├── data-export.test.js
│   ├── merge.test.js
│   ├── migration-coherence.test.js
│   ├── recipe-builder.test.js
│   ├── recipe-filters.test.js
│   ├── recipe-scaling.test.js
│   ├── recipe-submission.test.js
│   ├── utils.test.js
│   ├── config.test.js
│   ├── procedure.test.js
│   └── analytics.test.js
└── logo/
    ├── formula-logo.svg
    ├── formula-logo-clair.svg
    └── formula-logo-icone.svg
```

## Lancer les tests

```bash
node tests/run-all.js
```

## Fonctionnalités

- **Ingrédients** : création, modification, suppression, catégories, prix, unités, fournisseurs, allergènes
- **Recettes de base** : composition, procédé WYSIWYG, rendement, couverts
- **Recettes finales** : assemblage de recettes de base + ingrédients directs
- **Fournisseurs** : gestion de la liste des fournisseurs
- **Coûts** : calcul automatique avec conversions d'unités et coefficient de perte
- **Adaptation** : mise à l'échelle d'une recette selon couverts, budget, quantité ou ingrédient pivot
- **Allergènes** : détection automatique des 14 allergènes réglementaires européens
- **Export PDF** : fiche recette, fiche de production, fiche adaptée
- **Sauvegarde** : export/import JSON, fusion intelligente de sauvegardes

## Rôles

- **Chef** : accès complet à tous les onglets, dont l'onglet Coûts
- **Employé** : accès aux onglets Ingrédients, Recettes de base, Recettes finales, Fournisseurs — sans accès aux coûts

Les comptes sont créés lors du premier lancement de l'application (écran de configuration). Chaque restaurant définit ses propres mots de passe.

## Modules `logic/core`

| Module | Rôle |
|---|---|
| `constants.js` | Unités, catégories, types de recettes |
| `utils.js` | Formatage des nombres, prix, procédés, titres d'impression |
| `auth-helpers.js` | Chiffrement SHA-256 des mots de passe, génération et validation des codes de récupération |
| `costs-and-units.js` | Conversions masse/volume, calcul du coût total d'une recette, statut de coût |
| `recipe-builder.js` | Construction d'une ligne ingrédient ou sous-recette |
| `recipe-filters.js` | Filtres de liste et de recherche |
| `recipe-submission.js` | Validation du formulaire recette, upsert |
| `recipe-scaling.js` | Calcul du multiplicateur et des quantités adaptées |
| `allergenes.js` | Dictionnaire des 14 allergènes, détection par nom d'ingrédient, résumé complet pour une recette |
| `data-export.js` | Sérialisation pour export JSON, validation à l'import |
| `merge.js` | Comparaison et fusion de deux sauvegardes sans écrasement |
| `config.js` | Lecture et écriture de la configuration restaurant (localStorage) |
| `procedure.js` | Détection des dimensions et temps de cuisson dans les procédés, construction des avertissements d'adaptation |
| `analytics.js` | Chargement conditionnel de Google Analytics selon le consentement RGPD de l'utilisateur |

## Stockage localStorage

### Données principales
- `arpege_ingredients` : ingrédients
- `arpege_recipes` : recettes (base et finales)
- `arpege_suppliers` : fournisseurs
- `arpege_restaurant_config` : configuration du restaurant (nom, mots de passe hashés)

### Session
- `arpege_user` : utilisateur connecté (rôle)
- `arpege_consent_analytics` : consentement RGPD pour Google Analytics

### Données migrées v1 (en cours de déploiement)
- `arpege_v1_fournisseurs`
- `arpege_v1_ingredients`
- `arpege_v1_recettes_base`
- `arpege_v1_plats_finals`
- `arpege_v1_lignes_recette_ingredient`
- `arpege_v1_lignes_plat_sous_recette`
- `arpege_v1_lignes_plat_ingredient_direct`
- `arpege_schema_version`
- `arpege_feature_read_v1_enabled` : active la lecture v1 canary
