(function (global) {
  // Applique ou bascule un format sur la sélection via execCommand.
  // Le navigateur gère lui-même la sélection, le toggle et la frappe en mode activé.
  // command : 'bold' | 'italic' | 'underline' | 'foreColor' | 'insertUnorderedList'
  // value   : utilisé uniquement pour foreColor (ex: '#dc2626')
  function applyRichFormat(editorEl, command, value) {
    if (!editorEl) return;
    editorEl.focus();
    // Force le format moderne (<span style="color:...">) au lieu de <font color>
    // legacy. Compatible avec la sanitisation DOMPurify et évite d'accumuler
    // du HTML deprecated. Cette directive doit être appliquée AVANT chaque
    // commande car son état n'est pas garanti persistant entre les éditions.
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    if (command === "foreColor") {
      var current = "";
      try { current = document.queryCommandValue("foreColor"); } catch (e) {}
      var isRed = current === "rgb(220, 38, 38)" || current === "#dc2626";
      document.execCommand("foreColor", false, isRed ? "#000000" : (value || "#dc2626"));
    } else {
      document.execCommand(command, false, null);
    }
  }

  // Retourne un Set des formats actifs à la position du curseur (ou au début de la sélection).
  // Noms retournés : 'bold', 'italic', 'underline', 'foreColor', 'insertUnorderedList'
  function getActiveFormats(editorEl) {
    if (!editorEl) return new Set();
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode)) return new Set();
    var active = new Set();
    try {
      if (document.queryCommandState("bold")) active.add("bold");
      if (document.queryCommandState("italic")) active.add("italic");
      if (document.queryCommandState("underline")) active.add("underline");
      var color = document.queryCommandValue("foreColor");
      if (color === "rgb(220, 38, 38)" || color === "#dc2626") active.add("foreColor");
      if (document.queryCommandState("insertUnorderedList")) active.add("insertUnorderedList");
    } catch (e) {}
    return active;
  }

  global.FormulaEditor = { applyRichFormat, getActiveFormats };
})(typeof window !== "undefined" ? window : global);
