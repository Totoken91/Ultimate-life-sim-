import type { System, TickContext } from './types.js';
import type { Character, Faction } from '../model/types.js';
import type { Domain } from '../model/domain.js';
import { GOOD_LABELS, regimeName } from '../model/domain.js';
import { shortName } from '../model/character.js';
import { clamp } from '../util/math.js';
import { applyHealthDelta } from './physiology.js';
import { summarizeHealth } from '../body/body.js';
import {
  hunger,
  runDomainYear,
  runTrade,
  taxRate,
} from '../economy/domains.js';
import {
  chooseRuler,
  collectTax,
  outputFactor,
  rulerName,
  tickMood,
  upheaval,
} from '../economy/government.js';

/** Résidents par implantation, calculés une fois par tick. */
function byPlace(living: readonly Character[]): Map<string, Character[]> {
  const map = new Map<string, Character[]>();
  for (const c of living) {
    let b = map.get(c.settlement);
    if (!b) map.set(c.settlement, (b = []));
    b.push(c);
  }
  return map;
}

/**
 * PRE — l'économie du domaine.
 *
 * Chaque implantation produit ce que ses gens produisent, consomme ce qu'ils
 * consomment, et ses prix naissent de l'écart. Puis le grain va là où il
 * manque, parce que le prix l'y appelle (doc 11 §2).
 */
export const DomainEconomy: System = {
  id: 'domain.economy',
  phase: 'PRE',
  priority: 30,
  run(ctx) {
    const { world, ruleset } = ctx;
    if (world.domains.size === 0) return;
    const habitants = byPlace(ctx.living);

    for (const dom of world.domainList()) {
      if (dom.settlement === null) continue;
      const residents = habitants.get(dom.settlement) ?? [];
      runDomainYear(world, ruleset, dom, residents);

      // Qui possède la terre change ce qu'elle rend. Aucune propriété n'est
      // « la bonne » : chacune paie ailleurs (doc 11 §4).
      const facteur = outputFactor(dom.government);
      if (facteur !== 1) {
        for (const g of Object.keys(dom.production) as (keyof typeof dom.production)[]) {
          const v = dom.production[g];
          if (v !== undefined) dom.production[g] = v * facteur;
        }
      }
    }

    runTrade(world);

    // Les domaines qui englobent additionnent les leurs, **du bas vers le
    // haut** : sinon le monde totalise des régions pas encore à jour. La
    // récursivité n'est pas décorative — c'est elle qui portera les paliers
    // planétaires puis stellaires sans réécrire une ligne.
    for (const dom of world.domainsBottomUp()) {
      if (dom.settlement !== null) continue;
      dom.population = 0;
      dom.production = {};
      dom.consumption = {};
      dom.shortage = {};
      let pire = 0;
      for (const childId of dom.children) {
        const child = world.domains.get(childId);
        if (!child) continue;
        dom.population += child.population;
        for (const [g, v] of Object.entries(child.production)) {
          const k = g as keyof typeof dom.production;
          dom.production[k] = (dom.production[k] ?? 0) + (v ?? 0);
        }
        for (const [g, v] of Object.entries(child.consumption)) {
          const k = g as keyof typeof dom.consumption;
          dom.consumption[k] = (dom.consumption[k] ?? 0) + (v ?? 0);
        }
        pire = Math.max(pire, hunger(child));
      }
      dom.shortage['vivres'] = pire;
    }
  },
};

/**
 * MAIN — ce que la disette fait aux corps.
 *
 * Règle du doc 11 §7 : le joueur voit **des conséquences humaines** avant des
 * chiffres. Une pénurie n'est pas une ligne dans un tableau, c'est un hiver
 * qu'on ne passe pas.
 */
export const Subsistence2: System = {
  id: 'domain.faim',
  phase: 'MAIN',
  priority: 20,
  run(ctx) {
    const { world } = ctx;
    if (world.domains.size === 0) return;

    for (const dom of world.domainList()) {
      if (dom.settlement === null) continue;
      const manque = hunger(dom);
      if (manque < 0.08) continue;

      const rng = ctx.rng.fork('domain.faim', world.year, dom.id);
      const severite = clamp(manque, 0, 1);

      for (const c of ctx.living) {
        if (c.settlement !== dom.settlement) continue;
        // Les riches mangent en dernier ce qui manque : leur bourse achète
        // ce que le domaine n'a plus.
        const abri = clamp(Math.log10(Math.max(1, c.wealth)) / 6, 0, 0.7);
        const touche = severite * (1 - abri);
        if (touche < 0.05 || !rng.chance(touche)) continue;
        applyHealthDelta(c.body, -Math.round(4 + touche * 16), rng.fork('faim', c.id));
        c.health = summarizeHealth(c.body);
        c.mood = clamp(c.mood - Math.round(touche * 8), 0, 100);
      }

      if (manque >= 0.2 && world.player.alive && world.player.settlement === dom.settlement) {
        const bien = (dom.shortage['vivres'] ?? 0) >= (dom.shortage['eau'] ?? 0) ? 'vivres' : 'eau';
        world.say(
          manque >= 0.45
            ? `Il n'y a plus de ${GOOD_LABELS[bien]} à ${dom.name}. On enterre des enfants.`
            : `Les ${GOOD_LABELS[bien]} manquent à ${dom.name}. Les prix ont doublé.`,
        );
      }
    }
  },
};

