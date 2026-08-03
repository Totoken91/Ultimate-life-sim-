import type { Character, SocialClass } from '../model/types.js';
import type { Domain, GoodId, Government, Route, Scale } from '../model/domain.js';
import {
  GOOD_BASE_PRICE,
  GOOD_ELASTICITY,
  GOOD_IDS,
  VITAL_GOODS,
} from '../model/domain.js';
import type { World } from '../world/world.js';
import type { Ruleset } from '../content/ruleset.js';
import { ageOf, classRank } from '../model/character.js';
import { clamp } from '../util/math.js';

/**
 * L'économie par domaines (doc 11).
 *
 * Le même code fait tourner un village de deux habitants et un empire
 * multi-mondes. Ce qui change, c'est la **résolution** : ici, au palier fin,
 * chaque personne produit et consomme. Aux paliers supérieurs, ce seront des
 * cohortes puis des flux — et la formule des prix ne bougera pas.
 */

/** Ce qu'une personne consomme par an, avant son rang. */
const BESOIN_BASE: Partial<Record<GoodId, number>> = {
  vivres: 1,
  eau: 1,
};

/** Ce que le rang ajoute : on ne consomme pas la même chose selon d'où on vient. */
const BESOIN_RANG: Record<SocialClass, Partial<Record<GoodId, number>>> = {
  esclave: {},
  miserable: {},
  pauvre: { materiaux: 0.05 },
  commun: { materiaux: 0.15, outils: 0.05, soins: 0.05 },
  aise: { materiaux: 0.3, outils: 0.12, soins: 0.2, luxe: 0.08, savoir: 0.05 },
  noble: { materiaux: 0.8, outils: 0.2, soins: 0.5, luxe: 0.6, savoir: 0.2, armes: 0.15 },
  royal: { materiaux: 3, outils: 0.6, soins: 1.5, luxe: 3, savoir: 0.8, armes: 0.8 },
};

/** Un enfant mange, mais ne produit pas encore. */
const AGE_PRODUCTIF = 12;

/** Gouvernement par défaut d'une implantation, lu dans sa taille. */
export function defaultGovernment(size: string): Government {
  if (size === 'hameau') {
    return {
      power: 'personne',
      access: 'anciennete',
      tenure: 'revocable',
      reach: 5,
      property: 'commune',
      mandate: 'tradition',
      taxation: 'aucune',
    };
  }
  if (size === 'village') {
    return {
      power: 'un',
      access: 'anciennete',
      tenure: 'a vie',
      reach: 18,
      property: 'commune',
      mandate: 'tradition',
      taxation: 'corvee',
    };
  }
  if (size === 'bourg') {
    return {
      power: 'quelques-uns',
      access: 'fortune',
      tenure: 'mandat',
      reach: 34,
      property: 'privee',
      mandate: 'tradition',
      taxation: 'cens',
    };
  }
  // ville et cité : quelqu'un tient la place, et ça se paie
  return {
    power: 'quelques-uns',
    access: 'sang',
    tenure: 'hereditaire',
    reach: 52,
    property: 'seigneuriale',
    mandate: 'divin',
    taxation: 'dime',
  };
}

/** Ce que le sol donne, par implantation. Le reste vient des gens. */
const TERROIR: Record<string, Partial<Record<GoodId, number>>> = {
  basvardhen: { vivres: 0.25, eau: 0.9 },
  vardhen: { vivres: 0.35, eau: 0.9, information: 0.4 },
  kaleth: { vivres: 0.5, eau: 1.1, savoir: 0.25 },
  orin: { vivres: 1.1, eau: 1.2, materiaux: 0.3 },
  roc: { vivres: 0.7, eau: 0.8, materiaux: 0.5 },
  marches: { vivres: 0.55, eau: 0.7, materiaux: 0.4 },
};

export function newDomain(
  id: string,
  name: string,
  scale: Scale,
  parent: string | null,
  settlement: string | null,
  government: Government,
  year: number,
): Domain {
  return {
    id,
    name,
    scale,
    parent,
    children: [],
    settlement,
    population: 0,
    stocks: {},
    production: {},
    consumption: {},
    prices: {},
    shortage: {},
    government,
    rulerId: null,
    ruledSince: year,
    treasury: 0,
    legitimacy: 55,
    unrest: 10,
    lastUpheaval: year,
  };
}

/**
 * Construit l'arbre des domaines depuis le contenu : monde → régions (une par
 * culture) → implantations. La récursivité n'est pas décorative — c'est elle
 * qui fera tenir les paliers planétaires et stellaires sans réécrire une ligne.
 */
