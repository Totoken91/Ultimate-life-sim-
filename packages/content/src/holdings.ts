import type { HoldingDef, RetainerDef } from '@ed/engine';
import { classRank } from '@ed/engine';

/**
 * Le patrimoine du Rivage (doc 09 §4bis).
 *
 * L'échelle va jusqu'au vaisseau-planète ; à l'ère du fer, elle s'arrête au
 * manoir muré. Les paliers manquants ne demanderont pas de code, seulement du
 * contenu — c'est tout l'intérêt d'avoir mis `tier` dans la donnée.
 *
 * **L'entretien est la mécanique centrale.** Une demeure coûte un revenu de
 * marchand, chaque année, pour toujours. Le jour où vos revenus passent sous
 * l'entretien, ça ne disparaît pas d'un coup : ça se dégrade, et les gens
 * partent les premiers.
 */

const H = (d: HoldingDef): HoldingDef => d;
const R = (d: RetainerDef): RetainerDef => d;

export const HOLDINGS: HoldingDef[] = [
  H({
    id: 'chambre',
    label: 'Une chambre à soi',
    kind: 'logis',
    tier: 1,
    price: 400,
    upkeep: 60,
    comfort: 4,
    prestige: 1,
    staffSlots: 0,
    desc: 'Une porte qui ferme. On sous-estime ce que ça change.',
  }),
  H({
    id: 'maison',
    label: 'Une maison de ville',
    kind: 'logis',
    tier: 3,
    price: 3200,
    upkeep: 320,
    comfort: 9,
    prestige: 6,
    staffSlots: 1,
    desc: 'Deux pièces, un âtre, un toit qui tient. On peut y recevoir.',
    requires: (c) => classRank(c.subject.socialClass) >= 3,
  }),
  H({
    id: 'atelier',
    label: 'Un atelier avec logement',
    kind: 'atelier',
    tier: 4,
    price: 5200,
    upkeep: 480,
    comfort: 6,
    prestige: 9,
    staffSlots: 2,
    desc: 'On y travaille et on y dort. Ce que vous faites vous appartient.',
    requires: (c) => !!c.subject.jobId && classRank(c.subject.socialClass) >= 3,
  }),
  H({
    id: 'ferme',
    label: 'Une ferme et ses terres',
    kind: 'domaine',
    tier: 5,
    price: 9000,
    upkeep: 700,
    comfort: 7,
    prestige: 12,
    staffSlots: 2,
    desc: 'De la terre. C\'est la seule chose qui nourrisse sans qu\'on la surveille.',
    requires: (c) => classRank(c.subject.socialClass) >= 3,
  }),
  H({
    id: 'demeure',
    label: 'Une demeure',
    kind: 'logis',
    tier: 7,
    price: 34000,
    upkeep: 3200,
    comfort: 16,
    prestige: 28,
    staffSlots: 4,
    desc: 'Un escalier, des fenêtres en verre, une cour. Les gens ralentissent devant.',
    requires: (c) => classRank(c.subject.socialClass) >= 4,
  }),
  H({
    id: 'manoir',
    label: 'Un manoir muré',
    kind: 'forteresse',
    tier: 10,
    price: 140000,
    upkeep: 14000,
    comfort: 22,
    prestige: 60,
    staffSlots: 8,
    desc:
      'Un mur, une grille, et de quoi soutenir un siège de trois semaines. ' +
      'Ce n\'est plus une maison, c\'est une position.',
    requires: (c) => classRank(c.subject.socialClass) >= 5,
  }),
];

/**
 * Ceux qu'on prend à son service. Le temps est ce qu'ils rendent de plus
 * précieux : c'est la seule chose que la fortune devrait acheter en premier
 * (doc 16 §7).
 */
export const RETAINERS: RetainerDef[] = [
  R({
    id: 'servante',
    label: 'Une servante',
    gives: { comfort: 4, upkeep: 6 },
    wage: 180,
    minTier: 3,
    desc: 'L\'eau, le feu, le linge. Tout ce que vous ne ferez plus jamais.',
  }),
  R({
    id: 'nourrice',
    label: 'Une nourrice',
    gives: { temps: 1, comfort: 2 },
    wage: 320,
    minTier: 3,
    desc: 'Elle prend les enfants. Vous récupérez vos journées, et un peu de culpabilité.',
  }),
  R({
    id: 'intendant',
    label: 'Un intendant',
    gives: { temps: 1, upkeep: 25 },
    wage: 900,
    minTier: 5,
    desc:
      'Il tient les comptes, les gages et les clefs. Il sait tout de vous, ' +
      'et c\'est le prix.',
  }),
  R({
    id: 'homme_armes',
    label: 'Un homme d\'armes',
    gives: { guard: 35 },
    wage: 700,
    minTier: 5,
    desc: 'Il se tient derrière vous. Beaucoup de choses n\'arrivent plus.',
  }),
  R({
    id: 'precepteur',
    label: 'Un précepteur',
    gives: { skill: { id: 'lettres', d: 3 } },
    wage: 1100,
    minTier: 7,
    desc: 'Pour vos enfants, officiellement. Vous écoutez à la porte.',
  }),
  R({
    id: 'medecin_gages',
    label: 'Un médecin à gages',
    gives: { comfort: 8 },
    wage: 2400,
    minTier: 7,
    desc:
      'Il vient avant qu\'on l\'appelle. À cette époque ça ne garantit rien, ' +
      'mais ça change les chances.',
  }),
];
