import type {
  Character,
  EntityId,
  Faction,
  FactionGoal,
  FactionKind,
} from '../model/types.js';
import type { World } from '../world/world.js';
import type { Rng } from '../rng/rng.js';
import { ageOf, classRank, effectiveStat, shortName } from '../model/character.js';
import { clamp } from '../util/math.js';

/**
 * Les factions (doc 14).
 *
 * Elles ne sont pas créées par le moteur : elles se **découvrent**. Quelqu'un
 * finit par avoir assez d'hommes liés par serment, et le monde lui donne un nom.
 * C'est l'agentivité du [doc 13](../../../docs/13-agentivite.md) qui les
 * fabrique — `s'allier` et `rassembler des hommes` tissent le réseau, et ce
 * fichier se contente de le lire.
 */

/** Nombre d'hommes liés par serment à partir duquel un réseau devient un nom. */
export const SEUIL_FONDATION = 3;

/** En dessous, la faction se dissout : deux personnes ne sont pas une bande. */
export const SEUIL_DISSOLUTION = 2;

/** Ceux qui ont juré à `leader` et qui sont encore vivants. */
export function swornTo(world: World, leaderId: EntityId): Character[] {
  const out: Character[] = [];
  for (const rel of world.relations.toward(leaderId)) {
    if (rel.type !== 'serment') continue;
    const c = world.get(rel.from);
    if (c && c.alive && !c.isPlayer) out.push(c);
  }
  return out;
}

/**
 * Le genre de groupe que ce réseau produit — lu dans ce que ses gens *sont*,
 * jamais tiré au sort. Une bande de voleurs et un ordre de pieux ne se
 * ressemblent pas, et personne n'a eu à le décider.
 */
export function kindOf(leader: Character, members: readonly Character[]): FactionKind {
  const all = [leader, ...members];
  let crime = 0;
  let foi = 0;
  let negoce = 0;
  let armes = 0;
  for (const c of all) {
    crime += c.hidden.corruption / 100 + (c.traits.includes('voleur') ? 1 : 0);
    foi += c.traits.includes('pieux') ? 1.4 : 0;
    negoce += (c.skills['negoce'] ?? 0) / 60;
    armes += (c.skills['lame'] ?? 0) / 60 + (c.traits.includes('guerrier') ? 1 : 0);
  }
  const sang = classRank(leader.socialClass) >= 5 ? 1.5 : 0;
  const best = Math.max(crime, foi, negoce, armes, sang);
  if (best === sang) return 'clan';
  if (best === foi) return 'ordre';
  if (best === negoce) return 'guilde';
  if (best === armes) return 'compagnie';
  return 'bande';
}

const KIND_PREFIX: Record<FactionKind, string[]> = {
  bande: ['les gens de', 'la bande à', 'les hommes de'],
  compagnie: ['la compagnie de', 'les lances de', 'la troupe de'],
  guilde: ['la guilde de', 'la maison de commerce de', 'le comptoir de'],
  ordre: ['l\'ordre de', 'les frères de', 'la congrégation de'],
  clan: ['le clan', 'la maison', 'les fidèles de'],
};

const VOYELLES = 'aàâeéèêiîoôuûyAÀEÉÈIÎOÔUÛY';

/**
 * Colle un préfixe et un patronyme sans produire « le comptoir de de Toven »
 * ni « les hommes de Erisgar ». La grammaire est une chose que le joueur voit
 * dès la première partie.
 */
