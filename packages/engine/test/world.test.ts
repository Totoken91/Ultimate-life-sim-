import { describe, expect, it } from 'vitest';
import {
  MemoryStore,
  RelationGraph,
  World,
  asEntityId,
  band,
  describeFeeling,
  drift,
  relevance,
  wealthBand,
} from '@ed/engine';

const id = asEntityId;

describe('RelationGraph', () => {
  it('les arêtes sont dirigées : A peut aimer B qui le méprise', () => {
    const g = new RelationGraph();
    g.ensure(id(1), id(2), 'amour', 'aimé', 400);
    g.ensure(id(2), id(1), 'rivalite', 'l\'importun', 400);
    g.modify(id(1), id(2), { affection: 80 });
    g.modify(id(2), id(1), { affection: -60 });

    expect(g.get(id(1), id(2))?.affection).toBe(80);
    expect(g.get(id(2), id(1))?.affection).toBe(-60);
  });

  it('indexe dans les deux sens', () => {
    const g = new RelationGraph();
    g.ensure(id(1), id(2), 'amitie', 'ami', 400);
    g.ensure(id(3), id(2), 'haine', 'ennemi', 400);
    expect(g.from(id(1)).map((r) => r.to)).toEqual([id(2)]);
    expect(g.toward(id(2)).map((r) => r.from)).toEqual([id(1), id(3)]);
  });

  it('renvoie toujours les relations dans un ordre déterministe', () => {
    const g = new RelationGraph();
    for (const target of [9, 3, 7, 5]) g.ensure(id(1), id(target), 'amitie', 'x', 400);
    expect(g.from(id(1)).map((r) => r.to)).toEqual([id(3), id(5), id(7), id(9)]);
  });

  it('borne les valeurs', () => {
    const g = new RelationGraph();
    g.ensure(id(1), id(2), 'amitie', 'ami', 400);
    g.modify(id(1), id(2), { affection: 500, fear: -50 });
    expect(g.get(id(1), id(2))?.affection).toBe(100);
    expect(g.get(id(1), id(2))?.fear).toBe(0);
  });

  it('supprime proprement une entité', () => {
    const g = new RelationGraph();
    g.ensure(id(1), id(2), 'amitie', 'ami', 400);
    g.ensure(id(2), id(1), 'amitie', 'ami', 400);
    g.removeEntity(id(2));
    expect(g.from(id(1))).toEqual([]);
    expect(g.all()).toEqual([]);
  });

  it('survit à un aller-retour JSON', () => {
    const g = new RelationGraph();
    g.ensure(id(1), id(2), 'dette', 'créancier', 401);
    g.modify(id(1), id(2), { trust: -30 });
    const back = RelationGraph.fromJSON(JSON.parse(JSON.stringify(g.toJSON())));
    expect(back.get(id(1), id(2))?.trust).toBe(-30);
  });

  it('décrit un sentiment de façon lisible', () => {
    const g = new RelationGraph();
    const rel = g.ensure(id(1), id(2), 'haine', 'x', 400);
    rel.affection = -90;
    expect(describeFeeling(rel)).toBe('vous hait');
    rel.affection = 10;
    rel.fear = 80;
    expect(describeFeeling(rel)).toBe('vous craint');
  });
});

describe('MemoryStore', () => {
  it('respecte son budget en oubliant le moins pertinent', () => {
    const store = new MemoryStore();
    for (let i = 0; i < 60; i++) {
      store.add(id(1), { year: 400, text: `m${i}`, salience: i + 1, actors: [], tags: [] }, 20);
    }
    expect(store.of(id(1)).length).toBe(20);
    const kept = store.of(id(1)).map((m) => m.salience);
    expect(Math.min(...kept)).toBeGreaterThan(30);
  });

  it('la pertinence décroît avec le temps mais résiste à l\'émotion', () => {
    const fort = { id: 1, year: 400, text: '', salience: 90, actors: [], tags: [] };
    const faible = { id: 2, year: 400, text: '', salience: 10, actors: [], tags: [] };
    // un souvenir chargé tient des décennies, un souvenir tiède s'efface vite
    expect(relevance(fort, 430)).toBeGreaterThan(relevance(fort, 400) * 0.5);
    expect(relevance(faible, 430)).toBeLessThan(relevance(faible, 400) * 0.25);
    expect(relevance(faible, 430)).toBeLessThan(relevance(fort, 430) / 20);
  });

  it('retrouve les souvenirs impliquant quelqu\'un', () => {
    const store = new MemoryStore();
    store.add(id(1), { year: 400, text: 'a', salience: 50, actors: [id(2)], tags: [] });
    store.add(id(1), { year: 401, text: 'b', salience: 50, actors: [id(3)], tags: [] });
    expect(store.about(id(1), id(2), 402).map((m) => m.text)).toEqual(['a']);
  });
});

describe('World', () => {
  it('mesure la pression d\'un tag sur une fenêtre glissante', () => {
    const w = new World({ seed: 1, startYear: 400, mode: 'legende' });
    w.noteTags(['trahison']);
    w.year = 405;
    w.noteTags(['trahison']);
    w.year = 430;
    expect(w.tagPressure('trahison', 12)).toBe(0);
    expect(w.tagPressure('trahison', 40)).toBe(2);
  });

  it('vide son journal une seule fois', () => {
    const w = new World({ seed: 1, startYear: 400, mode: 'legende' });
    w.say('a');
    expect(w.drainLog()).toEqual(['a']);
    expect(w.drainLog()).toEqual([]);
  });
});

describe('présentation des valeurs', () => {
  it('les bandes viennent avant les chiffres', () => {
    expect(band(0)).toBe('nul');
    expect(band(50)).toBe('modeste');
    expect(band(100)).toBe('légendaire');
    expect(wealthBand(-50)).toBe('endetté');
    // Ces mots ne reprennent volontairement aucun label de classe sociale
    // (doc 18 §3) : deux échelles qui partagent leur vocabulaire se lisent
    // comme une contradiction.
    expect(wealthBand(5000)).toBe('de quoi voir venir');
    expect(wealthBand(20000)).toBe('bien pourvu');
    expect(wealthBand(10 ** 9)).toBe('démesuré');
  });

  it('drift approche la cible sans la dépasser', () => {
    expect(drift(0, 100, 0.5)).toBe(50);
    expect(drift(0, 100, 2)).toBe(100);
  });
});
