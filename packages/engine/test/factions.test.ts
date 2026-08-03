import { describe, it, expect } from 'vitest';
import { loadRuleset } from '@ed/content';
import {
  Rng,
  Simulation,
  clash,
  createLife,
  fighterValue,
  joinName,
  ofName,
  power,
  restore,
  sideOf,
  snapshot,
  tierOf,
  worldHash,
  type Side,
} from '@ed/engine';

const ruleset = loadRuleset();

function world(seed: number, population = 70) {
  const sim = new Simulation(ruleset, { seed, startYear: 1000, mode: 'chronique', population });
  createLife(sim.world, ruleset, new Rng(seed));
  return sim;
}

function run(sim: ReturnType<typeof world>, years: number): void {
  for (let i = 0; i < years; i++) {
    const opening = sim.openYear();
    for (const pending of opening.events) {
      const first = pending.options.find((o) => !o.locked);
      if (first) sim.resolveEvent(pending, first.id);
    }
    sim.closeYear();
  }
}

const troupe = (over: Partial<Side>): Side => ({
  id: 'x',
  label: 'les gens de X',
  heads: 10,
  quality: 50,
  tech: 1,
  morale: 55,
  command: 50,
  ground: 1,
  supply: 1,
  ...over,
});

describe('le système de conflit', () => {
  it('déduit le palier des effectifs, du duel à l\'extinction', () => {
    expect(tierOf(2)).toBe(0);
    expect(tierOf(8)).toBe(1);
    expect(tierOf(60)).toBe(2);
    expect(tierOf(3000)).toBe(3);
    expect(tierOf(50_000)).toBe(4);
    expect(tierOf(5_000_000)).toBe(6);
    expect(tierOf(500_000_000)).toBe(7);
  });

  it('mille lanciers ne battent pas une escouade blindée', () => {
    // Un lancier est au palier 1, une escouade mécanisée au palier 6 : c'est
    // ce saut-là que le carré rend infranchissable, pas un écart d'une ère.
    const lanciers = troupe({ heads: 1000, tech: 1, id: 'a', label: 'les lanciers' });
    const blindes = troupe({ heads: 20, tech: 6, id: 'b', label: 'l\'escouade' });
    expect(power(blindes)).toBeGreaterThan(power(lanciers));
    // « Jamais » veut dire jamais : le hasard borné ne renverse pas ce saut.
    for (let i = 0; i < 60; i++) {
      expect(clash(lanciers, blindes, new Rng(i)).winner).toBe('b');
    }
  });

  it('mais un écart d\'une seule ère ne compense pas n\'importe quel nombre', () => {
    // Le carré est fort, il n'est pas magique. Sinon la guerre asymétrique
    // deviendrait une formalité et le nombre ne servirait plus à rien.
    const foule = troupe({ heads: 2000, tech: 1 });
    const mieuxArmes = troupe({ heads: 20, tech: 2, label: 'les vétérans' });
    expect(power(foule)).toBeGreaterThan(power(mieuxArmes));
  });

  it('le nombre compte, mais sous-linéairement', () => {
    const dix = power(troupe({ heads: 10 }));
    const cent = power(troupe({ heads: 100 }));
    expect(cent).toBeGreaterThan(dix * 4);
    expect(cent).toBeLessThan(dix * 10);
  });

  it('le hasard ne renverse pas un rapport de forces écrasant', () => {
    const fort = troupe({ heads: 400, id: 'a' });
    const faible = troupe({ heads: 5, id: 'b', label: 'les trois pelés' });
    for (let i = 0; i < 40; i++) {
      expect(clash(fort, faible, new Rng(i)).winner).toBe('a');
    }
  });

  it('le vainqueur saigne aussi, et une victoire arrachée coûte cher', () => {
    const a = troupe({ heads: 60, id: 'a' });
    const b = troupe({ heads: 58, id: 'b', label: 'les autres' });
    const serree = clash(a, b, new Rng(7));
    const ecrasante = clash(troupe({ heads: 300, id: 'a' }), b, new Rng(7));
    expect(serree.lossA).toBeGreaterThan(0);
    expect(ecrasante.lossA).toBeLessThan(serree.lossA);
  });

  it('ne tue jamais plus de combattants nommés qu\'il n\'y en a', () => {
    const sim = world(5, 0);
    const gens = [sim.world.player];
    const side = sideOf('a', 'nous', gens, sim.world.player);
    const result = clash(side, troupe({ heads: 900, id: 'b' }), new Rng(3));
    expect(result.deadA.length).toBeLessThanOrEqual(gens.length);
  });

  it('la valeur d\'un combattant tient compte des blessures et de la santé', () => {
    const sim = world(6, 0);
    const c = sim.world.player;
    c.stats.force = 80;
    c.health = 100;
    const entier = fighterValue(c);
    c.health = 25;
    expect(fighterValue(c)).toBeLessThan(entier);
  });
});

