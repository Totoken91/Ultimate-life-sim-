import type { System, TickContext } from './types.js';
import type { Character } from '../model/types.js';
import type { World } from '../world/world.js';
import type { EventCtx } from '../events/types.js';
import type { Rng } from '../rng/rng.js';
import { ageOf } from '../model/character.js';
import { applyEffects } from '../events/effects.js';
import { ActionIndex, chooseAction } from '../ai/actions.js';
import {
  computeDrives,
  emptyCast,
  readRelations,
  upkeepOf,
  type Cast,
  type Situation,
} from '../ai/drives.js';

/**
 * Un PNJ hors du cercle du joueur n'agit qu'une année sur quatre. Même
 * trajectoire sur une vie, trois fois moins de travail — c'est le doc 02
 * appliqué à la volonté.
 */
const CADENCE = 4;

/** Âge à partir duquel on décide de soi-même. */
const MAJORITE = 13;

interface Locals {
  /** Tout le monde, par implantation. */
  all: Map<string, Character[]>;
  /** Célibataires en âge de l'être. */
  libres: Map<string, Character[]>;
  /** Les jeunes, à instruire ou à employer. */
  jeunes: Map<string, Character[]>;
  /** Ceux qui ont déjà des hommes à eux — les serments vont aux serments. */
  patrons: Map<string, Character[]>;
}

function buildLocals(world: World, living: readonly Character[], year: number): Locals {
  const all = new Map<string, Character[]>();
  const libres = new Map<string, Character[]>();
  const jeunes = new Map<string, Character[]>();
  const patrons = new Map<string, Character[]>();
  const push = (m: Map<string, Character[]>, key: string, c: Character): void => {
    let b = m.get(key);
    if (!b) m.set(key, (b = []));
    b.push(c);
  };

  // Un seul parcours des arêtes pour compter les jurés de chacun. Le faire par
  // personne serait quadratique ; ici c'est le même coût qu'une dérive.
  const sworn = new Map<number, number>();
  world.relations.forEach((rel) => {
    if (rel.type !== 'serment') return;
    sworn.set(rel.to, (sworn.get(rel.to) ?? 0) + 1);
  });

  for (const c of living) {
    push(all, c.settlement, c);
    const age = year - c.birthYear;
    if (!c.spouseId && age >= 17 && age <= 55) push(libres, c.settlement, c);
    if (age >= 8 && age <= 20) push(jeunes, c.settlement, c);
    if (!c.isPlayer && (sworn.get(c.id) ?? 0) >= 1) push(patrons, c.settlement, c);
  }
  return { all, libres, jeunes, patrons };
}

/** Complète la distribution avec ce que le lieu offre. */
function castLocals(
  sit: { self: Character; age: number },
  cast: Cast,
  locals: Locals,
  rng: Rng,
  year: number,
): void {
  const self = sit.self;
  const here = locals.all.get(self.settlement);
  if (here && here.length > 1) {
    for (let tries = 0; tries < 3; tries++) {
      const pick = here[rng.int(0, here.length - 1)];
      if (pick && pick.id !== self.id) {
        cast.voisin = pick;
        break;
      }
    }
  }

  const libres = locals.libres.get(self.settlement);
  if (libres && !self.spouseId && sit.age >= 17 && sit.age <= 55) {
    for (let tries = 0; tries < 4; tries++) {
      const pick = libres[rng.int(0, libres.length - 1)];
      if (!pick || pick.id === self.id || pick.sex === self.sex || pick.isPlayer) continue;
      if (Math.abs(year - pick.birthYear - sit.age) > 14) continue;
      cast.pretendant = pick;
      break;
    }
  }

  const patrons = locals.patrons.get(self.settlement);
  if (patrons && patrons.length > 0) {
    for (let tries = 0; tries < 3; tries++) {
      const pick = patrons[rng.int(0, patrons.length - 1)];
      if (pick && pick.id !== self.id) {
        cast.patron = pick;
        break;
      }
    }
  }

  const jeunes = locals.jeunes.get(self.settlement);
  if (jeunes && sit.age >= 25) {
    for (let tries = 0; tries < 3; tries++) {
      const pick = jeunes[rng.int(0, jeunes.length - 1)];
      if (pick && pick.id !== self.id && pick.fatherId !== self.id && pick.motherId !== self.id) {
        cast.cadet = pick;
        break;
      }
    }
  }
}

function familyCast(ctx: TickContext, self: Character, cast: Cast): number {
  const { world } = ctx;
  const spouse = world.get(self.spouseId);
  if (spouse?.alive) cast.epoux = spouse;
  const father = world.get(self.fatherId);
  const mother = world.get(self.motherId);
  cast.parent = father?.alive ? father : mother?.alive ? mother : null;
  let kids = 0;
  for (const id of self.childrenIds) {
    const kid = world.get(id);
    if (!kid || !kid.alive) continue;
    kids += 1;
    if (!cast.enfant || kid.birthYear < cast.enfant.birthYear) cast.enfant = kid;
  }
  return kids;
}

