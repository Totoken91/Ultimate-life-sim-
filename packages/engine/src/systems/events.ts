import type { System } from './types.js';
import { makeSelectCtx } from '../events/engine.js';
import { ageOf } from '../model/character.js';

/**
 * MAIN — germination des graines (doc 04 §2).
 *
 * Priorité absolue sur les événements tirés au hasard : une conséquence
 * différée qui arrive à maturité passe toujours avant le bruit de fond.
 */
export const SeedMaturation: System = {
  id: 'events.seeds',
  phase: 'MAIN',
  priority: 10,
  run(ctx) {
    const { world } = ctx;
    const player = world.player;
    if (!player.alive) return;

    const remaining: typeof world.seeds = [];
    for (const seed of world.seeds) {
      if (world.year < seed.dueYear) {
        remaining.push(seed);
        continue;
      }
      if (seed.needsActorsAlive && seed.actors.length > 0) {
        const anyAlive = seed.actors.some((id) => world.get(id)?.alive);
        if (!anyAlive) continue; // la graine meurt avec ses acteurs
      }
      const selectCtx = makeSelectCtx(
        world,
        ctx.ruleset,
        ctx.rng.fork('events.seed', world.year, seed.id),
        player,
      );
      const pending = ctx.engine.fromSeed(selectCtx, seed);
      if (pending) {
        ctx.queue.push(pending);
      } else if (world.year < seed.dueYear + 12) {
        // pas encore le moment : on repousse plutôt que de perdre la conséquence
        remaining.push({ ...seed, dueYear: world.year + 2 });
      }
    }
    world.seeds = remaining;
  },
};

/** Nombre d'événements tirés cette année. L'enfance est dense (doc 03 §3). */
function eventBudget(age: number, roll: number): number {
  if (age < 3) return roll < 0.55 ? 0 : 1;
  if (age <= 17) return roll < 0.1 ? 0 : roll < 0.55 ? 1 : roll < 0.9 ? 2 : 3;
  if (age >= 70) return roll < 0.25 ? 0 : roll < 0.75 ? 1 : 2;
  return roll < 0.15 ? 0 : roll < 0.6 ? 1 : roll < 0.92 ? 2 : 3;
}

/** MAIN — tirage des événements du joueur. */
export const EventDraw: System = {
  id: 'events.draw',
  phase: 'MAIN',
  priority: 70,
  run(ctx) {
    const { world } = ctx;
    const player = world.player;
    if (!player.alive) return;

    const age = ageOf(player, world.year);
    const rng = ctx.rng.fork('events.budget', world.year, player.id);
    const budget = Math.max(0, eventBudget(age, rng.float()) - ctx.queue.length);
    if (budget === 0) return;

    const selectCtx = makeSelectCtx(
      world,
      ctx.ruleset,
      ctx.rng.fork('events.select', world.year, player.id),
      player,
    );
    for (const pending of ctx.engine.select(selectCtx, budget)) {
      ctx.queue.push(pending);
    }
  },
};
