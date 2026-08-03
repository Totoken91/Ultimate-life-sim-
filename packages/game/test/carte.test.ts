import { describe, expect, it } from 'vitest';
import { Game, Observer } from '@ed/game';
import { loadRuleset } from '@ed/content';
import { homePath, levelOf, tileMap } from '@ed/engine';

const ruleset = loadRuleset();

const nouveau = (seed: number): Game => {
  const g = Game.create(ruleset, { seed, mode: 'chronique' });
  g.submit({ t: 'advance' });
  return g;
};

describe('la carte', () => {
  it('descend de l\'univers au monde habité sans se perdre', () => {
    const g = nouveau(4242);
    const chez = homePath(g.world.seed);
    let path = 'u';
    const paliers: string[] = [];

    for (;;) {
      const m = tileMap(g.world, path);
      paliers.push(m.level);
      if (!m.home) break;
      // On descend d'exactement un cran vers chez soi.
      path = `${path}/${m.home.slice(path.length + 1).split('/')[0]}`;
    }

    // Cinq clics séparent le vide absolu du sol où l'on vit.
    expect(paliers).toEqual(['univers', 'galaxie', 'secteur', 'systeme', 'monde']);
    expect(path).toBe(chez);
    const monde = tileMap(g.world, path);
    expect(monde.tiles.some((t) => t.domainId !== null)).toBe(true);
  });

  it('donne toujours le même ciel pour la même graine, et un autre pour une autre', () => {
    const a = tileMap(nouveau(7).world, 'u/3/4');
    const b = tileMap(nouveau(7).world, 'u/3/4');
    const c = tileMap(nouveau(8).world, 'u/3/4');
    expect(a.tiles.map((t) => t.kind)).toEqual(b.tiles.map((t) => t.kind));
    expect(a.tiles.map((t) => t.name)).toEqual(b.tiles.map((t) => t.name));
    expect(a.tiles.map((t) => t.name)).not.toEqual(c.tiles.map((t) => t.name));
  });

  it('ne laisse jamais entrer dans le vide', () => {
    const g = nouveau(11);
    for (const path of ['u', 'u/0', 'u/0/1', 'u/0/1/2']) {
      for (const t of tileMap(g.world, path).tiles) {
        if (!t.enterable) expect(t.name).toBe('—');
      }
    }
  });

  it('pose les domaines simulés sur les tuiles du monde', () => {
    const g = nouveau(4242);
    const monde = tileMap(g.world, homePath(g.world.seed));
    const regions = monde.tiles.filter((t) => t.domainId);
    expect(regions.length).toBeGreaterThan(0);
    for (const t of regions) {
      expect(g.world.domains.has(t.domainId as string)).toBe(true);
      expect(t.note).toMatch(/âmes/);
      // On descend dans une région : ses implantations sont là.
      const dedans = tileMap(g.world, t.path);
      expect(levelOf(t.path)).toBe('region');
      expect(dedans.tiles.filter((x) => x.domainId).length).toBeGreaterThan(0);
    }
  });
});

describe('l\'observatoire', () => {
  it('fait tourner un monde sans qu\'on décide quoi que ce soit', () => {
    const obs = Observer.create(ruleset, { seed: 4242, mode: 'chronique', chapter: 20 });
    const debut = obs.year;
    const ch = obs.next();
    expect(ch.from).toBe(debut);
    expect(ch.to).toBeGreaterThanOrEqual(debut + 20);
    expect(ch.headline.length).toBeGreaterThan(3);
    expect(ch.population).toBeGreaterThan(0);
  });

  it('traverse les siècles et les successions sans s\'arrêter', () => {
    const obs = Observer.create(ruleset, { seed: 12, mode: 'chronique', chapter: 25 });
    for (let i = 0; i < 8 && !obs.over; i++) obs.next();
    expect(obs.chapters.length).toBe(8);
    expect(obs.year).toBeGreaterThan(obs.chapters[0]!.from + 150);
    // Le fil a forcément changé de mains : personne ne vit deux siècles.
    expect(obs.chapters.reduce((n, c) => n + c.generations, 0)).toBeGreaterThan(0);
  });

  it('résume au lieu de tout déverser', () => {
    const obs = Observer.create(ruleset, { seed: 5, mode: 'chronique', chapter: 40 });
    for (let i = 0; i < 4; i++) {
      const ch = obs.next();
      expect(ch.lines.length).toBeLessThanOrEqual(14);
      // Et les lignes restent dans l'ordre du temps.
      for (let k = 1; k < ch.lines.length; k++) {
        expect(ch.lines[k]!.year).toBeGreaterThanOrEqual(ch.lines[k - 1]!.year);
      }
    }
  });

  it('est reproductible : même graine, même histoire', () => {
    const lire = () => {
      const o = Observer.create(ruleset, { seed: 99, mode: 'chronique', chapter: 25 });
      for (let i = 0; i < 3; i++) o.next();
      return o.chapters.map((c) => `${c.from}:${c.headline}:${c.lines.map((l) => l.text).join('|')}`);
    };
    expect(lire()).toEqual(lire());
  });
});
