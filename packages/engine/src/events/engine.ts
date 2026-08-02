import type { Character, EntityId, Seed } from '../model/types.js';
import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { Rng, hashKey } from '../rng/rng.js';
import { ageOf } from '../model/character.js';
import { applyEffects } from './effects.js';
import type {
  EventCtx,
  EventDef,
  EventResolution,
  PendingEvent,
  PendingOption,
  SelectCtx,
} from './types.js';

export function makeSelectCtx(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  subject: Character,
): SelectCtx {
  return { world, ruleset, subject, age: ageOf(subject, world.year), rng };
}

export function makeEventCtx(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  subject: Character,
  roles: Record<string, Character>,
): EventCtx {
  return {
    world,
    ruleset,
    subject,
    age: ageOf(subject, world.year),
    rng,
    roles,
    role(name: string): Character {
      const c = roles[name];
      if (!c) throw new Error(`Rôle « ${name} » absent du contexte`);
      return c;
    },
    maybe(name: string): Character | undefined {
      return roles[name];
    },
    rel(name: string) {
      const c = roles[name];
      return c ? world.relations.get(subject.id, c.id) : undefined;
    },
  };
}

export class EventEngine {
  private byId = new Map<string, EventDef>();

  constructor(private readonly ruleset: Ruleset) {
    for (const def of ruleset.events) this.byId.set(def.id, def);
  }

  def(id: string): EventDef | undefined {
    return this.byId.get(id);
  }

  /** Filtre dur : l'événement est-il seulement possible ici et maintenant ? */
  eligible(ctx: SelectCtx, def: EventDef): boolean {
    const { world, subject } = ctx;
    if (def.modes && !def.modes.includes(world.mode)) return false;
    if (def.minAge !== undefined && ctx.age < def.minAge) return false;
    if (def.maxAge !== undefined && ctx.age > def.maxAge) return false;
    if (def.once === 'life' && subject.seen.includes(def.id)) return false;
    if (def.once === 'dynasty' && world.flags[`once:${def.id}`]) return false;

    const cd = def.cooldown;
    if (cd) {
      const until =
        cd.scope === 'character' ? subject.cooldowns[def.id] : world.cooldowns[def.id];
      if (until !== undefined && world.year < until) return false;
    }
    if (def.requires && !def.requires(ctx)) return false;
    return true;
  }

  /**
   * Saturation de tags (doc 04 §1.4) : c'est ce qui empêche le jeu de sembler
   * répétitif au bout de deux heures.
   */
  private saturation(ctx: SelectCtx, def: EventDef): number {
    let factor = 1;
    for (const tag of def.tags) {
      const pressure = ctx.world.tagPressure(tag, 12);
      if (pressure > 0) factor *= 1 / (1 + 0.55 * pressure);
    }
    return Math.max(factor, 0.04);
  }

  /** Tire jusqu'à `max` événements pertinents, sans remise. */
  select(ctx: SelectCtx, max: number): PendingEvent[] {
    const pool: { def: EventDef; w: number }[] = [];
    for (const def of this.ruleset.events) {
      if (def.seedOnly) continue;
      if (!this.eligible(ctx, def)) continue;
      const base = typeof def.weight === 'function' ? def.weight(ctx) : def.weight;
      if (base <= 0) continue;
      pool.push({ def, w: base * this.saturation(ctx, def) });
    }
    pool.sort((a, b) => (a.def.id < b.def.id ? -1 : a.def.id > b.def.id ? 1 : 0));

    const out: PendingEvent[] = [];
    const taken = new Set<string>();
    for (let i = 0; i < max && pool.length > 0; i++) {
      const rng = ctx.rng.fork('events.draw', ctx.world.year, ctx.subject.id, i);
      const chosen = rng.weighted(
        pool.filter((p) => !taken.has(p.def.id)),
        (p) => p.w,
      );
      if (!chosen) break;
      taken.add(chosen.def.id);
      const pending = this.build(ctx, chosen.def);
      if (pending) out.push(pending);
    }
    return out;
  }

