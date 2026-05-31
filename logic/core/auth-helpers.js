(function (global) {
  // Caractères sans ambiguïté : O/0 et I/1 exclus pour éviter les confusions à la lecture.
  const RECOVERY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const RECOVERY_CODE_SEGMENT_LENGTH = 4;
  const RECOVERY_CODE_SEGMENTS = 3;

  // Entrée: aucune. Sortie: code de récupération aléatoire au format XXXX-XXXX-XXXX.
  // Utilise crypto.getRandomValues pour une entropie cryptographique (pas Math.random).
  // Le format en segments facilite la lecture et la saisie sur papier.
  function generateRecoveryCode() {
    const totalLength = RECOVERY_CODE_SEGMENT_LENGTH * RECOVERY_CODE_SEGMENTS;
    const array = new Uint8Array(totalLength);
    crypto.getRandomValues(array);
    let raw = "";
    for (const byte of array) {
      raw += RECOVERY_CODE_CHARS[byte % RECOVERY_CODE_CHARS.length];
    }
    const segments = [];
    for (let i = 0; i < RECOVERY_CODE_SEGMENTS; i++) {
      segments.push(raw.slice(i * RECOVERY_CODE_SEGMENT_LENGTH, (i + 1) * RECOVERY_CODE_SEGMENT_LENGTH));
    }
    return segments.join("-");
  }

  // Entrée: chaîne quelconque. Sortie: booléen — vrai si le format XXXX-XXXX-XXXX est respecté.
  // Insensible à la casse pour la saisie utilisateur.
  function isValidRecoveryCodeFormat(code) {
    if (!code || typeof code !== "string") return false;
    const normalized = code.trim().toUpperCase().replace(/\s/g, "");
    // [A-HJ-NP-Z] exclut explicitement I et O (ambigus avec 1 et 0).
    return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(normalized);
  }

  // Normalise un code saisi : majuscules, espaces supprimés, tirets conservés.
  function normalizeRecoveryCode(code) {
    if (!code || typeof code !== "string") return "";
    return code.trim().toUpperCase().replace(/\s/g, "");
  }

  // Chiffre un mot de passe avec SHA-256. Le mot de passe n'est jamais stocké en clair.
  // Le préfixe "formula-arpege-2024:" évite les collisions avec des hashs génériques.
  async function hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode("formula-arpege-2024:" + password);
    var hashBuffer = await crypto.subtle.digest("SHA-256", data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  global.FormulaAuthHelpers = {
    RECOVERY_CODE_CHARS,
    RECOVERY_CODE_SEGMENT_LENGTH,
    RECOVERY_CODE_SEGMENTS,
    generateRecoveryCode,
    isValidRecoveryCodeFormat,
    normalizeRecoveryCode,
    hashPassword,
  };
})(typeof window !== "undefined" ? window : global);
