import type { Character, EntityId } from '../model/types.js';
import type { Effect, EventCtx, RolePicker, SelectCtx } from '../events/types.js';
import { clamp } from '../util/math.js';

/**
 * Les entreprises (doc 16 §2).
 *
 * Ce qui manque le plus à un jeu de vie année par année, ce n'est pas le nombre
 * d'actions : c'est la **continuité**. Apprendre à lire n'est pas un bouton,
 * c'est trois ans. Courtiser quelqu'un n'est pas un jet de dés, c'est une
 * histoire qui avance ou qui s'enlise. Préparer une vengeance non plus.
 *
 * Une entreprise mange du temps chaque année, produit un récit à chaque
 * versement, peut caler, peut mal tourner — et finit par payer.
 */

export interface Pursuit {
  id: number;
  defId: string;
  label: string;
  startedYear: number;
  /** Temps déjà versé. */
  invested: number;
  /** Temps qu'il faudra, tel qu'on l'estime aujourd'hui. */
  needed: number;
  /** La personne visée, quand l'entreprise en vise une. */
  targetId: EntityId | null;
  /** Années consécutives sans rien y mettre. Trop, et ça s'éteint. */
  idle: number;
  /** État narratif propre à l'entreprise. */
  flags: Record<string, number | string | boolean>;
}

/** Une entreprise qu'on laisse dormir trop longtemps meurt d'elle-même. */
export const ABANDON_APRES = 4;

/** Nombre d'entreprises qu'on peut mener de front. On n'est pas une armée. */
export const ENTREPRISES_MAX = 3;

export interface PursuitCtx extends EventCtx {
  readonly pursuit: Pursuit;
  /** Temps versé cette année. */
  readonly spent: number;
}

export interface PursuitBeat {
  text: string;
  effects?: Effect[];
  /** Modifie l'estimation restante : une découverte peut rallonger la route. */
  addNeeded?: number;
}

export interface PursuitDef {
  id: string;
  label: string;
  kind: 'savoir' | 'metier' | 'coeur' | 'pouvoir' | 'ombre' | 'oeuvre';
  /** Ce que ça coûtera, avant que la vie s'en mêle. */
  cost: number;
  minAge?: number;
  maxAge?: number;
  requires?: (c: SelectCtx) => boolean;
  /** Qui elle vise. Absent = elle ne vise personne. */
  role?: RolePicker;
  /** Ce qu'on se dit en s'y mettant. */
  intro: (c: PursuitCtx) => string;
  /** Une année de travail. C'est là que vit le récit. */
  beat: (c: PursuitCtx) => PursuitBeat;
  /** Ce qui peut mal tourner, par année de travail. */
  hazard?: { chance: (c: PursuitCtx) => number; beat: (c: PursuitCtx) => PursuitBeat };
  /** Ce qu'on en retire, à la fin. */
  done: (c: PursuitCtx) => { text: string; effects: Effect[] };
  /** Ce qu'on perd en l'abandonnant. Rien, le plus souvent, sauf le temps. */
  quit?: (c: PursuitCtx) => { text: string; effects?: Effect[] };
  /** Ce que le monde en dit, si quelqu'un regarde. */
  tags?: string[];
}

/**
 * Ce qu'on estime devoir y mettre, une fois la vie prise en compte. Deux
 * personnes ne paient pas le même prix pour la même chose, et c'est le sujet.
 */
export function estimateCost(def: PursuitDef, c: Character): number {
  let facteur = 1;
  // L'intelligence abrège ce qui s'apprend, le charisme ce qui se négocie,
  // la volonté ce qui s'endure.
  switch (def.kind) {
    case 'savoir':
      facteur -= (c.stats.intelligence - 50) / 220;
      break;
    case 'coeur':
      facteur -= (c.stats.charisme - 50) / 200;
      break;
    case 'pouvoir':
      facteur -= (c.stats.charisme - 50) / 260 + c.hidden.influence / 400;
      break;
    case 'ombre':
      facteur -= (c.stats.agilite - 50) / 240 + c.hidden.corruption / 500;
      break;
    case 'oeuvre':
      facteur -= (c.stats.volonte - 50) / 220;
      break;
    case 'metier':
      facteur -= (c.stats.intelligence - 50) / 300 + (c.stats.force - 50) / 400;
      break;
  }
  return Math.max(2, Math.round(def.cost * clamp(facteur, 0.55, 1.6)));
}

export function progressOf(p: Pursuit): number {
  return clamp(p.invested / Math.max(1, p.needed), 0, 1);
}

/** Une phrase pour dire où l'on en est, sans jamais montrer un pourcentage brut. */
export function describeProgress(p: Pursuit): string {
  const r = progressOf(p);
  if (p.idle >= 2) return 'vous n\'y avez pas touché depuis longtemps';
  if (r >= 0.98) return 'c\'est fait';
  if (r >= 0.75) return 'vous y êtes presque';
  if (r >= 0.45) return 'ça prend forme';
  if (r >= 0.2) return 'vous commencez à voir comment faire';
  return 'vous en êtes aux premiers pas';
}

export function newPursuit(
  id: number,
  def: PursuitDef,
  subject: Character,
  targetId: EntityId | null,
  year: number,
): Pursuit {
  return {
    id,
    defId: def.id,
    label: def.label,
    startedYear: year,
    invested: 0,
    needed: estimateCost(def, subject),
    targetId,
    idle: 0,
    flags: {},
  };
}
