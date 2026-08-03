/** Types de données du monde. Aucune logique ici — que des formes. */

export type EntityId = number & { readonly __brand: 'EntityId' };
export const asEntityId = (n: number): EntityId => n as EntityId;

import type { Body } from '../body/body.js';

export type Sex = 'm' | 'f';

/** Valeur d'un drapeau narratif. Les flags sont clairsemés et inventés par le contenu. */
export type FlagValue = number | boolean | string;

/** Les 6 attributs de la Phase 1. Les 5 autres arrivent en Phase 4 (doc 03 §1.1). */
export type StatId =
  | 'force'
  | 'intelligence'
  | 'charisme'
  | 'agilite'
  | 'endurance'
  | 'volonte';

export const STAT_IDS: readonly StatId[] = [
  'force',
  'intelligence',
  'charisme',
  'agilite',
  'endurance',
  'volonte',
];

export const STAT_LABELS: Record<StatId, string> = {
  force: 'Force',
  intelligence: 'Intelligence',
  charisme: 'Charisme',
  agilite: 'Agilité',
  endurance: 'Endurance',
  volonte: 'Volonté',
};

/**
 * Ce que chaque attribut *fait*. Sans cette table, le joueur lisait
 * « For 48 Int 32 Cha 6 » et n'avait aucun moyen de savoir ce que ça changeait
 * dans sa vie — ce qui est la définition de jouer dans le vide.
 */
export const STAT_DESC: Record<StatId, string> = {
  force: 'Frapper, porter, tenir. Décide des rixes et du travail dur.',
  intelligence: 'Comprendre vite. Apprendre coûte moins de temps, et les métiers de savoir s\'ouvrent.',
  charisme: 'Ce qu\'on vous accorde sans réfléchir. Courtiser, commander, convaincre.',
  agilite: 'Les mains et les pieds. Voler, esquiver, les métiers de précision.',
  endurance: 'Ce que le corps encaisse. Maladie, faim, coups, vieillesse.',
  volonte: 'Ne pas céder. Tenir une entreprise, résister à la peur et à soi-même.',
};

/**
 * Où l'on se situe. Un nombre nu ne dit rien ; « remarquable » se lit d'un
 * coup d'œil et se compare sans calcul.
 */
export function statBand(value: number): string {
  if (value >= 85) return 'exceptionnel';
  if (value >= 70) return 'remarquable';
  if (value >= 56) return 'au-dessus';
  if (value >= 42) return 'dans la moyenne';
  if (value >= 28) return 'faible';
  if (value >= 15) return 'très faible';
  return 'infirme';
}

export const STAT_SHORT: Record<StatId, string> = {
  force: 'For',
  intelligence: 'Int',
  charisme: 'Cha',
  agilite: 'Agi',
  endurance: 'End',
  volonte: 'Vol',
};

/** Jamais affichés en clair. Ils ouvrent et ferment des portes (doc 03 §1.2). */
export type HiddenId =
  | 'potentiel'
  | 'destinee'
  | 'genetique'
  | 'karma'
  | 'folie'
  | 'corruption'
  | 'ambition'
  | 'influence';

export const HIDDEN_IDS: readonly HiddenId[] = [
  'potentiel',
  'destinee',
  'genetique',
  'karma',
  'folie',
  'corruption',
  'ambition',
  'influence',
];

export type SocialClass =
  | 'esclave'
  | 'miserable'
  | 'pauvre'
  | 'commun'
  | 'aise'
  | 'noble'
  | 'royal';

export const CLASS_ORDER: readonly SocialClass[] = [
  'esclave',
  'miserable',
  'pauvre',
  'commun',
  'aise',
  'noble',
  'royal',
];

export const CLASS_LABELS: Record<SocialClass, string> = {
  esclave: 'esclave',
  miserable: 'misérable',
  pauvre: 'pauvre',
  commun: 'commun',
  aise: 'aisé',
  noble: 'noble',
  royal: 'royal',
};

export type LifeStage =
  | 'nourrisson'
  | 'enfant'
  | 'adolescent'
  | 'jeune adulte'
  | 'adulte'
  | 'âge mûr'
  | 'vieillard';

export interface Injury {
  id: string;
  label: string;
  year: number;
  permanent: boolean;
  stat?: StatId;
  penalty?: number;
}

export interface Character {
  id: EntityId;
  given: string;
  family: string | null;
  epithet: string | null;
  sex: Sex;

