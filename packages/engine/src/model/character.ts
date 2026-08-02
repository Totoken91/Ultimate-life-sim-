import type {
  Character,
  EntityId,
  FlagValue,
  HiddenId,
  Injury,
  LifeStage,
  SocialClass,
  StatId,
} from './types.js';
import { CLASS_ORDER, STAT_IDS } from './types.js';
import { clamp } from '../util/math.js';

export function ageOf(c: Character, year: number): number {
  return (c.alive ? year : (c.deathYear ?? year)) - c.birthYear;
}

export function lifeStage(age: number): LifeStage {
  if (age <= 5) return 'nourrisson';
  if (age <= 12) return 'enfant';
  if (age <= 17) return 'adolescent';
  if (age <= 29) return 'jeune adulte';
  if (age <= 49) return 'adulte';
  if (age <= 64) return 'âge mûr';
  return 'vieillard';
}

export function fullName(c: Character): string {
  const parts = [c.given];
  if (c.family) parts.push(c.family);
  const base = parts.join(' ');
  return c.epithet ? `${base} « ${c.epithet} »` : base;
}

export function shortName(c: Character): string {
  return c.family ? `${c.given} ${c.family}` : c.given;
}

/** Modificateur net des blessures permanentes sur un attribut. */
export function injuryPenalty(c: Character, stat: StatId): number {
  let total = 0;
  for (const inj of c.injuries) {
    if (inj.stat === stat) total += inj.penalty ?? 0;
  }
  return total;
}

/** Valeur effective d'un attribut, blessures comprises. C'est celle qu'on teste. */
export function effectiveStat(c: Character, stat: StatId): number {
  return clamp(c.stats[stat] - injuryPenalty(c, stat), 1, 120);
}

export function statTotal(c: Character): number {
  let sum = 0;
  for (const s of STAT_IDS) sum += effectiveStat(c, s);
  return sum;
}

export function hasTrait(c: Character, trait: string): boolean {
  return c.traits.includes(trait);
}

export function skill(c: Character, id: string): number {
  return c.skills[id] ?? 0;
}

export function flag(c: Character, name: string): FlagValue {
  return c.flags[name] ?? false;
}

export function hasFlag(c: Character, name: string): boolean {
  const v = c.flags[name];
  return v !== undefined && v !== false && v !== 0 && v !== '';
}

export function classRank(cls: SocialClass): number {
  return CLASS_ORDER.indexOf(cls);
}

export function isAdult(c: Character, year: number): boolean {
  return ageOf(c, year) >= 18;
}

/**
 * Plafond de croissance d'un attribut. Le potentiel caché est le vrai
 * plafond : deux personnages avec les mêmes stats n'ont pas le même avenir.
 */
export function statCeiling(c: Character): number {
  return clamp(55 + c.hidden.potentiel * 0.45, 55, 100);
}

export function addInjury(c: Character, injury: Injury): void {
  c.injuries.push(injury);
}

export function modHidden(c: Character, id: HiddenId, delta: number): void {
  c.hidden[id] = clamp(c.hidden[id] + delta, 0, 100);
}

export function livingChildren(
  c: Character,
  lookup: (id: EntityId) => Character | undefined,
): Character[] {
  const out: Character[] = [];
  for (const id of c.childrenIds) {
    const child = lookup(id);
    if (child && child.alive) out.push(child);
  }
  return out;
}
