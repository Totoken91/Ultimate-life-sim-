/**
 * Aléatoire déterministe — xoshiro128** + forking par clé.
 *
 * Règle du projet (ADR-003) : `engine` ne contient AUCUNE autre source d'aléa.
 * Pas de Math.random, pas de Date.now.
 *
 * Le forking est *sans état* : on ne sauvegarde jamais l'état d'un RNG.
 * Chaque tirage est reproductible depuis (seedRacine, clé complète). La clé doit
 * décrire précisément le contexte : système, année, entité, intention.
 *
 *     const r = rng.fork('systems.health', world.year, char.id);
 *
 * Conséquence : ajouter un système ne décale jamais l'aléa des autres.
 */

export type RngKeyPart = string | number;

const FNV_PRIME = 0x01000193;
const FNV_OFFSET = 0x811c9dc5;

/** Hache une clé composite en une graine 32 bits. */
export function hashKey(base: number, parts: readonly RngKeyPart[]): number {
  let h = (FNV_OFFSET ^ (base >>> 0)) >>> 0;
  for (const part of parts) {
    const s = typeof part === 'number' ? part.toString(36) : part;
    for (let i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) >>> 0;
      h = Math.imul(h, FNV_PRIME) >>> 0;
    }
    // séparateur, pour que ('ab','c') != ('a','bc')
    h = (h ^ 0x1f) >>> 0;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** splitmix32 — utilisé uniquement pour étaler une graine sur l'état interne. */
function seedState(seed: number): [number, number, number, number] {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
  const s: [number, number, number, number] = [next(), next(), next(), next()];
  // état nul interdit
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1;
  return s;
}

export class Rng {
  readonly base: number;
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    this.base = seed >>> 0;
    const [a, b, c, d] = seedState(this.base);
    this.s0 = a;
    this.s1 = b;
    this.s2 = c;
    this.s3 = d;
  }

  /** Dérive un générateur indépendant. La clé doit décrire le contexte complet. */
  fork(...parts: RngKeyPart[]): Rng {
    return new Rng(hashKey(this.base, parts));
  }

  /** Entier non signé 32 bits. */
  u32(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7) >>> 0, 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  /** Flottant dans [0, 1). */
  float(): number {
    return this.u32() / 0x100000000;
  }

  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + (this.u32() % (max - min + 1));
  }

  /** Vrai avec la probabilité p (0..1). */
  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.float() < p;
  }

  /** Vrai avec la probabilité p exprimée en pourcentage (0..100). */
  percent(p: number): boolean {
    return this.chance(p / 100);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick sur une liste vide');
    return items[this.int(0, items.length - 1)] as T;
  }

  pickOrNull<T>(items: readonly T[]): T | null {
    return items.length === 0 ? null : this.pick(items);
  }

  /** Tirage pondéré. Les poids <= 0 sont ignorés. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    let total = 0;
    const weights: number[] = [];
    for (const item of items) {
      const w = Math.max(0, weightOf(item));
      weights.push(w);
      total += w;
    }
    if (total <= 0) return null;
    let roll = this.float() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i] as number;
      if (roll <= 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  /** Mélange (Fisher-Yates) — retourne une copie. */
  shuffled<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  /** Loi normale (Box-Muller), tronquée à ±4 écarts-types. */
  gaussian(mean: number, sd: number): number {
    const u1 = Math.max(this.float(), 1e-12);
    const u2 = this.float();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + sd * Math.max(-4, Math.min(4, z));
  }

  /** Loi normale bornée et arrondie — le tirage de stats standard. */
  stat(mean: number, sd: number, min = 1, max = 100): number {
    return Math.round(Math.max(min, Math.min(max, this.gaussian(mean, sd))));
  }
}
