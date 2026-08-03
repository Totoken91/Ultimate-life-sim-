import type { EntityId, Relation, RelationType } from '../model/types.js';
import { clamp } from '../util/math.js';

const key = (from: EntityId, to: EntityId): string => `${from}>${to}`;

/**
 * Graphe de relations dirigé, indexé dans les deux sens.
 * Il faut pouvoir demander « qui déteste X » aussi vite que « qui X déteste ».
 */
export class RelationGraph {
  private edges = new Map<string, Relation>();
  private out = new Map<EntityId, Set<EntityId>>();
  private inc = new Map<EntityId, Set<EntityId>>();

  get(from: EntityId, to: EntityId): Relation | undefined {
    return this.edges.get(key(from, to));
  }

  /** Crée ou met à jour l'arête from→to. Ne touche jamais à l'arête inverse. */
  set(rel: Relation): void {
    const k = key(rel.from, rel.to);
    const existed = this.edges.has(k);
    this.edges.set(k, rel);
    if (!existed) {
      let o = this.out.get(rel.from);
      if (!o) this.out.set(rel.from, (o = new Set()));
      o.add(rel.to);
      let i = this.inc.get(rel.to);
      if (!i) this.inc.set(rel.to, (i = new Set()));
      i.add(rel.from);
    }
  }

  ensure(
    from: EntityId,
    to: EntityId,
    type: RelationType,
    label: string,
    since: number,
  ): Relation {
    const existing = this.get(from, to);
    if (existing) return existing;
    const rel: Relation = {
      from,
      to,
      type,
      label,
      affection: 0,
      trust: 0,
      respect: 0,
      fear: 0,
      since,
    };
    this.set(rel);
    return rel;
  }

  modify(
    from: EntityId,
    to: EntityId,
    deltas: Partial<Pick<Relation, 'affection' | 'trust' | 'respect' | 'fear'>>,
  ): void {
    const rel = this.get(from, to);
    if (!rel) return;
    if (deltas.affection !== undefined) {
      rel.affection = clamp(rel.affection + deltas.affection, -100, 100);
    }
    if (deltas.trust !== undefined) rel.trust = clamp(rel.trust + deltas.trust, -100, 100);
    if (deltas.respect !== undefined) rel.respect = clamp(rel.respect + deltas.respect, -100, 100);
    if (deltas.fear !== undefined) rel.fear = clamp(rel.fear + deltas.fear, 0, 100);
  }

  /** Toutes les relations sortantes, triées par `to` — l'ordre doit être déterministe. */
  from(id: EntityId): Relation[] {
    const targets = this.out.get(id);
    if (!targets) return [];
    const out: Relation[] = [];
    for (const t of targets) {
      const rel = this.edges.get(key(id, t));
      if (rel) out.push(rel);
    }
    out.sort((a, b) => a.to - b.to);
    return out;
  }

  /** Toutes les relations entrantes, triées par `from`. */
  toward(id: EntityId): Relation[] {
    const sources = this.inc.get(id);
    if (!sources) return [];
    const out: Relation[] = [];
    for (const s of sources) {
      const rel = this.edges.get(key(s, id));
      if (rel) out.push(rel);
    }
    out.sort((a, b) => a.from - b.from);
    return out;
  }

  /** Parcourt les arêtes sans trier. À n'utiliser que si l'ordre n'influe pas. */
  forEach(fn: (rel: Relation) => void): void {
    for (const rel of this.edges.values()) fn(rel);
  }

  /**
   * Parcourt les sortantes **sans trier ni allouer**. L'ordre suit celui des
   * insertions : n'utiliser que si le résultat ne dépend pas de l'ordre, ou
   * si l'appelant départage lui-même les ex æquo (sur `to`, par exemple).
   * `from()` alloue un tableau et le trie — à six cents habitants qui décident
   * chaque année, c'est le tri qui coûte, pas la décision.
   */
  forEachFrom(id: EntityId, fn: (rel: Relation) => void): void {
    const targets = this.out.get(id);
    if (!targets) return;
    for (const t of targets) {
      const rel = this.edges.get(key(id, t));
      if (rel) fn(rel);
    }
  }

  all(): Relation[] {
    return [...this.edges.values()].sort((a, b) => a.from - b.from || a.to - b.to);
  }

  removeEntity(id: EntityId): void {
    for (const t of this.out.get(id) ?? []) {
      this.edges.delete(key(id, t));
      this.inc.get(t)?.delete(id);
    }
    for (const s of this.inc.get(id) ?? []) {
      this.edges.delete(key(s, id));
      this.out.get(s)?.delete(id);
    }
    this.out.delete(id);
    this.inc.delete(id);
  }

  toJSON(): Relation[] {
    return this.all();
  }

  static fromJSON(rows: Relation[]): RelationGraph {
    const g = new RelationGraph();
    for (const r of rows) g.set(r);
    return g;
  }
}

/** Sentiment net de `from` envers `to`, résumé en un mot. */
export function describeFeeling(rel: Relation): string {
  if (rel.fear >= 60 && rel.affection < 20) return 'vous craint';
  if (rel.affection >= 70) return 'vous est dévoué';
  if (rel.affection >= 40) return 'vous apprécie';
  if (rel.affection >= 15) return 'vous est favorable';
  if (rel.affection > -15) return 'indifférent';
  if (rel.affection > -40) return 'méfiant';
  if (rel.affection > -70) return 'vous en veut';
  return 'vous hait';
}
