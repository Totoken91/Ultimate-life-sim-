import type { Character, RelationType, Sex, SocialClass } from '../model/types.js';
import type { RolePicker, SelectCtx } from './types.js';
import { spawnCharacter } from '../world/spawn.js';
import { agreeLabel } from '../util/text.js';
import { ageOf } from '../model/character.js';

export interface KnownFilter {
  minAge?: number;
  maxAge?: number;
  sex?: Sex;
  types?: RelationType[];
  /** Étiquettes de relation acceptées : « mère », « fils », « voisin »… */
  labels?: string[];
  minAffection?: number;
  maxAffection?: number;
  alive?: boolean;
  excludeSpouse?: boolean;
  where?: (c: Character, ctx: SelectCtx) => boolean;
}

function matches(ctx: SelectCtx, c: Character, f: KnownFilter): boolean {
  if ((f.alive ?? true) && !c.alive) return false;
  const age = ageOf(c, ctx.world.year);
  if (f.minAge !== undefined && age < f.minAge) return false;
  if (f.maxAge !== undefined && age > f.maxAge) return false;
  if (f.sex && c.sex !== f.sex) return false;
  if (f.excludeSpouse && ctx.subject.spouseId === c.id) return false;
  if (f.where && !f.where(c, ctx)) return false;
  return true;
}

/** Quelqu'un que le sujet connaît déjà. Le coeur de la qualité narrative. */
function known(f: KnownFilter = {}): RolePicker {
  return (ctx) => {
    const candidates: Character[] = [];
    for (const rel of ctx.world.relations.from(ctx.subject.id)) {
      if (f.types && !f.types.includes(rel.type)) continue;
      if (f.labels && !f.labels.includes(rel.label)) continue;
      if (f.minAffection !== undefined && rel.affection < f.minAffection) continue;
      if (f.maxAffection !== undefined && rel.affection > f.maxAffection) continue;
      const c = ctx.world.get(rel.to);
      if (c && matches(ctx, c, f)) candidates.push(c);
    }
    candidates.sort((a, b) => a.id - b.id);
    return ctx.rng.pickOrNull(candidates);
  };
}

/** Un membre de la famille proche. */
function relative(f: KnownFilter = {}): RolePicker {
  return known({ ...f, types: ['sang', 'mariage'] });
}

function parent(f: KnownFilter = {}): RolePicker {
  return known({ ...f, labels: ['père', 'mère'] });
}

function child(f: KnownFilter = {}): RolePicker {
  return known({ ...f, labels: ['fils', 'fille'] });
}

function spouse(): RolePicker {
  return (ctx) => {
    const s = ctx.world.get(ctx.subject.spouseId);
    return s && s.alive ? s : null;
  };
}

/** N'importe qui de vivant dans la même implantation. */
function local(f: KnownFilter = {}): RolePicker {
  return (ctx) => {
    const candidates = ctx.world
      .living()
      .filter(
        (c) =>
          c.id !== ctx.subject.id &&
          c.settlement === ctx.subject.settlement &&
          matches(ctx, c, f),
      );
    return ctx.rng.pickOrNull(candidates);
  };
}

export interface GenerateOptions {
  minAge?: number;
  maxAge?: number;
  sex?: Sex;
  socialClass?: SocialClass;
  statMean?: number;
  traits?: string[];
  /** Étiquette posée sur la relation créée, si `bond` est demandé. */
  bond?: { type: RelationType; label: string; affection?: number };
}

/** Crée un inconnu cohérent. Filet de sécurité quand personne ne convient. */
function generate(opts: GenerateOptions = {}): RolePicker {
  return (ctx) => {
    const rng = ctx.rng.fork('role.generate', ctx.world.year, ctx.subject.id);
    const age = rng.int(opts.minAge ?? 18, opts.maxAge ?? 55);
    const c = spawnCharacter(ctx.world, ctx.ruleset, rng, {
      culture: ctx.subject.culture,
      age,
      settlement: ctx.subject.settlement,
      ...(opts.sex ? { sex: opts.sex } : {}),
      ...(opts.socialClass ? { socialClass: opts.socialClass } : {}),
      ...(opts.statMean !== undefined ? { statMean: opts.statMean } : {}),
      ...(opts.traits ? { traits: opts.traits } : {}),
    });
    if (opts.bond) {
      ctx.world.relations.ensure(
        ctx.subject.id,
        c.id,
        opts.bond.type,
        agreeLabel(opts.bond.label, c.sex),
        ctx.world.year,
      );
      if (opts.bond.affection) {
        ctx.world.relations.modify(ctx.subject.id, c.id, { affection: opts.bond.affection });
      }
    }
    return c;
  };
}

/** Essaie chaque sélecteur dans l'ordre, garde le premier qui trouve quelqu'un. */
function first(...pickers: RolePicker[]): RolePicker {
  return (ctx) => {
    for (const p of pickers) {
      const c = p(ctx);
      if (c) return c;
    }
    return null;
  };
}

export const pick = {
  known,
  relative,
  parent,
  child,
  spouse,
  local,
  generate,
  first,
};
