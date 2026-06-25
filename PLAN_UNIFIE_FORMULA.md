# Formula / Arpège — Plan unifié (technique + commercialisation)

**Version** : v1 — 25 juin 2026
**Statut** : plan-source actif. Fusionne et remplace `plan_formula_arpege_audit_lead_dev.html` (archivé) et `PLAN_OPTIMAL_COMMERCIALISATION_SUPABASE.md` (archivé, version du 24 juin).
**Cible** : transformer Formula en produit SaaS multi-restaurant vendable, sans perdre l'IA d'import qui reste un argument commercial fort.

---

## 1. Décision centrale

Formula suit une trajectoire en deux temps :

1. **D'abord** : architecture saine et multi-tenant — cadrage produit, fin du refactor, migration Vite, modèle de données propre, Supabase + RLS.
2. **Ensuite** : différenciateurs commerciaux — IA d'import, journal des ventes, statistiques de pilotage.
3. **Enfin** : pilote PVG et commercialisation formelle.

L'IA d'import et le journal des ventes sont **gardés** mais repositionnés **après** la migration cloud. Construire ces fonctions sur le monolithe actuel reviendrait à les porter deux fois.

---

## 2. Principes non négociables

### Données
- Aucune perte de données acceptée pendant import, migration ou synchronisation.
- Toute migration est réversible ou précédée d'une sauvegarde exploitable.
- Les anciens exports JSON locaux doivent rester importables dans la version cloud.
- Recettes, coûts, prix, historiques et fournisseurs restent liés par identifiants stables.

### Sécurité
- Un restaurant ne peut jamais lire les données d'un autre.
- Les rôles sont appliqués côté serveur (RLS Supabase), pas seulement dans l'interface.
- Le SHA-256 mot de passe local n'est pas réutilisé comme système d'auth commercial.
- Toute policy RLS est testée.
- Aucune clé API IA dans le navigateur — passage obligatoire par un proxy serveur.

### Produit
- Utilisable par un chef non technique.
- Onboarding restaurant simple : créer compte, importer données ou commencer vide.
- L'IA ne modifie jamais directement les données : aperçu + validation humaine systématique.

### Technique
- La logique métier existante (`logic/core/`) est réutilisée au maximum.
- Pas de réécriture massive sans tests de non-régression.
- Chaque phase laisse l'application dans un état utilisable.
- Les tests passent avant chaque livraison.

---

## 3. État actuel

### Travaux déjà livrés (ne pas refaire)

**Phase 0 audit & Phase 1 stabilisation critique — clôturées le 14 juin 2026.**

- Audit complet en 7 phases (structure, bugs runtime, sécurité, qualité, performance, robustesse, tests).
- 434 tests verts (`node tests/run-all.js`).
- Error Boundary global, `JSON.parse` sécurisé, Google Analytics désactivé.
- Validation métier renforcée (`validateRecipeDraft`).
- Sauvegarde automatique avant import/fusion (`FormulaSafetyBackup`).
- Sanitisation HTML des procédés (DOMPurify).
- Propagation `prixRecettes` à l'import/fusion.
- Écran "État des données" en Paramètres (chef-only).
- Messages d'erreur uniformisés (`FormulaConstants.MESSAGES`).
- Tests de non-régression import (5 trous comblés).
- Cohérence d'unités au formulaire (avertissement orange non bloquant).
- `ARCHITECTURE.md` (145 lignes, 6 sections).
- Centralisation `FormulaStorageKeys` (A1 + A2 livrés — `b9281c2`, `b2c0ffb`).
- Pinning CDN Babel `@7` (`684965a`).
- Warning cost-status propagé depuis sous-recettes (`3146c6d`).

### Forces consolidées

- Logique métier modulaire (`logic/core/`).
- 434 tests Node, base de non-régression solide.
- Import/export JSON structuré.
- Sauvegarde de sécurité avant import/fusion.
- Début de modèle v1 et migration shadow.

### Faiblesses à traiter

