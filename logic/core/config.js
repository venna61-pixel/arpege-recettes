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

  global.ArpegeConfig = {
    CONFIG_KEY,
    getConfig,
    saveConfig,
  };
})(typeof window !== "undefined" ? window : global);
