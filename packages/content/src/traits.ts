import type { TraitDef } from '@ed/engine';

type T = Omit<TraitDef, 'kind'> & { kind?: TraitDef['kind'] };

function make(kind: TraitDef['kind'], defs: T[]): TraitDef[] {
  return defs.map((d) => ({ ...d, kind }));
}

/**
 * Les traits *innés* sont tirés à la naissance.
 * Les traits *acquis* s'obtiennent par l'histoire vécue — jamais par un menu
 * (doc 03 §1.3). C'est le moteur d'événements qui les pose.
 */
const INNES = make('inne', [
  { id: 'genie', label: 'Génie', desc: 'Vous comprenez avant qu\'on ait fini d\'expliquer.', stats: { intelligence: 14 }, excludes: ['simple'], drives: { savoir: 0.15 } },
  { id: 'simple', label: 'Simple d\'esprit', desc: 'Le monde va trop vite pour vous.', stats: { intelligence: -16 }, excludes: ['genie'] },
  { id: 'colosse', label: 'Colosse', desc: 'On vous voit avant de vous entendre.', stats: { force: 13, agilite: -4 }, excludes: ['chetif'] },
  { id: 'chetif', label: 'Chétif', desc: 'Vous avez toujours été le plus petit de la ruelle.', stats: { force: -12, endurance: -6 }, excludes: ['colosse'] },
  { id: 'beau', label: 'Beau', desc: 'Les gens vous accordent des choses sans savoir pourquoi.', stats: { charisme: 11 }, excludes: ['difforme'] },
  { id: 'difforme', label: 'Difforme', desc: 'On détourne les yeux, ou on les fixe trop longtemps.', stats: { charisme: -14 }, excludes: ['beau'] },
  { id: 'vif', label: 'Vif', desc: 'Vos mains savent avant vous.', stats: { agilite: 12 } },
  { id: 'robuste', label: 'Robuste', desc: 'Vous guérissez de ce qui tue les autres.', stats: { endurance: 11 }, health: 6, longevity: -8 },
  { id: 'maladif', label: 'Maladif', desc: 'Chaque hiver vous coûte quelque chose.', health: -14, longevity: 14 },
  { id: 'longeve', label: 'Sang tenace', desc: 'Dans votre famille, on meurt vieux.', longevity: -22 },
  { id: 'aveugle', label: 'Aveugle', desc: 'Vous connaissez le monde par les sons et les mains.', stats: { agilite: -10, intelligence: 5 } },
  { id: 'sourd', label: 'Sourd', desc: 'Le silence est votre langue maternelle.', stats: { charisme: -8 } },
  { id: 'boiteux', label: 'Boiteux', desc: 'Vous n\'avez jamais pu courir.', stats: { agilite: -14, endurance: -5 } },
  { id: 'muet', label: 'Muet', desc: 'Vous n\'avez jamais parlé. Vous écoutez mieux que quiconque.', stats: { charisme: -10, intelligence: 4 } },
  { id: 'marque', label: 'Marqué', desc: 'Une tache de naissance que les vieilles femmes regardent trop longtemps.' },
  { id: 'jumeau', label: 'Jumeau', desc: 'Il y a quelqu\'un qui a votre visage.' },

  // Doc 09 §5bis. Aucune de ces conditions n'est seulement une perte, et le
  // monde n'a pas le vocabulaire pour les nommer : il a seulement un regard.
  {
    id: 'esprit_a_part',
    label: 'L\'esprit à part',
    desc: 'Vous ne regardez pas les gens et vous voyez ce qu\'ils ne voient pas. Les foules vous font mal.',
    stats: { intelligence: 9, charisme: -13, volonte: 4 },
    drives: { savoir: 0.2, lien: -0.15, statut: -0.1 },
  },
  {
    id: 'voix',
    label: 'Celui qui entend',
    desc: 'Il y a quelque chose qui parle. Vous n\'avez jamais su si c\'était dehors ou dedans.',
    stats: { charisme: -7, volonte: -5, intelligence: 3 },
  },
  {
    id: 'manchot',
    label: 'Manchot',
    desc: 'Il vous manque un bras depuis si longtemps que vous avez oublié le geste.',
    stats: { force: -15, agilite: -7, volonte: 6 },
  },
]);

