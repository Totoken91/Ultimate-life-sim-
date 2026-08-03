import type {
  Character,
  ChronicleEntry,
  EntityId,
  Faction,
  FlagValue,
  House,
  Seed,
  Settlement,
  WorldTally,
} from '../model/types.js';
import { asEntityId, emptyTally } from '../model/types.js';
import { emptyRecordBook, type RecordBook } from '../stats/records.js';
import type { Domain, Route } from '../model/domain.js';
import type { Holding, Retainer } from '../player/holdings.js';
import { RelationGraph } from './relations.js';
import { MemoryStore } from './memory.js';
import { Rng } from '../rng/rng.js';

export type WorldMode = 'chronique' | 'legende' | 'mythe';

/** Trace des tags d'événements récents — sert à la saturation (doc 04 §1.4). */
export interface TagHit {
  tag: string;
  year: number;
}

/**
 * Ce que le monde a fait sans vous cette année (doc 13 §4). Ce n'est pas la
 * Chronique : la Chronique est votre histoire, les nouvelles sont celles des autres.
 */
export interface NewsItem {
  year: number;
  text: string;
  /** Portée : ce qui est intime ne remonte que si vous connaissez l'acteur. */
  reach: 'intime' | 'local' | 'monde';
  place: string;
  actors: EntityId[];
}

/** Le fil de nouvelles ne garde que les dernières années. */
const NEWS_BUDGET = 240;

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
  readonly factions = new Map<string, Faction>();
  /** L'économie et le pouvoir, à toutes les échelles (doc 11). */
  readonly domains = new Map<string, Domain>();
  routes: Route[] = [];
  /** Ce que les gens possèdent, et ceux qui les servent (doc 09 §4). */
  holdings: Holding[] = [];
  retainers: Map<EntityId, Retainer[]> = new Map();
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
  /** Ce que les autres ont fait, le plus récent en dernier. */
  news: NewsItem[] = [];

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

  /**
   * Les maisons, triées. Toute boucle qui *écrit* (Chronique, journal, monde)
   * doit passer par là : l'ordre d'une Map est chronologique en partie et trié
   * après rechargement, et une partie rechargée doit se dérouler à l'identique.
   */
  houseList(): House[] {
    const out = [...this.houses.values()];
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out;
  }

  /** Les domaines, triés. Même règle que les maisons : écrire demande un tri. */
  domainList(): Domain[] {
    const out = [...this.domains.values()];
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out;
  }

  /** Ce que quelqu'un possède, trié. */
  holdingsOf(owner: EntityId): Holding[] {
    return this.holdings.filter((h) => h.ownerId === owner).sort((a, b) => a.id - b.id);
  }

  /** Ceux qui servent quelqu'un, triés. */
  retainersOf(owner: EntityId): Retainer[] {
    const list = this.retainers.get(owner) ?? [];
    return [...list].sort((a, b) => a.personId - b.personId);
  }

  /** Le domaine qui couvre une implantation. */
  domainAt(settlement: string): Domain | undefined {
    return this.domains.get(`dom_${settlement}`);
  }

  /**
   * Les domaines du plus profond au plus englobant, à égalité triés par id.
   * Agréger dans l'ordre alphabétique faisait additionner au monde des régions
   * qui n'étaient pas encore à jour — la somme était celle de l'an dernier.
   */
  domainsBottomUp(): Domain[] {
    const depth = new Map<string, number>();
    const measure = (d: Domain): number => {
      const seen = depth.get(d.id);
      if (seen !== undefined) return seen;
      let n = 0;
      let cur: Domain | undefined = d;
      const guard = new Set<string>();
      while (cur?.parent && !guard.has(cur.id)) {
        guard.add(cur.id);
        cur = this.domains.get(cur.parent);
        n += 1;
      }
      depth.set(d.id, n);
      return n;
    };
    const out = this.domainList();
    out.sort((a, b) => measure(b) - measure(a) || (a.id < b.id ? -1 : 1));
    return out;
  }

  /** Les groupes encore debout, triés — l'ordre doit être déterministe. */
  activeFactions(): Faction[] {
    const out: Faction[] = [];
    for (const f of this.factions.values()) if (f.dissolvedYear === null) out.push(f);
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out;
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

  /** Ajoute une nouvelle au fil du monde, en gardant le fil borné. */
  report(item: NewsItem): void {
    this.news.push(item);
    if (this.news.length > NEWS_BUDGET) {
      this.news.splice(0, this.news.length - NEWS_BUDGET);
    }
  }

  /** Les nouvelles des `window` dernières années, les plus récentes d'abord. */
  recentNews(window: number, limit = 40): NewsItem[] {
    const cutoff = this.year - window;
    const out: NewsItem[] = [];
    for (let i = this.news.length - 1; i >= 0 && out.length < limit; i--) {
      const item = this.news[i];
      if (item && item.year >= cutoff) out.push(item);
    }
    return out;
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