  birthYear: number;
  deathYear: number | null;
  causeOfDeath: string | null;
  alive: boolean;

  stats: Record<StatId, number>;
  hidden: Record<HiddenId, number>;
  traits: string[];
  skills: Record<string, number>;

  health: number;
  mood: number;
  wealth: number;

  jobId: string | null;
  jobYears: number;
  settlement: string;
  culture: string;
  houseId: string | null;
  socialClass: SocialClass;
  titles: string[];
  paths: string[];

  injuries: Injury[];
  flags: Record<string, FlagValue>;
  /** Le corps simulé (doc 12). `health` en est le résumé calculé. */
  body: Body;

  fatherId: EntityId | null;
  motherId: EntityId | null;
  spouseId: EntityId | null;
  childrenIds: EntityId[];

  isPlayer: boolean;
  /** Palier de simulation (doc 02 §1). En Phase 1 : 0 = focus, 1 = actif. */
  lod: 0 | 1;
  /** eventId -> année avant laquelle l'événement ne peut pas se redéclencher. */
  cooldowns: Record<string, number>;
  /** eventId vus une fois pour toutes dans cette vie. */
  seen: string[];
}

export type RelationType =
  | 'sang'
  | 'mariage'
  | 'amitie'
  | 'amour'
  | 'rivalite'
  | 'haine'
  | 'serment'
  | 'dette'
  | 'mentorat';

export const RELATION_LABELS: Record<RelationType, string> = {
  sang: 'lien du sang',
  mariage: 'mariage',
  amitie: 'amitié',
  amour: 'amour',
  rivalite: 'rivalité',
  haine: 'haine',
  serment: 'serment',
  dette: 'dette',
  mentorat: 'mentorat',
};

/**
 * Une relation est *dirigée* : A peut aimer B pendant que B méprise A.
 * Non négociable pour la qualité du drame (doc 03 §4.1).
 */
export interface Relation {
  from: EntityId;
  to: EntityId;
  type: RelationType;
  /** Étiquette de parenté ou de rôle, affichée telle quelle : « mère », « forgeron ». */
  label: string;
  affection: number; // -100..100
  trust: number; // -100..100
  respect: number; // -100..100
  fear: number; // 0..100
  since: number;
}

export interface Memory {
  id: number;
  year: number;
  text: string;
  /** Poids émotionnel initial. L'oubli fait décroître la pertinence. */
  salience: number;
  actors: EntityId[];
  tags: string[];
}

/**
 * Une conséquence différée (doc 04 §2). Sérialisable : elle ne référence que
 * des identifiants de contenu, jamais des fonctions.
 */
export interface Seed {
  id: number;
  eventId: string;
  plantedYear: number;
  dueYear: number;
  actors: EntityId[];
  /** La graine meurt si tous ses acteurs sont morts. */
  needsActorsAlive: boolean;
  note: string;
}

/**
 * Loi de succession (doc 03 §5). C'est une *loi modifiable* : la changer
 * provoque des crises, et c'est le but.
 */
export type SuccessionLaw =
  | 'primogeniture'
  | 'ultimogeniture'
  | 'merite'
  | 'designation'
  | 'combat';

export const SUCCESSION_LABELS: Record<SuccessionLaw, string> = {
  primogeniture: 'à l\'aîné',
  ultimogeniture: 'au dernier-né',
  merite: 'au plus capable',
  designation: 'à celui que le chef désigne',
  combat: 'à qui saura le prendre',
};

export type HouseRank = 'maison' | 'notable' | 'noble' | 'grande maison' | 'royale';

export const HOUSE_RANK_ORDER: readonly HouseRank[] = [
  'maison',
  'notable',
  'noble',
  'grande maison',
  'royale',
];

/** Seuils de prestige d'accès à chaque rang. */
export const HOUSE_RANK_THRESHOLDS: Record<HouseRank, number> = {
  maison: 0,
  notable: 60,
  noble: 180,
  'grande maison': 450,
  royale: 1100,
};

export interface House {
  id: string;
  name: string;
  foundedYear: number;
  founderId: EntityId;
  headId: EntityId;
  prestige: number;
  memberIds: EntityId[];
  traditions: string[];
  rank: HouseRank;
  motto: string;
  law: SuccessionLaw;
  /** Chefs successifs, du fondateur au chef actuel. */
  headHistory: EntityId[];
  /** Branches détachées : membres qui n'ont pas hérité et ont fait souche. */
  cadetIds: EntityId[];
}