const ACQUIS = make('acquis', [
  { id: 'mefiant', label: 'Méfiant', desc: 'On vous a appris tôt que la main tendue attrape.', stats: { intelligence: 3, charisme: -5 }, excludes: ['naif'], drives: { securite: 0.12, lien: -0.08 } },
  { id: 'naif', label: 'Naïf', desc: 'Vous croyez encore les gens.', stats: { charisme: 4, intelligence: -3 }, excludes: ['mefiant'], drives: { lien: 0.1, securite: -0.08 } },
  { id: 'cruel', label: 'Cruel', desc: 'Faire mal vous coûte moins qu\'à d\'autres.', excludes: ['compatissant'], drives: { vengeance: 0.15, pouvoir: 0.08, lien: -0.08 } },
  { id: 'compatissant', label: 'Compatissant', desc: 'Vous ne supportez pas de regarder ailleurs.', excludes: ['cruel'], drives: { lien: 0.12, sens: 0.1, vengeance: -0.15 } },
  { id: 'endurci', label: 'Endurci', desc: 'Ce qui devait vous briser ne l\'a pas fait.', stats: { volonte: 10, endurance: 5 }, drives: { securite: -0.1, survie: -0.05 } },
  { id: 'brise', label: 'Brisé', desc: 'Quelque chose en vous ne s\'est jamais remis.', stats: { volonte: -12 }, moodFloor: 20, drives: { sens: -0.12, pouvoir: -0.12, survie: 0.08 } },
  { id: 'survivant', label: 'Survivant', desc: 'La mort est passée près et ne vous a pas pris.', stats: { volonte: 7 }, longevity: -6 },
  { id: 'lettre', label: 'Lettré', desc: 'Vous savez lire. Peu de gens ici le savent.', stats: { intelligence: 6 }, drives: { savoir: 0.15 } },
  { id: 'voleur', label: 'Voleur', desc: 'Vos mains vont plus vite que votre conscience.', stats: { agilite: 5 }, drives: { richesse: 0.15 } },
  { id: 'violent', label: 'Violent', desc: 'Vous réglez avant de réfléchir.', stats: { force: 5, charisme: -4 }, drives: { vengeance: 0.2, lien: -0.1 } },
  { id: 'menteur', label: 'Beau parleur', desc: 'La vérité est un outil parmi d\'autres.', stats: { charisme: 7 }, drives: { pouvoir: 0.08, richesse: 0.08 } },
  { id: 'pieux', label: 'Pieux', desc: 'Vous priez, et cela vous tient debout.', stats: { volonte: 6 }, excludes: ['impie'], drives: { sens: 0.18, richesse: -0.08 } },
  { id: 'impie', label: 'Impie', desc: 'Vous avez cessé de demander.', excludes: ['pieux'], drives: { sens: -0.1, richesse: 0.08 } },
  { id: 'ambitieux', label: 'Ambitieux', desc: 'Ce que vous avez ne suffira jamais.', stats: { volonte: 5 }, excludes: ['content'], drives: { statut: 0.2, pouvoir: 0.18, richesse: 0.1, sens: 0.05 } },
  { id: 'content', label: 'Content de peu', desc: 'Vous avez trouvé votre mesure.', moodFloor: 42, excludes: ['ambitieux'], drives: { statut: -0.2, pouvoir: -0.18, richesse: -0.12 } },
  { id: 'rancunier', label: 'Rancunier', desc: 'Vous tenez des comptes que personne d\'autre ne tient.', drives: { vengeance: 0.22 } },
  { id: 'genereux', label: 'Généreux', desc: 'Vous donnez ce que vous n\'avez pas.', excludes: ['avare'], drives: { sens: 0.12, richesse: -0.15, lien: 0.08 } },
  { id: 'avare', label: 'Avare', desc: 'Chaque sou dépensé vous fait mal.', excludes: ['genereux'], drives: { richesse: 0.2, sens: -0.08 } },
  { id: 'courageux', label: 'Courageux', desc: 'Vous avez peur comme tout le monde. Vous avancez quand même.', stats: { volonte: 8 }, excludes: ['lache'], drives: { securite: -0.12, vengeance: 0.06 } },
  { id: 'lache', label: 'Lâche', desc: 'Vous avez appris que fuir marche souvent.', stats: { volonte: -7, agilite: 3 }, excludes: ['courageux'], drives: { securite: 0.18, vengeance: -0.15 } },
  { id: 'meneur', label: 'Meneur', desc: 'Les gens se rangent derrière vous sans qu\'on le leur demande.', stats: { charisme: 8 }, drives: { pouvoir: 0.15, statut: 0.1 } },
  { id: 'solitaire', label: 'Solitaire', desc: 'Vous êtes mieux seul et vous le savez.', stats: { volonte: 4, charisme: -6 }, drives: { lien: -0.25, savoir: 0.08 } },
  { id: 'obstine', label: 'Obstiné', desc: 'On ne vous fait pas changer d\'avis, on vous tue.', stats: { volonte: 9, intelligence: -2 }, drives: { vengeance: 0.1, statut: 0.06 } },
  { id: 'marin', label: 'Pied marin', desc: 'La mer ne vous rend plus malade.', stats: { endurance: 5 } },
  { id: 'guerrier', label: 'Homme de guerre', desc: 'Vous savez ce que le sang fait sur les mains.', stats: { force: 6, volonte: 4 }, drives: { vengeance: 0.1, pouvoir: 0.08, securite: -0.08 } },
  { id: 'erudit', label: 'Érudit', desc: 'Vous avez lu plus de livres qu\'il n\'y en a en ville.', stats: { intelligence: 9 }, drives: { savoir: 0.25, statut: 0.05 } },
  { id: 'marque_infamie', label: 'Marqué d\'infamie', desc: 'Un fer a laissé sa trace. Tout le monde sait.', stats: { charisme: -12 } },
  { id: 'affranchi', label: 'Affranchi', desc: 'Vous avez été possédé. Vous ne l\'êtes plus.', stats: { volonte: 8 } },
  { id: 'orphelin', label: 'Orphelin', desc: 'Personne ne viendra vous chercher.', stats: { volonte: 4 }, drives: { lien: 0.15, securite: 0.08 } },
  { id: 'parjure', label: 'Parjure', desc: 'Vous avez rompu un serment et on ne l\'a pas oublié.', stats: { charisme: -8 } },
  { id: 'notoire', label: 'Notoire', desc: 'On raconte des choses sur vous. Certaines sont vraies.', drives: { securite: 0.12 } },
  { id: 'guerisseur', label: 'Guérisseur', desc: 'Vos mains savent recoudre les gens.' },
  { id: 'hante', label: 'Hanté', desc: 'Vous voyez quelque chose que les autres ne voient pas.', stats: { volonte: -5 }, drives: { sens: 0.15, securite: 0.1 } },
]);

