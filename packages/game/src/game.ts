import {
  Rng,
  Simulation,
  World,
  ageOf,
  continueAsHeir,
  continueAsNewborn,
  continueAsStranger,
  createLife,
  fullName,
  heirsOf,
  makeEventCtx,
  strangersFor,
  worldStats,
  dynastyStats,
  familyTree,
  applyEffects,
  migrate,
  restore,
  snapshot,
  SAVE_VERSION,
  type ActionDef,
  type BirthResult,
  type EntityId,
  type HeirOption,
  type PendingEvent,
  type DynastyStats,
  type RecordBook,
  type Ruleset,
  type StrangerOption,
  type TreeNode,
  type TreeOptions,
  type WorldStats,
  type SuccessionLaw,
  type WorldMode,
  type WorldSnapshot,
} from '@ed/engine';

export type Phase =
  | 'naissance'
  | 'annee'
  | 'evenement'
  | 'resultat'
  | 'mort'
  | 'fin';

export interface Outcome {
  title: string;
  text: string;
  log: string[];
}

export interface NewGameOptions {
  seed?: number;
  mode?: WorldMode;
  startYear?: number;
  scenarioId?: string;
}

export type Command =
  | { t: 'advance' }
  | { t: 'choose'; optionId: string }
  | { t: 'action'; actionId: string }
  | { t: 'interact'; targetId: EntityId; kind: InteractionKind }
  | { t: 'continueAs'; heirId: EntityId }
  | { t: 'follow'; id: EntityId }
  | { t: 'newborn' }
  | { t: 'setLaw'; law: SuccessionLaw }
  | { t: 'end' };

export type InteractionKind =
  | 'parler'
  | 'offrir'
  | 'disputer'
  | 'courtiser'
  | 'demander'
  | 'former_corps'
  | 'former_esprit'
  | 'former_social'
  | 'former_ombre'
  | 'designer';

/** Les quatre écoles d'éducation (doc 03 §3). Un enfant se façonne. */
export const TRAININGS = {
  former_corps: { label: 'Le corps', stats: ['force', 'endurance'] as const, skill: 'lutte' },
  former_esprit: { label: 'L\'esprit', stats: ['intelligence', 'volonte'] as const, skill: 'lettres' },
  former_social: { label: 'Les gens', stats: ['charisme', 'intelligence'] as const, skill: 'rhetorique' },
  former_ombre: { label: 'L\'ombre', stats: ['agilite', 'charisme'] as const, skill: 'intrigue' },
} as const;

export type TrainingKind = keyof typeof TRAININGS;

export interface SaveFile {
  version: number;
  phase: Phase;
  pending: PendingEvent[];
  actionUsed: boolean;
  yearLog: string[];
  opening: string;
  world: WorldSnapshot;
}

/**
 * Façade de session (doc 05 §7). Toute la logique de jeu vit dans `engine` ;
 * `Game` ne fait qu'orchestrer l'alternance « le monde avance / le joueur choisit ».
 * Le CLI n'en connaît rien d'autre.
 */
export class Game {
  readonly sim: Simulation;
  readonly ruleset: Ruleset;

  phase: Phase = 'naissance';
  pending: PendingEvent[] = [];
  outcome: Outcome | null = null;
  actionUsed = false;
  yearLog: string[] = [];
  opening = '';

  private constructor(sim: Simulation, ruleset: Ruleset) {
    this.sim = sim;
    this.ruleset = ruleset;
  }

  get world(): World {
    return this.sim.world;
  }

  get player() {
    return this.world.player;
  }

  get age(): number {
    return ageOf(this.player, this.world.year);
  }

  // ─── création ─────────────────────────────────────────────────────────────

  static create(ruleset: Ruleset, opts: NewGameOptions = {}): Game {
    const seed = opts.seed ?? (Date.now() & 0x7fffffff);
    const sim = new Simulation(ruleset, {
      seed,
      startYear: opts.startYear ?? 400,
      mode: opts.mode ?? 'legende',
    });
    const game = new Game(sim, ruleset);
    const life = createLife(
      sim.world,
      ruleset,
      new Rng(seed).fork('newlife'),
      opts.scenarioId,
    );
    game.opening = life.result.opening;
    game.birth = life.result;
    return game;
  }

  birth: BirthResult | null = null;

  // ─── boucle ───────────────────────────────────────────────────────────────