/**
 * Une faction (doc 14). Elle naît d'un réseau de serments, pas d'une décision
 * du moteur : quelqu'un se fait assez d'hommes, et le monde lui donne un nom.
 */
export type FactionKind = 'bande' | 'compagnie' | 'guilde' | 'ordre' | 'clan';

export const FACTION_KIND_LABELS: Record<FactionKind, string> = {
  bande: 'bande',
  compagnie: 'compagnie',
  guilde: 'guilde',
  ordre: 'ordre',
  clan: 'clan',
};

/**
 * Ce qu'une faction cherche cette décennie. Une seule à la fois : une bande
 * qui veut tout à la fois ne veut rien, et le joueur ne peut pas la lire.
 */
export type FactionGoal =
  | 'croitre'
  | 'enrichir'
  | 'tenir'
  | 'dominer'
  | 'abattre'
  | 'venger';

export const GOAL_LABELS: Record<FactionGoal, string> = {
  croitre: 'grossir',
  enrichir: 'amasser',
  tenir: 'se maintenir',
  dominer: 'tenir la ville',
  abattre: 'en finir avec un rival',
  venger: 'laver un affront',
};

export interface Faction {
  id: string;
  name: string;
  kind: FactionKind;
  foundedYear: number;
  leaderId: EntityId;
  memberIds: EntityId[];
  /** Implantation où elle a son siège. */
  seat: string;
  /** Puissance recalculée chaque année : nombre, valeur et loyauté des membres. */
  power: number;
  treasury: number;
  goal: FactionGoal;
  /** Cible du but courant : id de faction, ou d'implantation pour `dominer`. */
  goalTarget: string | null;
  /** Sentiment envers les autres factions, -100..100. */
  standing: Record<string, number>;
  /** Emprise sur les implantations où elle pèse, 0..100. */
  grip: Record<string, number>;
  /** Combattants perdus depuis la fondation — c'est son histoire. */
  losses: number;
  dissolvedYear: number | null;
}

/**
 * Compteurs cumulés du monde. Le joueur aime les chiffres, et un monde qui
 * ne compte rien n'a pas d'Histoire (doc 10).
 */
export interface WorldTally {
  births: number;
  deaths: number;
  marriages: number;
  /** Morts causées par une décision d'un personnage, pas par le temps. */
  murders: number;
  deathsByCause: Record<string, number>;
  deathsByYear: Record<number, number>;
  birthsByYear: Record<number, number>;
  /** Combien de fois chaque conduite de PNJ a été jouée (doc 13 §6). */
  npcActions: Record<string, number>;
  /** Factions fondées, dissoutes, affrontements livrés (doc 14). */
  factionsFounded: number;
  factionsDissolved: number;
  clashes: number;
  /** Renversements, réformes et effondrements de gouvernements (doc 11 §4). */
  upheavals: number;
  /** Morts au combat, toutes échelles confondues. */
  fallen: number;
}

export function emptyTally(): WorldTally {
  return {
    births: 0,
    deaths: 0,
    marriages: 0,
    murders: 0,
    deathsByCause: {},
    deathsByYear: {},
    birthsByYear: {},
    npcActions: {},
    factionsFounded: 0,
    factionsDissolved: 0,
    clashes: 0,
    upheavals: 0,
    fallen: 0,
  };
}

export type ChronicleKind =
  | 'naissance'
  | 'mort'
  | 'mariage'
  | 'enfant'
  | 'metier'
  | 'ascension'
  | 'chute'
  | 'trahison'
  | 'crime'
  | 'violence'
  | 'fondation'
  | 'rencontre'
  | 'blessure'
  | 'fortune'
  | 'ruine'
  | 'revelation'
  | 'guerre'
  | 'note';

export interface ChronicleActor {
  id: EntityId;
  name: string;
}

/** Stockage structuré ; le rendu en prose est séparé (doc 04 §5). */
export interface ChronicleEntry {
  year: number;
  kind: ChronicleKind;
  importance: 1 | 2 | 3 | 4 | 5;
  actors: ChronicleActor[];
  data: Record<string, string | number | boolean>;
}

export interface Settlement {
  id: string;
  name: string;
  culture: string;
  size: 'hameau' | 'village' | 'bourg' | 'ville' | 'cité';
  wealth: number;
  danger: number;
  description: string;
}
