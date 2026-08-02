import type { Character, HouseRank, SocialClass } from '../model/types.js';
import { CLASS_ORDER } from '../model/types.js';
import { ageOf, fullName, shortName } from '../model/character.js';
import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { bloodOf } from './records.js';

/**
 * Statistiques du monde, calculées à la demande (doc 10).
 *
 * Rien n'est mis en cache : à quelques milliers d'entités, un parcours complet
 * coûte moins cher qu'un cache à invalider. Ça changera au palier LOD 2, pas avant.
 */

export interface Ranked {
  id: number;
  name: string;
  value: number;
  detail: string;
}

export interface CauseCount {
  cause: string;
  count: number;
  share: number;
}

export interface HouseStat {
  id: string;
  name: string;
  rank: HouseRank;
  prestige: number;
  living: number;
  total: number;
  founded: number;
  head: string;
  law: string;
}

export interface SettlementStat {
  id: string;
  name: string;
  population: number;
  medianAge: number;
  wealth: number;
}

export interface WorldStats {
  year: number;
  population: number;
  everLived: number;
  births: number;
  deaths: number;
  marriages: number;
  murders: number;

  medianAge: number;
  medianLifespan: number;
  childMortality: number;

  richest: Ranked[];
  oldest: Ranked[];
  mostChildren: Ranked[];
  bloodiest: Ranked[];

  totalWealth: number;
  topOneShare: number;
  classes: { cls: SocialClass; count: number; share: number }[];
  causes: CauseCount[];
  houses: HouseStat[];
  settlements: SettlementStat[];
  jobs: { label: string; count: number }[];
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
};