- `index.html` monolithique (≈ 4400 lignes).
- Dépendances CDN (React, Babel, Tailwind, DOMPurify, EmailJS) → pas de build reproductible.
- Pas de tests UI navigateur.
- Auth locale SHA-256 insuffisante pour usage commercial.
- Supabase pas encore modélisé en détail.
- Plan commercial, onboarding, RGPD à formaliser.
- Tailwind CDN non pinné (reporté en Phase 3 avec Vite).

---

## 4. Vue d'ensemble — 11 phases

| # | Phase | Nature | Statut |
|---|---|---|---|
| 0 | Cadrage produit & commercial | Produit | À faire |
| 1 | Fin du refactor progressif | Technique | En cours (centralisation config presque finie) |
| 2 | Modèle de données v1 finalisé | Données | À faire |
| 3 | Migration Vite + React | Industrialisation frontend | À faire |
| 4 | Extraction par domaines | Architecture | À faire |
| 5 | Supabase : auth + RLS | Backend / sécurité | À faire |
| 6 | Stockage cloud données métier | Backend | À faire |
| 7 | Migration localStorage → cloud | Migration | À faire |
| 8 | Import IA (texte / PDF / OCR) | Différenciateur commercial | À faire |
| 9 | Journal des ventes & statistiques | Métier | À faire |
| 10 | Tests UI, CI, qualité | Qualité | À faire |
| 11 | Client pilote + commercialisation | Commercial | À faire — en parallèle dès Phase 5 |

**Travaux préparatoires juridiques/commerciaux (RGPD, pricing, contrat pilote)** : à démarrer en parallèle dès Phase 5, pas en attente de Phase 11.

---

## Phase 0 — Cadrage produit & commercial

**But** : savoir ce qu'on vend avant de construire le backend.

### Actions
- Définir l'offre initiale :
  - cible (restaurant gastronomique, indépendant, traiteur, groupe — PVG = groupe) ;
  - nombre d'utilisateurs typique ;
  - usage principal (fiches, coûts, rentabilité, transmission équipe, achats) ;
  - données sensibles (prix fournisseurs, marges, recettes propriétaires).
- Définir les rôles :
  - propriétaire / admin restaurant ;
  - chef ;
  - second ;
  - employé lecture/écriture limitée ;
  - éventuel consultant externe.
- Définir le MVP commercial :
  - création ingrédients, recettes de base, recettes finales ;
  - coûts et rentabilité ;
  - fournisseurs ;
  - import/export ;
  - utilisateurs et rôles ;
  - sauvegarde cloud.
- Lister les fonctionnalités repoussées hors MVP.

