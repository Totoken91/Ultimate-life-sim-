import { describe, expect, it } from 'vitest';
import {
  MIGRATIONS,
  SAVE_VERSION,
  Rng,
  Simulation,
  createLife,
  migrate,
  restore,
  snapshot,
  worldHash,
} from '@ed/engine';
import { loadRuleset } from '@ed/content';

const ruleset = loadRuleset();

function freshWorld(seed = 4242) {
  const sim = new Simulation(ruleset, { seed, startYear: 400, mode: 'legende' });
  createLife(sim.world, ruleset, new Rng(seed).fork('newlife'));
  for (let i = 0; i < 15; i++) {
    sim.openYear();
    sim.closeYear();
  }
  return sim;
}

describe('sauvegarde', () => {
  it('conserve l\'état au bit près', () => {
    const sim = freshWorld();
    const before = worldHash(sim.world);
    const restored = restore(JSON.parse(JSON.stringify(snapshot(sim.world))));
    expect(worldHash(restored)).toBe(before);
  });

  it('conserve les relations, souvenirs et graines', () => {
    const sim = freshWorld(777);
    const snap = JSON.parse(JSON.stringify(snapshot(sim.world)));
    const restored = restore(snap);
    expect(restored.relations.all().length).toBe(sim.world.relations.all().length);
    expect(restored.seeds.length).toBe(sim.world.seeds.length);
    expect(restored.chronicle.length).toBe(sim.world.chronicle.length);
    const playerMemories = sim.world.memories.of(sim.world.playerId).length;
    expect(restored.memories.of(restored.playerId).length).toBe(playerMemories);
  });

  it('permet de reprendre la simulation à l\'identique après rechargement', () => {
    const a = freshWorld(31337);
    const snap = JSON.parse(JSON.stringify(snapshot(a.world)));
    const b = new Simulation(ruleset, restore(snap));

    for (let i = 0; i < 5; i++) {
      a.openYear();
      a.closeYear();
      b.openYear();
      b.closeYear();
    }
    expect(worldHash(b.world)).toBe(worldHash(a.world));
  });

  it('migre une sauvegarde v1 vers la version courante', () => {
    const sim = freshWorld(2024);
    const snap = JSON.parse(JSON.stringify(snapshot(sim.world))) as Record<string, unknown>;
    // on rétrograde artificiellement en v1
    snap['version'] = 1;
    delete snap['tally'];
    delete snap['records'];
    for (const ch of snap['characters'] as Record<string, unknown>[]) {
      delete ch['paths'];
      delete ch['titles'];
    }
    for (const h of snap['houses'] as Record<string, unknown>[]) {
      delete h['law'];
      delete h['headHistory'];
      delete h['cadetIds'];
    }
    const migrated = migrate(snap);
    expect(migrated.version).toBe(SAVE_VERSION);
    const restored = restore(migrated);
    for (const ch of restored.characters.values()) {
      expect(Array.isArray(ch.paths)).toBe(true);
      expect(Array.isArray(ch.titles)).toBe(true);
    }
    // v2 → v3 : les compteurs et le livre des records existent, vides.
    expect(restored.tally.deathsByCause).toBeDefined();
    expect(restored.records).toBeDefined();
    for (const house of restored.houses.values()) {
      expect(house.law).toBe('primogeniture');
      expect(Array.isArray(house.headHistory)).toBe(true);
    }
  });

  it('refuse une sauvegarde plus récente que le jeu', () => {
    expect(() => migrate({ version: SAVE_VERSION + 5 })).toThrow(/plus récente/);
  });

  it('refuse une version sans migration disponible', () => {
    expect(() => migrate({ version: 0 })).toThrow(/aucune migration/i);
  });

  it('déclare une migration pour chaque version antérieure', () => {
    for (let v = 1; v < SAVE_VERSION; v++) {
      expect(MIGRATIONS[v], `migration manquante v${v} → v${v + 1}`).toBeTypeOf('function');
    }
  });
});
