const fs = require("fs");
const assert = require("assert");

global.window = global;

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

loadScript("logic/core/editor.js");

const { applyRichFormat } = window.FormulaEditor;

function testModuleExposeApplyRichFormat() {
  assert.strictEqual(typeof applyRichFormat, "function");
}

function testApplyRichFormatEditorNullNeThrowPas() {
  // Doit retourner immédiatement sans erreur si editorEl est null
  assert.doesNotThrow(() => applyRichFormat(null, "bold"));
  assert.doesNotThrow(() => applyRichFormat(null, "italic"));
  assert.doesNotThrow(() => applyRichFormat(null, "underline"));
  assert.doesNotThrow(() => applyRichFormat(null, "foreColor", "#dc2626"));
  assert.doesNotThrow(() => applyRichFormat(null, "insertUnorderedList"));
}

function testApplyRichFormatEditorUndefinedNeThrowPas() {
  assert.doesNotThrow(() => applyRichFormat(undefined, "bold"));
}

// ─── styleWithCSS force le format HTML moderne ────────────────────────────────

function makeMockEditorAndDocument() {
  const calls = [];
  const editorEl = { focus: () => {} };
  // On simule un document avec execCommand qui mémorise tous les appels.
  global.document = {
    execCommand: (cmd, ui, value) => { calls.push({ cmd, value }); return true; },
    queryCommandValue: () => "",
    queryCommandState: () => false,
  };
  return { editorEl, calls };
}

function testApplyRichFormatActiveStyleWithCSS() {
  // Au lieu d'accumuler du HTML legacy <font color="...">, l'éditeur doit
  // produire le format moderne <span style="color:...">, mieux supporté par
  // les navigateurs et compatible avec l'allowlist DOMPurify.
  const { editorEl, calls } = makeMockEditorAndDocument();
  try {
    applyRichFormat(editorEl, "bold");
    const styleWithCSSCall = calls.find((c) => c.cmd === "styleWithCSS");
    assert.ok(styleWithCSSCall, "styleWithCSS doit être activé avant les commandes de formatage");
    assert.strictEqual(styleWithCSSCall.value, true, "styleWithCSS doit être activé (true)");
  } finally {
    delete global.document;
  }
}

function testApplyRichFormatStyleWithCSSAvantLaCommande() {
  const { editorEl, calls } = makeMockEditorAndDocument();
  try {
    applyRichFormat(editorEl, "foreColor", "#dc2626");
    const styleIdx = calls.findIndex((c) => c.cmd === "styleWithCSS");
    const foreColorIdx = calls.findIndex((c) => c.cmd === "foreColor");
    assert.ok(styleIdx >= 0, "styleWithCSS doit être appelé");
    assert.ok(foreColorIdx >= 0, "foreColor doit être appelé");
    assert.ok(styleIdx < foreColorIdx, "styleWithCSS doit précéder foreColor pour avoir effet");
  } finally {
    delete global.document;
  }
}

function runAll() {
  const tests = [
    testModuleExposeApplyRichFormat,
    testApplyRichFormatEditorNullNeThrowPas,
    testApplyRichFormatEditorUndefinedNeThrowPas,
    testApplyRichFormatActiveStyleWithCSS,
    testApplyRichFormatStyleWithCSSAvantLaCommande,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
