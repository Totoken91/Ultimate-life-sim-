import type { System } from './types.js';
import { clamp } from '../util/math.js';
import type { Character } from '../model/types.js';
import { ageOf, shortName } from '../model/character.js';
import { relevance } from '../world/memory.js';
import { spawnChild } from '../world/spawn.js';
import { carryingCapacity } from '../world/population.js';

/**
 * PRE — dérive des relations.
 *
 * Sans entretien, l'affection retourne lentement vers zéro : les amitiés
 * s'éteignent si on ne les nourrit pas. Le sang résiste, la haine résiste
 * encore plus — une rancune ne s'efface pas toute seule.
 */
export const RelationDrift: System = {
  id: 'social.drift',
  phase: 'PRE',
  priority: 60,
  run(ctx) {
    const { world } = ctx;
    // Chaque arête évolue indépendamment des autres : l'ordre n'a aucune
    // influence sur le résultat, on peut donc se passer du tri.
    world.relations.forEach((rel) => {
      const a = world.get(rel.from);
      const b = world.get(rel.to);
      if (!a || !b || !a.alive || !b.alive) return;

      const together = a.settlement === b.settlement;
      const bond = rel.type === 'sang' || rel.type === 'mariage';
      const rate = bond ? 0.02 : together ? 0.05 : 0.13;

      if (rel.affection > 0) rel.affection = clamp(rel.affection * (1 - rate), 0, 100);
      // la rancune est tenace : elle décroît deux fois plus lentement
      else if (rel.affection < 0) rel.affection = clamp(rel.affection * (1 - rate / 2), -100, 0);

      rel.fear = clamp(rel.fear * (1 - rate), 0, 100);

      // proximité familiale : les liens du sang se réchauffent d'eux-mêmes
      if (bond && together && rel.affection < 45) rel.affection = clamp(rel.affection + 2, -100, 100);
    });
  },
};

/**
 * PRE — l'oubli.
 *
 * Un souvenir dont la pertinence tombe sous le seuil disparaît. C'est la
 * mécanique qui, au palier Immortalité, deviendra l'érosion de la mémoire.
 */
export const Forgetting: System = {
  id: 'social.forgetting',
  phase: 'PRE',
  priority: 65,
  run(ctx) {
    const { world } = ctx;
    for (const c of ctx.living) {
      if (c.lod !== 0) continue;
      const mems = world.memories.of(c.id);
      if (mems.length === 0) continue;
      const kept = mems.filter((m) => relevance(m, world.year) >= 1.2);
      if (kept.length !== mems.length) {
        world.memories.drop(c.id);
        for (const m of kept) {
          world.memories.add(c.id, {
            year: m.year,
            text: m.text,
            salience: m.salience,
            actors: m.actors,
            tags: m.tags,
          });
        }
      }
    }
  },
};

/**
 * MAIN — vie des PNJ.
 *
 * Version Phase 1 : volontairement simple. Les PNJ se marient, ont des enfants,
 * trouvent un métier. L'IA utilitaire complète (pulsions × 25 actions) arrive en
 * Phase 3 ; ce système est sa place réservée.
 */
export const NpcLife: System = {
  id: 'social.npcLife',
  phase: 'MAIN',
  priority: 50,
  run(ctx) {
    const { world, ruleset } = ctx;
    const living = ctx.living;

    // Index construits une fois par tick. Les recalculer par personnage rendait
    // le système quadratique — invisible à 10 PNJ, ruineux à 500.
    const byPlace = new Map<string, Character[]>();
    const headcount = new Map<string, number>();
    const capacity = new Map<string, number>();
    for (const c of living) {
      let bucket = byPlace.get(c.settlement);
      if (!bucket) byPlace.set(c.settlement, (bucket = []));
      bucket.push(c);
      headcount.set(c.settlement, (headcount.get(c.settlement) ?? 0) + 1);
    }
    for (const id of byPlace.keys()) capacity.set(id, carryingCapacity(world, id));

    const newborns: string[] = [];

    for (const c of living) {
      if (c.isPlayer) continue;
      const age = ageOf(c, world.year);
      const rng = ctx.rng.fork('social.npcLife', world.year, c.id);

      // prise d'un métier à l'entrée dans l'âge adulte
      if (!c.jobId && age >= 16 && rng.chance(0.3)) {
        const options = Object.values(ruleset.jobs).filter(
          (j) => j.minAge <= age && j.prestige <= 40,
        );
        const job = rng.pickOrNull(options);
        if (job) c.jobId = job.id;
      }

      // naissances : c'est ce qui empêche le monde de s'éteindre en deux siècles
      const spouse = world.get(c.spouseId);
      if (
        spouse &&
        spouse.alive &&
        c.sex === 'f' &&
        age >= 17 &&
        age <= 44 &&
        c.childrenIds.length < 8 &&
        (headcount.get(c.settlement) ?? 0) < (capacity.get(c.settlement) ?? 0)
      ) {
        // fécondité en cloche, maximale vers 26 ans, modulée par la santé
        const peak = 1 - Math.abs(age - 26) / 26;
        const chance = 0.22 * Math.max(0.1, peak) * (0.5 + c.health / 140);
        if (rng.chance(chance)) {
          const father = spouse.sex === 'm' ? spouse : c;
          const mother = spouse.sex === 'm' ? c : spouse;
          spawnChild(world, ruleset, rng.fork('naissance', c.childrenIds.length), father, mother);
          headcount.set(c.settlement, (headcount.get(c.settlement) ?? 0) + 1);
          newborns.push(c.settlement);
        }
      }

      // mariage — on ne cherche que parmi les gens du même lieu
      if (!c.spouseId && age >= 17 && age <= 55 && rng.chance(0.11)) {
        const candidates = (byPlace.get(c.settlement) ?? []).filter((o) => {
          if (o.id === c.id || o.spouseId || o.isPlayer || o.sex === c.sex) return false;
          const otherAge = ageOf(o, world.year);
          return otherAge >= 17 && Math.abs(otherAge - age) <= 12;
        });
        const match = rng.pickOrNull(candidates);
        if (match) {
          c.spouseId = match.id;
          match.spouseId = c.id;
          world.relations.ensure(c.id, match.id, 'mariage', 'époux', world.year);
          world.relations.ensure(match.id, c.id, 'mariage', 'époux', world.year);
          world.relations.modify(c.id, match.id, { affection: 30, trust: 25 });
          world.relations.modify(match.id, c.id, { affection: 30, trust: 25 });
          world.tally.marriages += 1;
        }
      }
    }
    void newborns;
  },
};

/** MAIN — les proches du joueur agissent parfois de façon visible. */
export const NpcVisible: System = {
  id: 'social.npcVisible',
  phase: 'MAIN',
  priority: 55,
  run(ctx) {
    const { world } = ctx;
    const player = world.player;
    if (!player.alive) return;
    for (const rel of world.relations.from(player.id)) {
      const other = world.get(rel.to);
      if (!other || !other.alive) continue;
      const rng = ctx.rng.fork('social.npcVisible', world.year, other.id);
      if (!rng.chance(0.05)) continue;
      const age = ageOf(other, world.year);
      if (age >= 17 && other.spouseId && rng.chance(0.4)) {
        world.say(`${shortName(other)} (${rel.label}) parle de fonder un foyer.`);
      } else if (rel.affection < -30 && rng.chance(0.5)) {
        world.say(`${shortName(other)} (${rel.label}) dit du mal de vous en ville.`);
      }
    }
  },
};
