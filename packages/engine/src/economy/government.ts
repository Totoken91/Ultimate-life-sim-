import type { Character, EntityId, Faction } from '../model/types.js';
import type { Domain, GovAxis, Government } from '../model/domain.js';
import { regimeName } from '../model/domain.js';
import type { World } from '../world/world.js';
import type { Rng } from '../rng/rng.js';
import { ageOf, classRank, effectiveStat } from '../model/character.js';
import { clamp, drift } from '../util/math.js';
import { hunger } from './domains.js';

/**
 * Gouvernements malléables (doc 11 §4).
 *
 * Rien n'est figé. Un gouvernement change par **réforme** (le dirigeant modifie
 * un axe, contre de la légitimité), par **révolution** (le mécontentement
 * dépasse la légitimité), par **conquête** (le vainqueur impose le sien) ou par
 * **effondrement** (plus personne ne décide).
 *
 * C'est le même mécanisme que la loi de succession livrée en Phase 2 : une
 * règle modifiable, un coût pour la changer, des gens que ça froisse.
 */

/** Sous ce seuil de légitimité, tenir la place devient un travail à plein temps. */
export const LEGITIMITE_FRAGILE = 30;

/** Un renversement ne peut pas suivre le précédent : il faut le temps de souffler. */
export const DELAI_UPHEAVAL = 12;

/**
 * Qui devrait gouverner, selon la règle d'accès. C'est ici que les axes
 * cessent d'être des étiquettes : changer `access` change qui monte.
 */
