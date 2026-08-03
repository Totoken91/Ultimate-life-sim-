import type { Character, EntityId } from '../model/types.js';
import type { SelectCtx } from '../events/types.js';
import type { World } from '../world/world.js';
import { clamp } from '../util/math.js';

/**
 * Le patrimoine (doc 09 §4).
 *
 * Même schéma pour tout ce qu'on possède, de la paillasse au vaisseau de la
 * taille d'une planète. **L'entretien est la mécanique centrale, pas la
 * décoration** : le jour où vos revenus passent sous l'entretien, rien ne
 * disparaît d'un coup — ça s'éteint par étages, et les gens partent les
 * premiers.
 *
 * Et c'est ici que l'argent achète enfin la seule chose qui manque vraiment
 * dans une vie : du **temps** (doc 16 §1).
 */

export type HoldingKind =
  | 'logis'
  | 'atelier'
  | 'domaine'
  | 'navire'
  | 'forteresse'
  | 'orbitale'
  | 'astronef';

export const HOLDING_KIND_LABELS: Record<HoldingKind, string> = {
  logis: 'logis',
  atelier: 'atelier',
  domaine: 'domaine',
  navire: 'navire',
  forteresse: 'forteresse',
  orbitale: 'orbitale',
  astronef: 'astronef',
};

export interface HoldingDef {
  id: string;
  label: string;
  kind: HoldingKind;
  /** 0 = paillasse, 20 = astronef-planète. L'échelle est déjà là. */
  tier: number;
  /** Prix d'acquisition. */
  price: number;
  /** Par an, pour toujours. C'est ici que se joue tout l'équilibre. */
  upkeep: number;
  /** Ce qu'on y gagne à vivre : santé et humeur. */
  comfort: number;
  prestige: number;
  /** Places pour des gens à demeure. */
  staffSlots: number;
  desc: string;
  requires?: (c: SelectCtx) => boolean;
}

export interface Holding {
  id: number;
  defId: string;
  label: string;
  ownerId: EntityId;
  settlement: string;
  acquiredYear: number;
  /** 0 à 100. Sans entretien, ça se dégrade et le confort suit. */
  condition: number;
  staffIds: EntityId[];
}

/** Ce qu'un domestique rend, et ce qu'il coûte. */
export interface RetainerDef {
  id: string;
  label: string;
  /** Ce qu'il vous rend. Le temps est le seul vrai luxe. */
  gives: {
    temps?: number;
    comfort?: number;
    /** Protège d'une part des mauvais coups. */
    guard?: number;
    /** Entretient le patrimoine. */
    upkeep?: number;
    skill?: { id: string; d: number };
  };
  /** Gages annuels. */
  wage: number;
  /** Palier de patrimoine minimal pour l'entretenir. */
  minTier: number;
  desc: string;
}

/** Un domestique attaché à quelqu'un, avec son rôle et ses gages. */
export interface Retainer {
  personId: EntityId;
  defId: string;
  label: string;
  since: number;
  /** Années de gages impayés. Deux, et on s'en va. */
  unpaid: number;
}

/** Au-delà, on ne connaît plus les gens qui vous servent. */
export const ANNEES_IMPAYEES = 2;

export function comfortOf(
  world: World,
  owner: Character,
  defs: readonly HoldingDef[],
): number {
  let total = 0;
  for (const h of world.holdingsOf(owner.id)) {
    const def = defs.find((d) => d.id === h.defId);
    if (!def) continue;
    total += def.comfort * (0.4 + (h.condition / 100) * 0.6);
  }
  return Math.round(total);
}

export function prestigeOf(
  world: World,
  owner: Character,
  defs: readonly HoldingDef[],
): number {
  let total = 0;
  for (const h of world.holdingsOf(owner.id)) {
    const def = defs.find((d) => d.id === h.defId);
    if (def) total += def.prestige;
  }
  return Math.round(total);
}

/** Ce que tout ça coûte par an, entretien et gages compris. */
export function annualCost(
  world: World,
  owner: Character,
  holdings: readonly HoldingDef[],
  retainers: readonly RetainerDef[],
): number {
  let total = 0;
  for (const h of world.holdingsOf(owner.id)) {
    const def = holdings.find((d) => d.id === h.defId);
    if (def) total += def.upkeep;
  }
  for (const r of world.retainersOf(owner.id)) {
    const def = retainers.find((d) => d.id === r.defId);
    if (def) total += def.wage;
  }
  return Math.round(total);
}

/** Le palier le plus haut qu'on possède — ce qui ouvre les domestiques. */
export function topTier(
  world: World,
  owner: Character,
  defs: readonly HoldingDef[],
): number {
  let best = 0;
  for (const h of world.holdingsOf(owner.id)) {
    const def = defs.find((d) => d.id === h.defId);
    if (def && def.tier > best) best = def.tier;
  }
  return best;
}

/** Places libres pour du monde à demeure. */
export function freeSlots(
  world: World,
  owner: Character,
  defs: readonly HoldingDef[],
): number {
  let slots = 0;
  for (const h of world.holdingsOf(owner.id)) {
    const def = defs.find((d) => d.id === h.defId);
    if (def) slots += def.staffSlots;
  }
  return Math.max(0, slots - world.retainersOf(owner.id).length);
}

/**
 * Ce que la domesticité rend en temps. C'est la promesse du doc 16 §7 : le
 * vrai luxe n'est pas la villa, c'est de ne plus avoir à tout faire soi-même.
 */
export function timeFromStaff(
  world: World,
  owner: Character,
  defs: readonly RetainerDef[],
): { total: number; lines: { label: string; gain: number }[] } {
  const lines: { label: string; gain: number }[] = [];
  let total = 0;
  for (const r of world.retainersOf(owner.id)) {
    const def = defs.find((d) => d.id === r.defId);
    const gain = def?.gives.temps ?? 0;
    if (gain <= 0) continue;
    // Un domestique qu'on ne paie plus ne rend plus grand-chose.
    const effectif = r.unpaid > 0 ? 0 : gain;
    if (effectif > 0) {
      lines.push({ label: r.label, gain: effectif });
      total += effectif;
    }
  }
  // On ne délègue pas sa vie entière : deux temps rendus au maximum.
  return { total: clamp(total, 0, 2), lines };
}

export function describeCondition(condition: number): string {
  if (condition >= 90) return 'en parfait état';
  if (condition >= 70) return 'bien tenu';
  if (condition >= 45) return 'un peu fatigué';
  if (condition >= 20) return 'ça se dégrade';
  return 'ça tombe en ruine';
}
