(function (global) {
  function roundTo(value, decimals) {
    if (decimals === undefined) decimals = 2;
    return Number((value || 0).toFixed(decimals));
  }

  function formatDecimal(value, maxDigits) {
    if (maxDigits === undefined) maxDigits = 6;
    var n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
      useGrouping: false,
    });
  }

  function normalizeUnknownPrice(rawPrice) {
    var raw = String(rawPrice !== null && rawPrice !== undefined ? rawPrice : "").trim();
    if (!raw) return null;
    var parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function formatPriceDisplay(price) {
    var n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return "Prix inconnu";
    return formatDecimal(n) + " €";
  }

  function formatProcedureLine(rawLine) {
    var html = String(rawLine || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/__(.+?)__/g, "<u>$1</u>");
    html = html.replace(/\[red\](.+?)\[\/red\]/g, '<span style="color:#dc2626">$1</span>');
    if (html.startsWith("- ")) html = "• " + html.slice(2);
    return html;
  }

  // Allowlist DOMPurify pour les procédés riches.
  //
  // Tags produits par l'éditeur execCommand :
  //  - moderne (avec styleWithCSS=true) : <span style="color:...">
  //  - legacy (Chrome par défaut)       : <font color="...">
  // On accepte les deux : <font> reste autorisé pour ne pas casser les
  // recettes déjà enregistrées avant le passage à styleWithCSS.
  //
  // Attributs :
  //  - style : nécessaire pour la couleur en mode moderne
  //  - color : nécessaire pour <font color="...">
  // DOMPurify bloque déjà les valeurs CSS dangereuses (url(javascript:...)
  // expression(), etc.) par défaut.
  var PROCEDURE_ALLOWLIST = {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "span", "ul", "li", "font"],
    ALLOWED_ATTR: ["style", "color"],
  };

  function defaultProcedureSanitizer(html) {
    if (typeof window !== "undefined" && window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
      return window.DOMPurify.sanitize(html, PROCEDURE_ALLOWLIST);
    }
    // Fallback safe quand DOMPurify est absent (Node tests, offline, CDN cassé).
    // On échappe entièrement le HTML : le contenu s'affiche en texte brut,
    // ce qui est moins joli mais ne peut JAMAIS exécuter de script.
    return String(html || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // Convertit le texte d'un procédé en HTML safe.
  // Deux chemins :
  //  - texte SANS tag HTML détecté : markdown legacy (**gras**, *italique*,
  //    __souligné__, [red]...[/red], - puce) → formatProcedureLine qui échappe
  //    AVANT d'appliquer les patterns. Le résultat est intrinsèquement safe.
  //  - texte AVEC tag HTML : produit par l'éditeur execCommand. Passe par le
  //    sanitizer fourni en paramètre, ou par defaultProcedureSanitizer (DOMPurify
  //    en navigateur, échappement total en fallback).
  // Le sanitizer est injectable pour rendre la fonction testable sans DOMPurify.
  function migrateProcedureMarkdownToHtml(text, sanitizer) {
    if (!text) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) {
      var fn = typeof sanitizer === "function" ? sanitizer : defaultProcedureSanitizer;
      return fn(text);
    }
    return text.split("\n").map(function (line) {
      return "<p>" + (formatProcedureLine(line) || "<br>") + "</p>";
    }).join("");
  }

  function sanitizePrintTitle(value, suffix) {
    var invalidChars = ["/", "\\", ":", "*", "?", "\"", "<", ">", "|"];
    var cleanedName = String(value || "Recette");
    invalidChars.forEach(function (char) {
      cleanedName = cleanedName.split(char).join(" ");
    });
    cleanedName = cleanedName.replace(/\s+/g, " ").trim();
    return (cleanedName || "Recette") + " - " + suffix;
  }

  global.FormulaUtils = {
    roundTo,
    formatDecimal,
    normalizeUnknownPrice,
    formatPriceDisplay,
    formatProcedureLine,
    migrateProcedureMarkdownToHtml,
    sanitizePrintTitle,
  };
})(typeof window !== "undefined" ? window : global);
