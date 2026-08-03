import type { Character } from '../model/types.js';
import type { World } from '../world/world.js';
import { ageOf } from '../model/character.js';

/**
 * Le temps qu'on a (doc 16 §1).
 *
 * « Une action par année » est une convention de menu, pas une idée de jeu :
 * elle donne exactement la même liberté à un enfant de huit ans, à un forgeron
 * qui élève quatre gosses et à un seigneur qui gouverne une cité. Ici, une
 * année donne un **budget**, et ce budget dit qui vous êtes.
 */

/** Ce qu'une année vaut quand rien ne pèse. */
export const TEMPS_BASE = 4;

export interface TimeCost {
  label: string;
  cost: number;
}

export interface TimeBudget {
  total: number;
  /** Ce qui vous a été pris, et par quoi. Le joueur doit pouvoir le lire. */
  charges: TimeCost[];
  /** Ce que la domesticité vous rend. Le vrai luxe (doc 09 §4). */
  credits: TimeCost[];
}

/**
 * Combien de temps cette année vous laisse. Rien ici n'est un malus abstrait :
 * chaque ligne est une chose qu'on peut voir dans sa vie et, parfois, changer.
 */
export function timeBudget(
  world: World,
  c: Character,
  staff: readonly { label: string; gain: number }[] = [],
): TimeBudget {
  const age = ageOf(c, world.year);
  const charges: TimeCost[] = [];
  const credits: TimeCost[] = [];
  let total = TEMPS_BASE;

  if (age < 7) {
    total = 1;
    charges.push({ label: 'vous êtes un enfant', cost: TEMPS_BASE - 1 });
  } else if (age < 13) {
    total = 2;
    charges.push({ label: 'vous êtes un enfant', cost: TEMPS_BASE - 2 });
  } else if (age < 17) {
    total = 3;
    charges.push({ label: 'on décide encore pour vous', cost: 1 });
  }

  if (age >= 68) {
    total -= 1;
    charges.push({ label: 'l\'âge', cost: 1 });
  }
  if (c.health < 55) {
    total -= 1;
    charges.push({ label: 'vous n\'êtes pas bien', cost: 1 });
  }
  if (c.jobId && age >= 13) {
    total -= 1;
    charges.push({ label: 'votre métier', cost: 1 });
  }

  let enfantsACharge = 0;
  for (const id of c.childrenIds) {
    const kid = world.get(id);
    if (kid && kid.alive && ageOf(kid, world.year) < 13) enfantsACharge += 1;
  }
  if (enfantsACharge >= 2) {
    total -= 1;
    charges.push({ label: `${enfantsACharge} enfants en bas âge`, cost: 1 });
  }

  for (const dom of world.domainList()) {
    if (dom.rulerId === c.id) {
      total -= 1;
      charges.push({ label: `vous gouvernez ${dom.name}`, cost: 1 });
      break;
    }
  }
  for (const f of world.activeFactions()) {
    if (f.leaderId === c.id) {
      total -= 1;
      charges.push({ label: `vous menez ${f.name}`, cost: 1 });
      break;
    }
  }

  // Et ce que l'argent rachète. Un intendant, une nourrice, un homme de main :
  // c'est la seule chose que la fortune devrait acheter en premier.
  for (const s of staff) {
    total += s.gain;
    credits.push({ label: s.label, cost: s.gain });
  }

  // On garde toujours de quoi faire une chose. Une vie sans aucune marge n'est
  // plus une vie jouable, c'est un couloir.
  return { total: Math.max(1, total), charges, credits };
}
