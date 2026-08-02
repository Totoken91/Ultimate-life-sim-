import type {
  Character,
  ChronicleEntry,
  EntityId,
  FlagValue,
  House,
  Seed,
  Settlement,
  WorldTally,
} from '../model/types.js';
import { asEntityId, emptyTally } from '../model/types.js';
import { emptyRecordBook, type RecordBook } from '../stats/records.js';
import { RelationGraph } from './relations.js';
import { MemoryStore } from './memory.js';
import { Rng } from '../rng/rng.js';

export type WorldMode = 'chronique' | 'legende' | 'mythe';

/** Trace des tags d'événements récents — sert à la saturation (doc 04 §1.4). */
export interface TagHit {
  tag: string;
  year: number;
}

export interface WorldOptions {
  seed: number;
  startYear: number;
  mode: WorldMode;
}

export class World {
  readonly seed: number;
  readonly mode: WorldMode;
  year: number;
  playerId: EntityId;

  readonly characters = new Map<EntityId, Character>();
  readonly houses = new Map<string, House>();
  readonly settlements = new Map<string, Settlement>();
  readonly relations = new RelationGraph();
  readonly memories = new MemoryStore();

  seeds: Seed[] = [];
  chronicle: ChronicleEntry[] = [];
  flags: Record<string, FlagValue> = {};
  /** Cooldowns de portée dynastie/monde : eventId -> année de réouverture. */
  cooldowns: Record<string, number> = {};
  tagHits: TagHit[] = [];
  /** Compteurs cumulés — alimentés aux points d'écriture, jamais recalculés. */
  tally: WorldTally = emptyTally();
  /** Le livre des records : ce que le monde a connu de plus extrême. */
  records: RecordBook = emptyRecordBook();
  /** Journal de l'année en cours, consommé puis vidé par l'UI. */
  log: string[] = [];

  private nextEntity = 1;
  private nextSeed = 1;
  readonly rng: Rng;

  constructor(opts: WorldOptions) {
    this.seed = opts.seed >>> 0;
    this.mode = opts.mode;
    this.year = opts.startYear;
    this.playerId = asEntityId(0);
    this.rng = new Rng(this.seed);
  }

  // ─── entités ──────────────────────────────────────────────────────────────

  allocId(): EntityId {
    return asEntityId(this.nextEntity++);
  }

  add(c: Character): Character {
    this.characters.set(c.id, c);
    return c;
  }

  get(id: EntityId | null | undefined): Character | undefined {
    return id === null || id === undefined ? undefined : this.characters.get(id);
  }

  /** Le personnage joué. Lève si absent : c'est une erreur de programmation. */
  get player(): Character {
    const p = this.characters.get(this.playerId);
    if (!p) throw new Error('World sans joueur');
    return p;
  }

  /** Itération déterministe : toujours triée par id. */
  living(): Character[] {
    const out: Character[] = [];
    for (const c of this.characters.values()) if (c.alive) out.push(c);
    out.sort((a, b) => a.id - b.id);
    return out;
  }

  house(id: string | null | undefined): House | undefined {
    return id ? this.houses.get(id) : undefined;
  }

  settlement(id: string): Settlement | undefined {
    return this.settlements.get(id);
  }

  // ─── graines ──────────────────────────────────────────────────────────────

  plantSeed(seed: Omit<Seed, 'id'>): Seed {
    const s: Seed = { ...seed, id: this.nextSeed++ };
    this.seeds.push(s);
    return s;
  }

  // ─── chronique ────────────────────────────────────────────────────────────

  record(entry: ChronicleEntry): void {
    this.chronicle.push(entry);
  }

  // ─── tags ─────────────────────────────────────────────────────────────────

  noteTags(tags: readonly string[]): void {
    for (const tag of tags) this.tagHits.push({ tag, year: this.year });
    // on ne garde que 60 ans d'historique de tags
    const cutoff = this.year - 60;
    if (this.tagHits.length > 400) {
      this.tagHits = this.tagHits.filter((t) => t.year >= cutoff);
    }
  }

  /** Nombre de fois qu'un tag est sorti dans les `window` dernières années. */
  tagPressure(tag: string, window: number): number {
    const cutoff = this.year - window;
    let n = 0;
    for (const hit of this.tagHits) {
      if (hit.tag === tag && hit.year >= cutoff) n++;
    }
    return n;
  }

  // ─── divers ───────────────────────────────────────────────────────────────

  say(line: string): void {
    this.log.push(line);
  }

  drainLog(): string[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  /** Sérialisation des compteurs internes (le reste est reconstruit). */
  counters(): { nextEntity: number; nextSeed: number } {
    return { nextEntity: this.nextEntity, nextSeed: this.nextSeed };
  }

  restoreCounters(c: { nextEntity: number; nextSeed: number }): void {
    this.nextEntity = c.nextEntity;
    this.nextSeed = c.nextSeed;
  }

  setPlayer(id: EntityId): void {
    this.playerId = id;
  }
}