export function joinName(prefix: string, nom: string): string {
  const particule = /^(de |du |d'|des )/i.test(nom);
  if (prefix.endsWith(' de')) {
    if (particule) return `${prefix.slice(0, -3)} ${nom}`;
    if (VOYELLES.includes(nom[0] ?? '')) return `${prefix.slice(0, -1)}'${nom}`;
  }
  if (prefix.endsWith(' à') && particule) return `${prefix.slice(0, -2)} ${nom}`;
  return `${prefix} ${nom}`;
}

/**
 * Nomme un groupe sans jamais reprendre un nom déjà porté. Deux « bande à
 * Vandel » dans la même chronique et le lecteur ne sait plus qui se bat.
 */
export function nameFaction(
  rng: Rng,
  kind: FactionKind,
  leader: Character,
  taken: ReadonlySet<string>,
): string {
  const prefixes = KIND_PREFIX[kind];
  const nom = leader.family ?? leader.given;
  for (const prefix of rng.shuffled(prefixes)) {
    const candidate = joinName(prefix, nom);
    if (!taken.has(candidate)) return candidate;
  }
  // Le nom de famille ne suffit plus : on prend le prénom, puis on renonce.
  const prefix = prefixes[0] ?? 'les gens de';
  const withGiven = joinName(prefix, `${leader.given} ${nom}`);
  return taken.has(withGiven) ? `${withGiven} le jeune` : withGiven;
}

/** Solde annuelle d'un homme. Une faction qui ne paie pas perd ses gens. */
export const SOLDE = 30;

/**
 * Puissance d'une faction : le nombre compte, mais moins que ce qu'on croit.
 * Un exposant 0,8 sur les effectifs, comme dans la formule de bataille — c'est
 * la même idée, à un autre étage.
 */
export function recomputePower(world: World, f: Faction): number {
  let quality = 0;
  let living = 0;
  let loyalty = 0;
  for (const id of f.memberIds) {
    const c = world.get(id);
    if (!c || !c.alive) continue;
    living += 1;
    quality += effectiveStat(c, 'force') * 0.3 + (c.skills['lame'] ?? 0) * 0.4 + c.health * 0.3;
    const rel = world.relations.get(c.id, f.leaderId);
    loyalty += rel ? clamp((rel.respect + rel.trust) / 2, -100, 100) : 0;
  }
  if (living === 0) return 0;
  const leader = world.get(f.leaderId);
  const tete = leader?.alive
    ? 0.6 + (effectiveStat(leader, 'charisme') + (leader.skills['commandement'] ?? 0)) / 260
    : 0.4;
  const moyenne = quality / living;
  const cohesion = 0.6 + clamp(loyalty / living, -100, 100) / 250;
  return Math.round(Math.pow(living, 0.8) * (moyenne / 12) * tete * cohesion);
}

/** Membres vivants, triés — l'ordre doit être déterministe. */
export function livingMembers(world: World, f: Faction): Character[] {
  const out: Character[] = [];
  for (const id of f.memberIds) {
    const c = world.get(id);
    if (c && c.alive) out.push(c);
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

/**
 * Le groupe de quelqu'un. Parcours **trié** : `world.factions` est une Map, et
 * son ordre d'insertion est chronologique dans une partie en cours, mais trié
 * après un rechargement. Rendre le premier venu ferait diverger une partie
 * rechargée — c'est le test d'aller-retour qui l'a attrapé.
 */
export function factionOf(world: World, id: EntityId): Faction | undefined {
  for (const f of world.activeFactions()) {
    if (f.leaderId === id || f.memberIds.includes(id)) return f;
  }
  return undefined;
}

/**
 * Index appartenance → groupe, construit une fois. `factionOf` appelé dans une
 * boucle sur les vivants serait quadratique.
 */
export function membershipIndex(world: World): Map<EntityId, Faction> {
  const index = new Map<EntityId, Faction>();
  for (const f of world.activeFactions()) {
    if (!index.has(f.leaderId)) index.set(f.leaderId, f);
    for (const id of f.memberIds) if (!index.has(id)) index.set(id, f);
  }
  return index;
}

/**
 * Choix du but, par utilité — la même discipline qu'aux pulsions des PNJ
 * (doc 13 §3). Une faction ne suit pas un script : elle regarde sa situation.
 */
export function chooseGoal(
  world: World,
  f: Faction,
  rivals: readonly Faction[],
  rng: Rng,
): { goal: FactionGoal; target: string | null } {
  const membres = livingMembers(world, f).length;
  const leader = world.get(f.leaderId);
  const ambition = leader ? leader.hidden.ambition / 100 : 0.3;
  const cruaute = leader ? leader.hidden.corruption / 100 : 0.2;

  // L'ennemi le plus haï, et le plus faible qu'on puisse abattre.
  let hated: Faction | null = null;
  let prey: Faction | null = null;
  for (const other of rivals) {
    const feeling = f.standing[other.id] ?? 0;
    if (feeling <= -30 && (!hated || feeling < (f.standing[hated.id] ?? 0))) hated = other;
    if (
      other.seat === f.seat &&
      other.power < f.power * 0.8 &&
      (!prey || other.power < prey.power)
    ) {
      prey = other;
    }
  }

  const grip = f.grip[f.seat] ?? 0;
  const options: { goal: FactionGoal; target: string | null; score: number }[] = [
    { goal: 'croitre', target: null, score: clamp(1.1 - membres / 14, 0.05, 1) + ambition * 0.3 },
    { goal: 'enrichir', target: null, score: clamp(1 - f.treasury / 40000, 0.1, 1) * 0.8 },
    { goal: 'tenir', target: null, score: membres <= SEUIL_DISSOLUTION + 1 ? 0.9 : 0.2 },
    {
      goal: 'dominer',
      target: f.seat,
      score: (ambition * 0.9 + 0.15) * clamp(1 - grip / 100, 0, 1) * (membres >= 5 ? 1 : 0.3),
    },
    {
      goal: 'abattre',
      target: prey?.id ?? null,
      score: prey ? (0.35 + cruaute * 0.8) * clamp(f.power / Math.max(1, prey.power) / 3, 0.2, 1.2) : 0,
    },
    {
      goal: 'venger',
      target: hated?.id ?? null,
      score: hated ? clamp(-(f.standing[hated.id] ?? 0) / 100, 0, 1) * (0.6 + cruaute * 0.5) : 0,
    },
  ];

  // Tirage pondéré au carré, comme pour les PNJ : une faction qui prend
  // toujours son meilleur coup est une faction prévisible.
  const picked = rng.weighted(
    options.filter((o) => o.score > 0.05),
    (o) => o.score * o.score,
  );
  return picked
    ? { goal: picked.goal, target: picked.target }
    : { goal: 'tenir', target: null };
}

/** Fonde une faction autour d'un chef et de ses jurés. */
export function foundFaction(
  world: World,
  rng: Rng,
  leader: Character,
  members: readonly Character[],
): Faction {
  const kind = kindOf(leader, members);
  const id = `fac_${leader.id}_${world.year}`;
  const taken = new Set<string>();
  for (const f of world.factions.values()) if (f.dissolvedYear === null) taken.add(f.name);
  const faction: Faction = {
    id,
    name: nameFaction(rng, kind, leader, taken),
    kind,
    foundedYear: world.year,
    leaderId: leader.id,
    memberIds: [leader.id, ...members.map((m) => m.id)],
    seat: leader.settlement,
    power: 0,
    treasury: Math.round(leader.wealth * 0.1),
    goal: 'croitre',
    goalTarget: null,
    standing: {},
    grip: {},
    losses: 0,
    dissolvedYear: null,
  };
  faction.power = recomputePower(world, faction);
  world.factions.set(id, faction);
  world.tally.factionsFounded += 1;
  world.record({
    year: world.year,
    kind: 'fondation',
    importance: world.relations.get(world.playerId, leader.id) ? 3 : 2,
    actors: [{ id: leader.id, name: shortName(leader) }],
    data: { groupe: faction.name },
  });
  return faction;
}

/** Un chef mort est remplacé par le plus fort de ses hommes, pas par le plus vieux. */
export function replaceLeader(world: World, f: Faction): Character | null {
  const candidates = livingMembers(world, f).filter((c) => c.id !== f.leaderId);
  let best: Character | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const age = ageOf(c, world.year);
    if (age < 15) continue;
    const score =
      effectiveStat(c, 'charisme') * 0.4 +
      effectiveStat(c, 'force') * 0.25 +
      (c.skills['commandement'] ?? 0) * 0.35 +
      c.hidden.ambition * 0.2;
    if (score > bestScore || (score === bestScore && best && c.id < best.id)) {
      bestScore = score;
      best = c;
    }
  }
  if (best) f.leaderId = best.id;
  return best;
}