const ETATS = make('etat', [
  { id: 'endeuille', label: 'Endeuillé', desc: 'Vous portez un mort avec vous.', moodFloor: 0, drives: { sens: 0.12, lien: 0.1 } },
  { id: 'amoureux', label: 'Amoureux', desc: 'Rien d\'autre n\'a d\'importance en ce moment.', drives: { lien: 0.2, descendance: 0.1 } },
  { id: 'traque', label: 'Traqué', desc: 'Quelqu\'un vous cherche et il ne renoncera pas.', drives: { securite: 0.3, sens: -0.1 } },
  { id: 'mourant', label: 'Mourant', desc: 'Le corps a rendu son verdict.', health: -30, drives: { sens: 0.35, survie: 0.2 } },
  { id: 'exile', label: 'Exilé', desc: 'On vous a chassé et vous ne pouvez pas rentrer.', drives: { lien: 0.12, statut: 0.1 } },
  { id: 'recherche', label: 'Recherché', desc: 'Votre nom est sur une liste.', drives: { securite: 0.3 } },
  { id: 'endette', label: 'Endetté', desc: 'Quelqu\'un attend son dû et il compte les mois.', drives: { richesse: 0.25, securite: 0.1 } },
]);

export const TRAITS: Record<string, TraitDef> = Object.fromEntries(
  [...INNES, ...ACQUIS, ...ETATS].map((t) => [t.id, t]),
);

export const INNATE_POOL = INNES.map((t) => t.id);
