const fs = require("fs");
const assert = require("assert");

// Polyfill crypto.getRandomValues pour Node.js (disponible nativement en Node 16+)
const nodeCrypto = require("crypto");
global.crypto = {
  getRandomValues: (array) => {
    const bytes = nodeCrypto.randomBytes(array.length);
    for (let i = 0; i < array.length; i++) array[i] = bytes[i];
    return array;
  },
};
global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/auth-helpers.js");

const { generateRecoveryCode, isValidRecoveryCodeFormat, normalizeRecoveryCode } =
  window.ArpegeAuthHelpers;

// ─── generateRecoveryCode ─────────────────────────────────────────────────────

function testGenerateRecoveryCodeFormat() {
  const code = generateRecoveryCode();
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/,
    `Format inattendu : "${code}"`);
}

function testGenerateRecoveryCodeLongueur() {
  const code = generateRecoveryCode();
  // 4 + 1 + 4 + 1 + 4 = 14 caractères
  assert.strictEqual(code.length, 14, `Longueur attendue 14, reçu ${code.length}`);
}

function testGenerateRecoveryCodePasDeCaracteresAmbigus() {
  for (let i = 0; i < 100; i++) {
    const code = generateRecoveryCode().replace(/-/g, "");
    assert.ok(!/[01OI]/.test(code), `Code contient un caractère ambigu : "${code}"`);
  }
}

function testGenerateRecoveryCodeUniciteSurGrandNombre() {
  // Sur 50 codes générés, au moins 45 doivent être distincts (entropie suffisante)
  const codes = new Set();
  for (let i = 0; i < 50; i++) codes.add(generateRecoveryCode());
  assert.ok(codes.size >= 45,
    `Trop de codes identiques (${codes.size}/50) — entropie insuffisante`);
}

function testGenerateRecoveryCodeContientTirets() {
  const code = generateRecoveryCode();
  const parts = code.split("-");
  assert.strictEqual(parts.length, 3, "Le code doit contenir exactement 2 tirets");
  parts.forEach((p) => assert.strictEqual(p.length, 4, `Segment de longueur incorrecte : "${p}"`));
}

// ─── isValidRecoveryCodeFormat ────────────────────────────────────────────────

function testIsValidFormatCodesValides() {
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EFGH-23JK"), true);
  assert.strictEqual(isValidRecoveryCodeFormat("2345-6789-ABCD"), true);
  assert.strictEqual(isValidRecoveryCodeFormat("abcd-efgh-23jk"), true, "insensible à la casse");
}

function testIsValidFormatCodesInvalides() {
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EFGH"), false, "trop court");
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EFGH-23JK-LMNO"), false, "trop long");
  assert.strictEqual(isValidRecoveryCodeFormat(""), false, "vide");
  assert.strictEqual(isValidRecoveryCodeFormat(null), false, "null");
  assert.strictEqual(isValidRecoveryCodeFormat(undefined), false, "undefined");
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EF0H-23JK"), false, "contient 0 ambigu");
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EFIH-23JK"), false, "contient I ambigu");
  assert.strictEqual(isValidRecoveryCodeFormat("ABCD-EFOH-23JK"), false, "contient O ambigu");
  assert.strictEqual(isValidRecoveryCodeFormat("ABCDEFGH23JK"), false, "sans tirets");
}

// ─── normalizeRecoveryCode ────────────────────────────────────────────────────

function testNormalizeRecoveryCodeMajuscules() {
  assert.strictEqual(normalizeRecoveryCode("abcd-efgh-23jk"), "ABCD-EFGH-23JK");
}

function testNormalizeRecoveryCodeEspacesSupprimés() {
  assert.strictEqual(normalizeRecoveryCode("  ABCD-EFGH-23JK  "), "ABCD-EFGH-23JK");
}

function testNormalizeRecoveryCodeValeurVide() {
  assert.strictEqual(normalizeRecoveryCode(""), "");
  assert.strictEqual(normalizeRecoveryCode(null), "");
  assert.strictEqual(normalizeRecoveryCode(undefined), "");
}

// ─── Cohérence generateRecoveryCode → isValidRecoveryCodeFormat ──────────────

function testToutCodeGenereEstValide() {
  for (let i = 0; i < 50; i++) {
    const code = generateRecoveryCode();
    assert.strictEqual(isValidRecoveryCodeFormat(code), true,
      `Code généré non valide : "${code}"`);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  const tests = [
    testGenerateRecoveryCodeFormat,
    testGenerateRecoveryCodeLongueur,
    testGenerateRecoveryCodePasDeCaracteresAmbigus,
    testGenerateRecoveryCodeUniciteSurGrandNombre,
    testGenerateRecoveryCodeContientTirets,
    testIsValidFormatCodesValides,
    testIsValidFormatCodesInvalides,
    testNormalizeRecoveryCodeMajuscules,
    testNormalizeRecoveryCodeEspacesSupprimés,
    testNormalizeRecoveryCodeValeurVide,
    testToutCodeGenereEstValide,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