  submit(cmd: Command): void {
    switch (cmd.t) {
      case 'advance':
        this.advance();
        return;
      case 'choose':
        this.choose(cmd.optionId);
        return;
      case 'action':
        this.act(cmd.actionId);
        return;
      case 'interact':
        this.interact(cmd.targetId, cmd.kind);
        return;
      case 'continueAs':
        this.continueAs(cmd.heirId);
        return;
      case 'follow':
        this.follow(cmd.id);
        return;
      case 'newborn':
        this.newborn();
        return;
      case 'setLaw':
        this.setLaw(cmd.law);
        return;
      case 'end':
        this.phase = 'fin';
        return;
    }
  }

  private advance(): void {
    if (this.phase === 'naissance') {
      this.phase = 'annee';
      return;
    }
    if (this.phase === 'resultat') {
      this.outcome = null;
      this.phase = this.pending.length > 0 ? 'evenement' : 'annee';
      if (this.phase === 'annee') this.finishYear();
      return;
    }
    if (this.phase !== 'annee') return;

    // Une nouvelle année commence : le monde bouge, puis les événements arrivent.
    const opening = this.sim.openYear();
    this.actionUsed = false;
    this.yearLog = opening.log;
    this.pending = opening.events;
    if (this.pending.length > 0) {
      this.phase = 'evenement';
    } else {
      this.finishYear();
    }
  }

  /** Ferme l'année : subsistance, mortalité, bascule éventuelle vers la mort. */
  private finishYear(): void {
    const closing = this.sim.closeYear();
    this.yearLog = [...this.yearLog, ...closing.log];
    this.phase = closing.playerDied ? 'mort' : 'annee';
  }

  private choose(optionId: string): void {
    const current = this.pending[0];
    if (!current || this.phase !== 'evenement') return;
    const option = current.options.find((o) => o.id === optionId);
    if (!option || option.locked) return;

    const result = this.sim.resolveEvent(current, optionId);
    this.pending = this.pending.slice(1);
    this.outcome = { title: option.label, text: result.text, log: result.log };
    this.phase = 'resultat';
  }

