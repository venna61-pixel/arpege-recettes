(function (global) {
  if (!global.FormulaStorageKeys) {
    throw new Error("Module requis: logic/core/storage-keys.js doit être chargé avant logic/core/config.js");
  }
  var CONFIG_KEY = global.FormulaStorageKeys.CONFIG.RESTAURANT_CONFIG;

  function getConfig() {
    try {
      var raw = global.localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveConfig(config) {
    global.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function getCurrencySymbol() {
    var config = getConfig();
    return (config && config.currencySymbol) ? config.currencySymbol : "€";
  }

  function getCountryCode() {
    var config = getConfig();
    return (config && config.countryCode) ? config.countryCode : "FR";
  }

  global.FormulaConfig = {
    getConfig,
    saveConfig,
    getCurrencySymbol,
    getCountryCode,
  };
})(typeof window !== "undefined" ? window : global);
