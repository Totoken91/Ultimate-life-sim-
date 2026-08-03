import type { Character } from '../model/types.js';
import type { Rng } from '../rng/rng.js';
import { effectiveStat } from '../model/character.js';
import { clamp } from '../util/math.js';

/**
 * Le système de conflit (doc 09 §2).
 *
 * Erreur à ne pas commettre : écrire un système de bagarre, *puis* un système
 * de bataille, *puis* un système de guerre spatiale. Trois systèmes, trois fois
 * la maintenance, zéro cohérence.
 *
 * Un seul système, une échelle, et la même formule à tous les paliers. Ce qui
 * change d'une rixe à un bombardement orbital, ce ne sont pas les règles : ce
 * sont les effectifs et le palier technologique.
 */

/** Palier d'échelle, du duel à l'extinction (doc 09 §2). */
export type ClashTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TIER_LABELS: Record<ClashTier, string> = {
  0: 'duel',
  1: 'rixe',
  2: 'escarmouche',
  3: 'bataille rangée',
  4: 'campagne',
  5: 'guerre planétaire',
  6: 'guerre stellaire',
  7: 'guerre de civilisations',
};

/** Seuils d'effectifs. Le palier se déduit du nombre, jamais de l'intention. */
const TIER_FLOORS: readonly [ClashTier, number][] = [
  [7, 100_000_000],
  [6, 1_000_000],
  [5, 100_000],
  [4, 10_000],
  [3, 200],
  [2, 20],
  [1, 3],
  [0, 0],
];

export function tierOf(heads: number): ClashTier {
  for (const [tier, floor] of TIER_FLOORS) if (heads >= floor) return tier;
  return 0;
}

/**
 * Une force engagée. Volontairement abstraite : un `Side` peut être deux
 * ivrognes dans une ruelle ou une flotte de six millions d'hommes. Les
 * `combatants` ne sont renseignés qu'aux petits paliers, où les morts sont
 * des personnes et non des chiffres.
 */
export interface Side {
  id: string;
  label: string;
  heads: number;
  /** Valeur moyenne du combattant, 0..100. */
  quality: number;
  /** Palier technologique. Il compte au carré — voir plus bas. */
  tech: number;
  morale: number;
  /** Qualité du commandement, 0..100. */
  command: number;
  /** Terrain et ravitaillement, 0,5 à 1,5. */
  ground: number;
  supply: number;
  /** Les combattants nommés, quand il y en a. */
  combatants?: Character[];
}

export interface ClashResult {
  tier: ClashTier;
  winner: 'a' | 'b' | 'nul';
  powerA: number;
  powerB: number;
  /** Part des effectifs perdue de chaque côté, 0..1. */
  lossA: number;
  lossB: number;
  fallenA: number;
  fallenB: number;
  /** Combattants nommés tombés, quand le palier en compte. */
  deadA: Character[];
  deadB: Character[];
}

/**
 * Couche A — la bataille se résout à son échelle. Même formule partout.
 *
 * Le **carré** sur le palier technologique est ce qui rend une guerre
 * asymétrique crédible : mille lanciers ne battent pas une escouade blindée,
 * jamais. C'est aussi ce qui rend le saut d'ère désirable.
 */
export function power(side: Side): number {
  return (
    Math.pow(Math.max(1, side.heads), 0.8) *
    (0.3 + side.quality / 100) *
    Math.pow(Math.max(1, side.tech), 2) *
    (0.4 + side.morale / 120) *
    (0.6 + side.command / 180) *
    side.ground *
    side.supply
  );
}

/** Valeur militaire d'une personne : ce qu'elle vaut, blessures comprises. */
export function fighterValue(c: Character): number {
  const corps = effectiveStat(c, 'force') * 0.4 + effectiveStat(c, 'endurance') * 0.3;
  const metier = (c.skills['lame'] ?? 0) * 0.5 + (c.skills['lutte'] ?? 0) * 0.25;
  const nerf = effectiveStat(c, 'volonte') * 0.15;
  return clamp((corps + metier + nerf) * (0.4 + c.health / 160), 1, 100);
}

/** Assemble un camp à partir de personnes réelles. */
export function sideOf(
  id: string,
  label: string,
  fighters: readonly Character[],
  leader: Character | null,
  opts: { tech?: number; morale?: number; ground?: number; supply?: number } = {},
): Side {
  const heads = Math.max(1, fighters.length);
  let quality = 0;
  for (const f of fighters) quality += fighterValue(f);
  return {
    id,
    label,
    heads,
    quality: fighters.length > 0 ? quality / fighters.length : 25,
    tech: opts.tech ?? 1,
    morale: opts.morale ?? 55,
    command: leader
      ? clamp(
          effectiveStat(leader, 'charisme') * 0.5 +
            (leader.skills['commandement'] ?? 0) * 0.5,
          1,
          100,
        )
      : 25,
    ground: opts.ground ?? 1,
    supply: opts.supply ?? 1,
    combatants: [...fighters],
  };
}

