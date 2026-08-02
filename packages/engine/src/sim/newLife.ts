import type { Character, RelationType, Sex, SuccessionLaw } from '../model/types.js';
import { CLASS_LABELS, HIDDEN_IDS, STAT_IDS } from '../model/types.js';
import type { World } from '../world/world.js';
import type {
  BirthContext,
  BirthResult,
  BirthScenario,
  BondOptions,
  Ruleset,
  SpawnOptions,
} from '../content/ruleset.js';
import { spawnCharacter } from '../world/spawn.js';
import { Rng } from '../rng/rng.js';
import { clamp } from '../util/math.js';
import { fullName } from '../model/character.js';
import { MEMORY_BUDGET_FOCUS } from '../world/memory.js';

export interface NewLife {
  player: Character;
  scenario: BirthScenario;
  result: BirthResult;
}

/**
 * Crée une nouvelle vie. C'est le premier écran du jeu : il donne le ton
 * et il ne doit jamais être un simple tirage de chiffres (doc 03 §2).
 */
export function createLife(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  forcedScenarioId?: string,
): NewLife {
  const scenario =
    (forcedScenarioId ? ruleset.births.find((b) => b.id === forcedScenarioId) : null) ??
    rng.weighted(ruleset.births, (b) => b.weight) ??
    (ruleset.births[0] as BirthScenario);

  const sex: Sex = rng.chance(0.5) ? 'm' : 'f';
  const defaultSettlement = ruleset.settlements[0]?.id ?? 'vardhen';
  const player = spawnCharacter(world, ruleset, rng.fork('newlife.player', scenario.id), {
    culture: ruleset.settlements[0]?.culture ?? 'vardhen',
    sex,
    age: 0,
    settlement: defaultSettlement,
    lod: 0,
  });
  player.isPlayer = true;
  world.setPlayer(player.id);

  const ctx = makeBirthContext(world, ruleset, rng.fork('newlife.setup', scenario.id), player);
  const result = scenario.setup(ctx);
  applyBirthResult(world, ruleset, player, result);

  world.record({
    year: world.year,
    kind: 'naissance',
    importance: 5,
    actors: [{ id: player.id, name: fullName(player) }],
    data: {
      lieu: world.settlement(player.settlement)?.name ?? player.settlement,
      condition: result.condition,
      scenario: scenario.id,
    },
  });

  return { player, scenario, result };
}

function makeBirthContext(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  player: Character,
): BirthContext {
  let spawnCount = 0;

  const bond = (
    from: Character,
    to: Character,
    type: RelationType,
    label: string,
    opts: BondOptions = {},
  ): void => {
    world.relations.ensure(from.id, to.id, type, label, world.year);
    world.relations.modify(from.id, to.id, opts);
  };

  return {
    world,
    rng,
    player,

    place(settlement, culture) {
      player.settlement = settlement;
      const resolved = culture ?? world.settlement(settlement)?.culture;
      if (resolved && ruleset.cultures[resolved]) {
        player.culture = resolved;
        const names = ruleset.nameFor(rng.fork('rename', settlement), resolved, player.sex);
        player.given = names.given;
        player.family = names.family;
      }
    },

    spawn(opts) {
      const full: SpawnOptions = {
        culture: opts.culture ?? player.culture,
        settlement: opts.settlement ?? player.settlement,
        socialClass: opts.socialClass ?? player.socialClass,
        ...opts,
      };
      return spawnCharacter(world, ruleset, rng.fork('birth.spawn', spawnCount++), full);
    },

    bond,

    pair(a, b, type, labelAB, labelBA, opts = {}) {
      bond(a, b, type, labelAB, opts);
      bond(b, a, type, labelBA, opts);
    },

    remember(owner, text, salience, actors = [], tags = []) {
      world.memories.add(
        owner.id,
        {
          year: world.year,
          text,
          salience: clamp(salience, 1, 100),
          actors: actors.map((a) => a.id),
          tags,
        },
        MEMORY_BUDGET_FOCUS,
      );
    },

    seed(eventId, min, max, actors = [], note = '') {
      const delay = rng.fork('birth.seed', eventId).int(min, max);
      world.plantSeed({
        eventId,
        plantedYear: world.year,
        dueYear: world.year + Math.max(1, delay),
        actors: actors.map((a) => a.id),
        needsActorsAlive: actors.length > 0,
        note,
      });
    },

    parentOf(parent, child) {
      if (parent.sex === 'm') child.fatherId = parent.id;
      else child.motherId = parent.id;
      if (!parent.childrenIds.includes(child.id)) parent.childrenIds.push(child.id);
      bond(parent, child, 'sang', child.sex === 'm' ? 'fils' : 'fille', {
        affection: 40,
        trust: 30,
      });
      bond(child, parent, 'sang', parent.sex === 'm' ? 'père' : 'mère', {
        affection: 45,
        trust: 40,
      });
    },
  };
}