export function seedDomains(world: World, ruleset: Ruleset): void {
  if (world.domains.size > 0) return;
  const year = world.year;

  const root = newDomain('dom_monde', 'Le Rivage', 'monde', null, null, {
    power: 'personne',
    access: 'anciennete',
    tenure: 'revocable',
    reach: 0,
    property: 'commune',
    mandate: 'tradition',
    taxation: 'aucune',
  }, year);
  world.domains.set(root.id, root);

  for (const s of ruleset.settlements) {
    // Préfixe distinct : les cultures et les implantations partagent des noms
    // (« kaleth » est les deux), et deux domaines de même identifiant, c'est
    // une région qui écrase une ville dans la Map.
    const regionId = `dom_reg_${s.culture}`;
    let region = world.domains.get(regionId);
    if (!region) {
      const culture = ruleset.cultures[s.culture];
      region = newDomain(
        regionId,
        culture?.label ?? s.culture,
        'region',
        root.id,
        null,
        defaultGovernment('bourg'),
        year,
      );
      world.domains.set(regionId, region);
      root.children.push(regionId);
    }
    const dom = newDomain(
      `dom_${s.id}`,
      s.name,
      'implantation',
      regionId,
      s.id,
      defaultGovernment(s.size),
      year,
    );
    // Une implantation démarre avec une année de réserves : sans ça, la
    // première récolte trouve des greniers vides et tout le monde a faim.
    for (const g of GOOD_IDS) dom.stocks[g] = 0;
    world.domains.set(dom.id, dom);
    region.children.push(dom.id);
  }
}

/** Les routes de terre et de mer du Rivage. La latence est déjà là pour l'espace. */
export function seedRoutes(world: World): void {
  if (world.routes.length > 0) return;
  const link = (from: string, to: string, capacity: number, cost: number, risk: number): void => {
    world.routes.push({
      id: `${from}->${to}`,
      from: `dom_${from}`,
      to: `dom_${to}`,
      capacity,
      cost,
      risk,
      latency: 0,
      severedUntil: null,
    });
  };
  link('vardhen', 'basvardhen', 900, 0.02, 0.01);
  link('vardhen', 'kaleth', 500, 0.12, 0.05);
  link('vardhen', 'roc', 320, 0.14, 0.09);
  link('kaleth', 'orin', 380, 0.13, 0.06);
  link('orin', 'marches', 160, 0.22, 0.2);
  link('roc', 'marches', 120, 0.25, 0.24);
}

/** Ce qu'une personne produit cette année, selon son métier et son état. */
export function produceOf(
  c: Character,
  ruleset: Ruleset,
  year: number,
  out: Partial<Record<GoodId, number>>,
): void {
  const age = ageOf(c, year);
  if (age < AGE_PRODUCTIF) return;
  const job = c.jobId ? ruleset.jobs[c.jobId] : undefined;
  // Un corps entamé produit moins. C'est le lien direct entre le doc 12 et ici.
  const vigueur = clamp(0.35 + c.health / 130, 0.2, 1.15) * (age > 62 ? 0.6 : 1);
  if (!job || !job.produces) {
    // Sans métier, on travaille la terre. Une société pré-industrielle est
    // faite de gens qui se nourrissent et dégagent un mince surplus — c'est ce
    // surplus, et lui seul, qui permet aux villes d'exister.
    out.vivres = (out.vivres ?? 0) + 1.25 * vigueur;
    return;
  }
  const compétence = clamp(
    (c.skills[Object.keys(job.trains)[0] ?? ''] ?? 0) / 100,
    0,
    1,
  );
  const facteur = vigueur * (0.7 + compétence * 0.6);
  for (const [good, qty] of Object.entries(job.produces)) {
    const g = good as GoodId;
    out[g] = (out[g] ?? 0) + (qty ?? 0) * facteur;
  }
}

/** Ce qu'une personne consomme cette année. */
export function consumeOf(c: Character, out: Partial<Record<GoodId, number>>): void {
  for (const [good, qty] of Object.entries(BESOIN_BASE)) {
    const g = good as GoodId;
    out[g] = (out[g] ?? 0) + (qty ?? 0);
  }
  for (const [good, qty] of Object.entries(BESOIN_RANG[c.socialClass])) {
    const g = good as GoodId;
    out[g] = (out[g] ?? 0) + (qty ?? 0);
  }
}

/**
 * Le prix naît de la rareté **ici**, jamais d'un cours mondial.
 *
 *   prix = base × (demande / max(offre, ε))^élasticité × friction
 *
 * C'est ce qui rend le commerce jouable, et ce qui fait qu'un blocus ou une
 * mauvaise récolte se lisent dans les prix sans qu'on écrive un événement
 * « il y a une famine ».
 */
export function priceOf(good: GoodId, demand: number, supply: number, friction: number): number {
  const base = GOOD_BASE_PRICE[good];
  const ratio = demand / Math.max(supply, 0.05);
  const raw = base * Math.pow(clamp(ratio, 0.1, 12), GOOD_ELASTICITY[good]) * friction;
  return Math.round(clamp(raw, base * 0.2, base * 14) * 100) / 100;
}

