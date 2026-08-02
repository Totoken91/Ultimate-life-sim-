import type { EntityId } from '../model/types.js';
import type { World } from './world.js';

/**
 * Élagage des morts sans importance.
 *
 * Sans ça, `world.characters` ne fait que grossir : à raison de quelques
 * centaines de morts par siècle, une dynastie de trois mille ans traîne des
 * centaines de milliers de fiches que plus personne ne regardera jamais.
 *
 * C'est la version pauvre de la rétrogradation LOD du doc 02 §6 : on ne garde
 * que ce qui peut encore être consulté ou référencé. Ce qui part n'est pas
 * effacé de l'Histoire — la Chronique, elle, est conservée.
 */
export interface PruneOptions {
  /** On garde tous les morts récents : le joueur vient d'en croiser certains. */
  keepRecentYears?: number;
}

export function protectedIds(world: World, opts: PruneOptions = {}): Set<EntityId> {
  const keep = new Set<EntityId>();
  const recent = opts.keepRecentYears ?? 80;

  keep.add(world.playerId);

  for (const c of world.characters.values()) {
    if (c.alive) {
      keep.add(c.id);
      // la parenté immédiate d'un vivant reste consultable
      if (c.fatherId !== null) keep.add(c.fatherId);
      if (c.motherId !== null) keep.add(c.motherId);
      if (c.spouseId !== null) keep.add(c.spouseId);
      for (const kid of c.childrenIds) keep.add(kid);
      continue;
    }
    if (c.isPlayer) keep.add(c.id);
    if ((c.deathYear ?? 0) >= world.year - recent) keep.add(c.id);
  }

  for (const entry of Object.values(world.records)) {
    if (entry?.holderId !== null && entry?.holderId !== undefined) keep.add(entry.holderId);
  }
  for (const seed of world.seeds) for (const id of seed.actors) keep.add(id);
  for (const house of world.houses.values()) {
    keep.add(house.founderId);
    keep.add(house.headId);
    for (const id of house.headHistory) keep.add(id);
  }
  // les grands moments gardent leurs acteurs nommés
  for (const entry of world.chronicle) {
    if (entry.importance >= 4) for (const actor of entry.actors) keep.add(actor.id);
  }

  return keep;
}

/** Retire les morts non protégés. Renvoie le nombre de fiches libérées. */
export function pruneDead(world: World, opts: PruneOptions = {}): number {
  const keep = protectedIds(world, opts);
  const doomed: EntityId[] = [];

  for (const c of world.characters.values()) {
    if (!c.alive && !keep.has(c.id)) doomed.push(c.id);
  }
  if (doomed.length === 0) return 0;

  const gone = new Set(doomed);
  for (const id of doomed) {
    world.relations.removeEntity(id);
    world.memories.drop(id);
    world.characters.delete(id);
  }

  // on nettoie les références résiduelles pour ne pas laisser de trous
  for (const c of world.characters.values()) {
    if (c.fatherId !== null && gone.has(c.fatherId)) c.fatherId = null;
    if (c.motherId !== null && gone.has(c.motherId)) c.motherId = null;
    if (c.spouseId !== null && gone.has(c.spouseId)) c.spouseId = null;
    if (c.childrenIds.some((k) => gone.has(k))) {
      c.childrenIds = c.childrenIds.filter((k) => !gone.has(k));
    }
  }
  for (const house of world.houses.values()) {
    house.memberIds = house.memberIds.filter((id) => !gone.has(id));
    house.cadetIds = house.cadetIds.filter((id) => !gone.has(id));
  }

  return doomed.length;
}