function applyBirthResult(
  world: World,
  ruleset: Ruleset,
  player: Character,
  r: BirthResult,
): void {
  if (r.culture && ruleset.cultures[r.culture]) player.culture = r.culture;
  if (r.settlement) player.settlement = r.settlement;
  if (r.socialClass) player.socialClass = r.socialClass;
  if (r.family !== undefined) player.family = r.family;
  if (r.wealth !== undefined) player.wealth = r.wealth;
  if (r.health !== undefined) player.health = clamp(r.health, 1, 100);

  for (const s of STAT_IDS) {
    const v = r.stats?.[s];
    if (v !== undefined) player.stats[s] = clamp(v, 1, 100);
  }
  for (const h of HIDDEN_IDS) {
    const v = r.hidden?.[h];
    if (v !== undefined) player.hidden[h] = clamp(v, 0, 100);
  }
  for (const t of r.traits ?? []) {
    if (player.traits.includes(t)) continue;
    for (const excluded of ruleset.traits[t]?.excludes ?? []) {
      player.traits = player.traits.filter((x) => x !== excluded);
    }
    player.traits.push(t);
  }
  for (const p of r.paths ?? []) if (!player.paths.includes(p)) player.paths.push(p);
  Object.assign(player.flags, r.flags ?? {});
}

/**
 * Succession (doc 03 §3). La mort n'arrête pas la partie : on reprend avec
 * l'héritier — et avec ce que le défunt lui laisse, dettes et rancunes comprises.
 */
export interface HeirOption {
  id: Character['id'];
  name: string;
  age: number;
  relation: string;
  note: string;
  /** Rang dans l'ordre successoral tel que la loi de la maison le définit. */
  claim: number;
}

/** Candidats à la succession, du plus proche au plus lointain. */
function kinOf(world: World, dead: Character): { c: Character; relation: string; degree: number }[] {
  const out: { c: Character; relation: string; degree: number }[] = [];
  const seen = new Set<Character['id']>([dead.id]);

  const push = (c: Character | undefined, relation: string, degree: number): void => {
    if (!c || !c.alive || seen.has(c.id)) return;
    const age = world.year - c.birthYear;
    if (age < 1) return;
    seen.add(c.id);
    out.push({ c, relation, degree });
  };

  // 1. enfants
  for (const id of dead.childrenIds) push(world.get(id), world.get(id)?.sex === 'f' ? 'fille' : 'fils', 1);

  // 2. petits-enfants
  for (const id of dead.childrenIds) {
    const child = world.get(id);
    for (const gid of child?.childrenIds ?? []) {
      const g = world.get(gid);
      push(g, g?.sex === 'f' ? 'petite-fille' : 'petit-fils', 2);
    }
  }

  // 3. fratrie, puis neveux — c'est ce qui empêche une maison de s'éteindre
  //    parce qu'un seul homme est mort sans enfant.
  const parents = [world.get(dead.fatherId), world.get(dead.motherId)].filter(
    (p): p is Character => !!p,
  );
  const siblings: Character[] = [];
  for (const parent of parents) {
    for (const id of parent.childrenIds) {
      const sib = world.get(id);
      if (sib && sib.id !== dead.id) siblings.push(sib);
    }
  }
  for (const sib of siblings) push(sib, sib.sex === 'f' ? 'sœur' : 'frère', 3);
  for (const sib of siblings) {
    for (const id of sib.childrenIds) {
      const nephew = world.get(id);
      push(nephew, nephew?.sex === 'f' ? 'nièce' : 'neveu', 4);
    }
  }

  // 4. l'époux, en dernier recours, s'il y a une maison à tenir
  if (dead.houseId) push(world.get(dead.spouseId), 'époux', 5);

  return out;
}