/** Friction d'un domaine : ce que son isolement ajoute à tous ses prix. */
export function frictionOf(world: World, dom: Domain): number {
  let ouvertes = 0;
  let cout = 0;
  for (const r of world.routes) {
    if (r.from !== dom.id && r.to !== dom.id) continue;
    if (r.severedUntil !== null && r.severedUntil > world.year) continue;
    ouvertes += 1;
    cout += r.cost;
  }
  if (ouvertes === 0) return 1.35;
  return clamp(1 + cout / ouvertes - 0.06, 0.9, 1.3);
}

/**
 * Recalcule production, consommation, stocks et prix d'une implantation à
 * partir des gens qui y vivent. C'est le palier fin du doc 11 §1 : chaque
 * personne produit et consomme.
 */
export function runDomainYear(
  world: World,
  ruleset: Ruleset,
  dom: Domain,
  residents: readonly Character[],
): void {
  const production: Partial<Record<GoodId, number>> = {};
  const consumption: Partial<Record<GoodId, number>> = {};

  const terroir = dom.settlement ? TERROIR[dom.settlement] : undefined;
  for (const [good, qty] of Object.entries(terroir ?? {})) {
    const g = good as GoodId;
    production[g] = (production[g] ?? 0) + (qty ?? 0) * residents.length;
  }

  for (const c of residents) {
    produceOf(c, ruleset, world.year, production);
    consumeOf(c, consumption);
  }

  dom.population = residents.length;
  dom.production = production;
  dom.consumption = consumption;

  const friction = frictionOf(world, dom);
  for (const g of GOOD_IDS) {
    const prod = production[g] ?? 0;
    const besoin = consumption[g] ?? 0;
    const stock = dom.stocks[g] ?? 0;
    const offre = prod + stock;

    if (besoin <= 0 && prod <= 0 && stock <= 0) {
      delete dom.prices[g];
      delete dom.shortage[g];
      continue;
    }

    const servi = Math.min(besoin, offre);
    dom.shortage[g] = besoin > 0 ? clamp(1 - servi / besoin, 0, 1) : 0;

    // Ce qui reste se garde, mais tout ne se garde pas : les vivres pourrissent.
    const reste = Math.max(0, offre - servi);
    const garde = g === 'vivres' || g === 'eau' ? 0.45 : 0.85;
    dom.stocks[g] = Math.round(reste * garde * 100) / 100;

    dom.prices[g] = priceOf(g, Math.max(besoin, 0.05), Math.max(offre, 0.05), friction);
  }
}

/**
 * Le commerce. Le grain va là où il manque, tant qu'il y a une route et que
 * l'écart de prix paie le trajet. Personne ne décide : c'est le prix qui décide.
 */
export function runTrade(world: World): void {
  const routes = [...world.routes].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const r of routes) {
    if (r.severedUntil !== null && r.severedUntil > world.year) continue;
    const a = world.domains.get(r.from);
    const b = world.domains.get(r.to);
    if (!a || !b) continue;

    for (const g of GOOD_IDS) {
      const pa = a.prices[g];
      const pb = b.prices[g];
      if (pa === undefined || pb === undefined) continue;
      const [source, cible, prixSource, prixCible] =
        pa < pb ? [a, b, pa, pb] : [b, a, pb, pa];
      // Il faut que l'écart couvre le trajet, sinon la caravane ne part pas.
      if (prixCible <= prixSource * (1 + r.cost + 0.08)) continue;

      const dispo = source.stocks[g] ?? 0;
      const manque = (cible.consumption[g] ?? 0) * (cible.shortage[g] ?? 0);
      const volume = Math.min(dispo * 0.5, manque, r.capacity);
      if (volume <= 0.01) continue;

      source.stocks[g] = Math.round((dispo - volume) * 100) / 100;
      cible.stocks[g] = Math.round(((cible.stocks[g] ?? 0) + volume) * 100) / 100;

      // Le marchand prend sa part : la valeur passe d'un trésor à l'autre.
      const valeur = Math.round(volume * prixSource * (1 + r.cost));
      cible.treasury = Math.max(0, cible.treasury - Math.round(valeur * 0.05));
      source.treasury += Math.round(valeur * 0.05);
    }
  }
}

/** Le manque des biens vitaux, résumé en un nombre 0..1. */
export function hunger(dom: Domain): number {
  let worst = 0;
  for (const g of VITAL_GOODS) worst = Math.max(worst, dom.shortage[g] ?? 0);
  return worst;
}

/** Ce que le domaine prélève sur les siens, selon son régime et sa portée. */
export function taxRate(g: Government, c: Character): number {
  const rang = classRank(c.socialClass);
  const portee = g.reach / 100;
  switch (g.taxation) {
    case 'aucune':
      return 0;
    case 'corvee':
      return 0.01 * portee;
    case 'dime':
      return 0.1 * portee;
    case 'cens':
      return rang >= 3 ? 0.08 * portee : 0.01 * portee;
    case 'proportionnelle':
      return 0.12 * portee;
    case 'progressive':
      return clamp(0.03 + rang * 0.035, 0.03, 0.28) * portee;
  }
}
