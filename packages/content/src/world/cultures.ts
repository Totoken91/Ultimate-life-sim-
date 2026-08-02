import type { CultureDef } from '@ed/engine';

/**
 * Le Rivage — monde original, médiéval au départ, sans plafond (doc 06).
 * Trois cultures suffisent pour la Phase 1 : elles doivent surtout produire
 * des noms reconnaissables et des valeurs qui pèsent sur les événements.
 */
export const CULTURES: Record<string, CultureDef> = {
  vardhen: {
    id: 'vardhen',
    label: 'Vardhènois',
    given: {
      m: [
        'Kenny', 'Aldric', 'Perrin', 'Talin', 'Brann', 'Corvin', 'Doran', 'Edrik',
        'Faelan', 'Garrick', 'Halden', 'Joren', 'Kaspar', 'Ludovic', 'Mattis',
        'Norel', 'Ossian', 'Rurik', 'Sevran', 'Tobias', 'Vidar', 'Wendel',
      ],
      f: [
        'Maela', 'Ysera', 'Bréna', 'Cendre', 'Dalia', 'Elske', 'Freya', 'Gwenn',
        'Hilda', 'Ilva', 'Jorunn', 'Kaira', 'Lyanna', 'Mira', 'Nesta', 'Orla',
        'Rowena', 'Sigrid', 'Thyra', 'Vesna', 'Wilda', 'Ysolde',
      ],
    },
    families: [
      'Vaur', 'Kessel', 'Draum', 'Holt', 'Marec', 'Ostrand', 'Feln', 'Brask',
      'Renaut', 'Sorel', 'Toven', 'Ulric', 'Vandel', 'Wold', 'Ysbrand',
    ],
    epithets: ['le Boiteux', 'la Muette', 'le Pouce', 'sans Nom', 'des Quais', 'le Chien'],
    statBias: { endurance: 4, volonte: 3, intelligence: -2 },
    values: ['travail', 'parole donnée', 'mer', 'rancune'],
  },

  kaleth: {
    id: 'kaleth',
    label: 'Kalèthe',
    given: {
      m: [
        'Azim', 'Bashir', 'Cassien', 'Darius', 'Emran', 'Farid', 'Hakim', 'Ilyas',
        'Jahan', 'Karim', 'Lazhar', 'Mehdi', 'Nadir', 'Omar', 'Rashid', 'Sohrab',
        'Tarek', 'Ulfat', 'Yazid', 'Zaher',
      ],
      f: [
        'Amina', 'Bahar', 'Cyra', 'Dilara', 'Esma', 'Farah', 'Golnar', 'Hala',
        'Inaya', 'Jamila', 'Kaveh', 'Leila', 'Mina', 'Nour', 'Parisa', 'Rana',
        'Sahar', 'Tahira', 'Yasmine', 'Zohra',
      ],
    },
    families: [
      'al-Rhaz', 'Semar', 'Duhen', 'Ferrat', 'Ghazan', 'Hammar', 'Ibn-Sael',
      'Jelani', 'Karam', 'Nasir', 'Qadir', 'Sarrach', 'Tabriz', 'Zaman',
    ],
    epithets: ['le Lettré', 'la Patiente', 'aux Mains Bleues', 'le Second', 'des Sables'],
    statBias: { intelligence: 5, charisme: 2, force: -3 },
    values: ['savoir', 'hiérarchie', 'foi', 'mémoire'],
  },

  orin: {
    id: 'orin',
    label: 'Orinois',
    given: {
      m: [
        'Mael', 'Bran', 'Cadoc', 'Derwen', 'Eoghan', 'Gwilym', 'Hywel', 'Idris',
        'Llyr', 'Madoc', 'Neirin', 'Owain', 'Pryder', 'Rhys', 'Selyf', 'Taliesin',
        'Urien', 'Yestin',
      ],
      f: [
        'Aeron', 'Blodwen', 'Ceri', 'Dwynwen', 'Eirian', 'Ffion', 'Glenys',
        'Heulwen', 'Ianthe', 'Lowri', 'Meinir', 'Nerys', 'Olwen', 'Rhiannon',
        'Seren', 'Tegwen', 'Wenna',
      ],
    },
    families: [
      'Cerneth', 'Dolwyn', 'Erisgar', 'Fenhal', 'Gwaered', 'Llanfor', 'Maenol',
      'Pennarth', 'Rhoswen', 'Tirmawr', 'Ysgwyd',
    ],
    epithets: ['des Pierres', 'la Rousse', 'du Gué', 'le Loup', 'aux Corbeaux'],
    statBias: { agilite: 4, force: 2, charisme: -2 },
    values: ['clan', 'terre', 'présages', 'vengeance'],
  },
};

export const CULTURE_IDS = Object.keys(CULTURES);