/** Aptitude perçue — sert aux lois « au plus capable » et « par les armes ». */
function capability(c: Character, martial: boolean): number {
  const skills = Object.values(c.skills).reduce((a, b) => a + b, 0);
  if (martial) {
    return c.stats.force * 2 + c.stats.endurance + (c.skills['lame'] ?? 0) * 2;
  }
  return (
    c.stats.intelligence * 1.5 +
    c.stats.charisme * 1.2 +
    c.stats.volonte +
    skills * 0.4 +
    c.hidden.influence
  );
}

/**
 * Ordre successoral. La loi de la maison décide (doc 03 §5) ; sans maison,
 * c'est la primogéniture, parce que c'est l'usage partout sur le Rivage.
 */
export function heirsOf(world: World, dead: Character): HeirOption[] {
  const house = world.house(dead.houseId);
  const law: SuccessionLaw = house?.law ?? 'primogeniture';
  const kin = kinOf(world, dead);

  const designated = kin.find(({ c }) => c.flags['heritier_designe'] === true);

  const ordered = kin.slice().sort((a, b) => {
    if (a.degree !== b.degree) return a.degree - b.degree;
    const ageA = world.year - a.c.birthYear;
    const ageB = world.year - b.c.birthYear;
    switch (law) {
      case 'ultimogeniture':
        return ageA - ageB || a.c.id - b.c.id;
      case 'merite':
        return capability(b.c, false) - capability(a.c, false) || a.c.id - b.c.id;
      case 'combat':
        return capability(b.c, true) - capability(a.c, true) || a.c.id - b.c.id;
      case 'designation':
      case 'primogeniture':
      default:
        return ageB - ageA || a.c.id - b.c.id;
    }
  });

  if (law === 'designation' && designated) {
    const index = ordered.findIndex((k) => k.c.id === designated.c.id);
    if (index > 0) ordered.unshift(...ordered.splice(index, 1));
  }

  return ordered.map(({ c, relation }, i) => {
    const rel = world.relations.get(c.id, dead.id);
    const notes: string[] = [];
    if (rel && rel.affection < -25) notes.push('vous haïssait');
    else if (rel && rel.affection > 50) notes.push('vous était dévoué');
    if (c.flags['heritier_designe'] === true) notes.push('désigné');
    if (relation !== 'fils' && relation !== 'fille') notes.push(relation);
    return {
      id: c.id,
      name: fullName(c),
      age: world.year - c.birthYear,
      relation,
      note: notes.join(', '),
      claim: i + 1,
    };
  });
}

/**
 * Continuation « n'importe qui » (doc 09).
 *
 * La mort ne rend pas la main à la lignée seulement : on peut reprendre le fil
 * de n'importe qui d'autre dans le monde. C'est le mécanisme qui permet de
 * changer d'échelle sans triche — mourir gueux dans une ruelle et réapparaître
 * dans la vie de quelqu'un qui, lui, a une place.
 */
export interface StrangerOption {
  id: Character['id'];
  name: string;
  age: number;
  /** Accroche d'une ligne : ce qui rend cette vie intéressante à reprendre. */
  hook: string;
  place: string;
}

