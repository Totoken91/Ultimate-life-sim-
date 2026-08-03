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

/**
 * Accorde une étiquette de relation au sexe de la personne qu'elle désigne.
 *
 * Le contenu écrit ses étiquettes au masculin par défaut — c'est la forme la
 * plus courte à lire et à écrire — et marque les accords variables d'un `{e}`.
 * Le joueur lisait « Ysera Draum · celui qui m'a appris à lire » : une
 * étiquette est censée dire *qui est cette personne*, elle ne peut pas se
 * tromper sur elle.
 */
export function agreeLabel(label: string, sex: 'm' | 'f'): string {
  if (sex !== 'f') return label.replace(/\{e\}/g, '');
  const table = FEMININ[label];
  if (table) return table;
  return label
    .replace(/\{e\}/g, 'e')
    .replace(/^celui\b/, 'celle')
    .replace(/^mon\b/, 'ma');
}

/**
 * Le français ne se dérive pas mécaniquement (« le maître » → « la maîtresse »,
 * « le desservant » → « la desservante », « le complice » → « la complice »).
 * Une table courte est plus honnête qu'une règle qui se trompe.
 */
const FEMININ: Record<string, string> = {
  'le vieux': 'la vieille',
  'l\'inconnu': 'l\'inconnue',
  'le maître': 'la maîtresse',
  'mon maître': 'ma maîtresse',
  'le desservant': 'la desservante',
  'le lettré': 'la lettrée',
  'le rival': 'la rivale',
  'le notable': 'la notable',
  'le complice': 'la complice',
  'le créancier': 'la créancière',
  'le lésé': 'la lésée',
  'le chef de bande': 'la cheffe de bande',
  'mon chef': 'ma cheffe',
  'le petit chef': 'la petite cheffe',
  'le gamin du quartier': 'la gamine du quartier',
  'le gamin des questions': 'la gamine des questions',
  'le gamin qui pose des questions': 'la gamine qui pose des questions',
  'le débiteur en fuite': 'la débitrice en fuite',
  'mon seigneur': 'ma dame',
  'mon homme': 'ma femme',
  'mon apprenti': 'mon apprentie',
  'mon élève': 'mon élève',
  'mon enfant': 'mon enfant',
  'mon propre sang': 'mon propre sang',
  'juré': 'jurée',
  'époux': 'épouse',
  'aîné': 'aînée',
  'cadet': 'cadette',
  'jumeau': 'jumelle',
  'frère': 'sœur',
  'fils': 'fille',
  'père': 'mère',
  'oncle': 'tante',
  'cousin': 'cousine',
  'voisin': 'voisine',
  'ami d\'enfance': 'amie d\'enfance',
  'le protégé': 'la protégée',
  'aimé': 'aimée',
  'voleur': 'voleuse',
  compagnon: 'compagne',
  'compagnon de fuite': 'compagne de fuite',
  complice: 'complice',
  connaissance: 'connaissance',
  créancier: 'créancière',
};
