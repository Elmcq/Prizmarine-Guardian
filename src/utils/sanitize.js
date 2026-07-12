/**
 * @file Text-sanitisation helpers used by the toxicity matcher.
 * Goal: reduce a message to a canonical form so that simple word lists
 * catch common obfuscations (uppercase, accents, leetspeak, punctuation).
 */

/** Matches Unicode combining diacritical marks (U+0300–U+036F). */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Escape characters that have special meaning inside a RegExp.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalise text for matching.
 *  - NFD normalisation + diacritic stripping ("béci" -> "beci")
 *  - lowercasing
 *  - light leetspeak substitution (0->o, 1->i, 3->e, 4->a, 5->s, 7->t, $->s, @->a, !->i)
 *  - collapsing everything except [a-z0-9 ] to spaces
 *  - collapsing repeated whitespace
 * @param {string} text
 * @returns {string}
 */
export function sanitize(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classic Levenshtein edit distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  a = String(a);
  b = String(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Similarity ratio in [0, 1] between two strings (1 = identical).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function textSimilarity(a, b) {
  a = String(a);
  b = String(b);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}
