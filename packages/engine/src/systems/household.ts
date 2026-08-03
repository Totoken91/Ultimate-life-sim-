import type { System } from './types.js';
import type { Character, EntityId } from '../model/types.js';
import type { World } from '../world/world.js';
import { shortName } from '../model/character.js';
import { clamp } from '../util/math.js';
import { ANNEES_IMPAYEES } from '../player/holdings.js';

/**
 * POST — le patrimoine et ceux qui le tiennent (doc 09 §4).
 *
 * « L'entretien est la mécanique centrale, pas la décoration. » Rien ne
 * disparaît d'un coup : ça se dégrade, les gages ne sont plus versés, et les
 * gens partent les premiers. C'est une soustraction, et c'est une des plus
 * belles scènes que le jeu puisse produire.
 */
export const Household: System = {
  id: 'player.household',
  phase: 'POST',
  priority: 45,
  run(ctx) {
    const { world, ruleset } = ctx;
    if (world.holdings.length === 0 && world.retainers.size === 0) return;

    // Les propriétaires, triés : ce système écrit dans le journal, donc
    // l'ordre doit être déterministe (doc 01 §3).
    const owners = new Set<EntityId>(world.holdings.map((h) => h.ownerId));
    for (const ownerId of world.retainers.keys()) owners.add(ownerId);
    const tries = [...owners].sort((a, b) => a - b);
    for (const ownerId of tries) {
      const owner = world.get(ownerId);
      if (!owner) continue;

      // Un mort ne tient plus rien : ses biens passent, ses gens s'en vont.
      if (!owner.alive) {
        releaseAll(ctx, owner);
        continue;
      }

      const rng = ctx.rng.fork('household', world.year, owner.id);
      const mien = world.holdingsOf(owner.id);

      // ── entretien du bâti ────────────────────────────────────────────────
      let soinsDuPersonnel = 0;
      for (const r of world.retainersOf(owner.id)) {
        const def = ruleset.retainers.find((d) => d.id === r.defId);
        if (def && r.unpaid === 0) soinsDuPersonnel += def.gives.upkeep ?? 0;
      }

      for (const h of mien) {
        const def = ruleset.holdings.find((d) => d.id === h.defId);
        if (!def) continue;
        if (owner.wealth >= def.upkeep) {
          owner.wealth -= def.upkeep;
          h.condition = clamp(h.condition + 4 + soinsDuPersonnel, 0, 100);
        } else {
          // On ne peut plus payer : ça se dégrade, visiblement.
          const avant = h.condition;
          h.condition = clamp(h.condition - 9 + soinsDuPersonnel * 0.5, 0, 100);
          if (owner.isPlayer && avant >= 45 && h.condition < 45) {
            world.say(`${h.label} commence à se voir : vous ne suivez plus l'entretien.`);
          }
          if (h.condition <= 0) {
            world.holdings = world.holdings.filter((x) => x.id !== h.id);
            if (owner.isPlayer) {
              world.say(`${h.label} n'est plus tenable. Vous partez avant qu'on vous en chasse.`);
              world.record({
                year: world.year,
                kind: 'ruine',
                importance: 3,
                actors: [{ id: owner.id, name: shortName(owner) }],
                data: { quoi: h.label.toLowerCase() },
              });
            }
          }
        }
      }

      // ── les gages ────────────────────────────────────────────────────────
      for (const r of world.retainersOf(owner.id)) {
        const def = ruleset.retainers.find((d) => d.id === r.defId);
        const servant = world.get(r.personId);
        if (!def || !servant || !servant.alive) {
          dismiss(ctx, owner, r.personId, null);
          continue;
        }
        if (owner.wealth >= def.wage) {
          owner.wealth -= def.wage;
          servant.wealth += Math.round(def.wage * 0.8);
          r.unpaid = 0;
          world.relations.modify(servant.id, owner.id, { trust: 2, respect: 1 });
          // Ce que le service rend, année après année.
          if (def.gives.skill) {
            owner.skills[def.gives.skill.id] = clamp(
              (owner.skills[def.gives.skill.id] ?? 0) + def.gives.skill.d,
              0,
              100,
            );
          }
        } else {
          r.unpaid += 1;
          world.relations.modify(servant.id, owner.id, { trust: -14, affection: -8 });
          if (owner.isPlayer && r.unpaid === 1) {
            world.say(`Vous n'avez pas pu payer ${r.label.toLowerCase()}. On ne dit rien, encore.`);
          }
          if (r.unpaid > ANNEES_IMPAYEES) {
            dismiss(ctx, owner, servant.id, 'parti faute de gages');
            continue;
          }
        }

        // Un domestique bien traité peut aussi être débauché. Personne ne
        // vous appartient (doc 17 §3).
        const lien = world.relations.get(servant.id, owner.id);
        if (lien && lien.affection < -25 && rng.chance(0.25)) {
          dismiss(ctx, owner, servant.id, 'parti de son propre chef');
        }
      }

      // ── ce que le confort fait au corps et à l'humeur ────────────────────
      let confort = 0;
      for (const h of mien) {
        const def = ruleset.holdings.find((d) => d.id === h.defId);
        if (def) confort += def.comfort * (0.4 + (h.condition / 100) * 0.6);
      }
      for (const r of world.retainersOf(owner.id)) {
        const def = ruleset.retainers.find((d) => d.id === r.defId);
        if (def && r.unpaid === 0) confort += def.gives.comfort ?? 0;
      }
      if (confort > 0) {
        owner.mood = clamp(owner.mood + Math.min(6, confort / 4), 0, 100);
      }
    }
  },
};

function dismiss(
  ctx: { world: World },
  owner: Character,
  personId: EntityId,
  reason: string | null,
): void {
  const { world } = ctx;
  const list = world.retainers.get(owner.id) ?? [];
  const parti = list.find((r) => r.personId === personId);
  world.retainers.set(
    owner.id,
    list.filter((r) => r.personId !== personId),
  );
  const servant = world.get(personId);
  if (owner.isPlayer && parti && reason && servant) {
    world.say(`${shortName(servant)} — ${parti.label.toLowerCase()} — s'en va : ${reason}.`);
  }
}

/** À la mort, tout se dénoue : les gens d'abord. */
function releaseAll(ctx: { world: World }, owner: Character): void {
  const { world } = ctx;
  world.retainers.delete(owner.id);
}