/**
 * RESOLVE — le gouvernement.
 *
 * Il désigne qui décide selon sa propre règle d'accès, prélève, et regarde si
 * la légitimité tient encore devant le mécontentement (doc 11 §4).
 */
export const Governance: System = {
  id: 'domain.gouvernement',
  phase: 'RESOLVE',
  priority: 40,
  run(ctx) {
    const { world } = ctx;
    if (world.domains.size === 0) return;
    const habitants = byPlace(ctx.living);
    const factions = world.activeFactions();

    for (const dom of world.domainList()) {
      if (dom.settlement === null) continue;
      const residents = habitants.get(dom.settlement) ?? [];
      if (residents.length === 0) continue;
      const rng = ctx.rng.fork('domain.gouv', world.year, dom.id);

      // ── qui décide ────────────────────────────────────────────────────────
      const ruler = dom.rulerId !== null ? world.get(dom.rulerId) : undefined;
      const finDeMandat =
        dom.government.tenure === 'mandat' && world.year - dom.ruledSince >= 8;
      if (!ruler || !ruler.alive || ruler.settlement !== dom.settlement || finDeMandat) {
        const suivant = chooseRuler(world, dom, residents, factions, rng.fork('choix'));
        const avant = dom.rulerId;
        dom.rulerId = suivant?.id ?? null;
        dom.ruledSince = world.year;
        if (suivant && suivant.id !== avant) {
          suivant.hidden.influence = clamp(suivant.hidden.influence + 12, 0, 100);
          if (!suivant.titles.includes(dom.name)) suivant.titles.push(dom.name);
          announce(
            ctx,
            dom,
            `${shortName(suivant)} gouverne ${dom.name}.`,
            avant === null ? 2 : 3,
          );
        }
      }

      // ── ce qu'on prélève, et ce que ça coûte de tenir ─────────────────────
      const percu = collectTax(dom, residents, (c) => taxRate(dom.government, c));
      if (percu > 0 && dom.rulerId !== null) {
        const chef = world.get(dom.rulerId);
        // Le dirigeant en garde une part. C'est ce qui fait qu'on veut la place.
        if (chef) chef.wealth += Math.round(percu * 0.05);
      }
      // Tenir un lieu coûte, et coûte d'autant plus qu'on prétend y imposer
      // sa loi : gardes, greniers, chemins, scribes. Sans cette dépense, les
      // trésors montaient à douze millions de sous et ne voulaient plus rien
      // dire (doc 15 §5).
      const charge = Math.round(residents.length * (4 + dom.government.reach * 0.25));
      dom.treasury = Math.max(0, dom.treasury - charge);

      // Et en disette, un pouvoir qui a de l'or achète du grain. C'est là que
      // le gouvernement cesse d'être un décor : il change ce que les gens mangent.
      const manque = hunger(dom);
      if (manque > 0.05 && dom.treasury > 0) {
        const prix = dom.prices['vivres'] ?? 12;
        const besoin = (dom.consumption['vivres'] ?? 0) * manque;
        const achetable = Math.min(besoin, dom.treasury / Math.max(1, prix));
        if (achetable > 0.5) {
          dom.treasury = Math.max(0, dom.treasury - Math.round(achetable * prix));
          dom.stocks['vivres'] = (dom.stocks['vivres'] ?? 0) + achetable;
          dom.shortage['vivres'] = clamp(
            (dom.shortage['vivres'] ?? 0) - achetable / Math.max(0.01, dom.consumption['vivres'] ?? 1),
            0,
            1,
          );
          if (world.player.alive && world.player.settlement === dom.settlement && manque > 0.25) {
            world.say(`${dom.name} ouvre ses greniers.`);
          }
        }
      }

      // ── légitimité et mécontentement ──────────────────────────────────────
      tickMood(dom, dom.rulerId !== null ? (world.get(dom.rulerId) ?? null) : null, world.year);

      // ── et ce qui casse ───────────────────────────────────────────────────
      const pretendant = strongestLocal(factions, dom);
      const bris = upheaval(world, dom, pretendant, rng.fork('rupture'));
      if (bris) {
        world.tally.upheavals += 1;
        announce(ctx, dom, bris.text, 4);
        if (bris.before !== bris.after) {
          world.record({
            year: world.year,
            kind: bris.kind === 'coup' ? 'chute' : 'revelation',
            importance: 4,
            actors: [{ id: world.playerId, name: dom.name }],
            data: { quoi: `${dom.name} passe de ${bris.before} à ${bris.after}` },
          });
        }
      }
    }
  },
};

/** Le groupe le mieux implanté dans ce domaine, s'il y en a un. */
function strongestLocal(factions: readonly Faction[], dom: Domain): Faction | null {
  let best: Faction | null = null;
  for (const f of factions) {
    if (f.seat !== dom.settlement) continue;
    if (!best || f.power > best.power) best = f;
  }
  return best;
}

function announce(ctx: TickContext, dom: Domain, text: string, importance: number): void {
  const { world } = ctx;
  const ici = world.player.alive && world.player.settlement === dom.settlement;
  world.report({
    year: world.year,
    text,
    reach: importance >= 4 ? 'monde' : 'local',
    place: dom.settlement ?? dom.id,
    actors: dom.rulerId !== null ? [dom.rulerId] : [],
  });
  if (ici || importance >= 4) world.say(text);
}

export { regimeName, rulerName };
