import type { Settlement } from '@ed/engine';

export const SETTLEMENTS: Settlement[] = [
  {
    id: 'basvardhen',
    name: 'Bas-Vardhèn',
    culture: 'vardhen',
    size: 'ville',
    wealth: 18,
    danger: 72,
    description:
      'Les ruelles sous la cité haute. On y naît beaucoup et on y vieillit peu. ' +
      'L\'eau des quais monte deux fois par jour et emporte ce que personne ne réclame.',
  },
  {
    id: 'vardhen',
    name: 'Vardhèn',
    culture: 'vardhen',
    size: 'cité',
    wealth: 68,
    danger: 34,
    description:
      'La cité des quais et des comptoirs. Tout ce qui traverse la mer du Nord y passe, ' +
      'et tout ce qui y passe laisse une part.',
  },
  {
    id: 'kaleth',
    name: 'Kaleth-la-Blanche',
    culture: 'kaleth',
    size: 'cité',
    wealth: 74,
    danger: 26,
    description:
      'Cité de chaux et de bibliothèques, bâtie autour d\'un puits qui n\'a jamais tari. ' +
      'On y respecte les vieux livres plus que les vivants.',
  },
  {
    id: 'orin',
    name: 'Orin-sur-Loë',
    culture: 'orin',
    size: 'bourg',
    wealth: 34,
    danger: 30,
    description:
      'Un bourg de moulins accroché à la rivière. Les anciens y comptent encore les années ' +
      'par les crues.',
  },
  {
    id: 'roc',
    name: 'Le Roc',
    culture: 'vardhen',
    size: 'village',
    wealth: 40,
    danger: 55,
    description:
      'Une forteresse et le village qui la nourrit. On y voit plus de soldats que de femmes, ' +
      'et plus de corbeaux que de soldats.',
  },
  {
    id: 'marches',
    name: 'Les Marches Grises',
    culture: 'orin',
    size: 'hameau',
    wealth: 12,
    danger: 80,
    description:
      'La frontière que personne ne tient vraiment. Les cartes s\'arrêtent ici et les gens aussi.',
  },
];

export const SETTLEMENT_IDS = SETTLEMENTS.map((s) => s.id);
