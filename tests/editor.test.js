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

function runAll() {
  const tests = [
    testModuleExposeApplyRichFormat,
    testApplyRichFormatEditorNullNeThrowPas,
    testApplyRichFormatEditorUndefinedNeThrowPas,
  ];

  for (const testFn of tests) {
    testFn();
    console.log(`PASS ${testFn.name}`);
  }
}

runAll();
