const fs = require("fs");
const assert = require("assert");

const nodeCrypto = require("crypto");
global.crypto = {
  getRandomValues: (array) => {
    const bytes = nodeCrypto.randomBytes(array.length);
    for (let i = 0; i < array.length; i++) array[i] = bytes[i];
    return array;
  },
  subtle: nodeCrypto.webcrypto.subtle,
};
global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/auth-helpers.js");

const { generateRecoveryCode, isValidRecoveryCodeFormat, normalizeRecoveryCode, hashPassword } =
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

// ─── hashPassword ────────────────────────────────────────────────────────────

async function testHashPasswordRetourneChainHex() {
  const hash = await hashPassword("monMotDePasse");
  assert.strictEqual(typeof hash, "string", "doit retourner une chaîne");
  assert.strictEqual(hash.length, 64, "un hash SHA-256 fait toujours 64 caractères hex");
  assert.match(hash, /^[a-f0-9]+$/, "doit contenir uniquement des caractères hexadécimaux");
}

async function testHashPasswordMemeEntreeMemeSortie() {
  const hash1 = await hashPassword("identique");
  const hash2 = await hashPassword("identique");
  assert.strictEqual(hash1, hash2, "le même mot de passe doit toujours donner le même hash");
}

async function testHashPasswordEntreesDifferentesSortiesDifferentes() {
  const hash1 = await hashPassword("motDePasse1");
  const hash2 = await hashPassword("motDePasse2");
  assert.notStrictEqual(hash1, hash2, "des mots de passe différents doivent donner des hashs différents");
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

async function runAll() {
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
    testHashPasswordRetourneChainHex,
    testHashPasswordMemeEntreeMemeSortie,
    testHashPasswordEntreesDifferentesSortiesDifferentes,
  ];

  for (const testFn of tests) {
    await testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll().catch((err) => { console.error(err.message || err); process.exit(1); });
