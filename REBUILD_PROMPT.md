# PROMPT DE RECONSTRUCTION — FORMULA (Application de Gestion de Recettes Professionnelles)

---

## CONTEXTE PRODUIT

Tu dois construire **Formula**, une application SaaS B2B de gestion de recettes et de rentabilité pour les restaurateurs professionnels (cuisiniers, chefs, restaurateurs). Le produit cible les établissements du petit restaurant gastronomique au groupe multi-établissements. Il doit être commercialisable immédiatement, sécurisé, maintenable, et déployable sur cloud.

L'application est en **français** (interface, messages, etc.). Elle doit respecter les normes de l'industrie alimentaire française/européenne (allergènes, TVA, unités de mesure).

---

## STACK TECHNIQUE — DÉCISIONS ARCHITECTURALES

### Frontend
- **Framework** : Next.js 14+ (App Router, SSR/SSG/CSR hybride selon les pages)
- **Langage** : TypeScript strict (`"strict": true`)
- **Styling** : Tailwind CSS 4 + shadcn/ui (composants accessibles, thème personnalisable)
- **State management** :
  - **Serveur** : TanStack Query v5 (cache, invalidation, mutations optimistes)
  - **UI locale** : Zustand (modals, tabs, form drafts)
  - **Formulaires** : React Hook Form + Zod (validation isomorphe)
