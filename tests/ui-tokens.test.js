const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/ui-tokens.js");

const TOKENS = global.FormulaUITokens;

// ─── Structure du module ─────────────────────────────────────────────────────

function testModuleExpose() {
  assert.ok(TOKENS, "FormulaUITokens doit être exposé sur window");
}

function testApiPublique() {
  assert.ok(TOKENS.values && typeof TOKENS.values === "object", "values doit être un objet");
  assert.ok(TOKENS.vars   && typeof TOKENS.vars   === "object", "vars doit être un objet");
  assert.strictEqual(typeof TOKENS.cssVarsBlock, "string", "cssVarsBlock doit être une string");
  assert.strictEqual(typeof TOKENS.injectStyleTag, "function", "injectStyleTag doit être une fonction");
}

function testCategoriesAttendues() {
  const expected = ["brand", "gray", "alert", "overlay"];
  for (const cat of expected) {
    assert.ok(TOKENS.values[cat] && typeof TOKENS.values[cat] === "object", `values.${cat} manquant`);
    assert.ok(TOKENS.vars[cat]   && typeof TOKENS.vars[cat]   === "object", `vars.${cat} manquant`);
  }
}

// ─── Validité des valeurs ────────────────────────────────────────────────────

const HEX_RE  = /^#[0-9a-fA-F]{6}$/;
const RGBA_RE = /^rgba?\([\d.,\s]+\)$/;

function flattenAllValues() {
  const all = [];
  for (const cat of Object.keys(TOKENS.values)) {
    for (const key of Object.keys(TOKENS.values[cat])) {
      all.push({ category: cat, key, value: TOKENS.values[cat][key] });
    }
  }
  return all;
}

function testToutesLesValeursSontHexOuRgba() {
  for (const { category, key, value } of flattenAllValues()) {
    const isHex  = HEX_RE.test(value);
    const isRgba = RGBA_RE.test(value);
    assert.ok(isHex || isRgba, `${category}.${key} = "${value}" doit être un hex 6 chiffres ou un rgba()`);
  }
}

function testAucunDoublon() {
  const seen = new Map();
  for (const { category, key, value } of flattenAllValues()) {
    if (seen.has(value)) {
      assert.fail(`Doublon : "${value}" défini en ${seen.get(value)} et ${category}.${key}`);
    }
    seen.set(value, `${category}.${key}`);
  }
}

// ─── Régression : valeurs précises attendues ─────────────────────────────────
// Verrouille les couleurs effectivement utilisées dans index.html pour qu'un
// changement involontaire d'une valeur déclenche un test rouge.

function testValeursBrand() {
  assert.strictEqual(TOKENS.values.brand.primary,      "#1A3A4A");
  assert.strictEqual(TOKENS.values.brand.primaryHover, "#16303d");
  assert.strictEqual(TOKENS.values.brand.primaryLight, "#2A4A5A");
  assert.strictEqual(TOKENS.values.brand.accent,       "#C8956C");
  assert.strictEqual(TOKENS.values.brand.accentHover,  "#b8825c");
  assert.strictEqual(TOKENS.values.brand.accentDark,   "#7b5a42");
}

function testValeursGray() {
  assert.strictEqual(TOKENS.values.gray["50"],  "#f9fafb");
  assert.strictEqual(TOKENS.values.gray["100"], "#f3f4f6");
  assert.strictEqual(TOKENS.values.gray["200"], "#e5e7eb");
  assert.strictEqual(TOKENS.values.gray["300"], "#d1d5db");
  assert.strictEqual(TOKENS.values.gray["400"], "#9ca3af");
  assert.strictEqual(TOKENS.values.gray["500"], "#6b7280");
  assert.strictEqual(TOKENS.values.gray["600"], "#4b5563");
  assert.strictEqual(TOKENS.values.gray["700"], "#374151");
  assert.strictEqual(TOKENS.values.gray["900"], "#111827");
}

function testValeursAlert() {
  assert.strictEqual(TOKENS.values.alert.dangerText,        "#991b1b");
  assert.strictEqual(TOKENS.values.alert.dangerStrong,      "#dc2626");
  assert.strictEqual(TOKENS.values.alert.successText,       "#166534");
  assert.strictEqual(TOKENS.values.alert.warningText,       "#9a3412");
  assert.strictEqual(TOKENS.values.alert.warningMuted,      "#b45309");
  assert.strictEqual(TOKENS.values.alert.warningBorder,     "#f97316");
  assert.strictEqual(TOKENS.values.alert.warningBorderSoft, "#fdba74");
  assert.strictEqual(TOKENS.values.alert.warningBg,         "#fff7ed");
  assert.strictEqual(TOKENS.values.alert.warningBgSoft,     "#fffbeb");
}