### Livrables
- `PRODUCT_SCOPE.md` (cible, MVP, hors-MVP).
- Liste des rôles et permissions.
- Note de cadrage PVG (ce qui les intéresse, ce qu'on leur montre quand).

### Critère de sortie
On sait exactement quelle première version peut être vendue ou testée par des clients pilotes.

---

## Phase 1 — Fin du refactor progressif

**But** : finir de réduire la dépendance au gros `index.html` avant la bascule Vite. Origine : Phase 2 du plan d'audit.

### Chantiers

| Chantier | Action | Critère d'acceptation | Statut |
|---|---|---|---|
| **`ui-tokens.js`** | Centraliser les 245 couleurs hardcodées de `index.html`. | Plus de couleurs en dur. Tokens prêts à être convertis en config Tailwind en Phase 3. | À faire |
| **Éditeur procédé moderne** | Remplacer `document.execCommand` (deprecated) dans `logic/core/editor.js` par l'API `Selection`/`Range`. | Formatage riche (gras, italique, couleur, listes) fonctionne sans API obsolète. | À faire |
| **Système de notification unifié** | Remplacer les `alert()` natifs par un composant maison (toast ou modal léger) branché sur `FormulaConstants.MESSAGES`. | Plus aucun `alert()` natif dans `index.html`. | À faire |
| **Factorisation impression PDF** | Déduplication des 4 fonctions `handlePrint*` (≈ 800 lignes dupliquées). | Une fonction commune génère les fiches. | À faire |
| **Isolation import/export** | Extraire toute la logique import/export dans un module dédié. | L'UI ne manipule plus directement les détails JSON. | À faire |
| **Stabilisation autocomplete** | Ouverture, fermeture, clic extérieur, sélection. | Plus de menu déroulant bloqué. | À faire |
| **Adaptation recette** | Vérifier le passage du catalogue ingrédients aux calculs adaptés. | Coûts adaptés fiables. | À faire |

### Définition de terminé
- `index.html` ne grossit plus.
- Constantes techniques centralisées.
- Impression PDF non dupliquée.
- Import/export isolé.
- Tous les tests passent.

---

## Phase 2 — Modèle de données v1 finalisé

**But** : éliminer la double source de vérité entre legacy (`arpege_recipes`, `arpege_ingredients`) et modèle v1, avant de mapper vers Supabase. Origine : Phase 3 du plan d'audit.

### Chantiers

| Chantier | Action | Critère d'acceptation |
|---|---|---|
| **Migration v1 complète** | Migrer ingrédients, recettes de base, recettes finales et lignes. | Migration reproductible et testée. |
| **Lecture v1** | Activer progressivement la lecture v1, désactiver la lecture legacy. | Une seule source active par type de donnée. |
| **Rollback** | Garder possibilité de retour legacy pendant la transition. | Rollback documenté. |
| **Tests migration** | Tester avec références cassées, doublons, unités incohérentes. | Les erreurs sont détectées. |
| **Validation de références** | Vérifier que `ingredientId` et `baseRecipeId` pointent sur un élément existant, au formulaire et à l'import/fusion. | Une recette ne peut pas être enregistrée avec une référence cassée. Import bloque ou nettoie les orphelins. |
| **Documentation modèle** | Créer `DATA_MODEL.md`. | Un développeur comprend le modèle sans lire tout le code. |

### Règle
Aucune fonctionnalité avancée (IA, backend, ventes) ne doit écrire dans un modèle ambigu. **C'est pour ça que cette phase passe avant Vite et Supabase.**

### Définition de terminé
- Le modèle v1 est documenté.
- La migration est testée.
- L'app sait clairement quelle source lire.
- Les références recette → sous-recette sont cohérentes.
- Les données legacy ne sont plus la source principale.

---

## Phase 3 — Migration Vite + React

**But** : transformer l'app locale en codebase moderne, maintenable, prête pour Supabase et l'audit lead dev. Origine : Phase 7 du plan d'audit (anticipée).

### Pourquoi maintenant
Brancher Supabase, ajouter de l'IA, déployer en CI sur un `index.html` monolithique de 4400 lignes serait fragile. Mieux vaut migrer avant ces étapes que pendant.

### Architecture cible

```
src/
  app/
    App.jsx
    routes.jsx
    providers.jsx
  components/
    layout/
    forms/
    tables/
    modals/
    print/
  features/
    ingredients/
    recipes-base/
    recipes-finales/
    adaptation/
    pricing/
    import/
    sales/
    settings/
  domain/
    recipes/
    ingredients/
    costs/
    units/
    pricing/
    migration/
  services/
    storage/
    import-export/
    ai/
    analytics/
  styles/
  tests/
```

### Chantiers

| Chantier | Action | Critère d'acceptation |
|---|---|---|
| **Vite** | Créer l'app Vite + React. | `npm run dev` fonctionne. |
| **Dépendances locales** | React, ReactDOM, Tailwind, DOMPurify, EmailJS installés en local (suppression des CDN). | Plus de dépendance CDN runtime. |
| **Modules métier** | Réutiliser `logic/core/` en exports ES modules. | Pas de réécriture métier inutile. |
| **Tests** | Migrer de l'`eval()`-loader vers Vitest. | Tests plus lisibles, 434 tests verts. |
| **Lint/format** | Ajouter ESLint + Prettier. | Code homogène. |
| **Build** | `npm run build`. | Build reproductible. |

### Définition de terminé
- L'app démarre avec `npm run dev`.
- Le build fonctionne.
- Les 434 tests passent en Vitest.
- `index.html` ne contient plus la logique applicative.
- Tailwind est en config locale (pinning géré).

---

## Phase 4 — Extraction par domaines

**But** : sortir du monolithe sans perdre la logique existante. Origine : Phase 3 du plan commercialisation.

### Ordre recommandé
1. layout et navigation ;
2. ingrédients ;
3. fournisseurs ;
4. recettes de base ;
5. recettes finales ;
6. adaptation ;
7. rentabilité ;
8. paramètres ;
9. import/export ;
10. impression.

### Règle de migration

Pour chaque domaine :
- extraire les composants ;
- garder les fonctions métier dans `domain/` ;
- ajouter ou migrer les tests ;
- vérifier le parcours dans le navigateur ;
- **ne pas mélanger refactor et nouvelle fonctionnalité.**

### Définition de terminé
- Composants séparés par feature.
- Services de stockage isolés de l'UI.
- Tests de non-régression par domaine.
- Un dev externe peut comprendre ou modifier une zone sans lire 4000 lignes.

---

## Phase 5 — Supabase : auth + sécurité

**But** : créer le backend sans encore migrer toutes les fonctionnalités. Origine : Phase 5 du plan commercialisation + Phase 8 du plan d'audit.

### Actions
- Créer le projet Supabase.
- Configurer les environnements : local, staging, production.
- Créer `.env.example`.
- Ajouter Supabase client dans l'app Vite.
- Activer Supabase Auth (email + magic link, choix à confirmer en Phase 0).
- Créer les tables de base :
  - `organizations` ;
  - `profiles` ;
  - `organization_members`.
- Activer RLS partout.
- Écrire les premières policies :
  - un utilisateur lit seulement ses organisations ;
  - un membre lit seulement les membres de son organisation ;
  - seul admin/propriétaire peut inviter ou retirer.

### Livrables
- Migrations SQL Supabase.
- `.env.example`.
- `SECURITY.md`.
- Tests RLS (manuels au minimum, idéalement automatisés).

### Critère de sortie
Un utilisateur peut se connecter et être rattaché à une organisation **sans fuite de données** vers d'autres organisations.

### En parallèle
Démarrer le volet juridique de Phase 11 dès cette phase : RGPD, mentions légales, contrat pilote PVG (modèle).

---

## Phase 6 — Stockage cloud des données métier

**But** : connecter progressivement les features métier à Supabase. Origine : Phase 6 du plan commercialisation + Phase 8 du plan d'audit (multi-tenant, audit logs, backups).

### Ordre recommandé
1. fournisseurs ;
2. ingrédients ;
3. recettes simples ;
4. lignes de recettes ;
5. recettes finales ;
6. prix et rentabilité ;
7. imports ;
8. backups ;
9. audit logs.

### Stratégie

Couche repository :

```
services/
  repositories/
    ingredientsRepository.js
    recipesRepository.js
    suppliersRepository.js
    pricesRepository.js
    importsRepository.js
```

- L'UI ne parle pas directement à Supabase.
- Les fonctions métier restent pures.
- Les repositories transforment Supabase ↔ format domaine.

### Schéma Supabase initial recommandé

```text
auth.users
  id
  email

profiles
  id -> auth.users.id
  full_name
  created_at

organizations
  id
  name
  country_code
  currency
  created_at
  deleted_at

organization_members
  id
  organization_id
  user_id
  role
  created_at

suppliers
  id
  organization_id
  name
  contact
  notes
  created_at
  updated_at
  deleted_at

ingredients
  id
  organization_id
  supplier_id
  name
  category
  unit
  price
  allergens
  notes
  created_at
  updated_at
  deleted_at

recipes
  id
  organization_id
  type            -- 'base' ou 'finale'
  name
  category
  yield_quantity
  yield_unit
  portions
  procedure_html
  notes
  created_at
  updated_at
  deleted_at

recipe_ingredient_lines
  id
  organization_id
  recipe_id
  ingredient_id
  quantity
  unit
  waste_pct
  sort_order

recipe_subrecipe_lines
  id
  organization_id
  recipe_id
  subrecipe_id
  quantity
  unit
  sort_order

recipe_prices
  id
  organization_id
  recipe_id
  cost_per_portion
  price_ht
  price_ttc
  vat_rate
  margin_ht_pct
  margin_ttc_pct
  created_at
  created_by

imports
  id
  organization_id
  source
  status
  report
  created_at
  created_by

backup_snapshots
  id
  organization_id
  payload_url
  created_at

audit_logs
  id
  organization_id
  actor_user_id
  action
  entity_type
  entity_id
  payload
  created_at
```

### Décisions à confirmer en Phase 0/2
- Recettes base et finales → même table `recipes` avec champ `type` (recommandation : oui).
- Prix fournisseurs historisés (recommandation : oui, mais hors MVP).
- Suppressions logiques (soft delete) sur données métier.
- Unités : catalogue contrôlé + migration des valeurs existantes.

### Critère de sortie
Un restaurant pilote peut travailler sur ses données cloud principales.

---

## Phase 7 — Migration localStorage → cloud

**But** : permettre à un client existant (L'Arpège notamment) d'importer ses données locales. Origine : Phase 7 du plan commercialisation.

### Actions
- Réutiliser l'export JSON actuel.
- Ajouter un assistant d'import cloud :
  - sélection fichier ;
  - validation ;
  - aperçu ;
  - détection doublons ;
  - mapping ;
  - confirmation ;
  - sauvegarde cloud avant écriture si données existantes.
- Générer un rapport d'import :
  - objets créés ;
  - objets ignorés ;
  - conflits ;
  - erreurs ;
  - références réconciliées.

### Règle
**Aucune importation cloud n'écrit sans validation explicite.**

### Critère de sortie
Une sauvegarde locale actuelle peut devenir un compte restaurant cloud exploitable.

---

## Phase 8 — Import IA (texte / PDF / OCR)

**But** : ajouter le différenciateur commercial sans fragiliser le cœur métier. Origine : Phase 4 du plan d'audit, **repositionnée après la migration cloud** pour ne pas porter l'IA deux fois.

### Phase 8A — Import IA depuis texte copié-collé

| Fonction | Détail | Critère d'acceptation |
|---|---|---|
| **Coller une recette** | L'utilisateur colle du texte brut. | Pas encore de fichier. |
| **Extraction IA** | L'IA propose ingrédients, quantités, unités et procédé. | JSON structuré versionné. |
| **Aperçu avant import** | L'utilisateur corrige avant validation. | Rien n'est écrit sans validation. |
| **Détection doublons simple** | Comparaison noms ingrédients et recettes. | Suggestions, pas décision automatique. |
| **Import partiel** | Ajouter une recette sans écraser. | Fusion contrôlée. |

### Phase 8B — Import PDF / Word texte

| Fonction | Détail | Critère d'acceptation |
|---|---|---|
| **Upload fichier** | PDF texte ou Word. | Pas encore de scan photo. |
| **Extraction contenu** | Texte extrait côté serveur ou outil contrôlé. | Erreur propre si fichier illisible. |
| **Pipeline 8A** | IA → aperçu → validation → import. | Pas de duplication logique. |

### Phase 8C — Import photo / scan (OCR)

| Fonction | Détail | Critère d'acceptation |
|---|---|---|
| **OCR** | Reconnaissance image. | Niveau de confiance affiché. |
| **Ambiguïtés** | Quantités et unités incertaines signalées. | L'utilisateur doit confirmer. |
| **Import sécurisé** | Même pipeline que 8A/8B. | Jamais d'import automatique aveugle. |

### Architecture IA

| Élément | Décision |
|---|---|
| **Clé API** | Jamais dans le navigateur. |
| **Serveur proxy** | Supabase Edge Function (cohérent avec le backend), ou Vercel/Infomaniak en alternative. |
| **Schéma de sortie** | JSON strict versionné. |
| **Validation** | Validation locale avant écriture. |
| **Logs** | Ne pas stocker les recettes sensibles inutilement. |
| **Coût** | Afficher ou limiter les appels IA par organisation. |

### Définition de terminé
- L'IA ne modifie jamais directement les données.
- Tout passe par aperçu + validation.
- Le format JSON est versionné.
- Les imports partiels ne détruisent pas les données existantes.
- Les doublons sont proposés à l'utilisateur, pas fusionnés aveuglément.

---

## Phase 9 — Journal des ventes & statistiques

**But** : ajouter le pilotage métier après stabilisation du modèle et de la cloud. Origine : Phases 5 + 6 du plan d'audit.

### Phase 9A — Journal des ventes

| Fonction | Détail | Critère d'acceptation |
|---|---|---|
| **Saisie ventes** | Recette finale + quantité vendue + date. | Saisie rapide. |
| **Nombre de couverts** | Couverts du jour. | Manuel au départ. |
| **Coût théorique vendu** | Quantité × coût recette. | Calcul fiable. |
| **Marge estimée** | Prix enregistré – coût. | Basé sur prix actuels. |
| **Historique jours** | Liste des journées. | Exportable. |
| **Correction journée** | Modifier une journée passée. | Traçable (audit log). |

**Vigilance** : ne pas mélanger trop tôt "marge réelle" et "marge théorique". Parler de **marge estimée** au départ, puis plus tard de **marge réelle ajustée** (pertes, invendus, offerts).

### Phase 9B — Statistiques de pilotage

| Fonction | Critère d'acceptation |
|---|---|
| **Plats les plus vendus** | Classement 7 j / 30 j / période personnalisée. |
| **Plats les plus rentables** | Basé sur marge unitaire × volume. |
| **Évolution couverts** | Graphique simple. |
| **Ticket moyen** | Chiffre d'affaires / couverts. |
| **Comparaison coût/prix** | Détection des plats sous-margés. |
| **Alertes simples** | Recette sans prix, coût manquant, marge faible. |

### Condition d'entrée
Plusieurs semaines de ventes existent, les prix actuels par recette sont fiables, les coûts recette sont valides.

---

## Phase 10 — Tests UI, CI et qualité produit

**But** : éviter les régressions avant clients pilotes. Origine : Phase 8 du plan commercialisation.

### Actions
- GitHub Actions :
  - tests ;
  - build ;
  - lint.
- Tests UI sur parcours vitaux :
  - login ;
  - création ingrédient ;
  - création recette ;
  - calcul coût ;
  - import ;
  - rôle employé sans accès coûts ;
  - **isolation organisation** (test RLS critique pour PVG).
- Gestion d'erreurs réseau :
  - Supabase indisponible ;
  - session expirée ;
  - droits insuffisants ;
  - conflit données.

### Critère de sortie
On peut déployer une version pilote sans tester tout à la main à chaque changement.

---

## Phase 11 — Client pilote + commercialisation

**But** : confronter le produit à un vrai usage (PVG en cible) et le rendre vendable. Origine : Phases 9 + 10 du plan commercialisation + Phase 9 du plan d'audit (docs et quality gates).

**À démarrer en parallèle dès Phase 5** pour le volet juridique/commercial — pas en attente.

### Phase 11A — Pilote

- **1 à 3 restaurants** maximum (L'Arpège + 1 ou 2 restaurants du groupe PVG).
- Données réelles, accompagnement manuel.
- Feedback hebdomadaire.
- Support direct.

**Mesures** :
- temps de création d'une recette ;
- compréhension de la rentabilité ;
- erreurs fréquentes ;
- données manquantes ;
- performance ;
- besoins non prévus ;
- valeur perçue.

### Phase 11B — Documents pour audit lead dev / due diligence

| Document | Contenu |
|---|---|
| `README.md` | Installation, lancement, tests, architecture. |
| `ARCHITECTURE.md` | Vue technique globale (mise à jour post-Vite). |
| `DATA_MODEL.md` | Modèle de données (Supabase). |
| `SECURITY.md` | Risques, RLS, RGPD, gestion incidents. |
| `TESTING.md` | Stratégie de tests. |
| `ROADMAP.md` | Phases et décisions. |
| `CHANGELOG.md` | Historique. |
| `.env.example` | Variables nécessaires, sans secrets. |

### Phase 11C — Quality gates PR

Une PR ne peut être mergée que si :
- les tests passent ;
- le build passe ;
- aucun secret n'est présent dans le code ;
- aucune logique métier non testée n'est ajoutée ;
- aucune fonction massive n'est ajoutée dans `App` ou un composant racine ;
- la migration de données est rétrocompatible ;
- les erreurs utilisateur sont gérées proprement.

### Phase 11D — Volet commercial / juridique

- Onboarding finalisé.
- Documentation utilisateur courte.
- Mentions légales : confidentialité, RGPD, conditions d'utilisation, politique de suppression/export.
- Pricing commercial.
- Support défini : email, temps de réponse, sauvegardes, procédure incident.
- Page de présentation / site vitrine minimal.

### Critère de sortie
Le produit peut être proposé à PVG sans donner l'impression d'un prototype fragile.

---

## 5. Permissions initiales par rôle

| Rôle | Lecture | Écriture | Coûts/marges | Gestion users | Export/suppr. |
|---|---|---|---|---|---|
| **Propriétaire** | Tout | Tout | Oui | Oui | Oui |
| **Chef** | Tout | Tout (métier) | Oui | Non | Import/export |
| **Second** | Tout (métier) | Recettes, ingrédients, fournisseurs | Configurable | Non | Non |
| **Employé** | Recettes, ingrédients, fournisseurs | Limitée ou interdite (paramétrable) | Non par défaut | Non | Non |

Ces permissions sont à **appliquer côté Supabase RLS**, pas seulement dans l'UI.

---

## 6. Éléments à supprimer ou repousser

| Élément | Décision | Raison |
|---|---|---|
| **Backend avant migration Vite** | Éviter | Brancher Supabase sur monolithe = fragile (acté). |
| **Analytics locale (Google)** | Supprimé | RGPD, inutile sur outil local (déjà fait). |
| **Multi-pays TVA avancé** | Repousser | Hors MVP. |
| **"Marge réelle" trop tôt** | Reformuler | Utiliser "marge estimée" en Phase 9. |
| **Import IA qui écrit directement** | Interdit | Toute écriture passe par aperçu + validation. |
| **Clé API IA côté client** | Interdit | Proxy serveur obligatoire (Phase 8). |
| **Vendre sans RLS testée** | Interdit | Multi-tenant = isolation prouvée. |
| **Supprimer mode import/export JSON local** | Interdit | Filet de sécurité pour migration et clients réticents au cloud. |

---

## 7. Définition de "prêt pour pilote PVG"

Une version pilote est prête quand :

- l'app tourne avec Vite ;
- le build passe en CI ;
- les 434 tests métier passent ;
- Supabase Auth fonctionne ;
- RLS isole les restaurants (test automatisé) ;
- les rôles principaux existent et sont appliqués côté serveur ;
- ingrédients, fournisseurs et recettes sont en cloud ;
- un export local L'Arpège peut être importé dans le cloud ;
- un chef peut utiliser l'app sans aide technique constante ;
- une procédure de sauvegarde/restauration existe ;
- les limites du pilote sont expliquées clairement (par écrit, contrat pilote).

---

## 8. Verdict stratégique

Le bon objectif n'est pas "mettre Supabase". Le bon objectif est de transformer Formula en produit métier :

- **clair** pour les chefs ;
- **solide** pour les données ;
- **sécurisé** pour plusieurs restaurants ;
- **maintenable** pour les développeurs ;
- **vendable** à un groupe comme PVG sans honte.

L'ordre est :

1. **savoir ce qu'on vend** (Phase 0) ;
2. **finir le ménage** (Phases 1-2) ;
3. **moderniser l'architecture** (Phases 3-4) ;
4. **brancher le cloud sécurisé** (Phases 5-7) ;
5. **ajouter les différenciateurs** (Phases 8-9) ;
6. **industrialiser et vendre** (Phases 10-11).

L'IA et le journal des ventes restent des arguments commerciaux forts. Ils arrivent **après** la fondation, pas avant.