/** Score d'intérêt narratif. On ne propose jamais une vie sans matière. */
function interest(world: World, c: Character): number {
  const age = world.year - c.birthYear;
  if (age < 6 || age > 70) return 0;
  let score = 4;
  score += Math.min(12, world.relations.from(c.id).length * 1.5);
  score += c.titles.length * 8;
  score += c.houseId ? 5 : 0;
  score += c.traits.length * 1.2;
  if (c.wealth > 20000) score += 6;
  if (c.wealth < 0) score += 4; // la dette est une histoire, elle aussi
  if (c.socialClass === 'noble' || c.socialClass === 'royal') score += 6;
  if (c.socialClass === 'esclave' || c.socialClass === 'miserable') score += 4;
  if (age >= 14 && age <= 40) score += 6;
  for (const rel of world.relations.toward(c.id)) {
    if (rel.affection <= -50) score += 3; // quelqu'un le hait : il se passe des choses
  }
  return score;
}

function hookFor(world: World, c: Character, ruleset: Ruleset): string {
  const job = c.jobId ? ruleset.jobs[c.jobId]?.label.toLowerCase() : null;
  const enemies = world.relations.toward(c.id).filter((r) => r.affection <= -50).length;
  const house = world.house(c.houseId);
  if (enemies > 0) return `${job ?? CLASS_LABELS[c.socialClass]} · ${enemies} personne(s) le haïssent`;
  if (c.titles.length > 0) return `${c.titles[0]}`;
  if (house) return `de la Maison ${house.name}`;
  if (c.wealth < 0) return `${job ?? CLASS_LABELS[c.socialClass]} · criblé de dettes`;
  if (job) return job;
  return CLASS_LABELS[c.socialClass];
}

export function strangersFor(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  count = 3,
): StrangerOption[] {
  const dead = world.player;
  const pool = world
    .living()
    .filter((c) => c.id !== dead.id && interest(world, c) > 0);

  const picked: Character[] = [];
  const remaining = [...pool];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const chosen = rng
      .fork('stranger', world.year, i)
      .weighted(remaining, (c) => interest(world, c));
    if (!chosen) break;
    picked.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }

  return picked.map((c) => ({
    id: c.id,
    name: fullName(c),
    age: world.year - c.birthYear,
    hook: hookFor(world, c, ruleset),
    place: world.settlement(c.settlement)?.name ?? c.settlement,
  }));
}

/**
 * Un PNJ de palier 1 n'a presque aucun lien : le promouvoir tel quel donne une
 * vie vide, et « Vous ne connaissez personne » est la pire première phrase
 * possible. On matérialise son cercle au moment où on entre dedans — c'est
 * exactement le principe de promotion du doc 02 §1.
 */
export function materializeCircle(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  c: Character,
): void {
  const year = world.year;
  const link = (
    other: Character | undefined,
    labelOut: string,
    labelIn: string,
    type: RelationType,
    affection: number,
  ): void => {
    if (!other || !other.alive || other.id === c.id) return;
    world.relations.ensure(c.id, other.id, type, labelOut, year);
    world.relations.ensure(other.id, c.id, type, labelIn, year);
    world.relations.modify(c.id, other.id, { affection });
    world.relations.modify(other.id, c.id, { affection });
    other.lod = 0;
  };

  const self = c.sex === 'm' ? 'fils' : 'fille';
  link(world.get(c.fatherId), 'père', self, 'sang', 40);
  link(world.get(c.motherId), 'mère', self, 'sang', 40);
  link(world.get(c.spouseId), 'époux', 'époux', 'mariage', 45);
  for (const kid of c.childrenIds) {
    const child = world.get(kid);
    if (child) link(child, child.sex === 'm' ? 'fils' : 'fille', c.sex === 'm' ? 'père' : 'mère', 'sang', 45);
  }

  // Il faut au moins trois personnes autour de soi pour que la vie ait prise.
  const LABELS = ['voisin', 'ami d\'enfance', 'compagnon d\'atelier', 'créancier', 'rival de toujours'];
  let guard = 0;
  while (world.relations.from(c.id).length < 3 && guard++ < 6) {
    const draw = rng.fork('circle', c.id, guard);
    const locals = world
      .living()
      .filter(
        (o) =>
          o.id !== c.id &&
          o.settlement === c.settlement &&
          !world.relations.get(c.id, o.id) &&
          Math.abs(o.birthYear - c.birthYear) <= 25,
      );
    const other =
      draw.pickOrNull(locals) ??
      spawnCharacter(world, ruleset, draw.fork('spawn'), {
        culture: c.culture,
        age: Math.max(12, year - c.birthYear + draw.int(-12, 12)),
        settlement: c.settlement,
        socialClass: c.socialClass,
      });
    const label = draw.pick(LABELS);
    const warmth = label === 'rival de toujours' ? -35 : label === 'créancier' ? -10 : draw.int(10, 45);
    link(other, label, label === 'rival de toujours' ? 'rival de toujours' : 'connaissance', label === 'rival de toujours' ? 'rivalite' : 'amitie', warmth);
  }
}

