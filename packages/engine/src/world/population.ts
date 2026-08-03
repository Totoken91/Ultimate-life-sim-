import type { Character, SocialClass } from '../model/types.js';
import { agreeLabel } from '../util/text.js';
import type { World } from './world.js';
import type { Ruleset } from '../content/ruleset.js';
import { Rng } from '../rng/rng.js';
import { spawnCharacter } from './spawn.js';
import { ageOf } from '../model/character.js';

/**
 * Peuplement initial du monde.
 *
 * Sans lui, le monde ne contient que les gens croisés par le joueur : une
 * dizaine de personnes, des statistiques absurdes et aucune économie. Un monde
 * vivant a besoin d'un fond de population qui existait avant vous et qui
 * continuera après.
 *
 * Version Phase 2, volontairement simple : des foyers, des âges plausibles, des
 * métiers cohérents avec le lieu. Les migrations, les classes d'âge et la
 * démographie logistique du doc 02 §4 arrivent en Phase 5.
 */

/** Pyramide des âges pré-industrielle : beaucoup de jeunes, peu de vieux. */
function drawAge(rng: Rng): number {
  const roll = rng.float();
  if (roll < 0.3) return rng.int(0, 12);
  if (roll < 0.5) return rng.int(13, 24);
  if (roll < 0.75) return rng.int(25, 39);
  if (roll < 0.92) return rng.int(40, 54);
  return rng.int(55, 78);
}

function drawClass(rng: Rng, wealth: number): SocialClass {
  const roll = rng.float() * 100;
  const rich = wealth / 100; // 0..1 selon la prospérité du lieu
  if (roll < 6 - rich * 4) return 'miserable';
  if (roll < 40 - rich * 20) return 'pauvre';
  if (roll < 88 - rich * 8) return 'commun';
  if (roll < 98) return 'aise';
  return 'noble';
}

export interface PopulationOptions {
  /** Habitants par implantation, avant modulation par la taille du lieu. */
  perSettlement?: number;
}

const SIZE_FACTOR: Record<string, number> = {
  hameau: 0.35,
  village: 0.6,
  bourg: 0.9,
  ville: 1.4,
  cité: 1.9,
};

export function seedPopulation(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  opts: PopulationOptions = {},
): Character[] {
  const base = opts.perSettlement ?? 60;
  const created: Character[] = [];

  for (const settlement of ruleset.settlements) {
    const count = Math.max(6, Math.round(base * (SIZE_FACTOR[settlement.size] ?? 1)));
    const local = rng.fork('population', settlement.id);
    let placed = 0;

    while (placed < count) {
      const household = local.fork('foyer', placed);
      const cls = drawClass(household, settlement.wealth);

      // un chef de foyer adulte
      const headAge = Math.max(18, drawAge(household));
      const head = spawnCharacter(world, ruleset, household.fork('head'), {
        culture: settlement.culture,
        age: headAge,
        settlement: settlement.id,
        socialClass: cls,
      });
      giveJob(world, ruleset, household.fork('job'), head);
      created.push(head);
      placed++;

      // un conjoint, souvent
      if (household.chance(0.62) && placed < count) {
        const spouse = spawnCharacter(world, ruleset, household.fork('spouse'), {
          culture: settlement.culture,
          sex: head.sex === 'm' ? 'f' : 'm',
          age: Math.max(18, headAge + household.int(-8, 8)),
          settlement: settlement.id,
          socialClass: cls,
        });
        head.spouseId = spouse.id;
        spouse.spouseId = head.id;
        world.relations.ensure(head.id, spouse.id, 'mariage', agreeLabel('époux', spouse.sex), world.year);
        world.relations.ensure(spouse.id, head.id, 'mariage', agreeLabel('époux', head.sex), world.year);
        world.relations.modify(head.id, spouse.id, { affection: 35, trust: 30 });
        world.relations.modify(spouse.id, head.id, { affection: 35, trust: 30 });
        world.tally.marriages += 1;
        created.push(spouse);
        placed++;

        // des enfants, si le couple est en âge d'en avoir eu
        const kids = headAge > 24 ? household.int(0, 4) : household.int(0, 1);
        for (let k = 0; k < kids && placed < count; k++) {
          const kidAge = household.int(0, Math.max(1, Math.min(headAge - 18, 25)));
          const child = spawnCharacter(world, ruleset, household.fork('kid', k), {
            culture: settlement.culture,
            age: kidAge,
            settlement: settlement.id,
            socialClass: cls,
          });
          const father = head.sex === 'm' ? head : spouse;
          const mother = head.sex === 'f' ? head : spouse;
          child.fatherId = father.id;
          child.motherId = mother.id;
          child.family = father.family;
          father.childrenIds.push(child.id);
          mother.childrenIds.push(child.id);
          for (const parent of [father, mother]) {
            world.relations.ensure(
              parent.id,
              child.id,
              'sang',
              child.sex === 'm' ? 'fils' : 'fille',
              world.year,
            );
            world.relations.ensure(
              child.id,
              parent.id,
              'sang',
              parent.sex === 'm' ? 'père' : 'mère',
              world.year,
            );
            world.relations.modify(parent.id, child.id, { affection: 40, trust: 30 });
            world.relations.modify(child.id, parent.id, { affection: 45, trust: 40 });
          }
          if (kidAge >= 14) giveJob(world, ruleset, household.fork('kidjob', k), child);
          created.push(child);
          placed++;
        }
      }
    }
  }

  return created;
}

/** Attribue un métier plausible : ni chevalier au hameau, ni prêtre à 12 ans. */
function giveJob(world: World, ruleset: Ruleset, rng: Rng, c: Character): void {
  const age = ageOf(c, world.year);
  const eligible = Object.values(ruleset.jobs).filter((job) => {
    if (job.minAge > age) return false;
    if (job.prestige > 45) return false;
    const ctx = { world, ruleset, subject: c, age, rng };
    if (job.requires && !job.requires(ctx)) return false;
    return true;
  });
  const job = rng.weighted(eligible, (j) => 1 / (1 + j.prestige / 10));
  if (job) {
    c.jobId = job.id;
    c.jobYears = rng.int(0, Math.max(1, age - job.minAge));
    for (const [skillId, gain] of Object.entries(job.trains)) {
      c.skills[skillId] = Math.min(85, (gain ?? 0) * c.jobYears * 0.8);
    }
  }
}

/** Capacité d'accueil d'une implantation — la borne du doc 02 §4, en petit. */
export function carryingCapacity(world: World, settlementId: string): number {
  const s = world.settlement(settlementId);
  if (!s) return 0;
  return Math.round(90 * (SIZE_FACTOR[s.size] ?? 1) * (0.6 + s.wealth / 100));
}

export function populationOf(world: World, settlementId: string): number {
  let n = 0;
  for (const c of world.characters.values()) {
    if (c.alive && c.settlement === settlementId) n++;
  }
  return n;
}
