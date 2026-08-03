import { describe, it, expect } from 'vitest';
import { loadRuleset } from '@ed/content';
import {
  ActionIndex,
  Simulation,
  chooseAction,
  computeDrives,
  createLife,
  emptyCast,
  readRelations,
  topDrives,
  Rng,
  snapshot,
  restore,
  worldHash,
  type NpcActionDef,
  type Situation,
} from '@ed/engine';

const ruleset = loadRuleset();

function world(seed: number, population = 40) {
  const sim = new Simulation(ruleset, {
    seed,
    startYear: 1000,
    mode: 'chronique',
    population,
  });
  createLife(sim.world, ruleset, new Rng(seed));
  return sim;
}

function situationFor(sim: ReturnType<typeof world>, id: number): Situation {
  const self = [...sim.world.characters.values()].find((c) => c.id === id);
  if (!self) throw new Error('personnage absent');
  const cast = emptyCast();
  const read = readRelations(sim.world, self, cast);
  return {
    self,
    world: sim.world,
    ruleset,
    age: sim.world.year - self.birthYear,
    cast,
    grudge: read.grudge,
    allies: read.allies,
    enemies: read.enemies,
    bonds: read.bonds,
    kids: self.childrenIds.length,
    upkeep: 320,
    danger: 20,
  };
}

describe('pulsions', () => {
  it('un mourant sans le sou veut d\'abord survivre', () => {
    const sim = world(11, 0);
    const c = sim.world.player;
    c.health = 10;
    c.wealth = 0;
    const drives = computeDrives(situationFor(sim, c.id));
    expect(topDrives(drives, 1, 0)[0]).toBe('survie');
  });

  it('un vieillard installé cherche à laisser quelque chose', () => {
    const sim = world(12, 0);
    const c = sim.world.player;
    c.birthYear = sim.world.year - 74;
    c.health = 85;
    c.wealth = 90000;
    c.mood = 70;
    c.hidden.ambition = 10;
    c.stats.intelligence = 40;
    const drives = computeDrives(situationFor(sim, c.id));
    expect(drives.sens).toBeGreaterThan(drives.survie);
    expect(drives.sens).toBeGreaterThan(drives.richesse);
  });

  it('le caractère penche la balance, et il vient du contenu', () => {
    const sim = world(13, 0);
    const c = sim.world.player;
    c.birthYear = sim.world.year - 30;
    c.hidden.ambition = 50;
    const sobre = computeDrives(situationFor(sim, c.id)).statut;
    c.traits.push('ambitieux');
    const avide = computeDrives(situationFor(sim, c.id)).statut;
    expect(avide).toBeGreaterThan(sobre);
    // et le moteur ne connaît pas le mot « ambitieux » : il lit `drives`
    expect(ruleset.traits['ambitieux']?.drives?.statut).toBeGreaterThan(0);
  });

  it('deux personnages identiques veulent exactement la même chose', () => {
    const sim = world(14, 0);
    const a = sim.world.player;
    const drives1 = computeDrives(situationFor(sim, a.id));
    const drives2 = computeDrives(situationFor(sim, a.id));
    expect(drives2).toEqual(drives1);
  });
});