export function chooseRuler(
  world: World,
  dom: Domain,
  residents: readonly Character[],
  factions: readonly Faction[],
  rng: Rng,
): Character | null {
  const g = dom.government;
  if (g.power === 'personne') return null;

  const eligibles = residents.filter((c) => ageOf(c, world.year) >= 18 && !c.isPlayer);
  if (eligibles.length === 0) return null;

  const score = (c: Character): number => {
    switch (g.access) {
      case 'sang':
        return classRank(c.socialClass) * 30 + (c.houseId ? 40 : 0) + c.hidden.influence * 0.4;
      case 'fortune':
        return Math.log10(Math.max(1, c.wealth)) * 22;
      case 'merite':
        return (
          effectiveStat(c, 'intelligence') * 0.6 +
          (c.skills['calcul'] ?? 0) * 0.4 +
          (c.skills['lettres'] ?? 0) * 0.3
        );
      case 'foi':
        return (c.traits.includes('pieux') ? 60 : 0) + (c.jobId === 'prete' ? 45 : 0);
      case 'anciennete':
        return ageOf(c, world.year);
      case 'election':
        return effectiveStat(c, 'charisme') * 0.7 + c.hidden.influence * 0.5;
      case 'conquete': {
        // La force ne se mesure pas en muscles : elle se mesure en hommes.
        const f = factions.find((x) => x.leaderId === c.id);
        return (f ? f.power * 3 : 0) + effectiveStat(c, 'force') * 0.2;
      }
      case 'tirage':
        return rng.fork('tirage', c.id).float() * 100;
      case 'designation':
        return c.hidden.influence * 0.8 + effectiveStat(c, 'charisme') * 0.3;
    }
  };

  let best: Character | null = null;
  let bestScore = -1;
  for (const c of eligibles) {
    const s = score(c);
    if (s > bestScore || (s === bestScore && best && c.id < best.id)) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

/**
 * Chaque axe a un coût (doc 11 §4). Ces deux tables sont tout ce qui empêche
 * le système de devenir une bouillie où tout est modifiable et rien ne coûte.
 */
export function stabilityOf(g: Government): number {
  let s = 0;
  if (g.tenure === 'hereditaire' || g.tenure === 'a vie') s += 8;
  if (g.tenure === 'revocable') s -= 4;
  if (g.access === 'sang') s += 6;
  if (g.access === 'conquete') s -= 8;
  if (g.access === 'tirage') s -= 3;
  if (g.mandate === 'divin' || g.mandate === 'tradition') s += 5;
  if (g.mandate === 'force') s -= 6;
  return s;
}

/** Ce que le régime coûte en mécontentement, tous les ans, sans rien faire. */
export function frictionOf(g: Government): number {
  let f = g.reach / 24;
  if (g.taxation === 'progressive') f += 1.6;
  if (g.taxation === 'proportionnelle') f += 1;
  if (g.taxation === 'corvee') f += 1.4;
  if (g.property === 'commune') f -= 0.8;
  if (g.property === 'seigneuriale') f += 0.8;
  if (g.power === 'un') f += 0.6;
  if (g.power === 'tous') f -= 0.6;
  return f;
}

/**
 * Rendement de la production selon qui possède. La propriété commune tient les
 * gens ensemble mais produit moins sans contrainte ; la propriété privée fait
 * l'inverse. Aucune n'est « la bonne ».
 */
export function outputFactor(g: Government): number {
  switch (g.property) {
    case 'commune':
      return 0.94;
    case 'seigneuriale':
      return 1.0;
    case 'privee':
      return 1.05;
    case 'd\'Etat':
      return 0.98;
    case 'corporative':
      return 1.03;
  }
}

/**
 * Fait avancer légitimité et mécontentement d'une année.
 *
 * Deux nombres portent tout le système. Quand le mécontentement dépasse la
 * légitimité, quelque chose casse — et *quoi* dépend du régime.
 */
export function tickMood(dom: Domain, ruler: Character | null, year: number): void {
  const g = dom.government;
  const faim = hunger(dom);
  // L'ancienneté du régime légitime, jusqu'à un point.
  const duree = clamp(year - dom.lastUpheaval, 0, 60);

  // Légitimité : elle **tend vers ce que la situation autorise**, elle ne
  // s'empile pas. Tant que c'était une somme de petits gains positifs, 22 % des
  // domaines vivaient collés à 100 — un pouvoir littéralement indéboulonnable,
  // et la comparaison avec le mécontentement (qui déclenche tout, §5) ne se
  // jouait plus jamais chez eux. Le plafond de 96 est volontaire : personne
  // n'est légitime au point que rien ne puisse arriver.
  let cible = 34 + stabilityOf(g) * 1.4 + duree * 0.35;
  if (ruler) cible += effectiveStat(ruler, 'charisme') * 0.18;
  else cible -= 26;
  cible -= faim * 60;
  cible -= clamp((dom.unrest - 45) * 0.7, 0, 30);
  if (dom.treasury <= 0) cible -= 8;
  dom.legitimacy = clamp(drift(dom.legitimacy, clamp(cible, 0, 96), 0.16), 0, 100);

  // Mécontentement : la faim d'abord, toujours.
  let dUn = frictionOf(g) - 1.6;
  dUn += faim * 9;
  if (dom.legitimacy < LEGITIMITE_FRAGILE) dUn += 1.2;
  // Et la prospérité l'éteint pour de bon. Un peuple nourri et un trésor
  // plein, ça se voit : sinon le mécontentement ne fait que monter.
  if (faim < 0.03) dUn -= 2.2;
  if (dom.treasury > dom.population * 40) dUn -= 1.4;
  dom.unrest = clamp(dom.unrest + dUn, 0, 100);
}

export type UpheavalKind = 'reforme' | 'coup' | 'revolution' | 'effondrement';

export interface Upheaval {
  kind: UpheavalKind;
  text: string;
  /** Ce que le régime est devenu. */
  before: string;
  after: string;
}

/**
 * Ce qui casse quand le mécontentement dépasse la légitimité — et *quoi*
 * dépend du régime en place. Une monarchie fait une crise de succession, une
 * république une crise électorale, une dictature un coup d'État, un hameau un
 * départ collectif.
 */
export function upheaval(
  world: World,
  dom: Domain,
  challenger: Faction | null,
  rng: Rng,
): Upheaval | null {
  if (dom.unrest <= dom.legitimacy) return null;
  if (world.year - dom.lastUpheaval < DELAI_UPHEAVAL) return null;

  const g = dom.government;
  const before = regimeName(g);
  dom.lastUpheaval = world.year;

  // Un groupe armé qui tient la place prend le pouvoir, quel que soit le régime.
  if (challenger && (challenger.grip[dom.settlement ?? ''] ?? 0) >= 55) {
    dom.government = {
      ...g,
      power: 'un',
      access: 'conquete',
      tenure: 'a vie',
      mandate: 'force',
      reach: clamp(g.reach + 18, 0, 100),
    };
    dom.rulerId = challenger.leaderId;
    dom.ruledSince = world.year;
    dom.legitimacy = 32;
    dom.unrest = 45;
    return {
      kind: 'coup',
      text: `${challenger.name} prend ${dom.name} par la force.`,
      before,
      after: regimeName(dom.government),
    };
  }

  // Sinon, le régime casse selon sa propre nature.
  if (g.power === 'personne') {
    // On ne renverse pas l'absence de pouvoir : on s'en va.
    dom.unrest = clamp(dom.unrest - 25, 0, 100);
    return {
      kind: 'effondrement',
      text: `Des familles quittent ${dom.name}. Personne ne les retient.`,
      before,
      after: before,
    };
  }

  if (g.access === 'election' || g.tenure === 'mandat' || g.tenure === 'revocable') {
    dom.rulerId = null;
    dom.ruledSince = world.year;
    dom.legitimacy = clamp(dom.legitimacy + 12, 0, 100);
    dom.unrest = clamp(dom.unrest - 30, 0, 100);
    return {
      kind: 'reforme',
      text: `À ${dom.name}, on remercie ceux qui gouvernaient et on recommence.`,
      before,
      after: before,
    };
  }

  // Monarchies, féodalités, théocraties : ça se paie en sang ou en règles.
  const versLePeuple = rng.chance(0.45 + dom.unrest / 260);
  dom.government = versLePeuple
    ? {
        ...g,
        power: g.power === 'un' ? 'quelques-uns' : 'beaucoup',
        access: 'election',
        tenure: 'mandat',
        mandate: 'populaire',
        reach: clamp(g.reach - 14, 0, 100),
        taxation: g.taxation === 'corvee' ? 'cens' : g.taxation,
      }
    : {
        ...g,
        power: 'un',
        access: 'conquete',
        tenure: 'a vie',
        mandate: 'force',
        reach: clamp(g.reach + 22, 0, 100),
      };
  dom.rulerId = null;
  dom.ruledSince = world.year;
  dom.legitimacy = versLePeuple ? 48 : 30;
  dom.unrest = versLePeuple ? 30 : 50;
  return {
    kind: 'revolution',
    text: versLePeuple
      ? `${dom.name} chasse les siens : on décidera désormais autrement.`
      : `Quelqu'un ramasse le pouvoir tombé à ${dom.name}, et ne le rend pas.`,
    before,
    after: regimeName(dom.government),
  };
}

/**
 * Une réforme délibérée : le dirigeant change un axe. Ça coûte de la
 * légitimité et ça froisse — c'est exactement le prix de la loi de succession.
 */
export function reform(dom: Domain, axis: GovAxis, value: Government[GovAxis]): boolean {
  const g = dom.government;
  if (axis === 'reach') {
    const next = clamp(Number(value), 0, 100);
    const ecart = Math.abs(next - g.reach);
    if (ecart < 1) return false;
    g.reach = next;
    dom.legitimacy = clamp(dom.legitimacy - ecart / 3, 0, 100);
    dom.unrest = clamp(dom.unrest + ecart / 4, 0, 100);
    return true;
  }
  if (g[axis] === value) return false;
  (g as unknown as Record<string, unknown>)[axis] = value;
  // Toucher au fondement coûte plus cher que toucher à l'intendance.
  const cout = axis === 'mandate' || axis === 'power' || axis === 'access' ? 14 : 7;
  dom.legitimacy = clamp(dom.legitimacy - cout, 0, 100);
  dom.unrest = clamp(dom.unrest + cout * 0.8, 0, 100);
  return true;
}

/** Ce que le domaine prélève, versé au trésor, retiré des bourses. */
export function collectTax(
  dom: Domain,
  taxpayers: readonly Character[],
  rate: (c: Character) => number,
): number {
  let total = 0;
  for (const c of taxpayers) {
    // On taxe le **flux**, pas le stock. Un impôt annuel sur la fortune est
    // confiscatoire : il vidait les bourses et gonflait les trésors sans fin.
    const revenu = c.flags['revenu'];
    const assiette = typeof revenu === 'number' ? revenu : 0;
    if (assiette <= 0) continue;
    const part = Math.round(assiette * rate(c));
    if (part <= 0) continue;
    c.wealth -= part;
    total += part;
  }
  dom.treasury += total;
  return total;
}

/** Qui gouverne, lisible. */
export function rulerName(world: World, dom: Domain): string {
  const r = dom.rulerId !== null ? world.get(dom.rulerId as EntityId) : undefined;
  if (!r || !r.alive) return 'personne';
  return r.family ? `${r.given} ${r.family}` : r.given;
}
