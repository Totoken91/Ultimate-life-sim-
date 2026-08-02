import { describe, expect, it } from 'vitest';
import { Rng, hashKey } from '@ed/engine';

describe('Rng', () => {
  it('produit la même suite pour la même graine', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 50 }, () => a.u32());
    const seqB = Array.from({ length: 50 }, () => b.u32());
    expect(seqA).toEqual(seqB);
  });

  it('produit des suites différentes pour des graines différentes', () => {
    const a = Array.from({ length: 20 }, (_, i) => new Rng(1).u32() + i);
    const b = Array.from({ length: 20 }, (_, i) => new Rng(2).u32() + i);
    expect(a).not.toEqual(b);
  });

  it('fork : la même clé donne le même flux', () => {
    const root = new Rng(999);
    expect(root.fork('systems.health', 400, 7).float()).toBe(
      root.fork('systems.health', 400, 7).float(),
    );
  });

  it('fork : des clés différentes donnent des flux différents', () => {
    const root = new Rng(999);
    const a = root.fork('systems.health', 400, 7).float();
    const b = root.fork('systems.health', 400, 8).float();
    const cc = root.fork('systems.wealth', 400, 7).float();
    expect(a).not.toBe(b);
    expect(a).not.toBe(cc);
  });

  it('hashKey distingue les découpages de clé', () => {
    expect(hashKey(1, ['ab', 'c'])).not.toBe(hashKey(1, ['a', 'bc']));
  });

  it('float reste dans [0, 1)', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = rng.float();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int couvre les bornes incluses', () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('chance approche la probabilité demandée', () => {
    const rng = new Rng(42);
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (rng.chance(0.25)) hits++;
    expect(hits / 20000).toBeGreaterThan(0.23);
    expect(hits / 20000).toBeLessThan(0.27);
  });

  it('weighted respecte grossièrement les poids', () => {
    const rng = new Rng(5);
    const counts = { a: 0, b: 0 };
    const items = [
      { id: 'a' as const, w: 3 },
      { id: 'b' as const, w: 1 },
    ];
    for (let i = 0; i < 8000; i++) {
      const picked = rng.weighted(items, (x) => x.w);
      if (picked) counts[picked.id]++;
    }
    const ratio = counts.a / counts.b;
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.5);
  });

  it('weighted ignore les poids nuls et négatifs', () => {
    const rng = new Rng(11);
    const items = [
      { id: 'zero', w: 0 },
      { id: 'neg', w: -5 },
      { id: 'ok', w: 1 },
    ];
    for (let i = 0; i < 100; i++) {
      expect(rng.weighted(items, (x) => x.w)?.id).toBe('ok');
    }
  });

  it('gaussian reste borné', () => {
    const rng = new Rng(8);
    for (let i = 0; i < 5000; i++) {
      const v = rng.gaussian(50, 10);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(90);
    }
  });
});