function rank(
  chars: Character[],
  value: (c: Character) => number,
  detail: (c: Character) => string,
  limit: number,
): Ranked[] {
  return chars
    .map((c) => ({ id: c.id as number, name: fullName(c), value: value(c), detail: detail(c) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.id - b.id)
    .slice(0, limit);
}

export function worldStats(world: World, ruleset: Ruleset, limit = 5): WorldStats {
  const living = world.living();
  const all = [...world.characters.values()];
  const dead = all.filter((c) => !c.alive);

  const ages = living.map((c) => ageOf(c, world.year));
  const lifespans = dead.map((c) => (c.deathYear ?? world.year) - c.birthYear);
  const childDeaths = lifespans.filter((a) => a <= 12).length;

  const wealths = living.map((c) => Math.max(0, c.wealth)).sort((a, b) => b - a);
  const totalWealth = wealths.reduce((a, b) => a + b, 0);
  const topCount = Math.max(1, Math.round(wealths.length * 0.01));
  const topWealth = wealths.slice(0, topCount).reduce((a, b) => a + b, 0);

  const classCounts = new Map<SocialClass, number>();
  for (const c of living) classCounts.set(c.socialClass, (classCounts.get(c.socialClass) ?? 0) + 1);

  const causeTotal = Object.values(world.tally.deathsByCause).reduce((a, b) => a + b, 0) || 1;
  const causes: CauseCount[] = Object.entries(world.tally.deathsByCause)
    .map(([cause, count]) => ({ cause, count, share: count / causeTotal }))
    .sort((a, b) => b.count - a.count || (a.cause < b.cause ? -1 : 1))
    .slice(0, 8);

  const jobCounts = new Map<string, number>();
  for (const c of living) {
    if (!c.jobId) continue;
    const label = ruleset.jobs[c.jobId]?.label ?? c.jobId;
    jobCounts.set(label, (jobCounts.get(label) ?? 0) + 1);
  }

  const houses: HouseStat[] = [...world.houses.values()]
    .map((h) => ({
      id: h.id,
      name: h.name,
      rank: h.rank,
      prestige: Math.round(h.prestige),
      living: h.memberIds.filter((id) => world.get(id)?.alive).length,
      total: h.memberIds.length,
      founded: h.foundedYear,
      head: (() => {
        const head = world.get(h.headId);
        return head ? shortName(head) : '—';
      })(),
      law: h.law,
    }))
    .sort((a, b) => b.prestige - a.prestige || (a.name < b.name ? -1 : 1));

  const settlements: SettlementStat[] = [...world.settlements.values()]
    .map((s) => {
      const here = living.filter((c) => c.settlement === s.id);
      return {
        id: s.id,
        name: s.name,
        population: here.length,
        medianAge: median(here.map((c) => ageOf(c, world.year))),
        wealth: here.reduce((a, c) => a + Math.max(0, c.wealth), 0),
      };
    })
    .sort((a, b) => b.population - a.population);

  return {
    year: world.year,
    population: living.length,
    everLived: all.length,
    births: world.tally.births,
    deaths: world.tally.deaths,
    marriages: world.tally.marriages,
    murders: world.tally.murders,

    medianAge: median(ages),
    medianLifespan: median(lifespans),
    childMortality: dead.length > 0 ? childDeaths / dead.length : 0,

    richest: rank(living, (c) => c.wealth, (c) => `${ageOf(c, world.year)} ans`, limit),
    oldest: rank(living, (c) => ageOf(c, world.year), (c) => c.settlement, limit),
    mostChildren: rank(
      living,
      (c) => c.childrenIds.length,
      (c) => `${ageOf(c, world.year)} ans`,
      limit,
    ),
    bloodiest: rank(all, bloodOf, (c) => (c.alive ? 'vivant' : `mort en ${c.deathYear}`), limit),

    totalWealth,
    topOneShare: totalWealth > 0 ? topWealth / totalWealth : 0,
    classes: CLASS_ORDER.map((cls) => {
      const count = classCounts.get(cls) ?? 0;
      return { cls, count, share: living.length > 0 ? count / living.length : 0 };
    }).filter((row) => row.count > 0),
    causes,
    houses,
    settlements,
    jobs: [...jobCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1))
      .slice(0, 10),
  };
}

/** Statistiques de la lignée du joueur — l'écran « ma dynastie ». */
export interface DynastyStats {
  houseName: string | null;
  rank: HouseRank | null;
  prestige: number;
  law: string | null;
  founded: number | null;
  generations: number;
  livingDescendants: number;
  totalDescendants: number;
  deadDescendants: number;
  heads: { name: string; from: number; to: number | null }[];
  wealth: number;
  eldest: string | null;
}

/** Parcourt la descendance en largeur. Bornée : elle deviendra un LOD T3. */
export function descendantsOf(
  world: World,
  rootId: Character['id'],
  maxNodes = 20000,
): { all: Character[]; generations: number } {
  const seen = new Set<number>([rootId]);
  let frontier = [rootId];
  const all: Character[] = [];
  let generations = 0;

  while (frontier.length > 0 && all.length < maxNodes) {
    const next: typeof frontier = [];
    for (const id of frontier) {
      const c = world.get(id);
      if (!c) continue;
      for (const kid of c.childrenIds) {
        if (seen.has(kid)) continue;
        seen.add(kid);
        const child = world.get(kid);
        if (child) {
          all.push(child);
          next.push(kid);
        }
      }
    }
    if (next.length > 0) generations++;
    frontier = next;
  }
  return { all, generations };
}

export function dynastyStats(world: World): DynastyStats {
  const player = world.player;
  const house = world.house(player.houseId);
  const { all, generations } = descendantsOf(world, player.id);
  const livingKin = all.filter((c) => c.alive);

  const founderId = house?.founderId ?? player.id;
  const fromFounder = house ? descendantsOf(world, founderId) : { all, generations };

  return {
    houseName: house?.name ?? null,
    rank: house?.rank ?? null,
    prestige: Math.round(house?.prestige ?? 0),
    law: house?.law ?? null,
    founded: house?.foundedYear ?? null,
    generations: Math.max(generations, fromFounder.generations),
    livingDescendants: livingKin.length,
    totalDescendants: all.length,
    deadDescendants: all.length - livingKin.length,
    heads: (house?.headHistory ?? []).map((id) => {
      const c = world.get(id);
      return {
        name: c ? fullName(c) : '—',
        from: c?.birthYear ?? 0,
        to: c?.deathYear ?? null,
      };
    }),
    wealth:
      (house?.memberIds ?? [player.id]).reduce(
        (sum, id) => sum + Math.max(0, world.get(id)?.wealth ?? 0),
        0,
      ),
    eldest: (() => {
      const oldest = livingKin.sort(
        (a, b) => a.birthYear - b.birthYear || a.id - b.id,
      )[0];
      return oldest ? shortName(oldest) : null;
    })(),
  };
}