describe('choix utilitaire', () => {
  const nourrir: NpcActionDef = {
    id: 'test.manger',
    label: 'manger',
    serves: { survie: 1 },
    effects: () => [{ k: 'wealth', d: 1 }],
  };
  const briller: NpcActionDef = {
    id: 'test.briller',
    label: 'briller',
    serves: { statut: 1 },
    effects: () => [{ k: 'wealth', d: 1 }],
  };

  it('choisit une conduite qui apaise le manque le plus criant', () => {
    const sim = world(15, 0);
    const c = sim.world.player;
    c.birthYear = sim.world.year - 30;
    c.health = 8;
    c.wealth = 0;
    c.hidden.ambition = 0;
    const sit = situationFor(sim, c.id);
    const idx = new ActionIndex([nourrir, briller]);
    const decision = chooseAction(sit, computeDrives(sit), idx, new Rng(1));
    expect(decision?.def.id).toBe('test.manger');
  });

  it('ne choisit rien quand rien ne manque', () => {
    const sim = world(16, 0);
    const c = sim.world.player;
    c.birthYear = sim.world.year - 30;
    c.health = 100;
    c.wealth = 999999;
    c.mood = 90;
    c.hidden.ambition = 0;
    c.hidden.corruption = 0;
    c.hidden.influence = 0;
    c.hidden.destinee = 0;
    c.stats.intelligence = 30;
    const sit = situationFor(sim, c.id);
    const idx = new ActionIndex([nourrir, briller]);
    expect(chooseAction(sit, computeDrives(sit), idx, new Rng(2))).toBeNull();
  });

  it('écarte une conduite hors d\'âge ou en délai de reprise', () => {
    const sim = world(17, 0);
    const c = sim.world.player;
    c.birthYear = sim.world.year - 30;
    c.health = 5;
    const sit = situationFor(sim, c.id);
    const tardif: NpcActionDef = { ...nourrir, minAge: 60 };
    expect(chooseAction(sit, computeDrives(sit), new ActionIndex([tardif]), new Rng(3))).toBeNull();

    c.flags['ai:test.manger'] = sim.world.year - 1;
    const repos: NpcActionDef = { ...nourrir, cooldown: 5 };
    expect(chooseAction(sit, computeDrives(sit), new ActionIndex([repos]), new Rng(3))).toBeNull();
  });
});

describe('le monde tourne sans le joueur', () => {
  it('les PNJ agissent, et toutes les conduites écrites finissent par sortir', () => {
    const sim = world(2026, 70);
    for (let i = 0; i < 160; i++) {
      const opening = sim.openYear();
      for (const pending of opening.events) {
        const first = pending.options.find((o) => !o.locked);
        if (first) sim.resolveEvent(pending, first.id);
      }
      sim.closeYear();
    }
    const used = sim.world.tally.npcActions;
    const total = Object.values(used).reduce((n, v) => n + v, 0);
    expect(total).toBeGreaterThan(2000);

    // Du contenu jamais déclenché est du contenu mort. On tolère la traîne
    // (le meurtre entre voisins doit rester exceptionnel), pas le désert.
    const jamais = ruleset.npcActions.filter((a) => !used[a.id]);
    expect(jamais.length).toBeLessThanOrEqual(3);

    // …et aucune conduite n'écrase les autres.
    const top = Math.max(...Object.values(used));
    expect(top / total).toBeLessThan(0.45);
  });

  it('fabrique des inimitiés, et elles ne guérissent pas toutes seules', () => {
    const sim = world(4242, 70);
    for (let i = 0; i < 120; i++) {
      sim.openYear();
      sim.closeYear();
    }
    const haines = sim.world.relations.all().filter((r) => r.affection <= -45);
    expect(haines.length).toBeGreaterThan(3);
  });

  it('remplit un fil de nouvelles borné', () => {
    const sim = world(99, 60);
    for (let i = 0; i < 80; i++) {
      sim.openYear();
      sim.closeYear();
    }
    expect(sim.world.news.length).toBeGreaterThan(20);
    expect(sim.world.news.length).toBeLessThanOrEqual(240);
    for (const item of sim.world.recentNews(10)) {
      expect(item.year).toBeGreaterThanOrEqual(sim.world.year - 10);
      expect(item.text.length).toBeGreaterThan(5);
    }
  });

  it('reste reproductible après un aller-retour par la sauvegarde', () => {
    const a = world(777, 50);
    const b = new Simulation(ruleset, restore(JSON.parse(JSON.stringify(snapshot(a.world)))));
    for (let i = 0; i < 12; i++) {
      a.openYear();
      a.closeYear();
      b.openYear();
      b.closeYear();
    }
    expect(worldHash(b.world)).toBe(worldHash(a.world));
  });
});
