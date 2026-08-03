import { World, type WorldMode } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { EventEngine } from '../events/engine.js';
import { SystemRegistry, type TickContext } from '../systems/types.js';
import { Aging, Mortality, Subsistence } from '../systems/vitals.js';
import { Economy, SkillDecay, SocialMobility } from '../systems/economy.js';
import { Forgetting, NpcLife, NpcVisible, RelationDrift } from '../systems/social.js';
import { EventDraw, SeedMaturation } from '../systems/events.js';
import { HousePrestige, Pruning, Records } from '../systems/house.js';
import { Physiology } from '../systems/physiology.js';
import { Agency } from '../systems/agency.js';
import { Conflicts, FactionAI, FactionFormation } from '../systems/factions.js';
import { DomainEconomy, Governance, Realms, Subsistence2 } from '../systems/domains.js';
import { Household } from '../systems/household.js';
import { seedDomains, seedRoutes } from '../economy/domains.js';
import type { PendingEvent } from '../events/types.js';
import { Rng } from '../rng/rng.js';
import { ageOf } from '../model/character.js';
import { seedPopulation } from '../world/population.js';

export interface YearOpening {
  year: number;
  age: number;
  log: string[];
  events: PendingEvent[];
}

export interface YearClosing {
  log: string[];
  playerDied: boolean;
}

/** Assemble le monde, le contenu et le pipeline de systèmes. */
export function defaultRegistry(): SystemRegistry {
  return new SystemRegistry().register(
    Aging,
    Physiology,
    DomainEconomy,
    Economy,
    SkillDecay,
    RelationDrift,
    Forgetting,
    SeedMaturation,
    Subsistence2,
    NpcLife,
    Agency,
    FactionAI,
    NpcVisible,
    EventDraw,
    Subsistence,
    SocialMobility,
    HousePrestige,
    Household,
    FactionFormation,
    Conflicts,
    Governance,
    Realms,
    Mortality,
    Pruning,
    Records,
  );
}

export interface SimulationOptions {
  seed: number;
  startYear: number;
  mode: WorldMode;
  /** Habitants par implantation au démarrage. 0 pour un monde vide (tests). */
  population?: number;
}

export class Simulation {
  readonly world: World;
  readonly ruleset: Ruleset;
  readonly engine: EventEngine;
  readonly registry: SystemRegistry;

  constructor(ruleset: Ruleset, opts: SimulationOptions | World) {
    this.ruleset = ruleset;
    const fresh = !(opts instanceof World);
    this.world = opts instanceof World ? opts : new World(opts);
    this.engine = new EventEngine(ruleset);
    this.registry = defaultRegistry();
    for (const s of ruleset.settlements) this.world.settlements.set(s.id, s);
    // Les domaines et les routes sont du décor structurel : on les (re)pose
    // même sur une partie rechargée d'avant leur existence.
    seedDomains(this.world, ruleset);
    seedRoutes(this.world);

    // Le monde existait avant le joueur. Une partie rechargée ne repeuple pas.
    if (fresh) {
      const size = (opts as SimulationOptions).population ?? 55;
      if (size > 0) {
        seedPopulation(
          this.world,
          ruleset,
          new Rng(this.world.seed).fork('population'),
          { perSettlement: size },
        );
      }
    }
  }

  private context(queue: PendingEvent[], phaseSalt: string): TickContext {
    return {
      world: this.world,
      ruleset: this.ruleset,
      engine: this.engine,
      rng: new Rng(this.world.seed).fork(phaseSalt, this.world.year),
      queue,
      living: this.world.living(),
    };
  }

  /**
   * Ouvre une année : le temps passe, le monde bouge, les événements sont tirés.
   * Le tick s'arrête ici — la suite attend les choix du joueur.
   */
  openYear(): YearOpening {
    const world = this.world;
    world.year += 1;
    const queue: PendingEvent[] = [];

    const pre = this.context(queue, 'tick.pre');
    this.registry.runPhase('PRE', pre);
    const main = this.context(queue, 'tick.main');
    this.registry.runPhase('MAIN', main);

    return {
      year: world.year,
      age: ageOf(world.player, world.year),
      log: world.drainLog(),
      events: queue,
    };
  }

  /** Ferme l'année : conséquences, subsistance, mortalité. */
  closeYear(): YearClosing {
    const world = this.world;
    const queue: PendingEvent[] = [];
    const resolve = this.context(queue, 'tick.resolve');
    this.registry.runPhase('RESOLVE', resolve);
    const post = this.context(queue, 'tick.post');
    this.registry.runPhase('POST', post);

    return {
      log: world.drainLog(),
      playerDied: !world.player.alive,
    };
  }

  resolveEvent(pending: PendingEvent, optionId: string): { text: string; log: string[] } {
    return this.engine.resolve(this.world, pending, optionId);
  }
}
