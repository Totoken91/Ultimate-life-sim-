import type { Character, Sex, SocialClass, StatId } from '../model/types.js';
import { HIDDEN_IDS, STAT_IDS } from '../model/types.js';
import type { Rng } from '../rng/rng.js';
import type { Ruleset, SpawnOptions } from '../content/ruleset.js';
import type { World } from './world.js';
import { clamp } from '../util/math.js';
import { classRank } from '../model/character.js';
import { newBody } from '../body/body.js';

const CLASS_WEALTH: Record<SocialClass, number> = {
  esclave: 0,
  miserable: 6,
  pauvre: 80,
  commun: 400,
  aise: 3500,
  noble: 40000,
  royal: 600000,
};

/** Crée un personnage complet et l'insère dans le monde. */
export function spawnCharacter(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  opts: SpawnOptions,
): Character {
  const sex: Sex = opts.sex ?? (rng.chance(0.5) ? 'm' : 'f');
  const culture = ruleset.cultures[opts.culture] ? opts.culture : 'vardhen';
  const names = ruleset.nameFor(rng, culture, sex);
  const socialClass = opts.socialClass ?? 'commun';
  const bias = ruleset.cultures[culture]?.statBias ?? {};
  const mean = opts.statMean ?? 45;

  const stats = {} as Record<StatId, number>;
  for (const s of STAT_IDS) {
    stats[s] = rng.fork('spawn.stat', s, world.year, names.given).stat(mean + (bias[s] ?? 0), 13);
  }

  const hidden = {} as Character['hidden'];
  for (const h of HIDDEN_IDS) hidden[h] = 0;
  hidden.potentiel = rng.stat(45, 20);
  hidden.genetique = rng.stat(50, 18);
  hidden.destinee = rng.stat(20, 15);
  hidden.ambition = rng.stat(40, 22);
  hidden.karma = 50;
  // Ces trois-là restaient à zéro pour tout PNJ : personne dans le monde
  // n'était donc assez corrompu pour rançonner, assez fêlé pour basculer, ni
  // assez en vue pour fonder quoi que ce soit. Les conduites correspondantes
  // ne sortaient jamais (doc 13 §6).
  hidden.corruption = clamp(rng.stat(14, 15), 0, 100);
  hidden.folie = clamp(rng.stat(7, 11), 0, 100);
  // On naît avec le crédit de son rang. Le reste se gagne.
  hidden.influence = clamp(rng.stat(4 + classRank(socialClass) * 6, 9), 0, 100);

  const c: Character = {
    id: world.allocId(),
    given: opts.given ?? names.given,
    family: opts.family === undefined ? names.family : opts.family,
    epithet: null,
    sex,
    birthYear: world.year - opts.age,
    deathYear: null,
    causeOfDeath: null,
    alive: true,
    stats,
    hidden,
    traits: opts.traits ? [...opts.traits] : [],
    skills: {},
    health: clamp(rng.stat(82, 12), 20, 100),
    mood: rng.stat(58, 14),
    wealth: opts.wealth ?? Math.round(CLASS_WEALTH[socialClass] * (0.5 + rng.float())),
    jobId: opts.jobId ?? null,
    jobYears: 0,
    settlement: opts.settlement,
    culture,
    houseId: null,
    socialClass,
    titles: [],
    paths: [],
    injuries: [],
    flags: {},
    body: newBody(hidden.genetique),
    fatherId: null,
    motherId: null,
    spouseId: null,
    childrenIds: [],
    isPlayer: false,
    lod: opts.lod ?? 1,
    cooldowns: {},
    seen: [],
  };

  return world.add(c);
}

/**
 * Enfant de deux parents : la génétique se transmet, avec dérive.
 * C'est ce qui rend une lignée reconnaissable sur plusieurs générations.
 */
export function spawnChild(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  father: Character | null,
  mother: Character | null,
  sex?: Sex,
): Character {
  const anchor = father ?? mother;
  if (!anchor) throw new Error('spawnChild sans parent');
  const child = spawnCharacter(world, ruleset, rng, {
    culture: anchor.culture,
    sex,
    age: 0,
    settlement: anchor.settlement,
    socialClass: anchor.socialClass,
    family: anchor.family,
    wealth: 0,
  });

  for (const s of STAT_IDS) {
    const parental = father && mother
      ? (father.stats[s] + mother.stats[s]) / 2
      : anchor.stats[s];
    // 60 % d'hérédité, 40 % de bruit : les enfants ressemblent sans être des copies
    child.stats[s] = clamp(
      Math.round(parental * 0.6 + rng.fork('child.stat', s, child.id).stat(45, 15) * 0.4),
      1,
      100,
    );
  }
  const parentalGenes = father && mother
    ? (father.hidden.genetique + mother.hidden.genetique) / 2
    : anchor.hidden.genetique;
  child.hidden.genetique = clamp(Math.round(rng.gaussian(parentalGenes, 9)), 0, 100);
  child.hidden.potentiel = clamp(
    Math.round(rng.gaussian(35 + child.hidden.genetique * 0.35, 18)),
    0,
    100,
  );
  child.health = clamp(Math.round(rng.gaussian(70 + child.hidden.genetique * 0.25, 10)), 10, 100);
  child.body = newBody(child.hidden.genetique);

  // Un enfant qui porte le prénom de son parent rend la Chronique illisible
  // (« Perrin Vaur naquit de Perrin Vaur »). On retire ce cas.
  const taken = new Set([father?.given, mother?.given].filter(Boolean));
  for (let attempt = 0; attempt < 8 && taken.has(child.given); attempt++) {
    child.given = ruleset.nameFor(rng.fork('child.rename', attempt), child.culture, child.sex).given;
  }

  world.tally.births += 1;
  world.tally.birthsByYear[world.year] = (world.tally.birthsByYear[world.year] ?? 0) + 1;

  child.fatherId = father?.id ?? null;
  child.motherId = mother?.id ?? null;
  child.houseId = father?.houseId ?? mother?.houseId ?? null;
  if (father) father.childrenIds.push(child.id);
  if (mother) mother.childrenIds.push(child.id);

  const house = world.house(child.houseId);
  if (house) house.memberIds.push(child.id);

  return child;
}
