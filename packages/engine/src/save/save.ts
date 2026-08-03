import type { RecordBook } from '../stats/records.js';
import type {
  Character,
  ChronicleEntry,
  EntityId,
  Faction,
  FlagValue,
  House,
  WorldTally,
  Memory,
  Relation,
  Seed,
} from '../model/types.js';
import { World, type NewsItem, type TagHit, type WorldMode } from '../world/world.js';
import type { Domain, Route } from '../model/domain.js';
import type { Holding, Retainer } from '../player/holdings.js';
import { RelationGraph } from '../world/relations.js';
import { emptyTally } from '../model/types.js';
import { ORGAN_IDS, newBody } from '../body/body.js';
import { MemoryStore } from '../world/memory.js';

/**
 * ADR-008 : instantané complet versionné, pas de rejeu d'event log.
 * Les paliers T2/T3 ne seront jamais sauvegardés — ils sont regénérés.
 */
export const SAVE_VERSION = 8;

export interface WorldSnapshot {
  version: number;
  seed: number;
  mode: WorldMode;
  year: number;
  playerId: EntityId;
  counters: { nextEntity: number; nextSeed: number };
  characters: Character[];
  houses: House[];
  factions: Faction[];
  domains: Domain[];
  routes: Route[];
  holdings: Holding[];
  retainers: [EntityId, Retainer[]][];
  relations: Relation[];
  memories: { nextId: number; rows: [EntityId, Memory[]][] };
  seeds: Seed[];
  chronicle: ChronicleEntry[];
  flags: Record<string, FlagValue>;
  cooldowns: Record<string, number>;
  tagHits: TagHit[];
  tally: WorldTally;
  records: RecordBook;
  news: NewsItem[];
}