/** Le joueur voit-il passer cette nouvelle ? */
function visible(ctx: TickContext, actor: Character, reach: string): boolean {
  const { world } = ctx;
  if (reach === 'monde') return true;
  const player = world.player;
  if (!player.alive) return reach === 'local';
  const known = world.relations.get(player.id, actor.id) ?? world.relations.get(actor.id, player.id);
  if (known) return true;
  return reach === 'local' && actor.settlement === player.settlement;
}

/**
 * Contexte d'effets réutilisé d'un PNJ à l'autre.
 *
 * Le format d'effets réclame trois fermetures ; en construire trois cents par
 * année allouait plus que tout le travail de décision réuni. L'objet est
 * réemployé parce que `applyEffects` est synchrone et ne le conserve jamais.
 */
class ActContext implements EventCtx {
  world!: EventCtx['world'];
  ruleset!: EventCtx['ruleset'];
  subject!: Character;
  age = 0;
  rng!: Rng;
  readonly roles: Record<string, Character> = {};

  role(name: string): Character {
    const c = this.roles[name];
    if (!c) throw new Error(`Action de PNJ : rôle « ${name} » absent`);
    return c;
  }

  maybe(name: string): Character | undefined {
    return this.roles[name];
  }

  rel(name: string): ReturnType<EventCtx['rel']> {
    const c = this.roles[name];
    return c ? this.world.relations.get(this.subject.id, c.id) : undefined;
  }
}

/**
 * MAIN — l'agentivité des PNJ (doc 13).
 *
 * Chaque habitant lit ses manques, regarde ce que sa vie met à portée, et fait
 * quelque chose. Rien de tout cela ne passe par le joueur : c'est la différence
 * entre un décor et un monde.
 */
export const Agency: System = {
  id: 'ai.agency',
  phase: 'MAIN',
  priority: 52,
  run(ctx) {
    const { world, ruleset } = ctx;
    const actions = ruleset.npcActions ?? [];
    if (actions.length === 0) return;
    const idx = new ActionIndex(actions);
    const locals = buildLocals(world, ctx.living, world.year);
    const eventCtx = new ActContext();
    eventCtx.world = world;
    eventCtx.ruleset = ruleset;

    for (const self of ctx.living) {
      if (self.isPlayer) continue;
      const age = ageOf(self, world.year);
      if (age < MAJORITE) continue;
      // Le cercle du joueur vit en continu ; le reste du monde par tiers.
      if (self.lod !== 0 && (self.id + world.year) % CADENCE !== 0) continue;

      const rng = ctx.rng.fork('ai.agency', world.year, self.id);
      const cast = emptyCast();
      const kids = familyCast(ctx, self, cast);
      const read = readRelations(world, self, cast);
      castLocals({ self, age }, cast, locals, rng, world.year);

      const sit: Situation = {
        self,
        world,
        ruleset,
        age,
        cast,
        grudge: read.grudge,
        allies: read.allies,
        enemies: read.enemies,
        bonds: read.bonds,
        kids,
        upkeep: upkeepOf(self, world.year),
        danger: world.settlement(self.settlement)?.danger ?? 0,
      };

      const drives = computeDrives(sit);
      // Le même flux sert au choix puis à l'acte : un fork de moins par
      // habitant et par année, et l'aléa reste entièrement reproductible.
      const decision = chooseAction(sit, drives, idx, rng);
      if (!decision) continue;

      const { def, target } = decision;
      const actCtx = { sit, self, target, age, rng };

      eventCtx.subject = self;
      eventCtx.age = age;
      eventCtx.rng = rng;
      delete eventCtx.roles['cible'];
      if (target) eventCtx.roles['cible'] = target;

      applyEffects(eventCtx, def.effects(actCtx));
      if (def.cooldown) self.flags[`ai:${def.id}`] = world.year;
      // Compteur écrit au point d'action, jamais recalculé (doc 10 §1). C'est
      // lui qui dira au banc d'émergence quelle conduite ne sort jamais et
      // laquelle inonde le monde.
      const tally = world.tally.npcActions;
      tally[def.id] = (tally[def.id] ?? 0) + 1;

      if (def.news) {
        const reach = def.reach ?? 'local';
        if (visible(ctx, self, reach)) {
          const text = def.news(actCtx);
          world.report({
            year: world.year,
            text,
            reach: reach as 'intime' | 'local' | 'monde',
            place: self.settlement,
            actors: target ? [self.id, target.id] : [self.id],
          });
          // Ce qui touche le joueur directement remonte aussi dans son année.
          if (target?.isPlayer || reach === 'monde') world.say(text);
        }
      }
    }
  },
};
