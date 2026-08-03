import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import type { Rng } from '../rng/rng.js';
import type { EventEngine } from '../events/engine.js';
import type { PendingEvent } from '../events/types.js';
import type { Character } from '../model/types.js';

/**
 * Phases fixes d'un tick (doc 01 §5). Aucun système n'appelle un autre système :
 * ils communiquent par l'état du monde et par la file d'événements.
 * C'est ce qui évite le plat de spaghettis à six mois.
 */
export type TickPhase = 'PRE' | 'MAIN' | 'RESOLVE' | 'POST';

export const PHASE_ORDER: readonly TickPhase[] = ['PRE', 'MAIN', 'RESOLVE', 'POST'];

export interface TickContext {
  readonly world: World;
  readonly ruleset: Ruleset;
  readonly engine: EventEngine;
  readonly rng: Rng;
  /** Événements à présenter au joueur ce tour-ci. */
  readonly queue: PendingEvent[];
  /**
   * Les vivants, triés, calculés **une fois** par phase. Douze systèmes qui
   * appelaient chacun `world.living()` faisaient douze tris de six cents
   * entrées par année.
   */
  readonly living: readonly Character[];
}

export interface System {
  readonly id: string;
  readonly phase: TickPhase;
  /** Ordre déterministe explicite. Jamais l'ordre d'enregistrement (ADR-003). */
  readonly priority: number;
  run(ctx: TickContext): void;
}

export class SystemRegistry {
  private systems: System[] = [];
  private clock: (() => number) | null = null;
  private timings: Map<string, number> | null = null;

  register(...systems: System[]): this {
    this.systems.push(...systems);
    this.systems.sort(
      (a, b) =>
        PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) ||
        a.priority - b.priority ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    return this;
  }

  /**
   * Chronomètre chaque système. L'horloge est **injectée** : `engine` n'a pas
   * le droit d'appeler `performance.now` (ADR-003), et un budget qu'on ne
   * mesure pas est un budget qu'on dépasse (doc 01 §8).
   */
  instrument(clock: () => number): Map<string, number> {
    this.clock = clock;
    this.timings = new Map();
    return this.timings;
  }

  runPhase(phase: TickPhase, ctx: TickContext): void {
    const clock = this.clock;
    if (!clock || !this.timings) {
      for (const sys of this.systems) {
        if (sys.phase === phase) sys.run(ctx);
      }
      return;
    }
    for (const sys of this.systems) {
      if (sys.phase !== phase) continue;
      const t0 = clock();
      sys.run(ctx);
      this.timings.set(sys.id, (this.timings.get(sys.id) ?? 0) + clock() - t0);
    }
  }

  list(): readonly System[] {
    return this.systems;
  }
}