export function snapshot(world: World): WorldSnapshot {
  return {
    version: SAVE_VERSION,
    seed: world.seed,
    mode: world.mode,
    year: world.year,
    playerId: world.playerId,
    counters: world.counters(),
    characters: [...world.characters.values()].sort((a, b) => a.id - b.id),
    houses: [...world.houses.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    factions: [...world.factions.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    domains: world.domainList(),
    routes: world.routes,
    holdings: [...world.holdings].sort((a, b) => a.id - b.id),
    retainers: [...world.retainers.entries()].sort((a, b) => a[0] - b[0]),
    relations: world.relations.toJSON(),
    memories: world.memories.toJSON(),
    seeds: world.seeds,
    chronicle: world.chronicle,
    flags: world.flags,
    cooldowns: world.cooldowns,
    tagHits: world.tagHits,
    tally: world.tally,
    records: world.records,
    news: world.news,
  };
}

export function restore(snap: WorldSnapshot): World {
  const world = new World({ seed: snap.seed, startYear: snap.year, mode: snap.mode });
  world.restoreCounters(snap.counters);
  world.setPlayer(snap.playerId);
  for (const c of snap.characters) world.characters.set(c.id, c);
  for (const h of snap.houses) world.houses.set(h.id, h);
  for (const f of snap.factions ?? []) world.factions.set(f.id, f);
  for (const d of snap.domains ?? []) world.domains.set(d.id, d);
  world.routes = snap.routes ?? [];
  world.holdings = snap.holdings ?? [];
  world.retainers = new Map(snap.retainers ?? []);
  for (const r of snap.relations) world.relations.set(r);
  const memories = MemoryStore.fromJSON(snap.memories);
  Object.assign(world, { memories });
  world.seeds = snap.seeds;
  world.chronicle = snap.chronicle;
  world.flags = snap.flags;
  world.cooldowns = snap.cooldowns;
  world.tagHits = snap.tagHits;
  world.tally = snap.tally;
  world.records = snap.records;
  world.news = snap.news ?? [];
  return world;
}

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Chaîne de migrations v(n) → v(n+1). Testée sur des sauvegardes de référence.
 * On n'en supprime jamais une : une vieille partie doit toujours pouvoir remonter.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2 : `paths` (voies de pouvoir) ajouté sur les personnages.
  1: (raw) => {
    const chars = (raw['characters'] as Record<string, unknown>[] | undefined) ?? [];
    for (const c of chars) {
      if (!Array.isArray(c['paths'])) c['paths'] = [];
      if (!Array.isArray(c['titles'])) c['titles'] = [];
    }
    raw['version'] = 2;
    return raw;
  },

  // v2 → v3 : statistiques du monde, records, lois de succession.
  // Les compteurs cumulés repartent de zéro pour une vieille partie : on ne
  // peut pas inventer un passé qui n'a pas été mesuré, et mentir serait pire.
  2: (raw) => {
    if (!raw['tally']) raw['tally'] = emptyTally();
    if (!raw['records']) raw['records'] = {};
    const houses = (raw['houses'] as Record<string, unknown>[] | undefined) ?? [];
    for (const h of houses) {
      if (!h['law']) h['law'] = 'primogeniture';
      if (!Array.isArray(h['headHistory'])) h['headHistory'] = [h['headId']].filter(Boolean);
      if (!Array.isArray(h['cadetIds'])) h['cadetIds'] = [];
    }
    raw['version'] = 3;
    return raw;
  },

  // v3 → v4 : le corps simulé. On le reconstruit depuis la génétique et on
  // recale les organes sur la santé constatée — c'est une approximation
  // assumée : on ne peut pas inventer un passé médical qui n'a pas eu lieu.
  3: (raw) => {
    const chars = (raw['characters'] as Record<string, unknown>[] | undefined) ?? [];
    for (const c of chars) {
      if (c['body']) continue;
      const hidden = (c['hidden'] as Record<string, number> | undefined) ?? {};
      const body = newBody(hidden['genetique'] ?? 50);
      const health = typeof c['health'] === 'number' ? c['health'] : 80;
      for (const id of ORGAN_IDS) {
        body.organs[id] = Math.max(1, Math.min(100, health + (body.organs[id] - 88) * 0.5));
      }
      c['body'] = body;
    }
    raw['version'] = 4;
    return raw;
  },

  // v4 → v5 : le fil de nouvelles. Une vieille partie repart sans passé
  // rapporté : les PNJ n'agissaient pas, il n'y a rien à raconter.
  4: (raw) => {
    if (!Array.isArray(raw['news'])) raw['news'] = [];
    const tally = raw['tally'] as Record<string, unknown> | undefined;
    if (tally && !tally['npcActions']) tally['npcActions'] = {};
    raw['version'] = 5;
    return raw;
  },

  // v5 → v6 : les factions et le système de conflit. Une vieille partie n'en
  // a aucune : elles se découvriront d'elles-mêmes dès que les serments
  // auront tissé assez de réseau.
  5: (raw) => {
    if (!Array.isArray(raw['factions'])) raw['factions'] = [];
    const tally = raw['tally'] as Record<string, unknown> | undefined;
    if (tally) {
      for (const k of ['factionsFounded', 'factionsDissolved', 'clashes', 'fallen']) {
        if (typeof tally[k] !== 'number') tally[k] = 0;
      }
    }
    raw['version'] = 6;
    return raw;
  },

  // v6 → v7 : les domaines, les prix locaux et les gouvernements. Une vieille
  // partie repart sans : ils seront resemés au chargement, avec les stocks à
  // zéro. On ne peut pas inventer une économie qui n'a pas eu lieu.
  6: (raw) => {
    if (!Array.isArray(raw['domains'])) raw['domains'] = [];
    if (!Array.isArray(raw['routes'])) raw['routes'] = [];
    const tally = raw['tally'] as Record<string, unknown> | undefined;
    if (tally && typeof tally['upheavals'] !== 'number') tally['upheavals'] = 0;
    raw['version'] = 7;
    return raw;
  },

  // v7 → v8 : le patrimoine et la domesticité. Une vieille partie ne possède
  // rien : on ne peut pas inventer une maison qu'on n'a jamais achetée.
  7: (raw) => {
    if (!Array.isArray(raw['holdings'])) raw['holdings'] = [];
    if (!Array.isArray(raw['retainers'])) raw['retainers'] = [];
    raw['version'] = 8;
    return raw;
  },
};

export function migrate(raw: Record<string, unknown>): WorldSnapshot {
  let current = raw;
  let version = Number(current['version'] ?? 1);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(
        `Sauvegarde en version ${version} : aucune migration vers ${version + 1}.`,
      );
    }
    current = step(current);
    const next = Number(current['version'] ?? version + 1);
    if (next <= version) throw new Error('Migration sans progression de version');
    version = next;
  }
  if (version > SAVE_VERSION) {
    throw new Error(
      `Sauvegarde en version ${version}, plus récente que le jeu (${SAVE_VERSION}).`,
    );
  }
  return current as unknown as WorldSnapshot;
}

/** Empreinte de l'état du monde — sert au test de non-régression du déterminisme. */
export function worldHash(world: World): string {
  const snap = snapshot(world);
  const json = JSON.stringify(snap);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < json.length; i++) {
    const ch = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + ch, 0x85ebca6b) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}