  private act(actionId: string): void {
    if (this.phase !== 'annee' || this.actionUsed) return;
    const def = this.ruleset.actions.find((a) => a.id === actionId);
    if (!def || !this.isActionAvailable(def)) return;

    const rng = new Rng(this.world.seed).fork('action', actionId, this.world.year, this.player.id);
    const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, {});
    const { text, effects } = def.run(ctx);
    applyEffects(ctx, effects);
    this.actionUsed = true;
    this.outcome = { title: def.label, text, log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  isActionAvailable(def: ActionDef): boolean {
    const age = this.age;
    if (def.minAge !== undefined && age < def.minAge) return false;
    if (def.maxAge !== undefined && age > def.maxAge) return false;
    const rng = new Rng(this.world.seed).fork('action.check', def.id, this.world.year);
    const ctx = { world: this.world, ruleset: this.ruleset, subject: this.player, age, rng };
    if (def.hidden && def.hidden(ctx)) return false;
    if (def.requires && !def.requires(ctx)) return false;
    return true;
  }

  availableActions(): ActionDef[] {
    return this.ruleset.actions.filter((a) => this.isActionAvailable(a));
  }

  /**
   * Interactions directes avec un proche. Elles ne consomment pas l'action de
   * l'année : entretenir ses liens ne doit jamais être un coût d'opportunité,
   * sinon personne ne le fait et le jeu perd son sujet.
   */
  private interact(targetId: EntityId, kind: InteractionKind): void {
    const other = this.world.get(targetId);
    if (!other || !other.alive || this.phase !== 'annee') return;
    const rel = this.world.relations.get(this.player.id, other.id);
    if (!rel) return;
    const rng = new Rng(this.world.seed).fork('interact', kind, this.world.year, targetId);
    const name = fullName(other);
    let text = '';

    switch (kind) {
      case 'parler': {
        const gain = rng.int(4, 10) + Math.round(this.player.stats.charisme / 25);
        this.world.relations.modify(this.player.id, other.id, { affection: gain / 2 });
        this.world.relations.modify(other.id, this.player.id, { affection: gain, trust: 2 });
        text = `Vous passez du temps avec ${name}. Rien d'important n'est dit, ce qui est souvent l'essentiel.`;
        break;
      }
      case 'offrir': {
        const cost = Math.max(50, Math.round(Math.abs(this.player.wealth) * 0.05));
        if (this.player.wealth < cost) {
          text = 'Vous n\'avez rien à offrir.';
          break;
        }
        this.player.wealth -= cost;
        this.world.relations.modify(other.id, this.player.id, { affection: 14, trust: 6 });
        text = `Vous offrez quelque chose à ${name} (${cost} sous). On ne s'y attendait pas.`;
        break;
      }
      case 'disputer': {
        this.world.relations.modify(this.player.id, other.id, { affection: -18 });
        this.world.relations.modify(other.id, this.player.id, { affection: -22, fear: 6 });
        text = `Vous vous expliquez avec ${name}. Ça monte. Rien n'est réglé.`;
        break;
      }
      case 'courtiser': {
        if (this.player.spouseId || other.spouseId) {
          text = 'Ce n\'est pas possible.';
          break;
        }
        const ok = rng.chance(0.3 + this.player.stats.charisme / 220 + (rel.affection + 100) / 500);
        if (ok) {
          this.world.relations.modify(other.id, this.player.id, { affection: 20, trust: 8 });
          if (rel.affection > 45 && (this.world.relations.get(other.id, this.player.id)?.affection ?? 0) > 45) {
            const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, { autre: other });
            applyEffects(ctx, [{ k: 'marry', who: 'autre' }]);
            text = `${name} accepte de vous épouser.`;
          } else {
            text = `${name} vous regarde autrement. Ce n'est pas encore acquis.`;
          }
        } else {
          this.world.relations.modify(other.id, this.player.id, { affection: -6 });
          text = `${name} détourne la conversation. Le message est clair.`;
        }
        break;
      }
      case 'designer': {
        if (!this.canDesignate()) {
          text = 'Vous n\'avez pas de maison à léguer.';
          break;
        }
        for (const id of this.player.childrenIds) {
          const kid = this.world.get(id);
          if (kid) delete kid.flags['heritier_designe'];
        }
        other.flags['heritier_designe'] = true;
        this.world.relations.modify(other.id, this.player.id, { affection: 25, respect: 20 });
        text = `Vous désignez ${name} comme héritier. Les autres l'apprendront, et ne l'oublieront pas.`;
        this.world.record({
          year: this.world.year,
          kind: 'note',
          importance: 3,
          actors: [{ id: other.id, name }],
          data: { texte: `${name} fut désigné héritier.` },
        });
        break;
      }
      case 'former_corps':
      case 'former_esprit':
      case 'former_social':
      case 'former_ombre': {
        const training = TRAININGS[kind];
        const age = ageOf(other, this.world.year);
        if (age < 4 || age > 17) {
          text = 'On ne forme plus quelqu\'un de cet âge.';
          break;
        }
        // Le potentiel caché de l'enfant décide de ce que l'éducation rend.
        const yield_ = 1 + other.hidden.potentiel / 60;
        for (const stat of training.stats) {
          other.stats[stat] = Math.min(100, other.stats[stat] + Math.round(rng.int(1, 2) * yield_));
        }
        other.skills[training.skill] = Math.min(
          100,
          (other.skills[training.skill] ?? 0) + 3 * yield_,
        );
        this.world.relations.modify(other.id, this.player.id, { affection: 6, respect: 8 });
        this.player.wealth -= 60;
        const marker = `formation_${kind}`;
        const done = other.flags[marker];
        const years = (typeof done === 'number' ? done : 0) + 1;
        other.flags[marker] = years;
        // Cinq ans dans la même école laissent une marque durable.
        if (years === 5) {
          const trait =
            kind === 'former_corps'
              ? 'guerrier'
              : kind === 'former_esprit'
                ? 'lettre'
                : kind === 'former_social'
                  ? 'meneur'
                  : 'menteur';
          if (!other.traits.includes(trait)) other.traits.push(trait);
          text =
            `Cinq ans de la même école. ${name} en garde quelque chose que rien n'effacera.`;
          break;
        }
        text = `Vous formez ${name}. ${training.label} — ${years}ᵉ année.`;
        break;
      }
      case 'demander': {
        const theirFeeling = this.world.relations.get(other.id, this.player.id);
        const willing = (theirFeeling?.affection ?? 0) > 35 && other.wealth > 200;
        if (willing) {
          const amount = Math.round(other.wealth * 0.2);
          other.wealth -= amount;
          this.player.wealth += amount;
          this.world.relations.modify(other.id, this.player.id, { affection: -10 });
          text = `${name} vous prête ${amount} sous. On ne vous le rappellera pas — on s'en souviendra.`;
        } else {
          this.world.relations.modify(other.id, this.player.id, { affection: -12, respect: -10 });
          text = `${name} refuse, et vous regrettez d'avoir demandé.`;
        }
        break;
      }
    }

    this.outcome = { title: 'Rencontre', text, log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  // ─── mort et succession ───────────────────────────────────────────────────

  heirs(): HeirOption[] {
    return heirsOf(this.world, this.player);
  }

  // ─── maison et succession ─────────────────────────────────────────────────

  house() {
    return this.world.house(this.player.houseId);
  }

  /** On ne change la loi que si l'on est le chef de sa propre maison. */
  canSetLaw(): boolean {
    const house = this.house();
    return !!house && house.headId === this.player.id;
  }

  canDesignate(): boolean {
    return !!this.house();
  }

  private setLaw(law: SuccessionLaw): void {
    const house = this.house();
    if (!house || !this.canSetLaw() || house.law === law) return;
    const before = house.law;
    house.law = law;
    // Changer la loi coûte du prestige : on froisse ceux qu'elle déshérite.
    house.prestige = Math.max(0, house.prestige - 25);
    this.world.record({
      year: this.world.year,
      kind: 'note',
      importance: 4,
      actors: [{ id: this.player.id, name: fullName(this.player) }],
      data: { texte: `La Maison ${house.name} passe de la succession ${before} à ${law}.` },
    });
    this.outcome = {
      title: 'Loi de succession',
      text:
        `La Maison ${house.name} suivra désormais la loi « ${law} ». ` +
        `Ceux que l'ancienne loi favorisait ne vous le pardonneront pas de sitôt.`,
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  // ─── statistiques ─────────────────────────────────────────────────────────

  stats(limit = 5): WorldStats {
    return worldStats(this.world, this.ruleset, limit);
  }

  dynasty(): DynastyStats {
    return dynastyStats(this.world);
  }

  records(): RecordBook {
    return this.world.records;
  }

  tree(opts: TreeOptions = {}): TreeNode | null {
    return familyTree(this.world, this.player.id, { ancestors: 2, maxDepth: 4, ...opts });
  }

  /**
   * Trois vies qu'on pourrait reprendre à la place de la sienne. Recalculées à
   * chaque appel depuis un flux forké sur l'année : stable tant que l'année
   * l'est, donc l'écran de mort n'a pas la bougeotte.
   */
  strangers(count = 3): StrangerOption[] {
    return strangersFor(
      this.world,
      this.ruleset,
      new Rng(this.world.seed).fork('death.strangers', this.world.year),
      count,
    );
  }

  private follow(id: EntityId): void {
    if (this.phase !== 'mort') return;
    const rng = new Rng(this.world.seed).fork('follow', this.world.year, id);
    if (continueAsStranger(this.world, this.ruleset, id, rng)) this.resumeAfterDeath();
  }

  private newborn(): void {
    if (this.phase !== 'mort') return;
    const life = continueAsNewborn(
      this.world,
      this.ruleset,
      new Rng(this.world.seed).fork('newborn', this.world.year),
    );
    this.opening = life.result.opening;
    this.birth = life.result;
    this.pending = [];
    this.outcome = null;
    this.actionUsed = false;
    this.yearLog = this.world.drainLog();
    this.phase = 'naissance';
  }

  private resumeAfterDeath(): void {
    this.pending = [];
    this.outcome = null;
    this.actionUsed = false;
    this.yearLog = this.world.drainLog();
    this.phase = 'annee';
  }

  private continueAs(heirId: EntityId): void {
    if (this.phase !== 'mort') return;
    if (continueAsHeir(this.world, this.ruleset, heirId)) this.resumeAfterDeath();
  }

  // ─── sauvegarde ───────────────────────────────────────────────────────────

  save(): string {
    const file: SaveFile = {
      version: SAVE_VERSION,
      phase: this.phase,
      pending: this.pending,
      actionUsed: this.actionUsed,
      yearLog: this.yearLog,
      opening: this.opening,
      world: snapshot(this.world),
    };
    return JSON.stringify(file);
  }

  static load(ruleset: Ruleset, json: string): Game {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const worldRaw = raw['world'] as Record<string, unknown>;
    const world = restore(migrate(worldRaw));
    const sim = new Simulation(ruleset, world);
    const game = new Game(sim, ruleset);
    game.phase = (raw['phase'] as Phase) ?? 'annee';
    game.pending = (raw['pending'] as PendingEvent[]) ?? [];
    game.actionUsed = Boolean(raw['actionUsed']);
    game.yearLog = (raw['yearLog'] as string[]) ?? [];
    game.opening = (raw['opening'] as string) ?? '';
    return game;
  }
}