function testValeursOverlay() {
  assert.strictEqual(TOKENS.values.overlay.modal,      "rgba(0,0,0,.6)");
  assert.strictEqual(TOKENS.values.overlay.cardShadow, "rgba(0,0,0,0.08)");
}

// ─── vars : mapping vers var(--xxx) ──────────────────────────────────────────

const VAR_RE = /^var\(--[a-z0-9-]+\)$/;

function testToutesLesVarsSontDuFormatVar() {
  for (const cat of Object.keys(TOKENS.vars)) {
    for (const key of Object.keys(TOKENS.vars[cat])) {
      const v = TOKENS.vars[cat][key];
      assert.ok(VAR_RE.test(v), `vars.${cat}.${key} = "${v}" doit suivre le format var(--xxx)`);
    }
  }
}

function testVarsBrandSpecifiques() {
  assert.strictEqual(TOKENS.vars.brand.primary,      "var(--brand-primary)");
  assert.strictEqual(TOKENS.vars.brand.primaryHover, "var(--brand-primary-hover)");
  assert.strictEqual(TOKENS.vars.brand.primaryLight, "var(--brand-primary-light)");
  assert.strictEqual(TOKENS.vars.brand.accent,       "var(--brand-accent)");
  assert.strictEqual(TOKENS.vars.brand.accentHover,  "var(--brand-accent-hover)");
  assert.strictEqual(TOKENS.vars.brand.accentDark,   "var(--brand-accent-dark)");
}

function testVarsGraySpecifiques() {
  assert.strictEqual(TOKENS.vars.gray["50"],  "var(--gray-50)");
  assert.strictEqual(TOKENS.vars.gray["900"], "var(--gray-900)");
}

function testVarsAlertSpecifiques() {
  assert.strictEqual(TOKENS.vars.alert.dangerText,    "var(--alert-danger-text)");
  assert.strictEqual(TOKENS.vars.alert.warningBgSoft, "var(--alert-warning-bg-soft)");
}

function testVarsOverlaySpecifiques() {
  assert.strictEqual(TOKENS.vars.overlay.modal,      "var(--overlay-modal)");
  assert.strictEqual(TOKENS.vars.overlay.cardShadow, "var(--overlay-card-shadow)");
}

function testCorrespondanceValuesEtVars() {
  // Pour chaque catégorie, l'ensemble des clés doit être identique entre values et vars.
  for (const cat of Object.keys(TOKENS.values)) {
    const valueKeys = Object.keys(TOKENS.values[cat]).sort();
    const varKeys   = Object.keys(TOKENS.vars[cat]).sort();
    assert.deepStrictEqual(varKeys, valueKeys, `vars.${cat} et values.${cat} doivent avoir les mêmes clés`);
  }
}

// ─── cssVarsBlock : bloc :root injectable ────────────────────────────────────

function testCssVarsBlockCommenceParRoot() {
  assert.ok(TOKENS.cssVarsBlock.startsWith(":root {"), "cssVarsBlock doit commencer par ':root {'");
  assert.ok(TOKENS.cssVarsBlock.endsWith("}"),         "cssVarsBlock doit finir par '}'");
}

function testCssVarsBlockContientToutesLesVariables() {
  for (const { category, key, value } of flattenAllValues()) {
    const expected = "--" + category + "-" + camelToKebab(key) + ": " + value + ";";
    assert.ok(
      TOKENS.cssVarsBlock.includes(expected),
      `cssVarsBlock doit contenir "${expected}"`
    );
  }
}

function camelToKebab(s) {
  return String(s).replace(/[A-Z]/g, m => "-" + m.toLowerCase());
}

// ─── injectStyleTag : no-op côté Node, idempotent ────────────────────────────

function testInjectStyleTagEstNoOpSansDocument() {
  // En Node, document n'existe pas — l'appel ne doit pas planter.
  assert.doesNotThrow(() => TOKENS.injectStyleTag());
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testModuleExpose,
    testApiPublique,
    testCategoriesAttendues,
    testToutesLesValeursSontHexOuRgba,
    testAucunDoublon,
    testValeursBrand,
    testValeursGray,
    testValeursAlert,
    testValeursOverlay,
    testToutesLesVarsSontDuFormatVar,
    testVarsBrandSpecifiques,
    testVarsGraySpecifiques,
    testVarsAlertSpecifiques,
    testVarsOverlaySpecifiques,
    testCorrespondanceValuesEtVars,
    testCssVarsBlockCommenceParRoot,
    testCssVarsBlockContientToutesLesVariables,
    testInjectStyleTagEstNoOpSansDocument,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
