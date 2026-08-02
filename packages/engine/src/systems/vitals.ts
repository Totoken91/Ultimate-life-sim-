import type { System, TickContext } from './types.js';
import type { Character } from '../model/types.js';
import { ageOf } from '../model/character.js';
import { clamp, drift } from '../util/math.js';
import { applyHealthDelta } from './physiology.js';
import { fullName, shortName } from '../model/character.js';
import { makeEventCtx } from '../events/engine.js';
import { killCharacter } from '../events/effects.js';
import { causeOf } from '../body/conditions.js';

/** Modificateur de longévité apporté par les traits (défini par le contenu). */
function traitLongevity(ctx: TickContext, c: Character): number {
  let m = 1;
  for (const id of c.traits) {
    const def = ctx.ruleset.traits[id];
    if (def?.longevity) m *= 1 - def.longevity / 100;
  }
  return clamp(m, 0.35, 2.5);
}

function traitHealth(ctx: TickContext, c: Character): number {
  let d = 0;
  for (const id of c.traits) d += ctx.ruleset.traits[id]?.health ?? 0;
  return d;
}

/**
 * Risque annuel de mort. Plat pendant la jeunesse, puis exponentiel (Gompertz).
 * La mortalité infantile est réelle : c'est ce qui donne du poids à survivre.
 */
export function mortalityRisk(ctx: TickContext, c: Character): number {
  const age = ageOf(c, ctx.world.year);
  let base: number;
  if (age <= 0) base = 0.14;
  else if (age <= 4) base = 0.05;
  else if (age <= 12) base = 0.011;
  else if (age <= 39) base = 0.008;
  else base = 0.006 * Math.exp((age - 40) * 0.085);

  const healthFactor = clamp(2.3 - c.health / 52, 0.3, 5);
  const geneFactor = clamp(1.45 - c.hidden.genetique / 130, 0.6, 1.45);
  const classFactor =
    c.socialClass === 'esclave' || c.socialClass === 'miserable'
      ? 1.5
      : c.socialClass === 'pauvre'
        ? 1.2
        : c.socialClass === 'noble' || c.socialClass === 'royal'
          ? 0.82
          : 1;
  const injuryFactor = 1 + c.injuries.filter((i) => i.permanent).length * 0.06;

  let risk =
    base * healthFactor * geneFactor * classFactor * injuryFactor * traitLongevity(ctx, c);

  // Le joueur ne meurt pas d'un tirage avant d'avoir pu faire un seul choix.
  // Le risque devient une cicatrice, pas une fin (voir `Vitals`).
  if (c.isPlayer && age < 6) risk *= 0.15;

  return clamp(risk, 0, 0.97);
}

const CAUSES_YOUNG = [
  'emporté par la fièvre',
  'de faim',
  'd\'une plaie infectée',
  'noyé',
  'du flux de ventre',
];
const CAUSES_ADULT = [
  'de fièvre',
  'renversé par un attelage',
  'des suites d\'une rixe',
  'de la toux noire',
  'd\'un mal que nul ne sut nommer',
];
const CAUSES_OLD = [
  'de vieillesse',
  'd\'un souffle qui s\'arrêta dans son sommeil',
  'usé par les années',
  'le coeur rompu',
];

/** PRE — vieillissement, dérive de la santé, de l'humeur, des compétences. */
export const Aging: System = {
  id: 'vitals.aging',
  phase: 'PRE',
  priority: 10,
  run(ctx) {
    const { world } = ctx;
    for (const c of ctx.living) {
      const age = ageOf(c, world.year);
      const rng = ctx.rng.fork('vitals.aging', world.year, c.id);

      // La santé est calculée par la physiologie (doc 12) ; ici on ne fait
      // qu'appliquer ce que les traits apportent ou retirent au corps.
      const traitDelta = traitHealth(ctx, c);
      if (traitDelta !== 0 && c.body) {
        applyHealthDelta(c.body, traitDelta * 0.35, rng.fork('traits'));
      }

      // humeur : revient lentement vers un point d'équilibre personnel
      const moodTarget = clamp(
        48 + c.stats.volonte * 0.12 + (c.wealth > 0 ? 6 : -12) - c.hidden.folie * 0.15,
        5,
        92,
      );
      c.mood = clamp(drift(c.mood, moodTarget, 0.18) + rng.gaussian(0, 3), 0, 100);

      if (c.jobId) c.jobYears += 1;
    }
  },
};

