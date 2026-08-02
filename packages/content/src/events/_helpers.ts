import type {
  Character,
  Effect,
  EventCtx,
  EventDef,
  EventOption,
  Outcome,
  SelectCtx,
} from '@ed/engine';
import { hasTrait, shortName } from '@ed/engine';

/** Raccourcis d'écriture du contenu. Le contenu doit être agréable à écrire. */

export const n = (c: Character): string => shortName(c);

export const il = (c: Character): string => (c.sex === 'f' ? 'elle' : 'il');
export const lui = (c: Character): string => (c.sex === 'f' ? 'elle' : 'lui');
export const e = (c: Character): string => (c.sex === 'f' ? 'e' : '');

export function ev(def: EventDef): EventDef {
  return def;
}

export function opt(
  id: string,
  label: EventOption['label'],
  outcomes: Outcome[],
  extra: Omit<EventOption, 'id' | 'label' | 'outcomes'> = {},
): EventOption {
  return { id, label, outcomes, ...extra };
}

/** Issue unique : le choix mène toujours là. */
export function sure(text: (c: EventCtx) => string, effects: Effect[] | ((c: EventCtx) => Effect[])): Outcome[] {
  return [{ weight: 1, text, effects }];
}

export function out(
  weight: Outcome['weight'],
  text: (c: EventCtx) => string,
  effects: Effect[] | ((c: EventCtx) => Effect[]),
): Outcome {
  return { weight, text, effects };
}

/**
 * Test d'attribut : renvoie un poids d'issue.
 * `chance` monte avec l'attribut ; c'est ce qui rend les statistiques lisibles
 * sans jamais afficher de pourcentage au joueur (doc 05 §3).
 */
export function statTest(c: EventCtx, stat: Parameters<typeof statOf>[1], difficulty: number): number {
  return Math.max(0.05, statOf(c.subject, stat) / Math.max(1, difficulty));
}

function statOf(char: Character, stat: keyof Character['stats']): number {
  return char.stats[stat];
}

/** Poids qui monte avec un attribut. Sucre pour les issues pondérées. */
export const byStat =
  (stat: keyof Character['stats'], scale = 1) =>
  (c: EventCtx): number =>
    Math.max(0.05, (c.subject.stats[stat] / 50) * scale);

/** Poids qui monte quand l'attribut est *bas*. */
export const byLackOf =
  (stat: keyof Character['stats'], scale = 1) =>
  (c: EventCtx): number =>
    Math.max(0.05, ((100 - c.subject.stats[stat]) / 50) * scale);

export const trait = (c: SelectCtx | EventCtx, id: string): boolean => hasTrait(c.subject, id);

export const poor = (c: SelectCtx | EventCtx): boolean => c.subject.wealth < 200;
export const rich = (c: SelectCtx | EventCtx): boolean => c.subject.wealth > 8000;

export const inSettlement =
  (...ids: string[]) =>
  (c: SelectCtx): boolean =>
    ids.includes(c.subject.settlement);

export const classAtLeast =
  (rank: number) =>
  (c: SelectCtx): boolean => {
    const order = ['esclave', 'miserable', 'pauvre', 'commun', 'aise', 'noble', 'royal'];
    return order.indexOf(c.subject.socialClass) >= rank;
  };

/** Souvenir + chronique en un seul geste, pour les moments qui comptent. */
export function mark(
  text: string,
  salience: number,
  tags: string[],
  actors: string[] = [],
): Effect[] {
  return [{ k: 'memory', text, salience, tags, actors }];
}
