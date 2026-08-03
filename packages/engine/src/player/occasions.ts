import type { Character, EntityId, Faction } from '../model/types.js';
import type { Domain } from '../model/domain.js';
import type { Effect, EventCtx, RolePicker } from '../events/types.js';
import type { Rng } from '../rng/rng.js';
import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { makeEventCtx } from '../events/engine.js';
import { ageOf } from '../model/character.js';

/**
 * Les occasions (doc 16 §3).
 *
 * Le défaut d'un menu d'actions fixe, ce n'est pas sa longueur : c'est qu'il
 * est le **même** que vous soyez mendiant aux Marches ou seigneur de Vardhèn,
 * l'année d'une famine ou l'année d'une victoire. Ici, ce qui vous est proposé
 * est *lu dans l'état du monde* — les prix, les groupes, les gens qui viennent
 * d'agir, le régime, ce qui manque.
 *
 * Une occasion ne dure pas. Si vous ne la prenez pas, elle se ferme, et c'est
 * précisément ce qui donne du poids à une année.
 */

export interface OccasionCtx extends EventCtx {
  /** Le domaine où l'on vit. Prix, manque, régime, trésor. */
  readonly domain: Domain | undefined;
  /** Le groupe dont on est, s'il y en a un. */
  readonly faction: Faction | undefined;
  /** Le groupe le plus fort du lieu, qu'on en soit ou non. */
  readonly localPower: Faction | undefined;
}

export interface OccasionDef {
  id: string;
  /** Le monde offre-t-il ça, ici, maintenant, à cette personne ? */
  when: (c: OccasionCtx) => boolean;
  /** Poids relatif du tirage. Zéro écarte. */
  weight: (c: OccasionCtx) => number;
  /** Temps que ça prend. Une occasion chère se paie sur le reste de l'année. */
  cost: number;
  minAge?: number;
  maxAge?: number;
  /** Qui elle met en jeu. */
  role?: RolePicker;
  label: (c: OccasionCtx) => string;
  detail: (c: OccasionCtx) => string;
  take: (c: OccasionCtx) => { text: string; effects: Effect[] };
  /** Années pendant lesquelles elle reste ouverte. Défaut : celle-ci. */
  window?: number;
  tags?: string[];
}

/** Une occasion tirée, prête à afficher — et sérialisable. */
export interface Occasion {
  id: number;
  defId: string;
  label: string;
  detail: string;
  cost: number;
  roleId: EntityId | null;
  /** Après cette année, elle n'est plus là. */
  until: number;
}

/** Combien on en montre par année. Au-delà, ce n'est plus un choix, c'est une liste. */
export const OCCASIONS_PAR_AN = 3;

/**
 * Années avant qu'une occasion déjà saisie puisse revenir. Sans ce délai,
 * « acheter du grain pendant qu'il ne vaut rien » revenait chaque année tant
 * que le grain était bas : mécaniquement juste, et parfaitement lassant.
 */
export const REPOS_OCCASION = 6;

export function occasionCtx(
  world: World,
  ruleset: Ruleset,
  rng: Rng,
  subject: Character,
  roles: Record<string, Character> = {},
): OccasionCtx {
  const base = makeEventCtx(world, ruleset, rng, subject, roles);
  let mine: Faction | undefined;
  let strongest: Faction | undefined;
  for (const f of world.activeFactions()) {
    if (f.leaderId === subject.id || f.memberIds.includes(subject.id)) mine = mine ?? f;
    if (f.seat === subject.settlement && (!strongest || f.power > strongest.power)) strongest = f;
  }
  return {
    ...base,
    role: base.role.bind(base),
    maybe: base.maybe.bind(base),
    rel: base.rel.bind(base),
    domain: world.domainAt(subject.settlement),
    faction: mine,
    localPower: strongest,
  };
}

/**
 * Tire les occasions de l'année. Déterministe : la même situation offre les
 * mêmes portes. Les occasions encore ouvertes de l'an dernier sont conservées —
 * une porte peut rester entrebâillée, mais jamais indéfiniment.
 */
export function drawOccasions(
  world: World,
  ruleset: Ruleset,
  subject: Character,
  rng: Rng,
  keep: readonly Occasion[],
  nextId: () => number,
): Occasion[] {
  const age = ageOf(subject, world.year);
  // Une occasion dont l'acteur est mort n'est plus une occasion : elle produit
  // « vous écoutez quelqu'un pendant des heures », ce que personne ne devrait lire.
  const vivantes = keep.filter(
    (o) => o.until >= world.year && (o.roleId === null || (world.get(o.roleId)?.alive ?? false)),
  );
  const dejaLa = new Set(vivantes.map((o) => o.defId));
  const out = [...vivantes];

  const candidats: { def: OccasionDef; ctx: OccasionCtx; poids: number }[] = [];
  for (const def of ruleset.occasions ?? []) {
    if (dejaLa.has(def.id)) continue;
    const prise = subject.flags[`occ:${def.id}`];
    if (typeof prise === 'number' && world.year - prise < REPOS_OCCASION) continue;
    if (def.minAge !== undefined && age < def.minAge) continue;
    if (def.maxAge !== undefined && age > def.maxAge) continue;

    const forked = rng.fork('occasion', def.id);
    const roleCtx = occasionCtx(world, ruleset, forked, subject);
    let cible: Character | null = null;
    if (def.role) {
      cible = def.role(roleCtx);
      if (!cible) continue;
    }
    const ctx = cible
      ? occasionCtx(world, ruleset, forked, subject, { cible })
      : roleCtx;
    if (!def.when(ctx)) continue;
    const poids = def.weight(ctx);
    if (poids <= 0) continue;
    candidats.push({ def, ctx, poids });
  }

  candidats.sort((a, b) => (a.def.id < b.def.id ? -1 : 1));

  const restant = Math.max(0, OCCASIONS_PAR_AN - out.length);
  const pris = new Set<string>();
  for (let i = 0; i < restant; i++) {
    const choix = rng
      .fork('tirage', i)
      .weighted(candidats.filter((x) => !pris.has(x.def.id)), (x) => x.poids);
    if (!choix) break;
    pris.add(choix.def.id);
    const cible = choix.ctx.maybe('cible');
    out.push({
      id: nextId(),
      defId: choix.def.id,
      label: choix.def.label(choix.ctx),
      detail: choix.def.detail(choix.ctx),
      cost: choix.def.cost,
      roleId: cible?.id ?? null,
      until: world.year + Math.max(0, (choix.def.window ?? 1) - 1),
    });
  }
  return out;
}
