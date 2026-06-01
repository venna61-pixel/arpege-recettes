(function (global) {
  var CONFIG_KEY = "arpege_restaurant_config";

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
    CONFIG_KEY,
    getConfig,
    saveConfig,
    getCurrencySymbol,
    getCountryCode,
  };
})(typeof window !== "undefined" ? window : global);
