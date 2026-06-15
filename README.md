# arpege-recettes

Application web de gestion de recettes pour restaurant gastronomique. Construite avec React (sans bundler) et des modules JavaScript indépendants. Fonctionne entièrement en local, sans serveur.

📐 Pour comprendre les décisions structurantes, les flux de données et les conventions : voir [ARCHITECTURE.md](ARCHITECTURE.md).

## Architecture du projet

```text
/
├── index.html                         # Interface React + orchestration
├── models/
│   └── schema.js                      # Schéma de données v1 + valeurs par défaut
├── logic/
│   ├── core/                          # Logique métier
│   │   ├── constants.js               # Constantes partagées (unités, catégories, etc.)
│   │   ├── storage-keys.js            # Source unique des clés localStorage (DATA, SESSION, CONFIG, SAFETY, MIGRATIONS, V1, FEATURE_FLAGS, PREFS)
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
│   │   ├── editor.js                  # Formatage riche du procédé (gras, italique, couleur, liste) sans execCommand
│   │   ├── pricing.js                 # Calcul des prix de vente et marges (4 méthodes : coefficient, marge HT, marge TTC, prix TTC décidé)
│   │   ├── safety-backup.js           # Sauvegarde automatique avant import/fusion + restauration
│   │   └── data-status.js             # État des données (compteurs par type, dernière sauvegarde, taille de stockage)
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
│   ├── config.test.js
│   ├── constants.test.js
│   ├── core-costs-and-units.test.js
│   ├── data-export.test.js
│   ├── data-status.test.js
│   ├── editor.test.js
│   ├── merge.test.js
│   ├── migration-coherence.test.js
│   ├── procedure.test.js
│   ├── recipe-builder.test.js
│   ├── recipe-filters.test.js
│   ├── recipe-scaling.test.js
│   ├── recipe-submission.test.js
│   ├── rentabilite.test.js
│   ├── safety-backup.test.js
│   ├── schema.test.js
│   ├── storage-keys.test.js
│   └── utils.test.js
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
- **Coûts** : calcul automatique avec conversions d'unités et coefficient de perte. Avertissement formulaire quand une unité saisie n'est pas convertible vers l'unité d'achat de l'ingrédient.
- **Rentabilité** : calculateur de prix de vente (4 méthodes : par coefficient, par marge HT, par marge TTC, par prix TTC décidé), historique des prix, prix actuels par recette, statistiques de coûts
- **Adaptation** : mise à l'échelle d'une recette selon couverts, budget, quantité ou ingrédient pivot
- **Allergènes** : détection automatique des 14 allergènes réglementaires européens
- **Export PDF** : fiche recette, fiche de production, fiche adaptée
- **Sauvegarde** : export/import JSON (avec préservation des prix de vente), fusion intelligente de sauvegardes, sauvegarde automatique avant tout import/fusion avec restauration possible
- **État des données** : carte dans l'onglet Paramètres (chef) résumant le nombre d'ingrédients, recettes, fournisseurs, la dernière sauvegarde automatique et la taille du stockage local

## Rôles

- **Chef** : accès complet à tous les onglets, dont l'onglet Coûts
- **Employé** : accès aux onglets Ingrédients, Recettes de base, Recettes finales, Fournisseurs — sans accès aux coûts

Les comptes sont créés lors du premier lancement de l'application (écran de configuration). Chaque restaurant définit ses propres mots de passe.

## Modules `logic/core`

| Module | Rôle |
|---|---|
| `constants.js` | Unités, catégories, types de recettes, pays/TVA, messages utilisateur centralisés (`MESSAGES`) |
| `storage-keys.js` | Source unique des clés `localStorage` regroupées par catégorie : `DATA` (legacy), `SESSION`, `CONFIG`, `SAFETY`, `MIGRATIONS`, `V1`, `FEATURE_FLAGS` |
| `utils.js` | Formatage des nombres, prix, procédés, titres d'impression |
| `auth-helpers.js` | Chiffrement SHA-256 des mots de passe, génération et validation des codes de récupération |
| `costs-and-units.js` | Conversions masse/volume, calcul du coût total d'une recette, statut de coût, vérification de convertibilité par ligne (avertissement formulaire) |
| `recipe-builder.js` | Construction d'une ligne ingrédient ou sous-recette |
| `recipe-filters.js` | Filtres de liste et de recherche |
| `recipe-submission.js` | Validation du formulaire recette, upsert |
| `recipe-scaling.js` | Calcul du multiplicateur et des quantités adaptées |
| `allergenes.js` | Dictionnaire des 14 allergènes, détection par nom d'ingrédient, résumé complet pour une recette |
| `data-export.js` | Sérialisation pour export JSON, validation à l'import |
| `merge.js` | Comparaison et fusion de deux sauvegardes sans écrasement, y compris les prix de vente des recettes nouvellement importées |
| `config.js` | Lecture et écriture de la configuration restaurant (localStorage) |
| `procedure.js` | Détection des dimensions et temps de cuisson dans les procédés, construction des avertissements d'adaptation |
| `editor.js` | Formatage riche du procédé (gras, italique, souligné, couleur, liste à puces) via Selection/Range, sans `execCommand` |
| `pricing.js` | Calcul des prix de vente et marges selon 4 méthodes : par coefficient, par marge brute HT, par marge nette TTC, par prix TTC décidé |
| `safety-backup.js` | Sauvegarde automatique des données avant tout import ou fusion, avec restauration possible |
| `data-status.js` | État des données (compteurs ingrédients/recettes/fournisseurs, timestamp de la dernière sauvegarde automatique, taille du stockage localStorage) — affiché dans l'onglet Paramètres |

## Stockage localStorage

### Données principales
- `arpege_ingredients` : ingrédients
- `arpege_recipes` : recettes (base et finales)
- `arpege_suppliers` : fournisseurs
- `arpege_restaurant_config` : configuration du restaurant (nom, mots de passe hashés)

### Session
- `arpege_user` : utilisateur connecté (rôle)

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
