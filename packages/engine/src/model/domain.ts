/**
 * Le domaine (doc 11 §1).
 *
 * L'erreur serait d'écrire une économie de village, puis une économie de
 * royaume, puis une économie stellaire. **Une seule entité.** Un foyer est un
 * domaine, un village est un domaine, un empire galactique est un domaine. Ils
 * diffèrent par leur échelle et leur contenu, jamais par leur nature.
 */

import type { EntityId } from './types.js';

/**
 * Un bien n'est pas un objet, c'est une **catégorie de besoin**. Douze
 * suffisent du néolithique au post-matière. Règle : on n'ajoute un bien que si
 * son absence change une décision.
 */
export type GoodId =
  | 'vivres'
  | 'eau'
  | 'materiaux'
  | 'energie'
  | 'outils'
  | 'armes'
  | 'luxe'
  | 'soins'
  | 'savoir'
  | 'information'
  | 'exotique';

export const GOOD_IDS: readonly GoodId[] = [
  'vivres',
  'eau',
  'materiaux',
  'energie',
  'outils',
  'armes',
  'luxe',
  'soins',
  'savoir',
  'information',
  'exotique',
];

export const GOOD_LABELS: Record<GoodId, string> = {
  vivres: 'vivres',
  eau: 'eau',
  materiaux: 'matériaux',
  energie: 'énergie',
  outils: 'outils',
  armes: 'armes',
  luxe: 'luxe',
  soins: 'soins',
  savoir: 'savoir',
  information: 'nouvelles',
  exotique: 'l\'étrange',
};

/** Prix de référence en sous, à offre et demande équilibrées. */
export const GOOD_BASE_PRICE: Record<GoodId, number> = {
  vivres: 12,
  eau: 3,
  materiaux: 20,
  energie: 8,
  outils: 45,
  armes: 90,
  luxe: 400,
  soins: 60,
  savoir: 120,
  information: 25,
  exotique: 900,
};

/**
 * Élasticité : de combien le prix réagit à la rareté. Ce qu'on ne peut pas
 * remplacer flambe (les vivres), ce qu'on peut différer bouge peu (le luxe).
 */
export const GOOD_ELASTICITY: Record<GoodId, number> = {
  vivres: 1.35,
  eau: 1.5,
  materiaux: 0.9,
  energie: 1.1,
  outils: 0.8,
  armes: 0.95,
  luxe: 0.55,
  soins: 1.2,
  savoir: 0.7,
  information: 0.6,
  exotique: 0.5,
};

/** Les biens sans lesquels on ne passe pas l'hiver. */
export const VITAL_GOODS: readonly GoodId[] = ['vivres', 'eau'];

/** Échelle d'un domaine. La même structure les porte toutes (doc 11 §1). */
export type Scale =
  | 'foyer'
  | 'implantation'
  | 'region'
  | 'royaume'
  | 'monde'
  | 'systeme'
  | 'secteur'
  | 'galaxie';

export const SCALE_ORDER: readonly Scale[] = [
  'foyer',
  'implantation',
  'region',
  'royaume',
  'monde',
  'systeme',
  'secteur',
  'galaxie',
];

export const SCALE_LABELS: Record<Scale, string> = {
  foyer: 'foyer',
  implantation: 'implantation',
  region: 'région',
  royaume: 'royaume',
  monde: 'monde',
  systeme: 'système',
  secteur: 'secteur',
  galaxie: 'galaxie',
};

/**
 * Un gouvernement n'est pas un type énuméré : c'est un **jeu de règles** qu'on
 * modifie une par une, et dont les combinaisons produisent tous les régimes
 * (doc 11 §4). Chaque axe a un coût payé par quelqu'un de nommé.
 */
