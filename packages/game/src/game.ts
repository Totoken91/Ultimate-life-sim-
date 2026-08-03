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
  timeBudget,
  drawOccasions,
  occasionCtx,
  newPursuit,
  estimateCost,
  progressOf,
  describeProgress,
  ABANDON_APRES,
  ENTREPRISES_MAX,
  type Occasion,
  type Pursuit,
  type PursuitCtx,
  type PursuitDef,
  type TimeBudget,
  timeFromStaff,
  freeSlots,
  topTier,
  annualCost,
  describeCondition,
  reform,
  regimeName,
  pick,
  GOV_AXES,
  AXIS_LABELS,
  type GovAxis,
  type Government,
  type Holding,
  type HoldingDef,
  type Retainer,
  type RetainerDef,
} from '@ed/engine';
// `views.ts` ne prend de `game.ts` qu'un type : le cycle est effacé à la
// compilation, et le runtime n'en voit rien.
import { standing } from './views.js';

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
  /** Ouvrir une entreprise longue (doc 16 §2). */
  | { t: 'start'; pursuitId: string }
  /** Y verser du temps. */
  | { t: 'invest'; pursuitId: number; temps: number }
  | { t: 'abandon'; pursuitId: number }
  /** Saisir une occasion que le monde a ouverte (doc 16 §3). */
  | { t: 'seize'; occasionId: number }
  /** Ne rien faire de son année, et s'en porter mieux. */
  | { t: 'rest' }
  /** Laisser filer les années où l'on n'a rien à décider (doc 18 §4). */
  | { t: 'skip' }
  /** Le patrimoine (doc 17) : ce que l'argent achète, à commencer par du temps. */
  | { t: 'acquire'; holdingId: string }
  | { t: 'sell'; holdingId: number }
  | { t: 'hire'; retainerId: string }
  | { t: 'dismiss'; personId: EntityId }
  /** Réformer le gouvernement qu'on dirige (doc 11 §4). */
  | { t: 'reform'; axis: GovAxis; value: string | number }
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
  yearLog: string[];
  opening: string;
  /** L'année du joueur (doc 16). */
  spent: number;
  pursuits: Pursuit[];
  occasions: Occasion[];
  counters: { pursuit: number; occasion: number; holding: number };
  world: WorldSnapshot;
}

/** Ce qu'une année propose, vu du joueur. */
export interface YearView {
  budget: TimeBudget;
  spent: number;
  left: number;
  pursuits: {
    id: number;
    label: string;
    where: string;
    progress: number;
    idle: number;
    target: string | null;
  }[];
  /** Entreprises qu'on pourrait ouvrir. */
  openable: { id: string; label: string; kind: string; cost: number }[];
  occasions: { id: number; label: string; detail: string; cost: number; closing: boolean }[];
  /** Les coups d'une année : rapides, sans lendemain. */
  coups: { id: string; label: string; desc: string; category: string }[];
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
  yearLog: string[] = [];
  opening = '';

