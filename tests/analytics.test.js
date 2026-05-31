const fs = require("fs");
const assert = require("assert");

global.window = global;

// Mock DOM minimal pour Node.js
function makeDocument() {
  const headChildren = [];
  return {
    head: {
      appendChild: (el) => headChildren.push(el),
      children: headChildren,
    },
    createElement: (tag) => ({ tag, async: false, src: "" }),
  };
}

function resetAnalyticsState() {
  delete global.__GA_LOADED__;
  delete global.dataLayer;
  delete global.gtag;
  delete global.FormulaAnalytics;
}

function loadScript(path) {
  eval(fs.readFileSync(path, "utf8"));
}

// CONSENT_KEY et GA_ID
function testConsentKey() {
  resetAnalyticsState();
  global.document = makeDocument();
  loadScript("logic/core/analytics.js");
  assert.strictEqual(window.FormulaAnalytics.CONSENT_KEY, "arpege_consent_analytics");
}

function testGaId() {
  resetAnalyticsState();
  global.document = makeDocument();
  loadScript("logic/core/analytics.js");
  assert.ok(typeof window.FormulaAnalytics.GA_ID === "string" && window.FormulaAnalytics.GA_ID.length > 0);
}

// loadGoogleAnalytics — premier appel
function testLoadDefinitGtag() {
  resetAnalyticsState();
  global.document = makeDocument();
  loadScript("logic/core/analytics.js");
  window.FormulaAnalytics.loadGoogleAnalytics();
  assert.ok(typeof global.gtag === "function", "gtag doit être une fonction");
}

function testLoadDefinitDataLayer() {
  resetAnalyticsState();
  global.document = makeDocument();
  loadScript("logic/core/analytics.js");
  window.FormulaAnalytics.loadGoogleAnalytics();
  assert.ok(Array.isArray(global.dataLayer), "dataLayer doit être un tableau");
}

function testLoadMarqueGaLoaded() {
  resetAnalyticsState();
  global.document = makeDocument();
  loadScript("logic/core/analytics.js");
  window.FormulaAnalytics.loadGoogleAnalytics();
  assert.strictEqual(global.__GA_LOADED__, true);
}

function testLoadAjouteScriptAuHead() {
  resetAnalyticsState();
  const doc = makeDocument();
  global.document = doc;
  loadScript("logic/core/analytics.js");
  window.FormulaAnalytics.loadGoogleAnalytics();
  assert.strictEqual(doc.head.children.length, 1, "un script ajouté au head");
}

// loadGoogleAnalytics — garde double-chargement
function testDoublAppelIgnore() {
  resetAnalyticsState();
  const doc = makeDocument();
  global.document = doc;
  loadScript("logic/core/analytics.js");
  window.FormulaAnalytics.loadGoogleAnalytics();
  window.FormulaAnalytics.loadGoogleAnalytics();
  assert.strictEqual(doc.head.children.length, 1, "script ajouté une seule fois");
}

function runAll() {
  const tests = [
    testConsentKey,
    testGaId,
    testLoadDefinitGtag,
    testLoadDefinitDataLayer,
    testLoadMarqueGaLoaded,
    testLoadAjouteScriptAuHead,
    testDoublAppelIgnore,
  ];

  for (const testFn of tests) {
    testFn();
    console.log("PASS " + testFn.name);
  }
  console.log("\nTous les tests analytics passent.");
}

runAll();
