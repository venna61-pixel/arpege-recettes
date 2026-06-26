// Source unique des couleurs et transparences utilisées par Formula.
// Phase 1 — chantier "ui-tokens.js" du plan unifié.
//
// Centralisation en deux temps :
//   - `FormulaUITokens.values.brand.primary` = "#1A3A4A" pour consommation JS
//     ou injection dans des templates HTML (PDF générés en popup).
//   - `var(--brand-primary)` à utiliser dans le CSS statique, les styles
//     inline JSX et les classes Tailwind arbitrary (`text-[var(--brand-primary)]`).
//
// Au chargement, le module injecte un <style id="formula-ui-tokens"> dans
// <head> qui définit toutes les variables sur :root. Ce script doit être
// chargé en premier (avant tout autre logic/core/*) pour que les variables
// soient disponibles dès le parsing du premier <style> du document et de
// tout JSX rendu par React.
//
// Pour les PDF (templates HTML interpolés ouverts dans une popup), inclure
// `FormulaUITokens.cssVarsBlock` au début du <style> du document afin que
// les variables soient également définies dans le contexte de la popup.

(function (global) {
  // Palette identitaire Formula / Arpège.
  // primary = sarcelle foncée (titres, boutons, badges actifs).
  // accent  = sable caramel chaud (focus, borders d'accent, badges sélectionnés).
  var BRAND = {
    primary:      "#1A3A4A",
    primaryHover: "#16303d",
    primaryLight: "#2A4A5A",
    accent:       "#C8956C",
    accentHover:  "#b8825c",
    accentDark:   "#7b5a42",
  };

  // Échelle de gris (copie des nuances Tailwind gray-* effectivement utilisées
  // en valeur littérale dans le code, principalement dans les templates PDF).
  var GRAY = {
    "50":  "#f9fafb",
    "100": "#f3f4f6",
    "200": "#e5e7eb",
    "300": "#d1d5db",
    "400": "#9ca3af",
    "500": "#6b7280",
    "600": "#4b5563",
    "700": "#374151",
    "900": "#111827",
  };

  // États sémantiques : danger (rouge), success (vert), warning (orange/ambre).
  var ALERT = {
    dangerText:        "#991b1b",
    dangerStrong:      "#dc2626",
    successText:       "#166534",
    warningText:       "#9a3412",
    warningMuted:      "#b45309",
    warningBorder:     "#f97316",
    warningBorderSoft: "#fdba74",
    warningBg:         "#fff7ed",
    warningBgSoft:     "#fffbeb",
  };

  // Transparences noires (overlays modal, shadow douce de carte).
  var OVERLAY = {
    modal:      "rgba(0,0,0,.6)",
    cardShadow: "rgba(0,0,0,0.08)",
  };

  // Convention CSS : --<cat>-<clé-en-kebab>
  // primaryHover -> primary-hover ; warningBgSoft -> warning-bg-soft.
  // Les clés purement numériques (gray.50, gray.100…) sont laissées telles quelles.
  function kebab(key) {
    return String(key).replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); });
  }

  function buildVarName(category, key) {
    return "--" + category + "-" + kebab(key);
  }

  var CATEGORIES = [
    ["brand",   BRAND],
    ["gray",    GRAY],
    ["alert",   ALERT],
    ["overlay", OVERLAY],
  ];

  function buildVarsBlock() {
    var lines = [];
    for (var c = 0; c < CATEGORIES.length; c++) {
      var catName = CATEGORIES[c][0];
      var obj     = CATEGORIES[c][1];
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          lines.push("  " + buildVarName(catName, key) + ": " + obj[key] + ";");
        }
      }
    }
    return ":root {\n" + lines.join("\n") + "\n}";
  }

  function buildVarMap(catName, obj) {
    var out = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        out[key] = "var(" + buildVarName(catName, key) + ")";
      }
    }
    return out;
  }

  var values = { brand: BRAND, gray: GRAY, alert: ALERT, overlay: OVERLAY };
  var vars   = {
    brand:   buildVarMap("brand",   BRAND),
    gray:    buildVarMap("gray",    GRAY),
    alert:   buildVarMap("alert",   ALERT),
    overlay: buildVarMap("overlay", OVERLAY),
  };
  var cssVarsBlock = buildVarsBlock();

  // Injection idempotente dans <head> au chargement (no-op côté Node/tests).
  function injectStyleTag() {
    if (typeof document === "undefined" || !document.head) return;
    if (document.getElementById("formula-ui-tokens")) return;
    var style = document.createElement("style");
    style.id = "formula-ui-tokens";
    style.textContent = cssVarsBlock;
    document.head.appendChild(style);
  }

  global.FormulaUITokens = {
    values:         values,
    vars:           vars,
    cssVarsBlock:   cssVarsBlock,
    injectStyleTag: injectStyleTag,
  };

  injectStyleTag();
})(typeof window !== "undefined" ? window : globalThis);
