/**
 * Normalize an email so visually-identical variants collide on the BE unique
 * constraint. Without this, a user could register `User@Test.com` after
 * `user@test.com` already exists, or use full-width Unicode (`ｕｓｅｒ＠ｔｅｓｔ.ｃｏｍ`)
 * to bypass dupe-detection.
 *
 * Steps:
 *  1. `normalize('NFKC')` — folds visually-identical Unicode into canonical form
 *      (e.g., full-width ASCII → half-width, ligatures `fi` → `fi`).
 *  2. `trim()` — drops any leading/trailing whitespace pasted in.
 *  3. `toLowerCase()` — case-fold (email local-parts are technically case-sensitive
 *      per RFC 5321 but no real-world provider treats them that way).
 *
 * Intentionally NOT done:
 *  - Stripping dots in the local part (Gmail-style) — too aggressive; would break
 *    valid distinct addresses on other providers.
 *  - Removing `+tag` parts — same reason.
 *  - Heuristic similarity matching — only the BE unique constraint is the source of truth.
 *
 * NOTE: This must be paired with BE-side normalization (or at least case-folded
 * unique index) for the dupe guarantee to hold against direct API calls.
 */
export function normalizeEmail(email: string): string {
  return email.normalize('NFKC').trim().toLowerCase();
}
