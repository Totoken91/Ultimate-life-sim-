import type { System } from './types.js';
import type { Character } from '../model/types.js';
import { ageOf, fullName } from '../model/character.js';
import { clamp } from '../util/math.js';
import type { Rng } from '../rng/rng.js';
import {
  ORGAN_IDS,
  VITAL_IDS,
  summarizeHealth,
  type Body,
  type OrganId,
} from '../body/body.js';
import { buildRegistry, tickConditions, type ConditionRegistry } from '../body/conditions.js';
import { makeEventCtx } from '../events/engine.js';
import { killCharacter } from '../events/effects.js';

/**
 * Physiologie (doc 12).
 *
 * `health` cesse d'être une valeur qu'on pousse : elle devient le **résumé**
 * d'un corps qui vieillit, s'infecte, se répare et finit par lâcher quelque
 * part. Le contenu continue d'écrire `{ k: 'health', d: -12 }` — c'est le corps
 * qui décide de ce que ça veut dire.
 */

/** Un PNJ sur trois est examiné chaque année, avec un poids triplé. */
const ONSET_STAGGER = 3;

/** Vitesse d'usure annuelle après 35 ans, par organe. */
const WEAR: Record<OrganId, number> = {
  coeur: 0.42,
  poumons: 0.4,
  foie: 0.34,
  reins: 0.34,
  cerveau: 0.26,
  digestif: 0.3,
  os: 0.5,
  muscles: 0.55,
  peau: 0.45,
  sang: 0.22,
  nerfs: 0.3,
  sens: 0.6,
  immunite: 0.38,
  endocrine: 0.3,
  fertilite: 1.5,
};

/** Répartit un choc de santé sur un vrai corps. */
export function applyHealthDelta(body: Body, delta: number, rng: Rng): void {
  if (delta === 0) return;

  if (delta < 0) {
    const amount = -delta;
    // une blessure touche surtout un endroit, et se paie aussi en douleur
    const target = rng.pick(ORGAN_IDS);
    body.organs[target] = clamp(body.organs[target] - amount * 0.55, 0, 100);
    const second = rng.pick(ORGAN_IDS);
    body.organs[second] = clamp(body.organs[second] - amount * 0.2, 0, 100);
    body.douleur = clamp(body.douleur + amount * 0.5, 0, 100);
    body.inflammation = clamp(body.inflammation + amount * 0.35, 0, 100);
    body.infection = clamp(body.infection + amount * 0.18, 0, 100);
    return;
  }

  // se soigner, c'est d'abord faire tomber la fièvre et la douleur
  body.infection = clamp(body.infection - delta * 0.8, 0, 100);
  body.inflammation = clamp(body.inflammation - delta * 0.6, 0, 100);
  body.douleur = clamp(body.douleur - delta * 0.5, 0, 100);
  for (const id of ORGAN_IDS) {
    body.organs[id] = clamp(body.organs[id] + delta * 0.1, 0, 100);
  }
}

let registry: ConditionRegistry | null = null;
let registrySource: unknown = null;

function registryFor(defs: readonly unknown[]): ConditionRegistry {
  if (registry && registrySource === defs) return registry;
  registry = buildRegistry(defs as never);
  registrySource = defs;
  return registry;
}

/** PRE — usure des organes, retour à la normale des constantes, maladies. */
export const Physiology: System = {
  id: 'body.physiology',
  phase: 'PRE',
  priority: 15,
  run(ctx) {
    const { world, ruleset } = ctx;
    const defs = ruleset.conditions ?? [];
    const reg = registryFor(defs);

    for (const c of ctx.living) {
      const body = c.body;
      if (!body) continue;
      const age = ageOf(c, world.year);

      // ── usure et réparation ──────────────────────────────────────────────
      // Le joueur et ses proches sont calculés chaque année. Le reste du monde
      // l'est un an sur trois, avec des variations triplées : même trajectoire,
      // trois fois moins de travail. C'est le doc 02 appliqué à la chair.
      const focus = c.lod === 0;
      const due = focus || (c.id + world.year) % ONSET_STAGGER === 0;
      const step = focus ? 1 : ONSET_STAGGER;

      // Rien ne peut bouger cette année pour un corps sain qui n'est pas à son
      // tour : ni usure, ni maladie. On s'épargne le générateur et le résumé.
      if (!due && body.conditions.length === 0) continue;
      const rng = ctx.rng.fork('physiology', world.year, c.id);

      if (due) {
        const resilience = 0.55 + c.hidden.genetique / 140;
        const wearScale =
          age > 35 ? ((0.5 + ((age - 35) / 10) * 0.45) / resilience) * step : 0;
        const repair = (age < 20 ? 2.2 : age < 45 ? 1.3 : 0.7) * resilience * step;

        for (const id of ORGAN_IDS) {
          const wear = wearScale > 0 ? WEAR[id] * wearScale : 0;
          const gain = id === 'fertilite' ? 0 : repair;
          body.organs[id] = clamp(body.organs[id] - wear + gain, 0, 100);
        }

        // La fécondité suit sa propre horloge et ne remonte jamais.
        if (age > 38) {
          body.organs.fertilite = clamp(body.organs.fertilite - (age - 38) * 0.6 * step, 0, 100);
        }

        // ── retour à la normale ────────────────────────────────────────────
        const recovery = clamp(0.2 + body.organs.immunite / 260, 0.08, 0.5);
        const settled = 1 - Math.pow(1 - recovery, step);
        for (const id of VITAL_IDS) {
          body.vitals[id] = body.vitals[id] + (50 - body.vitals[id]) * settled;
        }
        if (age > 40) {
          body.vitals.tension = clamp(body.vitals.tension + (age - 40) * 0.06 * step, 0, 100);
        }

        body.infection = clamp(body.infection - (4 + body.organs.immunite / 22) * step, 0, 100);
        body.inflammation = clamp(body.inflammation - 3 * step, 0, 100);
        body.douleur = clamp(body.douleur - 2.5 * step, 0, 100);
      }

      // ── maladies ─────────────────────────────────────────────────────────
      // Le joueur et ses proches sont examinés chaque année ; le reste du
      // monde par tiers, avec un poids triplé. Même espérance, trois fois
      // moins de travail — c'est la promotion LOD appliquée au corps.
      const outcome = tickConditions(
        { world, subject: c, body, age, rng, onsetScale: focus ? 1 : due ? ONSET_STAGGER : 0 },
        reg,
      );

      for (const mark of outcome.marks) {
        if (!c.traits.includes(mark) && ruleset.traits[mark]) c.traits.push(mark);
      }

      if (c.isPlayer) {
        for (const def of outcome.appeared) world.say(`Votre corps : ${def.label}.`);
        for (const def of outcome.resolved) world.say(`C'est passé : ${def.label}.`);
      }

      // ── résumé ───────────────────────────────────────────────────────────
      c.health = summarizeHealth(body);

      if (outcome.killedBy) {
        const eventCtx = makeEventCtx(world, ruleset, rng, c, {});
        killCharacter(eventCtx, c, outcome.killedBy.label);
      }
    }
  },
};

/** Rappelle ce que le personnage sent, pour les écrans et les textes. */
export function bodyOwnerName(c: Character): string {
  return fullName(c);
}
