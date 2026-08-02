import type { EntityId, Memory } from '../model/types.js';

/**
 * Mémoire budgétée avec oubli (doc 01 §4).
 *
 * Un personnage qui se souvient de tout n'est ni crédible ni tenable en mémoire.
 * La pertinence d'un souvenir décroît avec le temps, mais un souvenir très
 * chargé émotionnellement résiste beaucoup plus longtemps.
 */
export const MEMORY_BUDGET_FOCUS = 48;
export const MEMORY_BUDGET_ACTIVE = 8;

export class MemoryStore {
  private byEntity = new Map<EntityId, Memory[]>();
  private nextId = 1;

  add(
    owner: EntityId,
    entry: Omit<Memory, 'id'>,
    budget: number = MEMORY_BUDGET_FOCUS,
  ): Memory {
    const mem: Memory = { ...entry, id: this.nextId++ };
    let list = this.byEntity.get(owner);
    if (!list) this.byEntity.set(owner, (list = []));
    list.push(mem);
    if (list.length > budget) this.forget(owner, budget, mem.year);
    return mem;
  }

  of(owner: EntityId): readonly Memory[] {
    return this.byEntity.get(owner) ?? [];
  }

  /** Souvenirs impliquant `actor`, du plus pertinent au moins pertinent. */
  about(owner: EntityId, actor: EntityId, year: number): Memory[] {
    return this.of(owner)
      .filter((m) => m.actors.includes(actor))
      .sort((a, b) => relevance(b, year) - relevance(a, year) || b.id - a.id);
  }

  tagged(owner: EntityId, tag: string): Memory[] {
    return this.of(owner).filter((m) => m.tags.includes(tag));
  }

  recent(owner: EntityId, count: number, year: number): Memory[] {
    return this.of(owner)
      .slice()
      .sort((a, b) => relevance(b, year) - relevance(a, year) || b.id - a.id)
      .slice(0, count);
  }

  private forget(owner: EntityId, budget: number, year: number): void {
    const list = this.byEntity.get(owner);
    if (!list) return;
    list.sort((a, b) => relevance(b, year) - relevance(a, year) || b.id - a.id);
    list.length = budget;
  }

  drop(owner: EntityId): void {
    this.byEntity.delete(owner);
  }

  toJSON(): { nextId: number; rows: [EntityId, Memory[]][] } {
    const rows = [...this.byEntity.entries()].sort((a, b) => a[0] - b[0]);
    return { nextId: this.nextId, rows };
  }

  static fromJSON(data: { nextId: number; rows: [EntityId, Memory[]][] }): MemoryStore {
    const store = new MemoryStore();
    store.nextId = data.nextId;
    for (const [id, list] of data.rows) store.byEntity.set(id, list);
    return store;
  }
}

/**
 * Pertinence = émotion × récence. Un souvenir de salience 90 tient plusieurs
 * décennies ; un souvenir de salience 10 s'efface en quelques années.
 */
export function relevance(mem: Memory, year: number): number {
  const age = Math.max(0, year - mem.year);
  const halfLife = 3 + mem.salience * 0.9;
  return mem.salience * Math.pow(0.5, age / halfLife);
}