export interface Government {
  /** Qui décide. */
  power: 'un' | 'quelques-uns' | 'beaucoup' | 'tous' | 'personne';
  /** Comment on y accède. */
  access:
    | 'sang'
    | 'election'
    | 'conquete'
    | 'fortune'
    | 'merite'
    | 'tirage'
    | 'foi'
    | 'anciennete'
    | 'designation';
  /** Combien de temps on garde. */
  tenure: 'a vie' | 'mandat' | 'revocable' | 'hereditaire';
  /** Ce que le pouvoir peut imposer sans consentement. 0 = coutume, 100 = total. */
  reach: number;
  /** Qui possède la terre et le capital. */
  property: 'privee' | 'commune' | 'seigneuriale' | 'd\'Etat' | 'corporative';
  /** Ce qui légitime. */
  mandate: 'tradition' | 'divin' | 'populaire' | 'force' | 'competence' | 'contrat';
  /** Qui paie quoi. */
  taxation: 'corvee' | 'dime' | 'cens' | 'proportionnelle' | 'progressive' | 'aucune';
}

export const POWER_LABELS: Record<Government['power'], string> = {
  un: 'un seul',
  'quelques-uns': 'quelques-uns',
  beaucoup: 'beaucoup',
  tous: 'tous',
  personne: 'personne',
};

export const ACCESS_LABELS: Record<Government['access'], string> = {
  sang: 'par le sang',
  election: 'par élection',
  conquete: 'par la force',
  fortune: 'par la fortune',
  merite: 'au mérite',
  tirage: 'au sort',
  foi: 'par la foi',
  anciennete: 'par l\'âge',
  designation: 'par désignation',
};

export const TENURE_LABELS: Record<Government['tenure'], string> = {
  'a vie': 'à vie',
  mandat: 'pour un temps',
  revocable: 'tant qu\'on le veut',
  hereditaire: 'et ses enfants après lui',
};

export const PROPERTY_LABELS: Record<Government['property'], string> = {
  privee: 'privée',
  commune: 'commune',
  seigneuriale: 'seigneuriale',
  'd\'Etat': 'du domaine',
  corporative: 'corporative',
};

export const MANDATE_LABELS: Record<Government['mandate'], string> = {
  tradition: 'la coutume',
  divin: 'le ciel',
  populaire: 'le peuple',
  force: 'la force',
  competence: 'la compétence',
  contrat: 'le contrat',
};

/** « au nom de le peuple » est une faute que le joueur voit tout de suite. */
const MANDATE_OF: Record<Government['mandate'], string> = {
  tradition: 'de la coutume',
  divin: 'du ciel',
  populaire: 'du peuple',
  force: 'de la force',
  competence: 'de la compétence',
  contrat: 'du contrat',
};

/** Le sujet est-il pluriel ? Le moteur ne peut pas le deviner, la table si. */
const POWER_PLURAL: Record<Government['power'], boolean> = {
  un: false,
  'quelques-uns': true,
  beaucoup: true,
  tous: true,
  personne: false,
};

export const TAXATION_LABELS: Record<Government['taxation'], string> = {
  corvee: 'la corvée',
  dime: 'la dîme',
  cens: 'le cens',
  proportionnelle: 'une part égale',
  progressive: 'plus aux riches',
  aucune: 'rien',
};

/** Les axes modifiables un par un, dans l'ordre où on les présente. */
export type GovAxis = keyof Government;

export const GOV_AXES: readonly GovAxis[] = [
  'power',
  'access',
  'tenure',
  'reach',
  'property',
  'mandate',
  'taxation',
];

export const AXIS_LABELS: Record<GovAxis, string> = {
  power: 'qui décide',
  access: 'comment on y accède',
  tenure: 'combien de temps',
  reach: 'ce qu\'on peut imposer',
  property: 'à qui est la terre',
  mandate: 'ce qui légitime',
  taxation: 'qui paie quoi',
};

/**
 * Une route relie deux domaines. La **latence est une mécanique** : commander
 * du grain à huit ans de distance change la nature du problème (doc 11 §2).
 */
