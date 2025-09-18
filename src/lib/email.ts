/**
 * Reproduit la logique MySQL:
 * CONCAT_WS('@',
 *   SUBSTRING_INDEX(SUBSTRING_INDEX(usr_email,'@',1),'+',1),
 *   SUBSTRING_INDEX(usr_email,'@',-1)
 * )
 * - On enlève le suffixe "+..." dans la partie locale
 * - On NE supprime PAS les points
 * - Collation utf8mb4_unicode_ci => insensibilité à la casse côté DB
 */
export function normalizeEmail(email: string): string {
    const trimmed = email.trim();
    const at = trimmed.lastIndexOf("@");
    if (at === -1) return trimmed;
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    const localNoPlus = local.split("+", 1)[0];
    return `${localNoPlus}@${domain}`;
}