- **Éditeur riche** : Tiptap v2 (procédures de recettes, remplacement de l'éditeur WYSIWYG custom)
- **Tests** : Vitest + Testing Library + Playwright (E2E)

### Backend
- **Runtime** : Node.js 20+ avec **Fastify** (ou NestJS si équipe grande)
- **Langage** : TypeScript strict
- **ORM** : Drizzle ORM (type-safe, migrations versionées)
- **Base de données principale** : PostgreSQL 16 (Supabase ou Railway)
- **Cache** : Redis (sessions, rate-limiting, queues d'email)
- **Authentification** : Auth.js v5 (anciennement NextAuth) avec JWT + Refresh tokens, ou Lucia Auth
- **Email** : Resend (transactionnel) + React Email (templates)
- **Stockage fichiers** : Cloudflare R2 (logos restaurants, exports)
- **Queue jobs** : BullMQ + Redis (exports asynchrones, emails)
- **Validation** : Zod (schemas partagés frontend/backend via monorepo)

### Infrastructure
- **Monorepo** : Turborepo avec `apps/web` (Next.js) + `apps/api` (Fastify) + `packages/shared` (types Zod, constantes métier)
- **CI/CD** : GitHub Actions (lint → test → build → deploy)
- **Déploiement** : Vercel (frontend) + Railway ou Fly.io (backend API)
- **Monitoring** : Sentry (erreurs) + Axiom ou Betterstack (logs)
- **Variables d'environnement** : Doppler ou Infisical

---

## ARCHITECTURE DE LA BASE DE DONNÉES

### Schéma PostgreSQL complet

```sql
-- Organisations (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'FR', -- FR, CH, BE, LU
  currency_symbol TEXT NOT NULL DEFAULT '€',
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- free | pro | enterprise
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Utilisateurs
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Argon2id
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membres d'une organisation (rôles)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'chef', 'employe')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);

-- Fournisseurs
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ingrédients
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_unit TEXT NOT NULL, -- g, kg, ml, L, cl, pièce, etc.
  purchase_price NUMERIC(12,4) NOT NULL, -- prix pour 1 unité
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  allergens TEXT[] DEFAULT '{}', -- array des codes allergènes EU
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recettes de base
CREATE TABLE base_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  reference_covers INTEGER, -- nombre de couverts de référence (optionnel)
  yield_quantity NUMERIC(12,4), -- rendement
  yield_unit TEXT, -- unité du rendement
  yield_source TEXT CHECK (yield_source IN ('actual', 'theoretical', 'legacy')),
  procedure TEXT, -- HTML sanitisé (Tiptap output)
  tva_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  waste_coefficient NUMERIC(5,4) NOT NULL DEFAULT 1, -- coefficient de perte global
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes d'ingrédients dans une recette de base
CREATE TABLE base_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_recipe_id UUID REFERENCES base_recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  waste_coefficient NUMERIC(5,4) NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recettes finales (plats)
CREATE TABLE final_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  reference_covers INTEGER NOT NULL DEFAULT 1,
  yield_quantity NUMERIC(12,4),
  yield_unit TEXT,
  procedure TEXT,
  tva_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  waste_coefficient NUMERIC(5,4) NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Composants recettes de base dans un plat final
CREATE TABLE final_recipe_base_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_recipe_id UUID REFERENCES final_recipes(id) ON DELETE CASCADE,
  base_recipe_id UUID REFERENCES base_recipes(id) ON DELETE RESTRICT,
  quantity_used NUMERIC(12,4) NOT NULL,
  unit_used TEXT NOT NULL,
  usage_mode TEXT CHECK (usage_mode IN ('quantity', 'portion')) DEFAULT 'quantity',
  portion_count NUMERIC(8,2), -- si mode=portion
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ingrédients directs dans un plat final
CREATE TABLE final_recipe_direct_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_recipe_id UUID REFERENCES final_recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  waste_coefficient NUMERIC(5,4) NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historique de prix / rentabilité
CREATE TABLE pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  final_recipe_id UUID REFERENCES final_recipes(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('coefficient', 'margeHT', 'margeTTC', 'prixTTC')),
  cost_ht NUMERIC(12,4) NOT NULL,
  price_ht NUMERIC(12,4) NOT NULL,
  price_ttc NUMERIC(12,4) NOT NULL,
  coefficient NUMERIC(8,4),
  marge_ht_eur NUMERIC(12,4),
  marge_ht_pct NUMERIC(8,4),
  marge_ttc_eur NUMERIC(12,4),
  marge_ttc_pct NUMERIC(8,4),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tokens de récupération de mot de passe
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- SHA-256 du token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invitations membres
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('chef', 'employe')),
  token_hash TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index critiques
CREATE INDEX ON ingredients(organization_id);
CREATE INDEX ON ingredients(organization_id, category);
CREATE INDEX ON base_recipes(organization_id);
CREATE INDEX ON final_recipes(organization_id);
CREATE INDEX ON pricing_history(organization_id, final_recipe_id, created_at DESC);
CREATE INDEX ON base_recipe_ingredients(base_recipe_id);
CREATE INDEX ON final_recipe_base_components(final_recipe_id);
CREATE INDEX ON final_recipe_direct_ingredients(final_recipe_id);
```

---

## SYSTÈME D'AUTHENTIFICATION

### Rôles et permissions

| Action | Owner | Chef | Employé |
|--------|-------|------|---------|
| Voir ingrédients | ✅ | ✅ | ✅ |
| Créer/modifier ingrédients | ✅ | ✅ | ❌ |
| Voir recettes de base | ✅ | ✅ | ✅ |
| Créer/modifier recettes de base | ✅ | ✅ | ❌ |
| Voir recettes finales | ✅ | ✅ | ✅ |
| Créer/modifier recettes finales | ✅ | ✅ | ❌ |
| Voir coûts/rentabilité | ✅ | ✅ | ❌ |
| Gérer fournisseurs | ✅ | ✅ | ❌ |
| Paramètres organisation | ✅ | ❌ | ❌ |
| Inviter membres | ✅ | ❌ | ❌ |
| Importer/exporter données | ✅ | ✅ | ❌ |

### Flux auth
1. **Inscription** : email + mot de passe → hash Argon2id → création organisation + user owner
2. **Connexion** : email/password → JWT access token (15 min) + refresh token (30 jours, httpOnly cookie)
3. **Invitation** : owner envoie invitation par email → lien tokenisé → nouvel utilisateur ou existant rejoint l'org
4. **Récupération mot de passe** : email → token 1h → nouveau mot de passe → token invalidé
5. **Sessions** : refresh token rotation (chaque refresh invalide l'ancien)

---

## PAGES ET ROUTING (Next.js App Router)

```
app/
├── (public)/
│   ├── page.tsx                         # Landing page marketing
│   ├── login/page.tsx                   # Connexion
│   ├── register/page.tsx                # Inscription + création org
│   ├── forgot-password/page.tsx         # Demande reset
│   ├── reset-password/[token]/page.tsx  # Nouveau mot de passe
│   └── invite/[token]/page.tsx          # Accepter invitation
├── (app)/
│   ├── layout.tsx                       # Shell app (auth guard, sidebar/header)
│   ├── dashboard/page.tsx               # Vue d'ensemble (stats rapides)
│   ├── ingredients/
│   │   ├── page.tsx                     # Liste + filtres + recherche
│   │   └── [id]/page.tsx                # Détail/édition ingrédient
│   ├── recettes/
│   │   ├── base/
│   │   │   ├── page.tsx                 # Liste recettes de base
│   │   │   ├── nouvelle/page.tsx        # Créer recette de base
│   │   │   └── [id]/page.tsx            # Détail/édition recette de base
│   │   └── finales/
│   │       ├── page.tsx                 # Liste recettes finales
│   │       ├── nouvelle/page.tsx        # Créer recette finale
│   │       └── [id]/page.tsx            # Détail/édition recette finale
│   ├── fournisseurs/
│   │   ├── page.tsx                     # Liste fournisseurs
│   │   └── [id]/page.tsx                # Détail fournisseur
│   ├── rentabilite/
│   │   ├── page.tsx                     # Calculateur (tab par défaut)
│   │   ├── prix-actuels/page.tsx        # Prix actuels par recette
│   │   ├── historique/page.tsx          # Historique complet
│   │   └── statistiques/page.tsx        # Stats coûts par catégorie
│   └── parametres/
│       ├── page.tsx                     # Infos restaurant + logo
│       ├── membres/page.tsx             # Gestion membres + invitations
│       └── donnees/page.tsx             # Import/export/backup
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── ingredients/route.ts
    ├── ingredients/[id]/route.ts
    ├── recettes/base/route.ts
    ├── recettes/base/[id]/route.ts
    ├── recettes/finales/route.ts
    ├── recettes/finales/[id]/route.ts
    ├── fournisseurs/route.ts
    ├── fournisseurs/[id]/route.ts
    ├── rentabilite/route.ts
    ├── export/route.ts
    └── import/route.ts
```

---

## FONCTIONNALITÉS DÉTAILLÉES

### 1. INGRÉDIENTS

**Liste** :
- Recherche full-text (nom)
- Filtres : catégorie (multi-select), allergène (multi-select), fournisseur, actif/archivé
- Tri : nom, prix, famille, date création
- Pagination ou infinite scroll
- Compteur de résultats
- Bouton "Ajouter" (chef+)

**Formulaire Ingrédient** :
- Champ `nom` (texte, requis, unique dans l'org)
- Champ `famille/catégorie` (select + option "Autre" + création à la volée)
- Champ `prix_achat` (décimal, requis, > 0) avec label dynamique: "Prix pour 1 [unité]"
- Champ `unité d'achat` (select avec groupes : Masse | Volume | Pièce)
  - Masse : gramme, kg
  - Volume : ml, cl, litre
  - Pièce : pièce, unité, botte, brique, boîte, sachet, bouteille, barquette, plaque, feuille
- Champ `fournisseur` (select nullable, avec création rapide inline)
- Section `Allergènes` (workflow en 3 étapes — voir détail ci-dessous)
- Archivage (soft-delete avec `active = false`)

**Workflow allergènes automatique** :
1. Après saisie du nom → lancer auto-détection silencieuse
2. Si allergènes détectés → afficher bannière "X allergènes détectés : [liste]. Confirmer ?"
   - "Oui, garder" → passer en mode checkboxes préremplis
   - "Non, vérifier" → ouvrir checkboxes vides
3. Si aucun détecté → proposer "Aucun allergène · Vérifier quand même"
4. Mode checkboxes : les 14 allergènes EU en grille 2 colonnes avec icônes
5. Résultat affiché sous le nom avec pastilles colorées

**14 Allergènes EU** (avec codes pour stockage) :
```
gluten, crustaces, oeufs, poisson, arachides, soja, lait,
fruits_a_coque, celeri, moutarde, sesame, sulfites, lupin, mollusques
```

**Détection automatique par nom** (normalisation : minuscules, sans accents, sans pluriel) :
- Gluten : blé, froment, seigle, orge, avoine, épeautre, kamut, farine, pain, pâte, semoule, son
- Crustacés : crevette, crabe, homard, langouste, langoustine, écrevisse, tourteau
- Œufs : œuf, oeuf, jaune, blanc d'oeuf, albumine, mayonnaise, meringue
- Poisson : cabillaud, saumon, thon, sole, bar, dorade, anchois, sardine, truite, carpe, brochet
- Arachides : cacahuète, arachide, peanut
- Soja : soja, soya, tofu, miso, tempeh, edamame
- Lait : lait, beurre, crème, fromage, yaourt, lactose, caséine, lactosérum
- Fruits à coque : amande, noix, noisette, cajou, pistache, noix de coco, macadamia, pécan, noix du brésil
- Céleri : céleri, celeriac
- Moutarde : moutarde, senévé
- Sésame : sésame, tahini
- Sulfites : vin, vinaigre, raisin sec, abricot sec, sulfite, anhydride sulfureux
- Lupin : lupin
- Mollusques : huître, moule, coquille saint-jacques, calmar, poulpe, seiche, escargot, palourde

---

### 2. RECETTES DE BASE

**Liste** :
- Recherche full-text (nom)
- Filtres : catégorie (multi-select), statut coût (complet/incomplet/erreur), actif
- Tri : nom, coût total, date
- Carte récapitulative : nom, coût total HT, rendement

**Formulaire Recette de Base** :
- `nom` (requis, unique dans l'org)
- `catégories` (tags multi-select + création à la volée)
- `nombre_couverts_référence` (entier optionnel, > 0)
- `rendement_référence` : quantité + unité (ex: "500 g", "2 L", "12 pièces")
  - Source : actual (mesuré) | theoretical (calculé par somme des ingrédients)
  - Calcul théorique automatique si rendement non saisi
- `coefficient_de_perte_global` (0–99%, afficher comme %) — perte globale sur la recette
- `tva_percent` (select selon pays de l'organisation : 5.5%, 10%, 20% pour FR)
- `procédure` (Tiptap rich text : bold, italic, underline, couleur, listes, titres)
- Section **Ingrédients directs** :
  - Chaque ligne : `ingrédient` (autocomplete) + `quantité` + `unité` + `coefficient_perte_ligne` (%)
  - Ajout ligne, suppression, réordonnancement (drag-and-drop)
  - Avertissement si unités incompatibles (masse ↔ volume ↔ pièce)
  - Coût ligne calculé en temps réel
- **Récapitulatif coût** :
  - Coût total HT
  - Coût par couvert HT (si couverts définis)
  - Coût pour rendement total
  - Statut : ✅ complet | ⚠️ partiel (certains ingrédients sans prix) | ❌ erreur (unité incompatible)

**Adaptation / Mise à l'échelle** :
Modal avec 4 modes pivot :
1. **Par nombre de couverts** : entrer le nouveau nb de couverts → multiplicateur = nouveaux couverts / couverts référence
2. **Par quantité globale** : entrer la quantité totale souhaitée (ex: 2 kg) → multiplicateur = cible / rendement
3. **Par budget** : entrer le budget HT cible → multiplicateur = budget / coût total
4. **Par ingrédient** : choisir un ingrédient pivot + quantité cible → multiplicateur = cible / quantité actuelle
- Afficher multiplicateur calculé
- Afficher toutes les quantités recalculées
- Bouton "Copier comme nouvelle recette" (crée une copie adaptée)
- Avertissement si la procédure contient des durées/températures/dimensions (texte non scalable)

---

### 3. RECETTES FINALES (PLATS)

**Liste** :
- Recherche, filtres par catégorie, statut coût
- Carte : nom, coût par couvert HT, prix de vente actuel (si défini), marge actuelle

**Formulaire Recette Finale** :
- `nom`, `catégories`, `nombre_couverts_référence` (requis), `rendement_référence` (optionnel)
- `coefficient_perte_global`, `tva_percent`, `procédure`
- Section **Composants recettes de base** :
  - Chaque ligne : `recette de base` (autocomplete) + mode d'utilisation :
    - Mode **quantité** : quantité + unité (ex: "300 g" de la recette)
    - Mode **portion** : nombre de portions (ex: "2 portions")
  - Coût proratisé calculé en temps réel
  - Allergènes hérités affichés sur la ligne
- Section **Ingrédients directs** (identique recette de base)
- **Récapitulatif coût** :
  - Coût total HT
  - Coût total TTC
  - Coût par couvert HT et TTC
  - Poids total calculé (si unités masse)
  - **Allergènes totaux** : union de tous les allergènes (recettes de base + ingrédients directs)
  - Statut coût

**Même adaptation/scaling que les recettes de base.**

---

### 4. FOURNISSEURS

**Liste** :
- Nom, contact, nombre d'ingrédients associés, bouton appel/mail rapide
- Recherche par nom ou contact

**Formulaire Fournisseur** :
- `nom` (requis)
- `nom_contact` (optionnel)
- `email_contact` (optionnel, validé)
- `téléphone_contact` (optionnel)
- `adresse` (optionnel, textarea)
- `notes` (optionnel, textarea)
- Affichage liste des ingrédients associés sur la fiche

---

### 5. RENTABILITÉ

Accessible uniquement aux rôles `owner` et `chef`.

**Onglet Calculateur** :
- Sélecteur de recette finale (autocomplete)
- Affichage du coût HT et TTC de la recette sélectionnée
- 4 colonnes de calcul simultané :

  **Colonne 1 — Coefficient** :
  - Input : coefficient (ex: 3.5)
  - Output calculé : Prix HT, Prix TTC, Marge HT €, Marge HT %, Marge TTC %, Marge TTC €

  **Colonne 2 — Marge HT %** :
  - Input : marge HT % (ex: 71.4%)
  - Output calculé : Prix HT = coût / (1 - marge%), Prix TTC, coefficient, marges TTC

  **Colonne 3 — Marge TTC %** :
  - Input : marge TTC % (ex: 72%)
  - Output calculé : Prix TTC, Prix HT, coefficient, marges HT

  **Colonne 4 — Prix TTC fixe** :
  - Input : prix de vente TTC (ex: 24.00€)
  - Output calculé : Prix HT = TTC / (1 + TVA%), coefficient = HT/coût, toutes les marges

- Formules de calcul :
  ```
  Prix HT (coeff)  = coût_HT × coefficient
  Prix TTC         = Prix HT × (1 + TVA/100)
  Marge HT €       = Prix HT - coût_HT
  Marge HT %       = (Prix HT - coût_HT) / Prix HT × 100
  Marge TTC €      = Prix TTC - (coût_HT × (1 + TVA/100))
  Marge TTC %      = Marge TTC € / Prix TTC × 100
  ```
- Bouton "Sauvegarder ce prix" → enregistre dans `pricing_history` avec méthode choisie
- Validation : marge < 100%, coût > 0, TVA >= 0

**Onglet Prix Actuels** :
- Tableau de toutes les recettes finales avec :
  - Nom, catégorie, coût HT par couvert, dernier prix TTC enregistré, dernière marge TTC%
  - Clic sur une ligne → pré-sélectionne dans le calculateur
- Tri par marge croissante/décroissante, coût, nom

**Onglet Historique** :
- Timeline par recette : chaque entrée = horodatage + méthode + prix HT/TTC + marges
- Filtres : recette, période (7j, 30j, 90j, tout)
- Possibilité de supprimer une entrée d'historique (chef+)

**Onglet Statistiques** :
- Coût moyen par catégorie de recette
- Min/Max/Médiane des coûts par couvert
- Top 5 recettes les plus coûteuses
- Top 5 recettes avec les meilleures marges
- Graphique évolution coût d'une recette dans le temps (si historique)

---

### 6. PARAMÈTRES

**Section Informations Restaurant** :
- Nom du restaurant (requis)
- Pays (FR, CH, BE, LU) → détermine TVA et devise par défaut
- Devise (€ par défaut, CHF pour Suisse)
- Logo : upload image (JPG, PNG, SVG, WebP, max 2 MB) → stockage R2, URL persistée
- Bouton "Sauvegarder"

**Section Membres** (owner uniquement) :
- Liste des membres actuels : nom, email, rôle, date d'ajout
- Modifier rôle (chef ↔ employé)
- Retirer un membre
- Inviter un nouveau membre : email + rôle → email d'invitation envoyé
- Liste des invitations en attente (avec annulation possible)

**Section Données** :
- **Tableau de bord statut** :
  - Nombre d'ingrédients actifs
  - Nombre de recettes de base actives
  - Nombre de recettes finales actives
  - Nombre de fournisseurs actifs
  - Dernière sauvegarde
- **Export** :
  - Format JSON structuré, incluant tous les types (ingredients, recettes base, recettes finales, fournisseurs, prix)
  - Nommage automatique : `formula_export_{org_slug}_{YYYYMMDD}.json`
  - Stockage temporaire côté serveur (R2) + lien de téléchargement signé (15 min)
- **Import** :
  - Upload fichier JSON
  - Validation côté serveur (format, version, identifiant app)
  - Analyse des conflits : affichage liste (identiques | nouveaux | conflits de nom)
  - Mode merge : résolution conflit par conflit (garder existant | remplacer | renommer)
  - Mode remplacement total : confirmation explicite ("Supprimer toutes mes données et importer")
  - Sauvegarde automatique avant toute import (backup dans R2)
- **Restaurer backup** :
  - Dernier backup automatique disponible (avant dernier import)
  - Affichage de sa date/heure
  - Bouton "Restaurer ce backup" avec confirmation

---

## LOGIQUE MÉTIER — CALCULS DE COÛTS

### Conversion d'unités

Groupes d'unités avec facteurs de conversion (vers l'unité de base) :
```typescript
const UNIT_GROUPS = {
  mass: {
    base: 'g',
    conversions: { g: 1, kg: 1000 }
  },
  volume: {
    base: 'ml',
    conversions: { ml: 1, cl: 10, L: 1000, litre: 1000 }
  },
  count: {
    base: 'pièce',
    conversions: {
      pièce: 1, unité: 1, part: 1, portion: 1,
      botte: 1, brique: 1, boîte: 1, sachet: 1,
      bouteille: 1, barquette: 1, plaque: 1, feuille: 1
    }
  }
}

function convertToBase(quantity: number, unit: string): { value: number; group: string } | null
function canConvert(unitA: string, unitB: string): boolean
function convertQuantity(qty: number, fromUnit: string, toUnit: string): number | null
```

### Calcul de coût d'une ligne d'ingrédient

```typescript
function computeIngredientLineCost(
  line: { quantity: number; unit: string; wasteCoefficientLine: number },
  ingredient: { purchasePrice: number; defaultUnit: string }
): { costHT: number | null; error: string | null } {
  // 1. Convertir quantity (line.unit) vers defaultUnit de l'ingrédient
  // 2. Si non convertible → error
  // 3. quantiteEffective = quantiteConverted × line.wasteCoefficientLine
  // 4. costHT = ingredient.purchasePrice × quantiteEffective
}
```

### Calcul de coût d'une recette de base

```typescript
function computeBaseRecipeCost(
  recipe: BaseRecipe,
  ingredients: Ingredient[]
): { totalCostHT: number | null; costPerCover: number | null; status: CostStatus }

// status: 'ok' | 'partial' (certains sans prix) | 'error' (unité incompatible)
```

### Calcul du coût d'un composant recette de base dans un plat final

```typescript
function computeBaseComponentCost(
  component: FinalRecipeBaseComponent,
  baseRecipe: BaseRecipe,
  ingredients: Ingredient[]
): { costHT: number | null; error: string | null } {
  // Mode 'quantity' :
  //   1. Calculer coût total de la recette de base (en unité rendement)
  //   2. Coût/unité = coûtTotal / yield_quantity
  //   3. Convertir component.quantity_used vers yield_unit
  //   4. costHT = coût/unité × quantitéConvertie
  //
  // Mode 'portion' :
  //   1. costHT = coûtTotal × (portions_used / reference_covers)
}
```

### Calcul de coût d'une recette finale

```typescript
function computeFinalRecipeCost(
  recipe: FinalRecipe,
  baseRecipes: BaseRecipe[],
  ingredients: Ingredient[]
): {
  totalCostHT: number | null;
  totalCostTTC: number | null;
  costPerCoverHT: number | null;
  costPerCoverTTC: number | null;
  totalWeightG: number | null;
  allergens: string[];
  status: CostStatus;
}
```

### Calcul de scaling

```typescript
type ScalingMode = 'covers' | 'quantity' | 'budget' | 'ingredient';

function computeScalingMultiplier(
  recipe: BaseRecipe | FinalRecipe,
  mode: ScalingMode,
  target: {
    covers?: number;
    quantity?: number;
    unit?: string;
    budgetHT?: number;
    ingredientId?: string;
    ingredientQuantity?: number;
  },
  ingredients: Ingredient[]
): { multiplier: number | null; error: string | null }

function detectNonLinearProcedureElements(procedureHtml: string): {
  hasTemperatures: boolean;
  hasDurations: boolean;
  hasDimensions: boolean;
  warnings: string[];
}
```

---

## COMPOSANTS UI RÉUTILISABLES

Créer dans `components/ui/` (construits sur shadcn/ui) :

### Composants génériques
- `<DataTable>` — table triable/filtrable avec pagination, sélection multi, actions par ligne
- `<SearchInput>` — debounce 300ms, icône, clear button
- `<MultiSelect>` — select avec tags, création à la volée, fuzzy search
- `<NumberInput>` — gestion décimaux avec séparateur virgule (FR), min/max, stepper
- `<UnitSelect>` — sélecteur d'unité groupé (Masse | Volume | Pièce)
- `<AllergenBadge>` — pastille colorée avec icône et nom pour chaque allergène
- `<AllergenPicker>` — grille 2 colonnes des 14 allergènes EU avec cases à cocher
- `<CostBadge>` — affichage coût avec statut (couleur selon: ok/partial/error)
- `<CategoryTag>` — tag de catégorie cliquable
- `<RichTextEditor>` — wrapper Tiptap avec barre d'outils (bold, italic, underline, couleur, liste)
- `<FileUpload>` — drag-and-drop + click, validation type/taille, preview
- `<ConfirmDialog>` — dialog de confirmation avec message customisable
- `<EmptyState>` — composant vide avec illustration et CTA
- `<LoadingSpinner>` — spinner cohérent
- `<ErrorBoundary>` — catch React errors, afficher message + bouton reload
- `<Logo>` — logo Formula ou logo restaurant (avec fallback initiales)

### Composants métier
- `<IngredientAutocomplete>` — recherche ingrédient avec coût affiché
- `<RecipeAutocomplete>` — recherche recette de base avec coût/rendement
- `<IngredientLine>` — ligne d'ingrédient dans recette (quantité + unité + perte + coût)
- `<BaseComponentLine>` — ligne composant recette (mode quantité ou portion + coût)
- `<CostSummary>` — récapitulatif coûts HT/TTC/par couvert avec statut
- `<AllergenSummary>` — liste allergènes totaux d'une recette
- `<PricingColumn>` — une colonne du calculateur de rentabilité
- `<PricingHistoryItem>` — entrée timeline de l'historique prix

---

## FORMATAGE ET LOCALISATION

```typescript
// packages/shared/src/formatting.ts

export function formatCurrency(amount: number, currencySymbol: string = '€'): string {
  // Format FR : "12,50 €" (espace insécable avant €)
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount) + ' ' + currencySymbol;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return value.toFixed(decimals).replace('.', ',') + ' %';
}

export function formatQuantity(qty: number, unit: string): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 3,
  }).format(qty);
  return `${formatted} ${unit}`;
}

// TVA par pays
export const TVA_RATES: Record<string, number[]> = {
  FR: [5.5, 10, 20],
  CH: [2.5, 3.7, 7.7],
  BE: [6, 12, 21],
  LU: [3, 8, 17],
};

// Devises par pays
export const CURRENCIES: Record<string, string> = {
  FR: '€', BE: '€', LU: '€', CH: 'CHF',
};
```

---

## IMPORT/EXPORT — FORMAT JSON

```typescript
// Format du fichier d'export
interface ExportFile {
  _meta: {
    app: 'formula-arpege';
    version: 2;
    exportedAt: string; // ISO
    organizationSlug: string;
    exportedBy: string; // email
  };
  ingredients: ExportedIngredient[];
  baseRecipes: ExportedBaseRecipe[];
  finalRecipes: ExportedFinalRecipe[];
  suppliers: ExportedSupplier[];
  pricingHistory: ExportedPricingEntry[];
}

// Chaque entité exportée avec ses relations inline (pas d'UUIDs internes)
// Les IDs sont remplacés par des slugs/noms lors de l'export
// pour permettre la portabilité entre instances
```

### Logique de merge
```typescript
interface MergeAnalysis {
  newItems: { type: EntityType; name: string }[];
  ignoredItems: { type: EntityType; name: string; reason: string }[];
  conflicts: {
    type: EntityType;
    name: string;
    existing: Record<string, unknown>;
    incoming: Record<string, unknown>;
    diff: string[]; // champs qui diffèrent
  }[];
}

// Résolution : pour chaque conflit, user choisit 'keep' | 'replace' | 'rename'
// Sur import : recalcul des IDs internes, remapping des relations
```

---

## API REST — ENDPOINTS

Toutes les routes sont préfixées par `/api/v1/` et requièrent un header `Authorization: Bearer <token>`.

```
# Authentification
POST   /auth/register           # email, password, restaurantName, country
POST   /auth/login              # email, password → { accessToken, user }
POST   /auth/logout             # invalide refresh token
POST   /auth/refresh            # refresh token → nouvel access token
POST   /auth/forgot-password    # email → envoie email reset
POST   /auth/reset-password     # token, newPassword

# Organisation
GET    /organization            # infos org courante
PATCH  /organization            # name, countryCode, currencySymbol
POST   /organization/logo       # upload logo (multipart)
DELETE /organization/logo       # supprimer logo

# Membres
GET    /members                 # liste membres
DELETE /members/:userId         # retirer membre
PATCH  /members/:userId/role    # modifier rôle
POST   /invitations             # inviter (email + role)
GET    /invitations             # liste invitations en attente
DELETE /invitations/:id         # annuler invitation

# Ingrédients
GET    /ingredients             # ?search=, ?category=, ?allergen=, ?supplier=
POST   /ingredients             # créer
GET    /ingredients/:id         # détail
PUT    /ingredients/:id         # mise à jour complète
DELETE /ingredients/:id         # soft delete (active=false)

# Fournisseurs
GET    /suppliers
POST   /suppliers
GET    /suppliers/:id
PUT    /suppliers/:id
DELETE /suppliers/:id

# Recettes de base
GET    /base-recipes            # ?search=, ?category=, ?status=
POST   /base-recipes
GET    /base-recipes/:id
PUT    /base-recipes/:id
DELETE /base-recipes/:id
POST   /base-recipes/:id/adapt  # body: { mode, target } → retourne quantités adaptées

# Recettes finales
GET    /final-recipes           # ?search=, ?category=, ?status=
POST   /final-recipes
GET    /final-recipes/:id
PUT    /final-recipes/:id
DELETE /final-recipes/:id
POST   /final-recipes/:id/adapt

# Rentabilité
GET    /pricing                          # ?recipeId= (prix actuels)
POST   /pricing                          # sauvegarder un prix
GET    /pricing/history                  # ?recipeId=, ?from=, ?to=
DELETE /pricing/history/:id
GET    /pricing/statistics               # stats agrégées

# Import/Export
GET    /export                  # génère fichier, retourne URL signée
POST   /import/analyze          # upload JSON → retourne MergeAnalysis
POST   /import/execute          # body: { resolutions } → exécute
POST   /import/restore-backup   # restaure dernier backup
```

---

## SÉCURITÉ

1. **Authentification** : Argon2id pour hash des mots de passe (coût mémoire: 65536, itérations: 3, parallélisme: 4)
2. **Autorisation** : middleware vérifie rôle sur chaque route (RBAC)
3. **Multi-tenant isolation** : toutes les requêtes DB filtrent par `organization_id` de la session
4. **Rate limiting** : Redis-based, 100 req/min par IP sur routes publiques, 1000 req/min sur routes auth
5. **CSRF** : tokens pour forms (Next.js actions), SameSite=Strict cookies
6. **XSS** : DOMPurify côté client pour afficher le HTML procédure, Content-Security-Policy headers
7. **SQL injection** : Drizzle ORM avec requêtes paramétrées exclusivement, jamais de raw SQL avec interpolation
8. **Upload files** : validation MIME type + magic bytes + taille max (2 MB logos, 10 MB exports)
9. **Secrets** : jamais de secrets dans le code, Doppler pour injection
10. **HTTPS** : TLS enforced, HSTS headers
11. **Logs** : jamais logger de mots de passe, tokens, ou données PII dans les logs

---

## TESTS

### Stratégie de test
```
packages/shared/src/    → tests unitaires Vitest (logique pure : calculs, conversions)
apps/api/               → tests intégration Vitest + Testcontainers (PostgreSQL real DB)
apps/web/               → tests composants Testing Library, tests E2E Playwright
```

### Tests obligatoires
- Toute la logique de calcul de coûts (cas nominaux + conversions d'unités + erreurs)
- Détection automatique des allergènes (tous les 14 types)
- Logique de scaling (4 modes pivot)
- Import/export/merge (conflits, remapping IDs)
- Auth (hash, tokens, expirations, recovery)
- Permissions (chaque endpoint testé avec les 3 rôles)
- Formatage des nombres et devises (FR locale)

---

## DASHBOARD (page d'accueil)

Après connexion, afficher un tableau de bord avec :
- **Carte statistiques** : nb ingrédients, nb recettes de base, nb recettes finales, nb fournisseurs
- **Recettes récentes** : 5 dernières modifiées
- **Alertes** : ingrédients sans prix, recettes avec coût incomplet, invitations en attente
- **Raccourcis** : boutons "Nouvelle recette", "Nouvel ingrédient", "Calculer un prix"

---

## RESPONSIVE ET ACCESSIBILITÉ

- **Mobile-first** : navigation par onglets scrollable horizontalement sur mobile
- **Desktop** : sidebar de navigation ou header fixe selon breakpoint
- **Accessibilité** : composants shadcn/ui conformes WCAG 2.1 AA (focus visible, aria-labels, rôles sémantiques)
- **Dark mode** : support via `next-themes` + tokens CSS Tailwind

---

## DÉPLOIEMENT

### Variables d'environnement requises
```env
# Base de données
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.formula.restaurant

# Email
RESEND_API_KEY=...
EMAIL_FROM=noreply@formula.restaurant

# Stockage
CLOUDFLARE_R2_ENDPOINT=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=formula-assets

# Redis
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=...
```

### Checklist avant production
- [ ] Migrations DB appliquées (`drizzle-kit migrate`)
- [ ] Variables d'env injectées dans tous les environnements
- [ ] Tests CI passent (unit + integration + E2E)
- [ ] CSP headers configurés
- [ ] Rate limiting actif
- [ ] Sentry configuré avec source maps
- [ ] Backup DB quotidien configuré
- [ ] HTTPS enforced (HSTS)
- [ ] robots.txt et sitemap.xml pour les pages publiques
- [ ] Performance Lighthouse > 90 sur les pages principales

---

## PLAN D'IMPLÉMENTATION RECOMMANDÉ

**Phase 1 — Fondations (Semaine 1-2)**
1. Monorepo Turborepo setup (apps/web, apps/api, packages/shared)
2. Base de données + migrations Drizzle (tous les schemas)
3. Auth complète (register, login, JWT, refresh tokens, recovery)
4. Layout app + navigation + guards de rôles

**Phase 2 — Données de base (Semaine 3-4)**
5. CRUD Fournisseurs (API + UI)
6. CRUD Ingrédients avec allergènes (API + UI + détection auto)
7. Logique métier : conversions d'unités + calculs de coûts (avec tests)

**Phase 3 — Recettes (Semaine 5-7)**
8. CRUD Recettes de base (API + UI + éditeur riche + coûts temps réel)
9. CRUD Recettes finales (API + UI + sous-recettes + coûts temps réel)
10. Adaptation/scaling des recettes (4 modes)

**Phase 4 — Rentabilité + Paramètres (Semaine 8-9)**
11. Module rentabilité (calculateur + historique + stats)
12. Paramètres organisation (logo, membres, invitations)
13. Import/export/merge avec résolution de conflits

**Phase 5 — Qualité (Semaine 10)**
14. Tests E2E Playwright sur les parcours critiques
15. Performance (bundle size, LCP, INP)
16. Accessibilité (audit WCAG)
17. Documentation API (Swagger/OpenAPI auto-généré)