describe('la grammaire des noms de groupes', () => {
  it('ne produit ni « de de Toven » ni « de Erisgar »', () => {
    expect(joinName('le comptoir de', 'de Toven')).toBe('le comptoir de Toven');
    expect(joinName('les hommes de', 'Erisgar')).toBe("les hommes d'Erisgar");
    expect(joinName('la bande à', 'du Sarrach')).toBe('la bande du Sarrach');
    expect(joinName('les gens de', 'Vaur')).toBe('les gens de Vaur');
  });

  it('contracte l\'article quand on parle du groupe', () => {
    expect(ofName('les gens de Zaman')).toBe('des gens de Zaman');
    expect(ofName('le comptoir de Toven')).toBe('du comptoir de Toven');
    expect(ofName('la bande à Feln')).toBe('de la bande à Feln');
    expect(ofName("l'ordre de Vaur")).toBe("de l'ordre de Vaur");
  });
});

describe('les factions', () => {
  it('naissent du réseau de serments, sans que le moteur les décrète', () => {
    const sim = world(4242);
    run(sim, 140);
    expect(sim.world.tally.factionsFounded).toBeGreaterThan(3);
    for (const f of sim.world.activeFactions()) {
      // toute faction debout a un chef vivant et des membres
      const leader = sim.world.get(f.leaderId);
      expect(leader).toBeDefined();
      expect(f.memberIds.length).toBeGreaterThan(0);
      expect(f.name.length).toBeGreaterThan(3);
    }
  });

  it('ne porte jamais deux fois le même nom', () => {
    const sim = world(88);
    run(sim, 140);
    const noms = sim.world.activeFactions().map((f) => f.name);
    expect(new Set(noms).size).toBe(noms.length);
  });

  it('se dissolvent quand il ne reste plus personne', () => {
    const sim = world(4242);
    run(sim, 160);
    expect(sim.world.tally.factionsDissolved).toBeGreaterThan(0);
    for (const f of sim.world.factions.values()) {
      if (f.dissolvedYear !== null) continue;
      const vivants = f.memberIds.filter((id) => sim.world.get(id)?.alive).length;
      expect(vivants).toBeGreaterThan(0);
    }
  });

  it('se font la guerre sans excès : ni jamais, ni chaque année', () => {
    const sim = world(4242);
    run(sim, 160);
    const parAn = sim.world.tally.clashes / 160;
    expect(sim.world.tally.clashes).toBeGreaterThan(0);
    expect(parAn).toBeLessThan(1);
    expect(sim.world.tally.fallen).toBeGreaterThan(0);
  });

  it('ne laissent pas les trésors enfler sans fin — la solde borne tout', () => {
    const sim = world(4242);
    run(sim, 200);
    for (const f of sim.world.activeFactions()) {
      expect(f.treasury).toBeGreaterThanOrEqual(0);
      expect(f.treasury).toBeLessThan(2_000_000);
    }
  });

  it('survivent à un aller-retour par la sauvegarde, au bit près', () => {
    const a = world(31337, 50);
    run(a, 60);
    const b = new Simulation(ruleset, restore(JSON.parse(JSON.stringify(snapshot(a.world)))));
    expect(b.world.factions.size).toBe(a.world.factions.size);
    for (let i = 0; i < 10; i++) {
      a.openYear();
      a.closeYear();
      b.openYear();
      b.closeYear();
    }
    expect(worldHash(b.world)).toBe(worldHash(a.world));
  });

  it('l\'élagage ne laisse jamais une faction menée par un mort effacé', () => {
    const sim = world(2026, 60);
    run(sim, 200);
    for (const f of sim.world.activeFactions()) {
      expect(sim.world.get(f.leaderId)).toBeDefined();
      for (const id of f.memberIds) expect(sim.world.get(id)).toBeDefined();
    }
  });
});
