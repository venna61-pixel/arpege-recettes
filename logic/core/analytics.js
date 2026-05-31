(function (global) {
  var CONSENT_KEY = "arpege_consent_analytics";
  var GA_ID = "G-C1BC423NRZ";

  function loadGoogleAnalytics() {
    if (global.__GA_LOADED__) return;
    global.__GA_LOADED__ = true;
    var script = global.document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    global.document.head.appendChild(script);
    global.dataLayer = global.dataLayer || [];
    global.gtag = function () { global.dataLayer.push(arguments); };
    global.gtag("js", new Date());
    global.gtag("config", GA_ID);
  }

  global.FormulaAnalytics = {
    CONSENT_KEY: CONSENT_KEY,
    GA_ID: GA_ID,
    loadGoogleAnalytics: loadGoogleAnalytics,
  };
})(typeof window !== "undefined" ? window : global);
