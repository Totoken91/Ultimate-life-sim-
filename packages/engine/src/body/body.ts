import { clamp } from '../util/math.js';

/**
 * Simulation du corps (doc 12).
 *
 * Le principe : `health` n'est plus une valeur qu'on modifie, c'est un
 * **résumé calculé** d'un corps qui a des organes, des constantes vitales et
 * des maladies en cours. On garde `health` parce que tout le jeu s'en sert —
 * mais elle devient une conséquence, plus une cause.
 */

export type OrganId =
  | 'coeur'
  | 'poumons'
  | 'foie'
  | 'reins'
  | 'cerveau'
  | 'digestif'
  | 'os'
  | 'muscles'
  | 'peau'
  | 'sang'
  | 'nerfs'
  | 'sens'
  | 'immunite'
  | 'endocrine'
  | 'fertilite';

export const ORGAN_IDS: readonly OrganId[] = [
  'coeur',
  'poumons',
  'foie',
  'reins',
  'cerveau',
  'digestif',
  'os',
  'muscles',
  'peau',
  'sang',
  'nerfs',
  'sens',
  'immunite',
  'endocrine',
  'fertilite',
];

export const ORGAN_LABELS: Record<OrganId, string> = {
  coeur: 'Cœur',
  poumons: 'Poumons',
  foie: 'Foie',
  reins: 'Reins',
  cerveau: 'Cerveau',
  digestif: 'Digestion',
  os: 'Os',
  muscles: 'Muscles',
  peau: 'Peau',
  sang: 'Sang',
  nerfs: 'Nerfs',
  sens: 'Sens',
  immunite: 'Défenses',
  endocrine: 'Humeurs du corps',
  fertilite: 'Fécondité',
};

/** Un organe dont la défaillance tue, et à quelle vitesse. */
export const VITAL_WEIGHT: Record<OrganId, number> = {
  coeur: 1,
  poumons: 1,
  cerveau: 1,
  foie: 0.75,
  reins: 0.75,
  sang: 0.7,
  digestif: 0.5,
  immunite: 0.45,
  endocrine: 0.35,
  nerfs: 0.3,
  muscles: 0.2,
  os: 0.2,
  peau: 0.15,
  sens: 0.1,
  fertilite: 0,
};

/**
 * Constantes vitales, normalisées : 50 = normal, 0 = effondré, 100 = emballé.
 * On ne montre jamais « 128/84 » au joueur, on montre « la tension est haute ».
 */
export type VitalId = 'tension' | 'pouls' | 'chaleur' | 'souffle' | 'sucre' | 'eau';

export const VITAL_IDS: readonly VitalId[] = ['tension', 'pouls', 'chaleur', 'souffle', 'sucre', 'eau'];

export const VITAL_LABELS: Record<VitalId, string> = {
  tension: 'Tension',
  pouls: 'Pouls',
  chaleur: 'Chaleur',
  souffle: 'Souffle',
  sucre: 'Sucre du sang',
  eau: 'Hydratation',
};

export interface ActiveCondition {
  defId: string;
  since: number;
  /** 0-100. Beaucoup de maux s'aggravent tout seuls. */
  severity: number;
  /** Le personnage — et le monde — ne savent pas encore que c'est là. */
  hidden: boolean;
  /** Un traitement est en cours cette année. */
  treated: boolean;
}

export interface Body {
  organs: Record<OrganId, number>;
  vitals: Record<VitalId, number>;
  /** Charge infectieuse en cours. */
  infection: number;
  inflammation: number;
  douleur: number;
  conditions: ActiveCondition[];
}

export function newBody(genetics = 50): Body {
  const organs = {} as Record<OrganId, number>;
  for (const id of ORGAN_IDS) organs[id] = clamp(88 + (genetics - 50) * 0.2, 40, 100);
  const vitals = {} as Record<VitalId, number>;
  for (const id of VITAL_IDS) vitals[id] = 50;
  return { organs, vitals, infection: 0, inflammation: 0, douleur: 0, conditions: [] };
}

/**
 * Santé résumée. Un organe vital effondré compte bien plus qu'une moyenne :
 * on ne meurt pas « en moyenne », on meurt du maillon le plus faible.
 */
export function summarizeHealth(body: Body): number {
  let weighted = 0;
  let total = 0;
  let worstVital = 100;

  for (const id of ORGAN_IDS) {
    const w = VITAL_WEIGHT[id];
    if (w <= 0) continue;
    weighted += body.organs[id] * w;
    total += w;
    if (w >= 0.7) worstVital = Math.min(worstVital, body.organs[id]);
  }

  const average = total > 0 ? weighted / total : 100;
  // le maillon faible pèse la moitié
  let health = average * 0.5 + worstVital * 0.5;

  health -= body.infection * 0.35;
  health -= body.inflammation * 0.12;
  health -= body.douleur * 0.1;

  // les constantes qui s'écartent trop de la normale coûtent
  for (const id of VITAL_IDS) {
    health -= Math.max(0, Math.abs(body.vitals[id] - 50) - 12) * 0.22;
  }

  return clamp(Math.round(health), 0, 100);
}

/** Ce que le personnage *ressent*, sans vocabulaire médical. */
export function describeVital(id: VitalId, value: number): string | null {
  const d = value - 50;
  if (Math.abs(d) < 14) return null;
  const strong = Math.abs(d) > 28;
  switch (id) {
    case 'tension':
      return d > 0
        ? strong
          ? 'le sang bat aux tempes en permanence'
          : 'des bourdonnements d\'oreille'
        : strong
          ? 'la vue se brouille quand vous vous levez'
          : 'des vertiges en vous levant';
    case 'pouls':
      return d > 0 ? 'le cœur s\'emballe sans raison' : 'le cœur bat trop lentement';
    case 'chaleur':
      return d > 0 ? (strong ? 'la fièvre ne tombe plus' : 'une fièvre légère') : 'vous avez froid tout le temps';
    case 'souffle':
      return d > 0 ? 'vous respirez trop vite' : strong ? 'le souffle manque au moindre effort' : 'vous êtes vite essoufflé';
    case 'sucre':
      return d > 0 ? 'une soif que rien ne calme' : 'des faiblesses brutales, sueurs froides';
    case 'eau':
      return d > 0 ? 'les jambes enflent' : 'la bouche sèche, les urines rares';
  }
}

export function organState(value: number): string {
  if (value >= 88) return 'intact';
  if (value >= 72) return 'bon';
  if (value >= 55) return 'usé';
  if (value >= 38) return 'atteint';
  if (value >= 20) return 'très atteint';
  if (value > 0) return 'ruiné';
  return 'perdu';
}

export function painState(value: number): string | null {
  if (value < 12) return null;
  if (value < 30) return 'une douleur de fond';
  if (value < 55) return 'une douleur qui gêne les gestes';
  if (value < 78) return 'une douleur qui occupe la journée';
  return 'une douleur qui empêche de penser';
}
