(function (global) {
  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  // Colonne 1 : Prix HT = coût × coefficient
  function calcByCoefficient(coutParCouvert, coefficient, tauxTVA) {
    if (coutParCouvert == null || !isFinite(coutParCouvert) || coutParCouvert <= 0) return null;
    if (!isFinite(coefficient) || coefficient <= 0) return null;
    if (!isFinite(tauxTVA) || tauxTVA < 0) return null;

    var prixHT          = coutParCouvert * coefficient;
    var prixTTC         = prixHT * (1 + tauxTVA / 100);
    var margeHTEur = prixHT - coutParCouvert;
    var margeHTPct = prixHT > 0 ? (margeHTEur / prixHT) * 100 : 0;
    var margeTTCEur = prixTTC - coutParCouvert;
    var margeTTCPct = prixTTC > 0 ? (margeTTCEur / prixTTC) * 100 : 0;

    return {
      prixHT:           round2(prixHT),
      prixTTC:          round2(prixTTC),
      coefficient:      round2(coefficient),
      margeHTEur:  round2(margeHTEur),
      margeHTPct:  round2(margeHTPct),
      margeTTCEur: round2(margeTTCEur),
      margeTTCPct: round2(margeTTCPct),
    };
  }

  // Colonne 2 : Prix HT = coût / (1 - marge%)
  function calcByMargeBruteHT(coutParCouvert, margeHTPct, tauxTVA) {
    if (coutParCouvert == null || !isFinite(coutParCouvert) || coutParCouvert <= 0) return null;
    if (!isFinite(margeHTPct) || margeHTPct < 0 || margeHTPct >= 100) return null;
    if (!isFinite(tauxTVA) || tauxTVA < 0) return null;

    var m               = margeHTPct / 100;
    var prixHT          = coutParCouvert / (1 - m);
    var prixTTC         = prixHT * (1 + tauxTVA / 100);
    var coefficient     = prixHT / coutParCouvert;
    var margeHTEur = prixHT - coutParCouvert;
    var margeTTCEur = prixTTC - coutParCouvert;
    var margeTTCPct = prixTTC > 0 ? (margeTTCEur / prixTTC) * 100 : 0;

    return {
      prixHT:           round2(prixHT),
      prixTTC:          round2(prixTTC),
      coefficient:      round2(coefficient),
      margeHTEur:  round2(margeHTEur),
      margeHTPct:  round2(margeHTPct),
      margeTTCEur: round2(margeTTCEur),
      margeTTCPct: round2(margeTTCPct),
    };
  }

  // Colonne 3 : Prix TTC = coût / (1 - marge%)
  function calcByMargeNetteTTC(coutParCouvert, margeTTCPct, tauxTVA) {
    if (coutParCouvert == null || !isFinite(coutParCouvert) || coutParCouvert <= 0) return null;
    if (!isFinite(margeTTCPct) || margeTTCPct < 0 || margeTTCPct >= 100) return null;
    if (!isFinite(tauxTVA) || tauxTVA < 0) return null;

    var m                = margeTTCPct / 100;
    var prixTTC          = coutParCouvert / (1 - m);
    var prixHT           = prixTTC / (1 + tauxTVA / 100);
    var coefficient      = prixHT / coutParCouvert;
    var margeTTCEur = prixTTC - coutParCouvert;
    var margeHTEur  = prixHT - coutParCouvert;
    var margeHTPct  = prixHT > 0 ? (margeHTEur / prixHT) * 100 : 0;

    return {
      prixHT:           round2(prixHT),
      prixTTC:          round2(prixTTC),
      coefficient:      round2(coefficient),
      margeTTCEur: round2(margeTTCEur),
      margeTTCPct: round2(margeTTCPct),
      margeHTEur:  round2(margeHTEur),
      margeHTPct:  round2(margeHTPct),
    };
  }

  // Colonne 4 : toutes les marges à partir d'un prix TTC saisi
  function calcByPrixTTC(coutParCouvert, prixTTC, tauxTVA) {
    if (coutParCouvert == null || !isFinite(coutParCouvert) || coutParCouvert <= 0) return null;
    if (!isFinite(prixTTC) || prixTTC <= 0) return null;
    if (!isFinite(tauxTVA) || tauxTVA < 0) return null;

    var prixHT      = prixTTC / (1 + tauxTVA / 100);
    var coefficient = prixHT / coutParCouvert;
    var margeTTCEur = prixTTC - coutParCouvert;
    var margeTTCPct = (margeTTCEur / prixTTC) * 100;
    var margeHTEur  = prixHT - coutParCouvert;
    var margeHTPct  = prixHT > 0 ? (margeHTEur / prixHT) * 100 : 0;

    return {
      prixHT:      round2(prixHT),
      prixTTC:     round2(prixTTC),
      coefficient: round2(coefficient),
      margeTTCEur: round2(margeTTCEur),
      margeTTCPct: round2(margeTTCPct),
      margeHTEur:  round2(margeHTEur),
      margeHTPct:  round2(margeHTPct),
    };
  }

  global.FormulaPricing = {
    calcByCoefficient,
    calcByMargeBruteHT,
    calcByMargeNetteTTC,
    calcByPrixTTC,
  };
})(typeof window !== "undefined" ? window : global);