/** Reprend le fil de quelqu'un d'autre. Aucun héritage : on arrive dans sa vie. */
export function continueAsStranger(
  world: World,
  ruleset: Ruleset,
  id: Character['id'],
  rng: Rng,
): boolean {
  const dead = world.player;
  const next = world.get(id);
  if (!next || !next.alive || next.id === dead.id) return false;

  dead.isPlayer = false;
  next.isPlayer = true;
  next.lod = 0;
  world.setPlayer(next.id);
  materializeCircle(world, ruleset, rng, next);

  world.record({
    year: world.year,
    kind: 'note',
    importance: 4,
    actors: [{ id: next.id, name: fullName(next) }],
    data: {
      texte: `Le fil se déplace : on suit désormais ${fullName(next)}, ${
        world.year - next.birthYear
      } ans.`,
    },
  });

  void ruleset;
  return true;
}

/** Repart d'une naissance neuve, dans le même monde, à l'année courante. */
export function continueAsNewborn(world: World, ruleset: Ruleset, rng: Rng): NewLife {
  const dead = world.player;
  dead.isPlayer = false;
  return createLife(world, ruleset, rng);
}

export function continueAsHeir(world: World, ruleset: Ruleset, heirId: Character['id']): boolean {
  const dead = world.player;
  const heir = world.get(heirId);
  if (!heir || !heir.alive) return false;

  heir.isPlayer = true;
  heir.lod = 0;
  dead.isPlayer = false;
  world.setPlayer(heir.id);

  // L'héritage : les biens, les titres, la maison — et les inimitiés du défunt.
  const inherited = Math.max(0, dead.wealth);
  heir.wealth += inherited;
  dead.wealth = 0;
  for (const t of dead.titles) if (!heir.titles.includes(t)) heir.titles.push(t);
  if (dead.houseId && !heir.houseId) heir.houseId = dead.houseId;
  const house = world.house(heir.houseId);
  if (house) {
    house.headId = heir.id;
    if (!house.memberIds.includes(heir.id)) house.memberIds.push(heir.id);
  }

  // Les ennemis du père deviennent ceux du fils. C'est ça, une dynastie.
  for (const rel of world.relations.toward(dead.id)) {
    if (rel.affection > -35) continue;
    const enemy = world.get(rel.from);
    if (!enemy || !enemy.alive || enemy.id === heir.id) continue;
    world.relations.ensure(enemy.id, heir.id, 'haine', 'héritier de son ennemi', world.year);
    world.relations.modify(enemy.id, heir.id, { affection: Math.round(rel.affection / 2) });
  }

  world.memories.add(heir.id, {
    year: world.year,
    text: `${fullName(dead)} est mort. Ce qui reste est à moi, dettes comprises.`,
    salience: 90,
    actors: [dead.id],
    tags: ['heritage', 'deuil'],
  });

  world.record({
    year: world.year,
    kind: 'ascension',
    importance: 4,
    actors: [{ id: heir.id, name: fullName(heir) }],
    data: {
      quoi: `hérite de ${fullName(dead)}${inherited > 0 ? ` et de ${inherited} sous` : ''}`,
    },
  });

  void ruleset;
  return true;
}