/**
 * Résout l'affrontement. Le hasard existe mais ne renverse pas une différence
 * de puissance écrasante : un facteur de chance borné à ±35 %, appliqué au
 * rapport de forces. On perd rarement à un contre dix, et jamais à un contre
 * mille.
 */
export function clash(a: Side, b: Side, rng: Rng): ClashResult {
  const tier = tierOf(a.heads + b.heads);
  const pa = power(a) * (0.82 + rng.float() * 0.36);
  const pb = power(b) * (0.82 + rng.float() * 0.36);

  const total = pa + pb;
  const edge = total > 0 ? (pa - pb) / total : 0;
  const winner: ClashResult['winner'] =
    Math.abs(edge) < 0.06 ? 'nul' : edge > 0 ? 'a' : 'b';

  // Le vainqueur saigne aussi. Une victoire nette coûte peu, une victoire
  // arrachée coûte presque autant qu'une défaite — c'est ce qui rend une
  // guerre gagnée capable de ruiner celui qui la gagne.
  const brutality = 0.1 + tier * 0.025;
  const lossA = clamp(brutality * (1 - edge) * (0.6 + rng.float() * 0.8), 0, 0.9);
  const lossB = clamp(brutality * (1 + edge) * (0.6 + rng.float() * 0.8), 0, 0.9);

  const fallenA = Math.min(a.heads, Math.round(a.heads * lossA));
  const fallenB = Math.min(b.heads, Math.round(b.heads * lossB));

  return {
    tier,
    winner,
    powerA: pa,
    powerB: pb,
    lossA,
    lossB,
    fallenA,
    fallenB,
    deadA: pickFallen(a, fallenA, rng.fork('tombes', 'a')),
    deadB: pickFallen(b, fallenB, rng.fork('tombes', 'b')),
  };
}

/**
 * Qui meurt. Les faibles tombent en premier — mais pas toujours : c'est
 * précisément l'imprévu qui fait qu'un héros peut mourir bêtement.
 */
function pickFallen(side: Side, count: number, rng: Rng): Character[] {
  const pool = side.combatants;
  if (!pool || pool.length === 0 || count <= 0) return [];
  const ordered = [...pool].sort((x, y) => x.id - y.id);
  const weighted = rng.shuffled(
    ordered.map((c) => ({ c, risk: 120 - fighterValue(c) + rng.int(0, 60) })),
  );
  weighted.sort((x, y) => y.risk - x.risk || x.c.id - y.c.id);
  return weighted.slice(0, Math.min(count, ordered.length)).map((w) => w.c);
}

/**
 * « Victoire de les gens de Zaman » : la contraction de l'article est la même
 * mécanique que pour les causes de mort (doc 12). On la refait ici parce que
 * les noms de groupes sont produits par le monde, pas écrits à la main.
 */
export function ofName(label: string): string {
  if (label.startsWith('les ')) return `des ${label.slice(4)}`;
  if (label.startsWith('le ')) return `du ${label.slice(3)}`;
  if (label.startsWith('la ')) return `de la ${label.slice(3)}`;
  if (label.startsWith('l\'')) return `de l'${label.slice(2)}`;
  if ('aàâeéèêiîoôuûyAÀEÉÈIÎOÔUÛY'.includes(label[0] ?? '')) return `d'${label}`;
  return `de ${label}`;
}

/**
 * Résumé lisible d'un affrontement, pour la Chronique et les rumeurs.
 *
 * Tournure nominale volontaire : « les hommes de Vaur » est pluriel, « la bande
 * à Vaur » ne l'est pas, et le moteur n'a aucun moyen de le savoir. « Victoire
 * de X sur Y » est juste dans les deux cas.
 */
export function describeClash(result: ClashResult, a: Side, b: Side): string {
  const nom = TIER_LABELS[result.tier];
  const pertes = result.fallenA + result.fallenB;
  const morts = pertes === 0 ? 'sans un mort' : pertes === 1 ? '1 mort' : `${pertes} morts`;
  if (result.winner === 'nul') {
    return `${nom} indécise entre ${a.label} et ${b.label} — ${morts}.`;
  }
  const vainqueur = result.winner === 'a' ? a : b;
  const vaincu = result.winner === 'a' ? b : a;
  const chere =
    (result.winner === 'a' ? result.lossA : result.lossB) > 0.28
      ? ', chèrement payée'
      : '';
  return `Victoire ${ofName(vainqueur.label)} sur ${vaincu.label} — ${nom}, ${morts}${chere}.`;
}
