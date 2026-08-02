/** Types de données du monde. Aucune logique ici — que des formes. */

export type EntityId = number & { readonly __brand: 'EntityId' };
export const asEntityId = (n: number): EntityId => n as EntityId;

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

export interface House {
  id: string;
  name: string;
  foundedYear: number;
  founderId: EntityId;
  headId: EntityId;
  prestige: number;
  memberIds: EntityId[];
  traditions: string[];
  /** Rang dynastique — doc 03 §5. */
  rank: 'maison' | 'notable' | 'noble' | 'grande maison' | 'royale';
  motto: string;
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
