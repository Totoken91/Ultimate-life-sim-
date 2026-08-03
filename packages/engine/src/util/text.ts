/**
 * Accords et petites règles de français. Rien de simulé ici — mais un jeu qui
 * écrit « 1 ans » ou « 1 morts » se lit comme un brouillon, et le joueur cesse
 * de croire au reste (doc 18 §1).
 */

/** `1 an`, `0 an`, `7 ans`. */
export function ans(n: number): string {
  return `${n} ${Math.abs(n) < 2 ? 'an' : 'ans'}`;
}

/** Accorde un mot au pluriel derrière un nombre : `plural(1, 'mort')` → `1 mort`. */
export function plural(n: number, singulier: string, pluriel?: string): string {
  return `${n} ${Math.abs(n) < 2 ? singulier : (pluriel ?? `${singulier}s`)}`;
}

/** `de` + élision : `de Toven`, `d'Erisgar`. Le nom garde sa majuscule. */
export function de(nom: string): string {
  return /^[aeiouyàâéèêëîïôöûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
}
