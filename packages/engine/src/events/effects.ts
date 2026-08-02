import type { Character, EntityId, Sex } from '../model/types.js';
import type { Effect, EventCtx, Ref } from './types.js';
import { clamp } from '../util/math.js';
import { fullName, shortName } from '../model/character.js';
import { spawnChild } from '../world/spawn.js';
import { MEMORY_BUDGET_ACTIVE, MEMORY_BUDGET_FOCUS } from '../world/memory.js';

/** Résout une référence d'effet vers un personnage. */
function resolve(ctx: EventCtx, ref: Ref | undefined): Character | undefined {
  if (ref === undefined || ref === 'subject') return ctx.subject;
  return ctx.roles[ref];
}

function ids(ctx: EventCtx, refs: Ref[] | undefined): EntityId[] {
  if (!refs) return [];
  const out: EntityId[] = [];
  for (const r of refs) {
    const c = resolve(ctx, r);
    if (c) out.push(c.id);
  }
  return out;
}

export function applyEffects(ctx: EventCtx, effects: readonly Effect[]): void {
  for (const fx of effects) applyEffect(ctx, fx);
}

export function applyEffect(ctx: EventCtx, fx: Effect): void {
  const { world, ruleset } = ctx;

  switch (fx.k) {
    case 'stat': {
      const c = resolve(ctx, fx.who);
      if (c) c.stats[fx.stat] = clamp(c.stats[fx.stat] + fx.d, 1, 100);
      return;
    }
    case 'hidden': {
      const c = resolve(ctx, fx.who);
      if (c) c.hidden[fx.id] = clamp(c.hidden[fx.id] + fx.d, 0, 100);
      return;
    }
    case 'trait': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      if (fx.remove) c.traits = c.traits.filter((t) => t !== fx.remove);
      if (fx.add && !c.traits.includes(fx.add)) {
        const def = ruleset.traits[fx.add];
        for (const excluded of def?.excludes ?? []) {
          c.traits = c.traits.filter((t) => t !== excluded);
        }
        c.traits.push(fx.add);
        if (c.isPlayer && def) world.say(`Vous devenez ${def.label.toLowerCase()}.`);
      }
      return;
    }
    case 'wealth': {
      const c = resolve(ctx, fx.who);
      if (c) c.wealth = Math.round(c.wealth + fx.d);
      return;
    }
    case 'health': {
      const c = resolve(ctx, fx.who);
      if (c) c.health = clamp(c.health + fx.d, 0, 100);
      return;
    }
    case 'mood': {
      const c = resolve(ctx, fx.who);
      if (c) c.mood = clamp(c.mood + fx.d, 0, 100);
      return;
    }
    case 'skill': {
      const c = resolve(ctx, fx.who);
      if (c) c.skills[fx.id] = clamp((c.skills[fx.id] ?? 0) + fx.d, 0, 100);
      return;
    }
    case 'injure': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      c.injuries.push({
        id: `inj${c.injuries.length + 1}`,
        label: fx.label,
        year: world.year,
        permanent: fx.permanent ?? true,
        ...(fx.stat ? { stat: fx.stat } : {}),
        ...(fx.penalty ? { penalty: fx.penalty } : {}),
      });
      if (c.isPlayer) world.say(`Blessure : ${fx.label}.`);
      return;
    }
    case 'rel': {
      const from = resolve(ctx, fx.from ?? 'subject');
      const to = resolve(ctx, fx.to);
      if (!from || !to || from.id === to.id) return;
      const rel = world.relations.ensure(
        from.id,
        to.id,
        fx.type ?? 'amitie',
        fx.label ?? shortName(to),
        world.year,
      );
      if (fx.type) rel.type = fx.type;
      if (fx.label) rel.label = fx.label;
      world.relations.modify(from.id, to.id, fx);
      if (fx.mutual) {
        world.relations.ensure(
          to.id,
          from.id,
          fx.type ?? 'amitie',
          shortName(from),
          world.year,
        );
        world.relations.modify(to.id, from.id, fx);
      }
      return;
    }
    case 'flag': {
      if (fx.scope === 'world') {
        world.flags[fx.name] = fx.value;
        return;
      }
      const c = resolve(ctx, fx.who);
      if (c) c.flags[fx.name] = fx.value;
      return;
    }
    case 'memory': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      world.memories.add(
        c.id,
        {
          year: world.year,
          text: fx.text,
          salience: clamp(fx.salience, 1, 100),
          actors: ids(ctx, fx.actors),
          tags: fx.tags ?? [],
        },
        c.lod === 0 ? MEMORY_BUDGET_FOCUS : MEMORY_BUDGET_ACTIVE,
      );
      return;
    }
    case 'seed': {
      const delay = ctx.rng.fork('seed', fx.eventId, world.year, ctx.subject.id).int(fx.min, fx.max);
      world.plantSeed({
        eventId: fx.eventId,
        plantedYear: world.year,
        dueYear: world.year + Math.max(1, delay),
        actors: ids(ctx, fx.actors),
        needsActorsAlive: fx.needsActorsAlive ?? true,
        note: fx.note ?? '',
      });
      return;
    }
    case 'kill': {
      const c = resolve(ctx, fx.who);
      // Le sujet de l'événement est l'auteur : c'est ce qui alimente le
      // record « plus de sang versé » et le compteur de meurtres du monde.
      if (c && c.alive) killCharacter(ctx, c, fx.cause, ctx.subject);
      return;
    }
    case 'job': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      c.jobId = fx.id;
      c.jobYears = 0;
      if (c.isPlayer && fx.id) {
        const job = ruleset.jobs[fx.id];
        if (job) {
          world.say(`Vous êtes désormais ${job.label.toLowerCase()}.`);
          world.record({
            year: world.year,
            kind: 'metier',
            importance: 2,
            actors: [{ id: c.id, name: fullName(c) }],
            data: { metier: job.label.toLowerCase() },
          });
        }
      }
      return;
    }
    case 'class': {
      const c = resolve(ctx, fx.who);
      if (c) c.socialClass = fx.to;
      return;
    }
    case 'chronicle': {
      const actors = (fx.actors ?? ['subject'])
        .map((r) => resolve(ctx, r))
        .filter((c): c is Character => !!c)
        .map((c) => ({ id: c.id, name: fullName(c) }));
      world.record({
        year: world.year,
        kind: fx.kind,
        importance: fx.importance,
        actors,
        data: fx.data ?? {},
      });
      return;
    }
    case 'marry': {
      const spouse = resolve(ctx, fx.who);
      const self = ctx.subject;
      if (!spouse || !spouse.alive || spouse.id === self.id) return;
      self.spouseId = spouse.id;
      spouse.spouseId = self.id;
      world.relations.ensure(self.id, spouse.id, 'mariage', 'époux', world.year);
      world.relations.ensure(spouse.id, self.id, 'mariage', 'époux', world.year);
      world.relations.modify(self.id, spouse.id, { affection: 25, trust: 20 });
      world.relations.modify(spouse.id, self.id, { affection: 25, trust: 20 });
      spouse.lod = 0;
      world.tally.marriages += 1;
      world.record({
        year: world.year,
        kind: 'mariage',
        importance: 3,
        actors: [
          { id: self.id, name: fullName(self) },
          { id: spouse.id, name: fullName(spouse) },
        ],
        data: {},
      });
      return;
    }
    case 'child': {
      const self = ctx.subject;
      const partner = fx.withRole ? resolve(ctx, fx.withRole) : world.get(self.spouseId);
      const rng = ctx.rng.fork('child', self.id, world.year, self.childrenIds.length);
      const sex: Sex = rng.chance(0.5) ? 'm' : 'f';
      const father = self.sex === 'm' ? self : (partner ?? null);
      const mother = self.sex === 'f' ? self : (partner ?? null);
      const child = spawnChild(world, ruleset, rng, father, mother, sex);
      child.lod = 0;
      world.relations.ensure(self.id, child.id, 'sang', sex === 'm' ? 'fils' : 'fille', world.year);
      world.relations.ensure(
        child.id,
        self.id,
        'sang',
        self.sex === 'm' ? 'père' : 'mère',
        world.year,
      );
      world.relations.modify(self.id, child.id, { affection: 45, trust: 30 });
      world.relations.modify(child.id, self.id, { affection: 55, trust: 45 });
      world.record({
        year: world.year,
        kind: 'enfant',
        importance: 3,
        actors: [
          { id: self.id, name: fullName(self) },
          { id: child.id, name: fullName(child) },
        ],
        data: { sexe: sex },
      });
      if (self.isPlayer) {
        world.say(`${child.given} est né${sex === 'f' ? 'e' : ''}.`);
      }
      return;
    }
    case 'foundHouse': {
      const self = ctx.subject;
      if (self.houseId) return;
      const name = fx.name ?? ruleset.houseNameFor(ctx.rng.fork('house', self.id), self);
      const id = `house_${self.id}`;
      world.houses.set(id, {
        id,
        name,
        foundedYear: world.year,
        founderId: self.id,
        headId: self.id,
        prestige: 5,
        memberIds: [self.id, ...self.childrenIds],
        traditions: [],
        rank: 'maison',
        motto: fx.motto ?? '',
        law: 'primogeniture',
        headHistory: [self.id],
        cadetIds: [],
      });
      self.houseId = id;
      self.family = name;
      for (const kid of self.childrenIds) {
        const child = world.get(kid);
        if (child) {
          child.houseId = id;
          child.family = name;
        }
      }
      world.record({
        year: world.year,
        kind: 'fondation',
        importance: 4,
        actors: [{ id: self.id, name: fullName(self) }],
        data: { maison: name },
      });
      world.say(`La Maison ${name} est fondée.`);
      return;
    }
    case 'title': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      if (fx.remove) c.titles = c.titles.filter((t) => t !== fx.remove);
      if (fx.add && !c.titles.includes(fx.add)) c.titles.push(fx.add);
      return;
    }
    case 'path': {
      const c = resolve(ctx, fx.who);
      if (c && !c.paths.includes(fx.unlock)) c.paths.push(fx.unlock);
      return;
    }
    case 'move': {
      const c = resolve(ctx, fx.who);
      if (!c) return;
      c.settlement = fx.settlement;
      if (c.isPlayer) {
        const s = world.settlement(fx.settlement);
        if (s) world.say(`Vous vivez désormais à ${s.name}.`);
      }
      return;
    }
    case 'log': {
      world.say(fx.text);
      return;
    }
  }
}

