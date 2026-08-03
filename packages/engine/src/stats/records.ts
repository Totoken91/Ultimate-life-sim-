import { ans } from '../util/text.js';
import type { Character, EntityId, House } from '../model/types.js';
import { ageOf, fullName } from '../model/character.js';
import type { World } from '../world/world.js';

/**
 * Le livre des records (doc 10).
 *
 * Un monde qui ne retient rien n'a pas d'Histoire. On garde les extrêmes
 * *jamais atteints*, pas les valeurs courantes : « l'homme le plus riche que
 * le Rivage ait connu » reste vrai après sa mort, et c'est tout l'intérêt.
 */
export type RecordId =
  | 'fortune'
  | 'longevite'
  | 'descendance'
  | 'sang_verse'
  | 'influence'
  | 'maison_prestige'
  | 'maison_taille'
  | 'annee_meurtriere';

export interface RecordEntry {
  /** Qui le détient. `null` pour les records qui ne visent personne. */
  holderId: EntityId | null;
  holder: string;
  value: number;
  year: number;
  detail: string;
  /** Vrai tant que le détenteur est en vie. */
  alive: boolean;
}

export type RecordBook = Partial<Record<RecordId, RecordEntry>>;

export const RECORD_LABELS: Record<RecordId, string> = {
  fortune: 'Plus grande fortune',
  longevite: 'Plus longue vie',
  descendance: 'Plus nombreuse descendance',
  sang_verse: 'Plus de sang versé',
  influence: 'Plus grande influence',
  maison_prestige: 'Maison la plus prestigieuse',
  maison_taille: 'Maison la plus nombreuse',
  annee_meurtriere: 'Année la plus meurtrière',
};

export function emptyRecordBook(): RecordBook {
  return {};
}

/** N'écrase un record que s'il est battu. Égalité = l'ancien tient. */
export function challenge(
  book: RecordBook,
  id: RecordId,
  entry: Omit<RecordEntry, 'alive'> & { alive?: boolean },
): boolean {
  const current = book[id];
  if (current && current.value >= entry.value) return false;
  book[id] = { alive: entry.alive ?? true, ...entry };
  return true;
}

/** Nombre de morts imputées à un personnage (voir `killCharacter`). */
export function bloodOf(c: Character): number {
  const v = c.flags['sang_verse'];
  return typeof v === 'number' ? v : 0;
}

/**
 * Passe en revue les vivants et les maisons. O(n) par tick, ce qui est
 * négligeable aux effectifs des paliers 0 et 1.
 */
export function updateRecords(world: World): void {
  const book = world.records;

  for (const c of world.living()) {
    const name = fullName(c);
    const age = ageOf(c, world.year);

    challenge(book, 'fortune', {
      holderId: c.id,
      holder: name,
      value: c.wealth,
      year: world.year,
      detail: `à ${ans(age)}`,
    });
    challenge(book, 'longevite', {
      holderId: c.id,
      holder: name,
      value: age,
      year: world.year,
      detail: `né en ${c.birthYear}`,
    });
    challenge(book, 'descendance', {
      holderId: c.id,
      holder: name,
      value: c.childrenIds.length,
      year: world.year,
      detail: `${c.childrenIds.length} enfant(s)`,
    });
    challenge(book, 'influence', {
      holderId: c.id,
      holder: name,
      value: Math.round(c.hidden.influence),
      year: world.year,
      detail: c.titles[0] ?? '',
    });
    const blood = bloodOf(c);
    if (blood > 0) {
      challenge(book, 'sang_verse', {
        holderId: c.id,
        holder: name,
        value: blood,
        year: world.year,
        detail: `${blood} mort(s) de sa main`,
      });
    }
  }

  for (const house of houses(world)) {
    challenge(book, 'maison_prestige', {
      holderId: null,
      holder: `Maison ${house.name}`,
      value: Math.round(house.prestige),
      year: world.year,
      detail: house.rank,
    });
    const living = house.memberIds.filter((id) => world.get(id)?.alive).length;
    challenge(book, 'maison_taille', {
      holderId: null,
      holder: `Maison ${house.name}`,
      value: living,
      year: world.year,
      detail: `${living} vivants`,
    });
  }

  const deathsThisYear = world.tally.deathsByYear[world.year] ?? 0;
  if (deathsThisYear > 0) {
    challenge(book, 'annee_meurtriere', {
      holderId: null,
      holder: `An ${world.year}`,
      value: deathsThisYear,
      year: world.year,
      detail: `${deathsThisYear} mort(s)`,
    });
  }

  // Un record tenu par un mort reste un record — on note seulement qu'il l'est.
  for (const entry of Object.values(book)) {
    if (entry && entry.holderId !== null) {
      entry.alive = world.get(entry.holderId)?.alive ?? false;
    }
  }
}

function houses(world: World): House[] {
  return [...world.houses.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}
