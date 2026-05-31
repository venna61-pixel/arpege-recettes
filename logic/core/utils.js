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

  function migrateProcedureMarkdownToHtml(text) {
    if (!text) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
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

  global.ArpegeUtils = {
    roundTo,
    formatDecimal,
    normalizeUnknownPrice,
    formatPriceDisplay,
    formatProcedureLine,
    migrateProcedureMarkdownToHtml,
    sanitizePrintTitle,
  };
})(typeof window !== "undefined" ? window : global);