  /**
   * L'année du joueur (doc 16). « Une action par an » a disparu : une année
   * donne du temps, et le temps se répartit.
   */
  spent = 0;
  pursuits: Pursuit[] = [];
  occasions: Occasion[] = [];
  private nextPursuitId = 1;
  private nextHoldingId = 1;
  private nextOccasionId = 1;
  /** Entreprises nourries cette année. Le reste prend une année de poussière. */
  private fedThisYear = new Set<number>();

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
      case 'start':
        this.startPursuit(cmd.pursuitId);
        return;
      case 'invest':
        this.invest(cmd.pursuitId, cmd.temps);
        return;
      case 'abandon':
        this.abandonPursuit(cmd.pursuitId);
        return;
      case 'seize':
        this.seize(cmd.occasionId);
        return;
      case 'rest':
        this.rest();
        return;
      case 'skip':
        this.skipYears();
        return;
      case 'acquire':
        this.acquire(cmd.holdingId);
        return;
      case 'sell':
        this.sell(cmd.holdingId);
        return;
      case 'hire':
        this.hire(cmd.retainerId);
        return;
      case 'dismiss':
        this.dismissStaff(cmd.personId);
        return;
      case 'reform':
        this.reformGovernment(cmd.axis, cmd.value);
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
    this.agePursuits();
    const opening = this.sim.openYear();
    this.spent = 0;
    this.yearLog = opening.log;
    this.pending = opening.events;
    this.refreshOccasions();
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
    // Quelqu'un a pu mourir pendant l'année qu'on vient de fermer. Une porte
    // qui mène à un mort n'est plus une porte : « Bran Fenhal veut parler à
    // quelqu'un » devenait « vous écoutez quelqu'un pendant des heures ».
    this.occasions = this.occasions.filter(
      (o) => o.roleId === null || (this.world.get(o.roleId)?.alive ?? false),
    );
    if (!closing.playerDied) this.announceSteps();
    this.phase = closing.playerDied ? 'mort' : 'annee';
  }

  /**
   * Franchir une marche doit **s'entendre** (doc 18 §4). Sans ça, la vue
   * « votre place » était un tableau de bord qu'on consultait, jamais un
   * moment qu'on vivait : on découvrait trois ans plus tard qu'on avait un
   * toit. On compare l'état d'avant, gardé sur le personnage pour survivre à
   * la sauvegarde, et on dit ce que ça change.
   */
  private announceSteps(): void {
    const place = standing(this);
    // Le jeu de marches **déjà annoncées** ne fait que grandir. Une influence
    // qui oscille autour de 35, un veuvage suivi d'un remariage : sans ça, la
    // même phrase revenait quatre fois dans une vie et cessait d'être un
    // moment pour devenir un tic.
    const premiere = this.player.flags['marches'] === undefined;
    const vues = new Set(String(this.player.flags['marches'] ?? '').split(',').filter(Boolean));
    for (const step of place.steps) {
      if (!step.done || vues.has(step.id)) continue;
      vues.add(step.id);
      if (!premiere) this.world.say(`${step.label}. ${step.got}`);
    }
    this.player.flags['marches'] = [...vues].sort().join(',');
    this.yearLog = [...this.yearLog, ...this.world.drainLog()];
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

  /** Un coup : rapide, sans lendemain, un temps. */
  private act(actionId: string): void {
    if (this.phase !== 'annee' || this.timeLeft < 1) return;
    const def = this.ruleset.actions.find((a) => a.id === actionId);
    if (!def || !this.isActionAvailable(def)) return;

    const rng = new Rng(this.world.seed).fork('action', actionId, this.world.year, this.player.id);
    const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, {});
    const { text, effects } = def.run(ctx);
    applyEffects(ctx, effects);
    this.spent += 1;
    this.outcome = { title: def.label, text, log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  // ─── l'année du joueur (doc 16) ───────────────────────────────────────────

  get budget(): TimeBudget {
    // La domesticité rend du temps : c'est ce que l'argent achète en premier.
    const staff = timeFromStaff(this.world, this.player, this.ruleset.retainers);
    return timeBudget(this.world, this.player, staff.lines);
  }

  get timeLeft(): number {
    return Math.max(0, this.budget.total - this.spent);
  }

  private pursuitDef(p: Pursuit): PursuitDef | undefined {
    return this.ruleset.pursuits.find((d) => d.id === p.defId);
  }

  private pursuitCtx(p: Pursuit, spent: number, salt: string): PursuitCtx {
    const target = p.targetId !== null ? this.world.get(p.targetId) : undefined;
    const rng = new Rng(this.world.seed).fork('pursuit', salt, p.id, this.world.year);
    const base = makeEventCtx(
      this.world,
      this.ruleset,
      rng,
      this.player,
      target && target.alive ? { cible: target } : {},
    );
    return { ...base, role: base.role.bind(base), maybe: base.maybe.bind(base), rel: base.rel.bind(base), pursuit: p, spent };
  }

  /** Les entreprises qu'on pourrait ouvrir aujourd'hui. */
  openablePursuits(): PursuitDef[] {
    if (this.pursuits.length >= ENTREPRISES_MAX) return [];
    const age = this.age;
    const encours = new Set(this.pursuits.map((p) => p.defId));
    return this.ruleset.pursuits.filter((d) => {
      if (encours.has(d.id)) return false;
      if (d.minAge !== undefined && age < d.minAge) return false;
      if (d.maxAge !== undefined && age > d.maxAge) return false;
      if (!d.requires) return true;
      const rng = new Rng(this.world.seed).fork('pursuit.check', d.id, this.world.year);
      return d.requires({ world: this.world, ruleset: this.ruleset, subject: this.player, age, rng });
    });
  }

  private startPursuit(defId: string): void {
    if (this.phase !== 'annee' || this.timeLeft < 1) return;
    if (!this.openablePursuits().some((d) => d.id === defId)) return;
    const def = this.ruleset.pursuits.find((d) => d.id === defId);
    if (!def) return;

    let targetId: EntityId | null = null;
    if (def.role) {
      const rng = new Rng(this.world.seed).fork('pursuit.role', defId, this.world.year);
      const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, {});
      const target = def.role(ctx);
      if (!target) return;
      targetId = target.id;
    }
    const p = newPursuit(this.nextPursuitId++, def, this.player, targetId, this.world.year);
    this.pursuits.push(p);
    this.spent += 1;
    const ctx = this.pursuitCtx(p, 1, 'intro');
    this.outcome = { title: def.label, text: def.intro(ctx), log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  /**
   * Verser du temps dans une entreprise. C'est ici que se joue la continuité
   * qui manque à une action par année : la même chose, reprise, qui avance.
   */
  private invest(pursuitId: number, temps: number): void {
    if (this.phase !== 'annee') return;
    const p = this.pursuits.find((x) => x.id === pursuitId);
    const def = p ? this.pursuitDef(p) : undefined;
    if (!p || !def) return;
    const mise = Math.max(1, Math.min(temps, this.timeLeft, Math.max(1, p.needed - p.invested)));
    if (mise < 1) return;

    this.spent += mise;
    p.invested += mise;
    p.idle = 0;
    this.fedThisYear.add(p.id);
    const ctx = this.pursuitCtx(p, mise, 'beat');

    // Ce qui peut mal tourner d'abord : un revers raconte mieux qu'un progrès.
    if (def.hazard) {
      const risque = def.hazard.chance(ctx);
      if (ctx.rng.fork('hasard').chance(risque)) {
        const beat = def.hazard.beat(ctx);
        if (beat.effects) applyEffects(ctx, beat.effects);
        if (beat.addNeeded) p.needed += beat.addNeeded;
        this.outcome = { title: p.label, text: beat.text, log: this.world.drainLog() };
        this.phase = 'resultat';
        return;
      }
    }

    if (p.invested >= p.needed) {
      const fin = def.done(ctx);
      applyEffects(ctx, fin.effects);
      this.pursuits = this.pursuits.filter((x) => x.id !== p.id);
      this.outcome = { title: `${p.label} — c'est fait`, text: fin.text, log: this.world.drainLog() };
      this.phase = 'resultat';
      return;
    }

    const beat = def.beat(ctx);
    if (beat.effects) applyEffects(ctx, beat.effects);
    if (beat.addNeeded) p.needed += beat.addNeeded;
    this.outcome = { title: p.label, text: beat.text, log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  private abandonPursuit(pursuitId: number): void {
    const p = this.pursuits.find((x) => x.id === pursuitId);
    const def = p ? this.pursuitDef(p) : undefined;
    if (!p || !def) return;
    this.pursuits = this.pursuits.filter((x) => x.id !== p.id);
    if (def.quit) {
      const ctx = this.pursuitCtx(p, 0, 'quit');
      const out = def.quit(ctx);
      if (out.effects) applyEffects(ctx, out.effects);
      this.outcome = { title: p.label, text: out.text, log: this.world.drainLog() };
      this.phase = 'resultat';
    }
  }

  private refreshOccasions(): void {
    const rng = new Rng(this.world.seed).fork('occasions', this.world.year, this.player.id);
    this.occasions = drawOccasions(
      this.world,
      this.ruleset,
      this.player,
      rng,
      this.occasions,
      () => this.nextOccasionId++,
    );
  }

  private seize(occasionId: number): void {
    if (this.phase !== 'annee') return;
    const occ = this.occasions.find((o) => o.id === occasionId);
    if (!occ || occ.cost > this.timeLeft) return;
    const def = this.ruleset.occasions.find((d) => d.id === occ.defId);
    if (!def) return;

    const target = occ.roleId !== null ? this.world.get(occ.roleId) : undefined;
    const rng = new Rng(this.world.seed).fork('occasion.take', occ.defId, this.world.year);
    const ctx = occasionCtx(
      this.world,
      this.ruleset,
      rng,
      this.player,
      target && target.alive ? { cible: target } : {},
    );
    const { text, effects } = def.take(ctx);
    applyEffects(ctx, effects);
    this.spent += occ.cost;
    // On marque la prise : elle ne reviendra pas avant des années.
    this.player.flags[`occ:${occ.defId}`] = this.world.year;
    this.occasions = this.occasions.filter((o) => o.id !== occ.id);
    this.outcome = { title: occ.label, text, log: this.world.drainLog() };
    this.phase = 'resultat';
  }

  /**
   * Y a-t-il quoi que ce soit à décider cette année ?
   *
   * Entre zéro et cinq ans, la réponse est non : un temps, aucune occasion,
   * aucune entreprise ouvrable. Le joueur cliquait « passer l'année » cinq
   * fois de suite en lisant le même écran. Ce n'est pas de la simulation,
   * c'est une salle d'attente.
   */
  get idleYear(): boolean {
    if (this.phase !== 'annee') return false;
    const y = this.year();
    return (
      y.occasions.filter((o) => o.cost <= y.left).length === 0 &&
      y.pursuits.length === 0 &&
      y.openable.length === 0 &&
      y.coups.length === 0
    );
  }

  /**
   * Laisse filer les années jusqu'à ce que quelque chose arrive : un
   * événement, une porte qui s'ouvre, ou la fin de l'enfance.
   */
  private skipYears(): void {
    if (this.phase !== 'annee') return;
    const debut = this.age;
    for (let i = 0; i < 25; i++) {
      this.advance();
      if (this.phase !== 'annee') return;
      if (!this.idleYear) break;
    }
    const passees = this.age - debut;
    if (passees > 1) {
      this.yearLog = [
        `${passees} années passent. Vous grandissez, et rien ne vous est demandé.`,
        ...this.yearLog,
      ];
    }
  }

  /** Ne rien faire est un choix, et il soigne. */
  private rest(): void {
    if (this.phase !== 'annee') return;
    const reste = this.timeLeft;
    if (reste < 1) return;
    this.spent += reste;
    const rng = new Rng(this.world.seed).fork('repos', this.world.year, this.player.id);
    const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, {});
    // Souffler **répare**, ça n'exalte pas. À +3 d'humeur par temps versé, un
    // joueur qui soufflait chaque année passait 56 % de sa vie « exalté » : le
    // mot ne voulait plus rien dire, et rien de ce qui lui arrivait ne se
    // lisait plus dans son humeur (doc 18 §5). Le gain est désormais
    // proportionnel à ce qui manque.
    const manque = Math.max(0, 78 - this.player.mood);
    applyEffects(ctx, [
      { k: 'health', d: 2 + reste * 2 },
      { k: 'mood', d: 3 + Math.min(manque, reste * 7) },
    ]);
    this.outcome = {
      title: 'Souffler',
      text:
        reste >= 3
          ? 'Vous n\'avez rien fait de cette année. Personne ne s\'en souviendra, et vous en aviez besoin.'
          : 'Vous vous êtes ménagé sur la fin. Ça se sent.',
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  /**
   * Fin d'année : ce qu'on n'a pas nourri prend une année de poussière, et
   * finit par s'éteindre tout seul. Une entreprise abandonnée en silence est
   * une histoire aussi — c'est même la plus courante.
   */
  private agePursuits(): void {
    const perdues: string[] = [];
    for (const p of this.pursuits) {
      if (!this.fedThisYear.has(p.id)) p.idle += 1;
    }
    this.pursuits = this.pursuits.filter((p) => {
      if (p.idle < ABANDON_APRES) return true;
      perdues.push(p.label);
      return false;
    });
    this.fedThisYear.clear();
    for (const label of perdues) {
      this.yearLog.push(`Vous avez laissé tomber : ${label.toLowerCase()}.`);
    }
  }

  // ─── le patrimoine (doc 17) ───────────────────────────────────────────────

  /** Ce qu'on pourrait acheter aujourd'hui. */
  buyableHoldings(): HoldingDef[] {
    const deja = new Set(this.world.holdingsOf(this.player.id).map((h) => h.defId));
    const age = this.age;
    return this.ruleset.holdings.filter((d) => {
      if (deja.has(d.id)) return false;
      if (!d.requires) return true;
      const rng = new Rng(this.world.seed).fork('holding.check', d.id, this.world.year);
      return d.requires({ world: this.world, ruleset: this.ruleset, subject: this.player, age, rng });
    });
  }

  /** Ceux qu'on pourrait prendre à son service. */
  hirableRetainers(): RetainerDef[] {
    if (freeSlots(this.world, this.player, this.ruleset.holdings) < 1) return [];
    const tier = topTier(this.world, this.player, this.ruleset.holdings);
    const deja = new Set(this.world.retainersOf(this.player.id).map((r) => r.defId));
    return this.ruleset.retainers.filter((d) => !deja.has(d.id) && d.minTier <= tier);
  }

  private acquire(defId: string): void {
    if (this.phase !== 'annee' || this.timeLeft < 1) return;
    const def = this.buyableHoldings().find((d) => d.id === defId);
    if (!def || this.player.wealth < def.price) return;

    this.player.wealth -= def.price;
    this.spent += 1;
    this.world.holdings.push({
      id: this.nextHoldingId++,
      defId: def.id,
      label: def.label,
      ownerId: this.player.id,
      settlement: this.player.settlement,
      acquiredYear: this.world.year,
      condition: 80,
      staffIds: [],
    });
    this.world.record({
      year: this.world.year,
      kind: 'fortune',
      importance: def.tier >= 7 ? 3 : 2,
      actors: [{ id: this.player.id, name: fullName(this.player) }],
      data: { quoi: def.label.toLowerCase() },
    });
    this.outcome = {
      title: def.label,
      text:
        `${def.desc} Il faudra ${def.upkeep} sous par an pour la garder — ` +
        `et c'est ça, le vrai prix.`,
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  private sell(holdingId: number): void {
    const h = this.world.holdings.find((x) => x.id === holdingId && x.ownerId === this.player.id);
    const def = h ? this.ruleset.holdings.find((d) => d.id === h.defId) : undefined;
    if (!h || !def) return;
    // On revend mal ce qu'on a laissé se dégrader.
    const prix = Math.round(def.price * 0.55 * (0.4 + (h.condition / 100) * 0.6));
    this.player.wealth += prix;
    this.world.holdings = this.world.holdings.filter((x) => x.id !== h.id);
    this.outcome = {
      title: h.label,
      text: `Vendu, ${prix} sous. On ne revient jamais sur ce qu'on a vendu.`,
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  private hire(defId: string): void {
    if (this.phase !== 'annee' || this.timeLeft < 1) return;
    const def = this.hirableRetainers().find((d) => d.id === defId);
    if (!def || this.player.wealth < def.wage) return;

    // On embauche quelqu'un du lieu : une vraie personne, qui a une vie.
    const rng = new Rng(this.world.seed).fork('hire', defId, this.world.year);
    const ctx = makeEventCtx(this.world, this.ruleset, rng, this.player, {});
    const person = pick.local({ minAge: 15, maxAge: 60 })(ctx);
    if (!person) return;

    const list = this.world.retainers.get(this.player.id) ?? [];
    list.push({
      personId: person.id,
      defId: def.id,
      label: def.label,
      since: this.world.year,
      unpaid: 0,
    });
    this.world.retainers.set(this.player.id, list);
    person.lod = 0;
    this.world.relations.ensure(person.id, this.player.id, 'serment', 'mon maître', this.world.year);
    this.world.relations.modify(person.id, this.player.id, { respect: 12, trust: 8 });
    this.world.relations.ensure(this.player.id, person.id, 'serment', def.label.toLowerCase(), this.world.year);
    this.spent += 1;
    this.outcome = {
      title: def.label,
      text:
        `${fullName(person)} entre à votre service. ${def.desc} ` +
        `${def.wage} sous par an, et il faudra les trouver chaque année.`,
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  private dismissStaff(personId: EntityId): void {
    const list = this.world.retainers.get(this.player.id) ?? [];
    const parti = list.find((r) => r.personId === personId);
    if (!parti) return;
    this.world.retainers.set(
      this.player.id,
      list.filter((r) => r.personId !== personId),
    );
    const person = this.world.get(personId);
    if (person) {
      this.world.relations.modify(person.id, this.player.id, { affection: -20, trust: -15 });
    }
    this.outcome = {
      title: parti.label,
      text: person
        ? `Vous renvoyez ${fullName(person)}. On ne discute pas, et on n'oublie pas.`
        : 'Renvoyé.',
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  // ─── gouverner (doc 11 §4) ────────────────────────────────────────────────

  /** Le domaine que le joueur dirige, s'il en dirige un. */
  ruledDomain() {
    return this.world.domainList().find((d) => d.rulerId === this.player.id);
  }

  /** Ce qu'on peut changer, et ce que ça coûterait. */
  reformOptions(): { axis: GovAxis; label: string; current: string; choices: (string | number)[] }[] {
    const dom = this.ruledDomain();
    if (!dom) return [];
    const g = dom.government;
    const table: Record<GovAxis, (string | number)[]> = {
      power: ['un', 'quelques-uns', 'beaucoup', 'tous'],
      access: ['sang', 'election', 'conquete', 'fortune', 'merite', 'tirage', 'foi', 'anciennete', 'designation'],
      tenure: ['a vie', 'mandat', 'revocable', 'hereditaire'],
      reach: [Math.max(0, g.reach - 20), Math.min(100, g.reach + 20)],
      property: ['privee', 'commune', 'seigneuriale', 'd\'Etat', 'corporative'],
      mandate: ['tradition', 'divin', 'populaire', 'force', 'competence', 'contrat'],
      taxation: ['corvee', 'dime', 'cens', 'proportionnelle', 'progressive', 'aucune'],
    };
    return GOV_AXES.map((axis) => ({
      axis,
      label: AXIS_LABELS[axis],
      current: String(g[axis]),
      choices: table[axis].filter((v) => String(v) !== String(g[axis])),
    }));
  }

  private reformGovernment(axis: GovAxis, value: string | number): void {
    if (this.phase !== 'annee' || this.timeLeft < 1) return;
    const dom = this.ruledDomain();
    if (!dom) return;
    const avant = regimeName(dom.government);
    const legAvant = dom.legitimacy;
    if (!reform(dom, axis, value as Government[GovAxis])) return;
    this.spent += 1;
    const apres = regimeName(dom.government);
    const cout = Math.round(legAvant - dom.legitimacy);
    this.world.record({
      year: this.world.year,
      kind: 'revelation',
      importance: avant === apres ? 3 : 4,
      actors: [{ id: this.player.id, name: fullName(this.player) }],
      data: { quoi: `changea ${AXIS_LABELS[axis]} à ${dom.name}` },
    });
    this.outcome = {
      title: `Réforme à ${dom.name}`,
      text:
        (avant === apres
          ? `Vous changez ${AXIS_LABELS[axis]}. Le régime garde son nom, pas ses habitudes.`
          : `${dom.name} n'est plus une ${avant} : c'est une ${apres}.`) +
        ` Ça vous coûte ${cout} de légitimité, et quelques amitiés.`,
      log: this.world.drainLog(),
    };
    this.phase = 'resultat';
  }

  /** Ce qu'on possède, tel que le joueur le lit. */
  household(): {
    holdings: { id: number; label: string; condition: string; upkeep: number; comfort: number }[];
    staff: { personId: EntityId; label: string; name: string; wage: number; unpaid: number }[];
    slots: number;
    yearly: number;
    buyable: { id: string; label: string; desc: string; price: number; upkeep: number; tier: number }[];
    hirable: { id: string; label: string; desc: string; wage: number; temps: number }[];
  } {
    const holdingDefs = this.ruleset.holdings;
    return {
      holdings: this.world.holdingsOf(this.player.id).map((h) => {
        const def = holdingDefs.find((d) => d.id === h.defId);
        return {
          id: h.id,
          label: h.label,
          condition: describeCondition(h.condition),
          upkeep: def?.upkeep ?? 0,
          comfort: def?.comfort ?? 0,
        };
      }),
      staff: this.world.retainersOf(this.player.id).map((r) => {
        const def = this.ruleset.retainers.find((d) => d.id === r.defId);
        const person = this.world.get(r.personId);
        return {
          personId: r.personId,
          label: r.label,
          name: person ? fullName(person) : 'quelqu\'un',
          wage: def?.wage ?? 0,
          unpaid: r.unpaid,
        };
      }),
      slots: freeSlots(this.world, this.player, holdingDefs),
      yearly: annualCost(this.world, this.player, holdingDefs, this.ruleset.retainers),
      buyable: this.buyableHoldings().map((d) => ({
        id: d.id,
        label: d.label,
        desc: d.desc,
        price: d.price,
        upkeep: d.upkeep,
        tier: d.tier,
      })),
      hirable: this.hirableRetainers().map((d) => ({
        id: d.id,
        label: d.label,
        desc: d.desc,
        wage: d.wage,
        temps: d.gives.temps ?? 0,
      })),
    };
  }

  /** L'année telle que le joueur la voit. */
  year(): YearView {
    const budget = this.budget;
    return {
      budget,
      spent: this.spent,
      left: this.timeLeft,
      pursuits: this.pursuits.map((p) => {
        const target = p.targetId !== null ? this.world.get(p.targetId) : undefined;
        return {
          id: p.id,
          label: p.label,
          where: describeProgress(p),
          progress: progressOf(p),
          idle: p.idle,
          target: target ? fullName(target) : null,
        };
      }),
      openable: this.openablePursuits().map((d) => ({
        id: d.id,
        label: d.label,
        kind: d.kind,
        cost: estimateCost(d, this.player),
      })),
      occasions: this.occasions.map((o) => ({
        id: o.id,
        label: o.label,
        detail: o.detail,
        cost: o.cost,
        closing: o.until <= this.world.year,
      })),
      coups: this.availableActions().map((a) => ({
        id: a.id,
        label: a.label,
        desc: a.desc,
        category: a.category,
      })),
    };
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
    this.resetYear();
    this.yearLog = this.world.drainLog();
    this.phase = 'naissance';
  }

  private resumeAfterDeath(): void {
    this.pending = [];
    this.outcome = null;
    this.resetYear();
    this.yearLog = this.world.drainLog();
    this.phase = 'annee';
  }

  /**
   * Une nouvelle vie n'hérite ni des entreprises ni des occasions de l'ancienne.
   * Ce qu'on n'a pas fini meurt avec celui qui l'avait commencé.
   */
  private resetYear(): void {
    this.spent = 0;
    this.pursuits = [];
    this.occasions = [];
    this.fedThisYear.clear();
    this.refreshOccasions();
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
      yearLog: this.yearLog,
      opening: this.opening,
      spent: this.spent,
      pursuits: this.pursuits,
      occasions: this.occasions,
      counters: { pursuit: this.nextPursuitId, occasion: this.nextOccasionId, holding: this.nextHoldingId },
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
    game.spent = Number(raw['spent'] ?? 0);
    game.pursuits = (raw['pursuits'] as Pursuit[]) ?? [];
    game.occasions = (raw['occasions'] as Occasion[]) ?? [];
    const compteurs = raw['counters'] as
      | { pursuit?: number; occasion?: number; holding?: number }
      | undefined;
    game.nextPursuitId = compteurs?.pursuit ?? game.pursuits.length + 1;
    game.nextOccasionId = compteurs?.occasion ?? game.occasions.length + 1;
    game.nextHoldingId = compteurs?.holding ?? game.world.holdings.length + 1;
    game.yearLog = (raw['yearLog'] as string[]) ?? [];
    game.opening = (raw['opening'] as string) ?? '';
    return game;
  }
}