export interface Route {
  id: string;
  from: string;
  to: string;
  /** Unités transportables par an. */
  capacity: number;
  /** Part de la valeur mangée par le trajet, 0..1. */
  cost: number;
  /** Chance annuelle qu'une cargaison se perde. */
  risk: number;
  /** Années de trajet. 0 = dans l'année. */
  latency: number;
  /** Route coupée par une guerre, un blocus, un effondrement. */
  severedUntil: number | null;
}

export interface Domain {
  id: string;
  name: string;
  scale: Scale;
  parent: string | null;
  children: string[];
  /** Implantation de rattachement, quand le domaine en couvre une. */
  settlement: string | null;

  population: number;
  stocks: Partial<Record<GoodId, number>>;
  production: Partial<Record<GoodId, number>>;
  consumption: Partial<Record<GoodId, number>>;
  prices: Partial<Record<GoodId, number>>;
  /** Manque constaté l'an dernier, par bien : 0 = comblé, 1 = rien du tout. */
  shortage: Partial<Record<GoodId, number>>;

  government: Government;
  /** Celui qui décide, quand quelqu'un décide. */
  rulerId: EntityId | null;
  /** Depuis quand il décide. */
  ruledSince: number;
  treasury: number;
  legitimacy: number;
  unrest: number;
  /** Année du dernier renversement — sert aux délais et à la Chronique. */
  lastUpheaval: number;
}

/**
 * Les régimes classiques ne sont que des points dans l'espace des sept axes.
 * Cette table ne sert **qu'à nommer** : elle ne contraint rien, et un
 * gouvernement qui n'y figure pas est parfaitement valide.
 */
const REGIMES: { name: string; match: Partial<Government> }[] = [
  { name: 'chefferie', match: { power: 'un', access: 'anciennete' } },
  { name: 'féodalité', match: { power: 'quelques-uns', access: 'sang', property: 'seigneuriale' } },
  { name: 'monarchie', match: { power: 'un', access: 'sang' } },
  { name: 'république', match: { power: 'beaucoup', access: 'election' } },
  { name: 'dictature', match: { power: 'un', access: 'conquete' } },
  { name: 'théocratie', match: { access: 'foi' } },
  { name: 'démocratie directe', match: { power: 'tous' } },
  { name: 'technocratie', match: { access: 'merite' } },
  { name: 'ploutocratie', match: { access: 'fortune' } },
  { name: 'oligarchie', match: { power: 'quelques-uns' } },
  { name: 'tyrannie', match: { power: 'un' } },
];

/** Le nom qu'on donnerait à ce gouvernement. Purement descriptif. */
export function regimeName(g: Government): string {
  if (g.power === 'personne') return 'personne ne commande';
  for (const r of REGIMES) {
    let ok = true;
    for (const [axis, value] of Object.entries(r.match)) {
      if (g[axis as GovAxis] !== value) {
        ok = false;
        break;
      }
    }
    if (ok) return r.name;
  }
  return 'un arrangement sans nom';
}

/** Une phrase que le joueur peut lire sans tableau. */
export function describeGovernment(g: Government): string {
  if (g.power === 'personne') return 'Personne ne commande ici. On s\'arrange.';
  const pluriel = POWER_PLURAL[g.power];
  const decide = pluriel ? 'décident' : 'décide';
  const impose =
    g.reach >= 75
      ? `et ${pluriel ? 'ils imposent' : 'il impose'} ce qu'${pluriel ? 'ils veulent' : 'il veut'}`
      : g.reach >= 40
        ? `et on ${pluriel ? 'leur' : 'lui'} obéit la plupart du temps`
        : `mais ${pluriel ? 'ils ne peuvent' : 'il ne peut'} guère qu'ordonner poliment`;
  return (
    `${POWER_LABELS[g.power]} ${decide}, ${ACCESS_LABELS[g.access]}, ` +
    `${TENURE_LABELS[g.tenure]} — au nom ${MANDATE_OF[g.mandate]}, ${impose}.`
  );
}