/** POST — le tirage de mortalité. Toujours en fin de tick, après les événements. */
export const Mortality: System = {
  id: 'vitals.mortality',
  phase: 'POST',
  priority: 90,
  run(ctx) {
    const { world } = ctx;
    for (const c of ctx.living) {
      const age = ageOf(c, world.year);
      const rng = ctx.rng.fork('vitals.mortality', world.year, c.id);
      const risk = mortalityRisk(ctx, c);

      if (!rng.chance(risk)) continue;

      // Frôler la mort dans la petite enfance laisse une marque, pas une tombe.
      if (c.isPlayer && age < 6) {
        if (!c.traits.includes('survivant')) {
          c.traits.push('survivant');
          world.say('Vous auriez dû mourir cette année-là. Vous n\'êtes pas mort.');
          world.record({
            year: world.year,
            kind: 'revelation',
            importance: 3,
            actors: [{ id: c.id, name: fullName(c) }],
            data: { quoi: 'la mort passa et ne prit pas' },
          });
        }
        c.health = clamp(c.health - 15, 5, 100);
        continue;
      }

      // Si le corps porte un mal avancé, c'est lui qu'on nomme. Mourir « de
      // fièvre » quand on traîne la toux noire depuis quinze ans efface
      // justement l'histoire que la simulation vient d'écrire.
      // Seuls les maux qui peuvent tuer sont nommés : on ne meurt pas d'une
      // cataracte, même très avancée.
      const lethalDefs = new Map(
        (ctx.ruleset.conditions ?? []).filter((d) => d.lethal).map((d) => [d.id, d]),
      );
      const worst = (c.body?.conditions ?? [])
        .filter((cond) => !cond.hidden && cond.severity >= 40 && lethalDefs.has(cond.defId))
        .sort((a2, b2) => b2.severity - a2.severity)[0];
      const named = worst ? lethalDefs.get(worst.defId)?.label : undefined;

      const causes = age <= 12 ? CAUSES_YOUNG : age >= 60 ? CAUSES_OLD : CAUSES_ADULT;
      const cause = named
        ? causeOf(named)
        : c.health <= 5
          ? 'de maladie et d\'épuisement'
          : rng.pick(causes);
      const eventCtx = makeEventCtx(world, ctx.ruleset, rng, c, {});
      killCharacter(eventCtx, c, cause);
    }
  },
};

/** POST — famine et misère : la pauvreté tue lentement. */
export const Subsistence: System = {
  id: 'vitals.subsistence',
  phase: 'POST',
  priority: 20,
  run(ctx) {
    const { world } = ctx;
    for (const c of ctx.living) {
      if (c.wealth >= 0) continue;
      const severity = clamp(-c.wealth / 120, 0.5, 12);
      c.health = clamp(c.health - severity, 0, 100);
      c.mood = clamp(c.mood - severity * 1.5, 0, 100);
      if (c.isPlayer) {
        world.say(
          c.wealth < -400
            ? 'Vous ne mangez plus à votre faim depuis longtemps. Le corps lâche.'
            : 'La faim vous suit partout.',
        );
      }
    }
  },
};

export function describeHealth(c: Character): string {
  const h = c.health;
  if (h >= 90) return 'florissant';
  if (h >= 72) return 'bon';
  if (h >= 55) return 'passable';
  if (h >= 38) return 'fragile';
  if (h >= 20) return 'mauvais';
  if (h > 0) return 'mourant';
  return 'éteint';
}

export function describeMood(c: Character): string {
  const m = c.mood;
  if (m >= 85) return 'exalté';
  if (m >= 70) return 'serein';
  if (m >= 55) return 'stable';
  if (m >= 40) return 'las';
  if (m >= 25) return 'amer';
  if (m >= 12) return 'sombre';
  return 'brisé';
}

export { shortName };