/**
 * Tue un personnage. Écrit la Chronique, dénoue les liens, marque le deuil
 * chez ceux qui l'aimaient — le chagrin est une mécanique, pas une note.
 */
export function killCharacter(
  ctx: EventCtx,
  c: Character,
  cause: string,
  by?: Character | null,
): void {
  const { world } = ctx;
  if (!c.alive) return;
  c.alive = false;
  c.deathYear = world.year;
  c.causeOfDeath = cause;
  const age = world.year - c.birthYear;

  world.tally.deaths += 1;
  world.tally.deathsByCause[cause] = (world.tally.deathsByCause[cause] ?? 0) + 1;
  world.tally.deathsByYear[world.year] = (world.tally.deathsByYear[world.year] ?? 0) + 1;
  if (by && by.id !== c.id && by.alive) {
    world.tally.murders += 1;
    const blood = by.flags['sang_verse'];
    by.flags['sang_verse'] = (typeof blood === 'number' ? blood : 0) + 1;
  }

  // Une chronique est *personnelle* : la mort d'un inconnu n'y a pas la même
  // place que celle de quelqu'un qu'on aimait ou qu'on haïssait.
  const known = world.relations.get(world.playerId, c.id);
  const importance: 1 | 2 | 3 | 4 | 5 = c.isPlayer
    ? 5
    : !known
      ? 1
      : Math.abs(known.affection) >= 30 || known.type === 'sang' || known.type === 'mariage'
        ? 3
        : 2;

  world.record({
    year: world.year,
    kind: 'mort',
    importance,
    actors: [{ id: c.id, name: fullName(c) }],
    data: { age, cause },
  });

  for (const rel of world.relations.toward(c.id)) {
    const mourner = world.get(rel.from);
    if (!mourner || !mourner.alive) continue;
    if (rel.affection > 20) {
      mourner.mood = clamp(mourner.mood - Math.round(rel.affection / 3), 0, 100);
      world.memories.add(
        mourner.id,
        {
          year: world.year,
          text: `${shortName(c)} est mort${c.sex === 'f' ? 'e' : ''} — ${cause}.`,
          salience: clamp(40 + rel.affection / 2, 30, 95),
          actors: [c.id],
          tags: ['deuil'],
        },
        mourner.lod === 0 ? MEMORY_BUDGET_FOCUS : MEMORY_BUDGET_ACTIVE,
      );
    }
  }

  const spouse = world.get(c.spouseId);
  if (spouse) spouse.spouseId = null;

  if (!c.isPlayer && world.player.alive) {
    const known = world.relations.get(world.playerId, c.id);
    if (known) {
      world.say(`${shortName(c)} (${known.label}) est mort${c.sex === 'f' ? 'e' : ''} — ${cause}.`);
    }
  }
}
