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

  runPhase(phase: TickPhase, ctx: TickContext): void {
    for (const sys of this.systems) {
      if (sys.phase === phase) sys.run(ctx);
    }
  }

  list(): readonly System[] {
    return this.systems;
  }
}