  /** Construit un événement depuis une graine arrivée à maturité. */
  fromSeed(ctx: SelectCtx, seed: Seed): PendingEvent | null {
    const def = this.byId.get(seed.eventId);
    if (!def) return null;
    if (def.minAge !== undefined && ctx.age < def.minAge) return null;
    if (def.requires && !def.requires(ctx)) return null;
    const preset: Record<string, EntityId> = {};
    const names = Object.keys(def.roles ?? {});
    seed.actors.forEach((id, i) => {
      const name = names[i];
      if (name) preset[name] = id;
    });
    return this.build(ctx, def, preset);
  }

  /** Tire les rôles, rend le texte et les options. Null si un rôle manque. */
  build(
    ctx: SelectCtx,
    def: EventDef,
    presetRoles: Record<string, EntityId> = {},
  ): PendingEvent | null {
    const roles: Record<string, Character> = {};
    const roleIds: Record<string, EntityId> = {};
    for (const [name, picker] of Object.entries(def.roles ?? {})) {
      const presetId = presetRoles[name];
      const preset = presetId !== undefined ? ctx.world.get(presetId) : undefined;
      const c = preset && preset.alive ? preset : picker(ctx);
      if (!c) return null;
      roles[name] = c;
      roleIds[name] = c.id;
    }

    const eventCtx = makeEventCtx(ctx.world, ctx.ruleset, ctx.rng, ctx.subject, roles);
    const salt = ctx.rng.fork('events.salt', def.id, ctx.world.year, ctx.subject.id).u32();

    const options: PendingOption[] = [];
    for (const opt of def.options) {
      const ok = opt.requires ? opt.requires(eventCtx) : true;
      if (!ok && opt.hideWhenLocked) continue;
      options.push({
        id: opt.id,
        label: typeof opt.label === 'function' ? opt.label(eventCtx) : opt.label,
        ...(opt.hint ? { hint: opt.hint } : {}),
        locked: !ok,
        ...(!ok && opt.lockedReason ? { lockedReason: opt.lockedReason } : {}),
      });
    }
    if (options.every((o) => o.locked)) return null;

    // marque l'événement comme sorti : cooldowns, unicité, saturation
    const { world, subject } = ctx;
    if (def.once === 'life' && !subject.seen.includes(def.id)) subject.seen.push(def.id);
    if (def.once === 'dynasty') world.flags[`once:${def.id}`] = true;
    if (def.cooldown) {
      const until = world.year + def.cooldown.years;
      if (def.cooldown.scope === 'character') subject.cooldowns[def.id] = until;
      else world.cooldowns[def.id] = until;
    }
    world.noteTags(def.tags);

    return {
      defId: def.id,
      text: def.text(eventCtx),
      roleIds,
      subjectId: subject.id,
      salt,
      options,
    };
  }

  /** Applique le choix du joueur. Le choix n'est pas le résultat. */
  resolve(world: World, pending: PendingEvent, optionId: string): EventResolution {
    const def = this.byId.get(pending.defId);
    if (!def) return { text: '…', log: [] };
    const subject = world.get(pending.subjectId);
    if (!subject) return { text: '…', log: [] };

    const roles: Record<string, Character> = {};
    for (const [name, id] of Object.entries(pending.roleIds)) {
      const c = world.get(id);
      if (c) roles[name] = c;
    }

    const rng = new Rng(hashKey(world.seed, ['resolve', pending.defId, optionId, pending.salt]));
    const ctx = makeEventCtx(world, this.ruleset, rng, subject, roles);

    const option = def.options.find((o) => o.id === optionId) ?? def.options[0];
    if (!option) return { text: '…', log: [] };

    const outcome = rng.weighted(option.outcomes, (o) =>
      typeof o.weight === 'function' ? o.weight(ctx) : o.weight,
    );
    if (!outcome) return { text: '…', log: [] };

    const effects =
      typeof outcome.effects === 'function' ? outcome.effects(ctx) : outcome.effects;
    const text = outcome.text(ctx);
    applyEffects(ctx, effects);

    return { text, log: world.drainLog() };
  }
}
