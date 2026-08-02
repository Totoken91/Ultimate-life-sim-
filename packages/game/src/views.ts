import {
  CLASS_LABELS,
  STAT_IDS,
  STAT_SHORT,
  ageOf,
  band,
  describeFeeling,
  describeHealth,
  describeMood,
  describeWealth,
  effectiveStat,
  fullName,
  lifeStage,
  relevance,
  shortName,
  type Character,
  type EntityId,
  type StatId,
} from '@ed/engine';
import type { Game } from './game.js';

export interface StatusView {
  name: string;
  year: number;
  age: number;
  stage: string;
  settlement: string;
  house: string | null;
  socialClass: string;
  job: string | null;
  health: string;
  healthValue: number;
  mood: string;
  moodValue: number;
  wealth: string;
  stats: { id: StatId; short: string; value: number }[];
  titles: string[];
}

export function status(game: Game): StatusView {
  const p = game.player;
  const world = game.world;
  const house = world.house(p.houseId);
  const job = p.jobId ? game.ruleset.jobs[p.jobId] : undefined;
  return {
    name: fullName(p),
    year: world.year,
    age: game.age,
    stage: lifeStage(game.age),
    settlement: world.settlement(p.settlement)?.name ?? p.settlement,
    house: house ? `Maison ${house.name}` : null,
    socialClass: CLASS_LABELS[p.socialClass],
    job: job?.label ?? null,
    health: describeHealth(p),
    healthValue: p.health,
    mood: describeMood(p),
    moodValue: p.mood,
    wealth: describeWealth(p.wealth),
    stats: STAT_IDS.map((id) => ({
      id,
      short: STAT_SHORT[id],
      value: effectiveStat(p, id),
    })),
    titles: [...p.titles],
  };
}

export interface RelationView {
  id: EntityId;
  name: string;
  age: number;
  label: string;
  /** Ce que *l'autre* ressent pour vous — c'est ça qui compte. */
  feeling: string;
  affection: number;
  alive: boolean;
  isSpouse: boolean;
  isChild: boolean;
}

export function relations(game: Game, includeDead = false): RelationView[] {
  const world = game.world;
  const p = game.player;
  const out: RelationView[] = [];
  for (const rel of world.relations.from(p.id)) {
    const other = world.get(rel.to);
    if (!other) continue;
    if (!other.alive && !includeDead) continue;
    const back = world.relations.get(other.id, p.id);
    out.push({
      id: other.id,
      name: shortName(other),
      age: ageOf(other, world.year),
      label: rel.label,
      feeling: back ? describeFeeling(back) : 'vous connaît à peine',
      affection: back?.affection ?? 0,
      alive: other.alive,
      isSpouse: p.spouseId === other.id,
      isChild: p.childrenIds.includes(other.id),
    });
  }
  out.sort(
    (a, b) =>
      Number(b.isSpouse) - Number(a.isSpouse) ||
      Number(b.isChild) - Number(a.isChild) ||
      b.affection - a.affection ||
      a.id - b.id,
  );
  return out;
}

export interface SelfView {
  traits: { label: string; desc: string; kind: string }[];
  skills: { label: string; value: number; band: string }[];
  injuries: string[];
  memories: { year: number; text: string }[];
  paths: string[];
  children: { name: string; age: number; alive: boolean }[];
}

export function self(game: Game): SelfView {
  const p = game.player;
  const world = game.world;
  const rs = game.ruleset;

  const traits = p.traits
    .map((id) => rs.traits[id])
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ label: t.label, desc: t.desc, kind: t.kind }));

  const skills = Object.entries(p.skills)
    .filter(([, v]) => v >= 1)
    .map(([id, v]) => ({ label: rs.skills[id]?.label ?? id, value: Math.round(v), band: band(v) }))
    .sort((a, b) => b.value - a.value);

  const memories = world.memories
    .recent(p.id, 10, world.year)
    .filter((m) => relevance(m, world.year) > 2)
    .map((m) => ({ year: m.year, text: m.text }));

  const children = p.childrenIds
    .map((id) => world.get(id))
    .filter((c): c is Character => !!c)
    .map((c) => ({ name: shortName(c), age: ageOf(c, world.year), alive: c.alive }));

  return {
    traits,
    skills,
    injuries: p.injuries.map((i) => i.label),
    memories,
    paths: [...p.paths],
    children,
  };
}

export interface WorldView {
  settlement: { name: string; description: string; size: string; danger: string };
  year: number;
  mode: string;
  activeSeeds: number;
  knownPeople: number;
}

export function worldView(game: Game): WorldView {
  const world = game.world;
  const s = world.settlement(game.player.settlement);
  return {
    settlement: {
      name: s?.name ?? game.player.settlement,
      description: s?.description ?? '',
      size: s?.size ?? '',
      danger:
        (s?.danger ?? 0) > 65 ? 'très dangereux' : (s?.danger ?? 0) > 40 ? 'rude' : 'calme',
    },
    year: world.year,
    mode: world.mode,
    activeSeeds: world.seeds.length,
    knownPeople: world.relations.from(game.player.id).length,
  };
}
