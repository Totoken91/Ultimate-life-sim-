import type { Character, Relation } from '../model/types.js';
import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { ageOf, classRank } from '../model/character.js';
import { clamp } from '../util/math.js';
import { UPKEEP } from '../systems/economy.js';

/**
 * Les pulsions (doc 13 §1).
 *
 * Un PNJ n'a pas de plan : il a des manques. Dix nombres entre 0 et 1 disent
 * ce qui lui manque le plus cette année, et c'est tout ce qui pilote sa
 * conduite. La différence entre deux vies n'est pas dans le code, elle est
 * dans le classement de ces dix nombres.
 */
export type DriveId =
  | 'survie'
  | 'securite'
  | 'lien'
  | 'descendance'
  | 'statut'
  | 'richesse'
  | 'pouvoir'
  | 'vengeance'
  | 'savoir'
  | 'sens';

export const DRIVE_IDS: readonly DriveId[] = [
  'survie',
  'securite',
  'lien',
  'descendance',
  'statut',
  'richesse',
  'pouvoir',
  'vengeance',
  'savoir',
  'sens',
];

export const DRIVE_LABELS: Record<DriveId, string> = {
  survie: 'survivre',
  securite: 'être en sûreté',
  lien: 'ne pas être seul',
  descendance: 'faire souche',
  statut: 'compter aux yeux des autres',
  richesse: 'avoir de quoi',
  pouvoir: 'décider du sort des autres',
  vengeance: 'faire payer',
  savoir: 'comprendre',
  sens: 'laisser quelque chose',
};

export type Drives = Record<DriveId, number>;

/** Les gens que la situation met à portée de main. Résolus une fois par tour. */
export interface Cast {
  /** Celui qu'on hait le plus, s'il y a de la haine. */
  rival: Character | null;
  /** L'attache la plus forte hors du sang. */
  ami: Character | null;
  epoux: Character | null;
  /** Un enfant vivant, le plus âgé d'abord. */
  enfant: Character | null;
  parent: Character | null;
  /** Quelqu'un du lieu, connu ou non. */
  voisin: Character | null;
  /** Un célibataire du lieu, d'âge et de sexe compatibles. */
  pretendant: Character | null;
  /** Un jeune du lieu, à instruire ou à employer. */
  cadet: Character | null;
  /**
   * Quelqu'un du lieu qui a déjà des hommes à lui. Sans ce rôle, les serments
   * se dispersaient sur tout le village et personne n'atteignait jamais le
   * seuil qui fait naître une faction (doc 14 §1).
   */
  patron: Character | null;
}

export function emptyCast(): Cast {
  return {
    rival: null,
    ami: null,
    epoux: null,
    enfant: null,
    parent: null,
    voisin: null,
    pretendant: null,
    cadet: null,
    patron: null,
  };
}

/**
 * Tout ce qu'il faut savoir d'un personnage pour décider, calculé **une fois**.
 * Les actions ne refont jamais ces parcours : à six cents habitants, une seule
 * boucle de relations en trop coûte plus cher que tout le reste du système.
 */
export interface Situation {
  readonly self: Character;
  readonly world: World;
  readonly ruleset: Ruleset;
  readonly age: number;
  readonly cast: Cast;
  /** Le lien le plus haineux, au-delà du seuil de rancune. */
  readonly grudge: Relation | null;
  readonly allies: number;
  readonly enemies: number;
  /** Liens affectueux, tous types confondus. */
  readonly bonds: number;
  readonly kids: number;
  readonly upkeep: number;
  readonly danger: number;
}

/**
 * Seuil au-delà duquel on tient quelqu'un pour son ennemi. Descendu de -35 à
 * -30 après mesure : au-dessus, aucune rancune du monde n'atteignait jamais le
 * seuil, et toute la famille « faire payer » restait lettre morte.
 */
const RANCUNE = -30;

/** Résout `grudge`, `rival`, `ami`, et les comptes, en un seul parcours. */
export function readRelations(world: World, self: Character, cast: Cast): {
  grudge: Relation | null;
  allies: number;
  enemies: number;
  bonds: number;
} {
  let grudge: Relation | null = null;
  let bestFriend = -1;
  let allies = 0;
  let enemies = 0;
  let bonds = 0;

  // Parcours non trié : on départage nous-mêmes les ex æquo sur `to`, ce qui
  // rend le résultat indépendant de l'ordre d'insertion.
  world.relations.forEachFrom(self.id, (rel) => {
    const other = world.get(rel.to);
    if (!other || !other.alive) return;
    if (rel.affection >= 25) {
      allies += 1;
      bonds += 1;
    } else if (rel.affection <= -25) {
      enemies += 1;
    }
    if (
      rel.affection <= RANCUNE &&
      (!grudge || rel.affection < grudge.affection || (rel.affection === grudge.affection && rel.to < grudge.to))
    ) {
      grudge = rel;
      cast.rival = other;
    }
    if (
      rel.affection >= 20 &&
      rel.type !== 'sang' &&
      rel.type !== 'mariage' &&
      (rel.affection > bestFriend || (rel.affection === bestFriend && cast.ami && rel.to < cast.ami.id))
    ) {
      bestFriend = rel.affection;
      cast.ami = other;
    }
  });
  return { grudge, allies, enemies, bonds };
}

/**
 * Traduit un état en manques. Rien ici n'est aléatoire : deux personnages
 * identiques veulent la même chose. C'est le tirage de l'action qui varie.
 */
export function computeDrives(sit: Situation): Drives {
  const c = sit.self;
  const age = sit.age;
  const h = c.hidden;

  const gene = (v: number): number => v / 100;

  // Survie : la santé qui lâche, ou la bourse qui ne suit plus le train de vie.
  const corps = clamp((58 - c.health) / 58, 0, 1);
  const bourse = sit.upkeep > 0 ? clamp(1 - c.wealth / (sit.upkeep * 2), 0, 1) : 0;
  const survie = clamp(corps * 0.75 + bourse * 0.55, 0, 1);

  // Sûreté : des ennemis, un lieu dangereux, une rancune qui plane.
  const securite = clamp(
    sit.enemies * 0.16 + sit.danger / 220 + (sit.grudge ? 0.2 : 0) - gene(h.influence) * 0.2,
    0,
    1,
  );

  // Lien : la solitude est une pulsion, pas un décor.
  const solitude = clamp(0.5 - sit.bonds * 0.11, 0, 0.5);
  const celibat = !c.spouseId && age >= 17 && age <= 55 ? 0.34 : 0;
  const cafard = c.mood < 40 ? (40 - c.mood) / 160 : 0;
  const lien = clamp(solitude + celibat + cafard, 0, 1);

  // Descendance : bornée par la biologie, poussée par la maison.
  const fertile = c.sex === 'f' ? age >= 17 && age <= 44 : age >= 18 && age <= 62;
  const descendance = fertile
    ? clamp((c.spouseId ? 0.5 : 0.16) - sit.kids * 0.1 + (c.houseId ? 0.12 : 0), 0, 1)
    : 0;

  // Statut : l'ambition mesurée à la marche qu'il reste à monter.
  const marge = 1 - classRank(c.socialClass) / 6;
  const statut = age >= 14 ? clamp(gene(h.ambition) * (0.35 + marge * 0.6), 0, 1) : 0;

  // Richesse : l'ambition, la corruption, et le simple fait de manquer.
  const richesse = age >= 12
    ? clamp(gene(h.ambition) * 0.3 + gene(h.corruption) * 0.28 + bourse * 0.4, 0, 1)
    : 0;

  // Pouvoir : n'existe qu'après avoir de quoi manger.
  const pouvoir =
    age >= 20
      ? clamp((gene(h.ambition) * 0.62 + gene(h.influence) * 0.32) * (1 - survie * 0.6), 0, 1)
      : 0;

  // Vengeance : proportionnelle à la rancune, amplifiée par ce qui déraille.
  // Une haine fraîche doit pouvoir passer devant tout le reste — sinon les
  // conduites qui ne servent qu'elle (frapper, tuer) ne sortent jamais.
  const vengeance = sit.grudge
    ? clamp((-sit.grudge.affection / 100) * (0.85 + gene(h.folie) * 0.35 + gene(h.corruption) * 0.3), 0, 1)
    : 0;

  // Savoir : l'esprit qui cherche, tant que le ventre est plein. Mesuré à
  // l'écart au-dessus de la moyenne, et non à l'intelligence brute : à
  // `intelligence / 130`, apprendre était la première pulsion de tout le
  // monde, et le Rivage entier passait ses journées à étudier.
  const savoir = clamp(
    ((c.stats.intelligence - 46) / 110 + gene(h.potentiel) * 0.2) * (1 - survie * 0.7),
    0,
    1,
  );

  // Sens : la dernière rareté (doc 00 §1). Elle ne s'ouvre qu'avec l'âge,
  // ou avec une maison à qui l'on doit quelque chose.
  const vieillesse = age >= 45 ? clamp((age - 45) / 35, 0, 0.75) : 0;
  const sens = clamp(vieillesse + (c.houseId ? 0.15 : 0) + gene(h.destinee) * 0.2, 0, 1);

  const drives: Drives = {
    survie,
    securite,
    lien,
    descendance,
    statut,
    richesse,
    pouvoir,
    vengeance,
    savoir,
    sens,
  };

  // Le caractère penche la balance. Les biais vivent dans le contenu, pas ici :
  // le moteur ne connaît pas un seul identifiant de trait.
  for (const t of c.traits) {
    const bias = sit.ruleset.traits[t]?.drives;
    if (!bias) continue;
    for (const id of DRIVE_IDS) {
      const d = bias[id];
      if (d !== undefined) drives[id] = clamp(drives[id] + d, 0, 1);
    }
  }

  return drives;
}

/** Les `n` pulsions les plus fortes, au-dessus du seuil. Ordre déterministe. */
export function topDrives(drives: Drives, n: number, floor: number): DriveId[] {
  const ranked = DRIVE_IDS.filter((id) => drives[id] >= floor);
  ranked.sort((a, b) => drives[b] - drives[a] || (a < b ? -1 : 1));
  return ranked.slice(0, n);
}

/** Coût de la vie annuel — sert au calcul du manque. */
export function upkeepOf(c: Character, year: number): number {
  return Math.round(UPKEEP[c.socialClass] * (ageOf(c, year) < 16 ? 0.4 : 1));
}
