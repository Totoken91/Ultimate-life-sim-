import { pick } from '@ed/engine';
import { byStat, ev, n, opt, out, sure, trait } from './_helpers.js';

/** Crime, violence, et les chemins qu'on ne raconte pas à table. */
export const SHADOW_EVENTS = [
  ev({
    id: 'shadow.gros_coup',
    tags: ['crime', 'fortune'],
    minAge: 15,
    maxAge: 60,
    requires: (c) => (c.subject.skills['vol'] ?? 0) >= 20 || c.subject.paths.includes('criminel'),
    weight: 11,
    cooldown: { years: 6, scope: 'character' },
    roles: {
      complice: pick.first(
        pick.known({ minAge: 15, minAffection: 10 }),
        pick.generate({ minAge: 20, maxAge: 45, bond: { type: 'amitie', label: 'le complice' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('complice'))} a repéré une maison. Les propriétaires sont absents trois jours, ` +
      `le coffre est au premier, et il faut être deux.`,
    options: [
      opt('faire', 'Le faire', [
        out((c) => 1 + (c.subject.skills['crochetage'] ?? 0) / 12 + (c.subject.skills['vol'] ?? 0) / 15, () => 'Deux heures, aucune trace. Vous partagez dans une arrière-salle et vous ne redormez normalement qu\'un mois plus tard.', [
          { k: 'wealth', d: 2200 },
          { k: 'skill', id: 'vol', d: 10 },
          { k: 'skill', id: 'crochetage', d: 10 },
          { k: 'rel', to: 'complice', type: 'serment', label: 'complice', affection: 25, trust: 30, mutual: true },
          { k: 'hidden', id: 'corruption', d: 10 },
          { k: 'chronicle', kind: 'crime', importance: 3, data: { quoi: 'vida un coffre en une nuit' } },
        ]),
        out(1.4, (c) => `Quelqu'un rentre plus tôt. ${n(c.role('complice'))} panique. Il y a un mort et ce n'est pas vous.`, [
          { k: 'wealth', d: 600 },
          { k: 'trait', add: 'recherche' },
          { k: 'trait', add: 'hante' },
          { k: 'hidden', id: 'karma', d: -22 },
          { k: 'chronicle', kind: 'violence', importance: 4, data: { quoi: 'prit part à un cambriolage qui finit mal' } },
          { k: 'seed', eventId: 'seed.justice.rattrape', min: 2, max: 10, actors: [], note: 'le mort du cambriolage' },
        ]),
        out(1.2, () => 'La garde attendait. Vous vous en sortez de justesse, sans rien, avec un visage connu.', [
          { k: 'health', d: -14 },
          { k: 'trait', add: 'recherche' },
          { k: 'wealth', d: -100 },
        ]),
      ], { hint: 'risqué' }),
      opt('denoncer', 'Vendre le plan à la garde', sure(
        (c) => `Vous êtes payé pour l'information. ${n(c.role('complice'))} prend dix ans. Dans le milieu, on met six mois à comprendre d'où c'est venu.`,
        [
          { k: 'wealth', d: 400 },
          { k: 'rel', to: 'complice', from: 'complice', type: 'haine', label: 'le mouchard', affection: -90 },
          { k: 'trait', add: 'parjure' },
          { k: 'hidden', id: 'karma', d: -18 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 8, max: 16, actors: ['complice'], note: 'celui que vous avez vendu' },
        ],
      ), { hint: 'cruel' }),
      opt('refuser', 'Refuser', sure(
        () => 'Vous refusez. Ça se fait sans vous et ça se passe bien, ce qui vous agace pendant des années.',
        [{ k: 'mood', d: -6 }],
      )),
    ],
  }),

  ev({
    id: 'shadow.duel',
    tags: ['violence', 'honneur'],
    minAge: 16,
    maxAge: 65,
    weight: 8,
    cooldown: { years: 10, scope: 'character' },
    roles: {
      adversaire: pick.first(
        pick.known({ maxAffection: -20, minAge: 16 }),
        pick.local({ minAge: 18, maxAge: 50 }),
        pick.generate({ minAge: 20, maxAge: 45, statMean: 55, bond: { type: 'rivalite', label: 'l\'adversaire' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('adversaire'))} vous a insulté devant douze personnes. Dans cette ville, ça se règle ` +
      `d'une seule façon, et tout le monde attend de voir laquelle vous choisirez.`,
    options: [
      opt('accepter', 'Accepter le duel', [
        out((c) => 1 + (c.subject.skills['lame'] ?? 0) / 12 + c.subject.stats.force / 60, (c) => `Trois échanges. ${n(c.role('adversaire'))} tombe. On vous regarde différemment pour le reste de votre vie.`, [
          { k: 'kill', who: 'adversaire', cause: 'd\'un coup de lame, sur le pré' },
          { k: 'skill', id: 'lame', d: 12 },
          { k: 'trait', add: 'guerrier' },
          { k: 'hidden', id: 'influence', d: 12 },
          { k: 'hidden', id: 'karma', d: -8 },
          { k: 'chronicle', kind: 'violence', importance: 4, data: { quoi: 'tua un homme en duel' } },
          { k: 'seed', eventId: 'seed.vendetta', min: 4, max: 18, actors: [], note: 'la famille de celui que vous avez tué' },
        ]),
        out(1.6, () => 'Vous perdez. Vous survivez, ce qui est déjà beaucoup, mais pas entier.', [
          { k: 'health', d: -30 },
          { k: 'injure', label: 'une balafre de la tempe au menton', permanent: true, stat: 'charisme', penalty: 6 },
          { k: 'trait', add: 'endurci' },
        ]),
      ], { hint: 'risqué' }),
      opt('excuser', 'Présenter vos excuses', sure(
        () => 'Vous vous excusez. C\'est fini en une phrase et ça vous coûte plus longtemps que ça n\'a duré.',
        [
          { k: 'stat', stat: 'charisme', d: -5 },
          { k: 'trait', add: 'lache' },
          { k: 'mood', d: -14 },
          { k: 'rel', to: 'adversaire', from: 'adversaire', respect: -30 },
        ],
      ), { hint: 'lâche' }),
      opt('embuscade', 'Le régler autrement, une nuit', [
        out(byStat('agilite', 1.4), (c) => `On retrouve ${n(c.role('adversaire'))} au matin. Personne ne prouve rien. Certains devinent.`, [
          { k: 'kill', who: 'adversaire', cause: 'poignardé dans une ruelle' },
          { k: 'hidden', id: 'corruption', d: 20 },
          { k: 'hidden', id: 'karma', d: -25 },
          { k: 'trait', add: 'cruel' },
          { k: 'memory', text: 'La ruelle. Personne n\'a jamais rien prouvé.', salience: 92, tags: ['secret', 'meurtre'] },
        ]),
        out(1.5, () => 'On vous voit. On ne vous arrête pas tout de suite, ce qui est bien pire.', [
          { k: 'trait', add: 'recherche' },
          { k: 'seed', eventId: 'seed.justice.rattrape', min: 1, max: 6, actors: [], note: 'la nuit où on vous a vu' },
        ]),
      ], { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'shadow.corruption',
    tags: ['crime', 'politique'],
    minAge: 20,
    maxAge: 70,
    requires: (c) => !!c.subject.jobId && c.subject.jobYears >= 3,
    weight: 8,
    cooldown: { years: 8, scope: 'character' },
    roles: {
      solliciteur: pick.generate({ minAge: 30, maxAge: 60, socialClass: 'aise', statMean: 55, bond: { type: 'dette', label: 'le solliciteur' } }),
    },
    text: (c) =>
      `${n(c.role('solliciteur'))} vous propose de regarder ailleurs pendant une journée. La somme ` +
      `représente trois ans de votre salaire et il la pose sur la table sans la compter.`,
    options: [
      opt('prendre', 'Prendre', sure(
        () => 'Vous prenez. Ça se passe bien. Ça se passera bien la fois suivante aussi, et c\'est exactement le problème.',
        [
          { k: 'wealth', d: 2600 },
          { k: 'hidden', id: 'corruption', d: 25 },
          { k: 'rel', to: 'solliciteur', type: 'dette', label: 'celui qui m\'a acheté', affection: 5, fear: 20, mutual: true },
          { k: 'seed', eventId: 'seed.corruption.chantage', min: 3, max: 14, actors: ['solliciteur'], note: 'ce qu\'il sait sur vous' },
        ],
      )),
      opt('refuser', 'Refuser', [
        out(2, () => 'Vous refusez. On n\'insiste pas. On note votre nom quelque part.', [
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'stat', stat: 'volonte', d: 5 },
          { k: 'rel', to: 'solliciteur', from: 'solliciteur', affection: -20 },
        ]),
        out(1.2, () => 'Vous refusez. Trois mois plus tard, vous perdez votre place pour une raison qui n\'a rien à voir. Officiellement.', [
          { k: 'job', id: null },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'mood', d: -14 },
        ]),
      ]),
      opt('doubler', 'Prendre — et le dénoncer ensuite', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 10, () => 'Vous gardez l\'argent et vous livrez l\'homme. C\'est brillant. Vous n\'aurez plus jamais confiance en personne, parce que vous savez maintenant que ça se fait.', [
          { k: 'wealth', d: 2600 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'hidden', id: 'influence', d: 14 },
          { k: 'skill', id: 'intrigue', d: 14 },
          { k: 'trait', add: 'menteur' },
        ]),
        out(1.6, () => 'Vous n\'êtes pas le premier à essayer. On vous le fait comprendre avec deux doigts cassés.', [
          { k: 'injure', label: 'deux doigts qui ne se plient plus', permanent: true, stat: 'agilite', penalty: 6 },
          { k: 'health', d: -12 },
          { k: 'wealth', d: -300 },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'shadow.emeute',
    tags: ['violence', 'politique'],
    minAge: 14,
    maxAge: 60,
    weight: 6,
    cooldown: { years: 20, scope: 'world' },
    text: () =>
      'Le prix du grain a doublé en une saison. Ce matin, la foule est devant les greniers et ' +
      'quelqu\'un a apporté des torches.',
    options: [
      opt('mener', 'Prendre la tête', [
        out(byStat('charisme', 1.5), () => 'On vous suit. Les greniers s\'ouvrent, le prix retombe, et cinq cents personnes savent désormais votre nom.', [
          { k: 'hidden', id: 'influence', d: 25 },
          { k: 'skill', id: 'commandement', d: 15 },
          { k: 'trait', add: 'meneur' },
          { k: 'trait', add: 'notoire' },
          { k: 'path', unlock: 'politique' },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 'mena l\'émeute du grain' } },
          { k: 'seed', eventId: 'seed.justice.rattrape', min: 1, max: 5, actors: [], note: 'l\'émeute du grain' },
        ]),
        out(1.5, () => 'La garde charge avant que vous ayez fini votre phrase. Vous vous réveillez trois jours plus tard.', [
          { k: 'health', d: -30 },
          { k: 'trait', add: 'recherche' },
        ]),
      ], { hint: 'risqué' }),
      opt('piller', 'Profiter du désordre', sure(
        () => 'Pendant que tout le monde regarde les greniers, vous regardez ailleurs. Vous rentrez chargé.',
        [{ k: 'wealth', d: 800 }, { k: 'skill', id: 'vol', d: 8 }, { k: 'hidden', id: 'karma', d: -10 }],
      )),
      opt('rentrer', 'Rentrer chez vous', sure(
        () => 'Vous rentrez et vous barricadez la porte. Il y a onze morts. Vous n\'en faites pas partie.',
        [{ k: 'mood', d: -8 }],
      )),
    ],
  }),

  ev({
    id: 'shadow.prison',
    tags: ['crime', 'justice'],
    minAge: 14,
    maxAge: 75,
    requires: (c) => trait(c, 'recherche') || trait(c, 'traque'),
    weight: 14,
    cooldown: { years: 8, scope: 'character' },
    text: () =>
      'On vous a pris. Le cachot du Bas-Vardhèn est une cave où l\'eau monte à marée haute, ' +
      'et le juge ne siège que deux fois par an.',
    options: [
      opt('purger', 'Purger', sure(
        () => 'Deux ans. Vous en ressortez plus dur, plus maigre, avec des contacts que vous n\'aviez pas.',
        [
          { k: 'health', d: -25 },
          { k: 'wealth', d: -400 },
          { k: 'trait', add: 'endurci' },
          { k: 'trait', add: 'marque_infamie' },
          { k: 'trait', remove: 'recherche' },
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'chronicle', kind: 'chute', importance: 3, data: { quoi: 'deux ans au cachot' } },
        ],
      )),
      opt('acheter', 'Acheter le juge', sure(
        () => 'Vous payez. Le dossier disparaît. Le juge ne vous oublie pas et vous ne l\'oubliez pas non plus.',
        [
          { k: 'wealth', d: -3000 },
          { k: 'trait', remove: 'recherche' },
          { k: 'hidden', id: 'corruption', d: 12 },
          { k: 'seed', eventId: 'seed.corruption.chantage', min: 4, max: 15, actors: [], note: 'le juge que vous avez acheté' },
        ],
      ), { requires: (c) => c.subject.wealth >= 3000, lockedReason: 'il faudrait 3 000 sous' }),
      opt('evader', 'S\'évader', [
        out(byStat('agilite', 1.3), () => 'À marée basse, par la grille. Vous êtes libre et vous ne remettrez jamais les pieds dans cette ville.', [
          { k: 'move', settlement: 'marches' },
          { k: 'health', d: -15 },
          { k: 'trait', add: 'traque' },
          { k: 'trait', add: 'notoire' },
        ]),
        out(1.5, () => 'On vous rattrape dans l\'eau. Ce qui suit ajoute trois ans à votre peine et vous coûte un pouce.', [
          { k: 'health', d: -32 },
          { k: 'injure', label: 'un pouce en moins à la main gauche', permanent: true, stat: 'agilite', penalty: 8 },
          { k: 'trait', add: 'marque_infamie' },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'shadow.protection',
    tags: ['crime', 'pouvoir'],
    minAge: 20,
    maxAge: 65,
    requires: (c) => c.subject.paths.includes('criminel') && (c.subject.skills['intrigue'] ?? 0) >= 30,
    weight: 9,
    cooldown: { years: 10, scope: 'character' },
    text: () =>
      'Trois rues, huit échoppes, et personne pour les tenir depuis que l\'ancien est mort. ' +
      'Vous pourriez prendre. Il faudrait tenir.',
    options: [
      opt('prendre', 'Prendre les trois rues', [
        out((c) => 1 + (c.subject.skills['commandement'] ?? 0) / 12 + c.subject.stats.charisme / 60, () => 'Vous prenez. Vous tenez. En deux ans, on cesse de discuter le prix.', [
          { k: 'wealth', d: 3500 },
          { k: 'hidden', id: 'influence', d: 22 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'skill', id: 'commandement', d: 14 },
          { k: 'title', add: 'des trois rues' },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 'prit les trois rues du Bas-Vardhèn' } },
        ]),
        out(1.6, () => 'Vous prenez et vous ne tenez pas. Quelqu\'un de plus dur prend à son tour, et il commence par vous.', [
          { k: 'health', d: -28 },
          { k: 'wealth', d: -500 },
          { k: 'trait', add: 'traque' },
        ]),
      ], { hint: 'risqué' }),
      opt('laisser', 'Laisser à quelqu\'un d\'autre', sure(
        () => 'Vous laissez. Celui qui prend s\'en souvient et vous laisse tranquille. C\'est une forme de sagesse.',
        [{ k: 'hidden', id: 'ambition', d: -8 }],
      )),
    ],
  }),

  ev({
    id: 'shadow.temoin',
    tags: ['crime', 'secret'],
    minAge: 12,
    maxAge: 75,
    weight: 7,
    cooldown: { years: 14, scope: 'character' },
    roles: {
      coupable: pick.first(
        pick.known({ minAge: 18 }),
        pick.local({ minAge: 20 }),
        pick.generate({ minAge: 25, maxAge: 55 }),
      ),
    },
    text: (c) =>
      `Vous avez vu ${n(c.role('coupable'))} faire quelque chose que personne d'autre n'a vu. ` +
      `${n(c.role('coupable'))} sait que vous avez vu.`,
    options: [
      opt('taire', 'Ne rien dire, jamais', sure(
        (c) => `Vous ne dites rien. ${n(c.role('coupable'))} vous doit désormais quelque chose qu'on ne rembourse pas.`,
        [
          { k: 'rel', to: 'coupable', from: 'coupable', type: 'dette', label: 'celui qui sait', affection: 10, fear: 40, trust: 20 },
          { k: 'flag', name: 'secret_detenu', value: true },
          { k: 'seed', eventId: 'seed.secret.leve', min: 5, max: 20, actors: ['coupable'], note: 'le secret que vous gardez' },
        ],
      )),
      opt('chantage', 'Monnayer votre silence', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 10, () => 'Vous êtes payé chaque saison. C\'est de l\'argent facile, et l\'argent facile a toujours une fin.', [
          { k: 'wealth', d: 1500 },
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'hidden', id: 'corruption', d: 14 },
          { k: 'rel', to: 'coupable', from: 'coupable', type: 'haine', label: 'le maître chanteur', affection: -60, fear: 45 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 3, max: 12, actors: ['coupable'], note: 'celui que vous faites chanter' },
        ]),
        out(1.4, (c) => `${n(c.role('coupable'))} n'est pas du genre à payer. On vous retrouve au bord de l'eau, vivant de peu.`, [
          { k: 'health', d: -30 },
          { k: 'injure', label: 'une oreille en moins', permanent: true, stat: 'charisme', penalty: 5 },
        ]),
      ], { hint: 'risqué' }),
      opt('denoncer', 'Aller le dire', sure(
        (c) => `Vous parlez. La justice fait son travail, ce qui arrive parfois. ${n(c.role('coupable'))} ne revient pas, ou revient dans quinze ans.`,
        [
          { k: 'hidden', id: 'karma', d: 10 },
          { k: 'trait', add: 'notoire' },
          { k: 'rel', to: 'coupable', from: 'coupable', type: 'haine', label: 'le témoin', affection: -85 },
          { k: 'seed', eventId: 'seed.vendetta', min: 10, max: 22, actors: ['coupable'], note: 'celui que vous avez dénoncé' },
        ],
      )),
    ],
  }),

  ev({
    id: 'shadow.guerre',
    tags: ['guerre', 'violence'],
    minAge: 16,
    maxAge: 55,
    requires: (c) => c.subject.paths.includes('militaire') || c.subject.jobId === 'soldat' || c.subject.jobId === 'sergent',
    weight: 13,
    cooldown: { years: 5, scope: 'character' },
    text: () =>
      'On marche sur les Marches. Trois semaines de boue, puis une matinée qui décide de tout. ' +
      'On vous place au deuxième rang, ce qui est mieux que le premier.',
    options: [
      opt('tenir', 'Tenir la ligne', [
        out((c) => 1 + (c.subject.skills['lame'] ?? 0) / 10 + c.subject.stats.volonte / 50, () => 'La ligne tient. C\'est tout ce qu\'on demandait. Vous en ressortez avec une part de butin et un regard qui a changé.', [
          { k: 'wealth', d: 700 },
          { k: 'skill', id: 'lame', d: 12 },
          { k: 'trait', add: 'guerrier' },
          { k: 'health', d: -12 },
          { k: 'chronicle', kind: 'violence', importance: 3, data: { quoi: 'tint la ligne aux Marches' } },
        ]),
        out(1.6, () => 'La ligne ne tient pas. Vous vous réveillez sous deux morts, et c\'est ce qui vous sauve.', [
          { k: 'health', d: -35 },
          { k: 'injure', label: 'une épaule qui ne se lève plus tout à fait', permanent: true, stat: 'force', penalty: 8 },
          { k: 'trait', add: 'hante' },
        ]),
      ]),
      opt('avancer', 'Charger le premier', [
        out((c) => 0.8 + c.subject.stats.force / 45, () => 'On vous voit. Le sergent vous voit. Ça compte plus que le reste.', [
          { k: 'skill', id: 'lame', d: 15 },
          { k: 'skill', id: 'commandement', d: 10 },
          { k: 'trait', add: 'courageux' },
          { k: 'health', d: -18 },
          { k: 'hidden', id: 'influence', d: 12 },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'chargea le premier et survécut' } },
        ]),
        out(2, () => 'Vous chargez. Une pique vous ouvre le flanc à trois pas de la ligne adverse.', [
          { k: 'health', d: -45 },
          { k: 'injure', label: 'une cicatrice qui court du flanc à la hanche', permanent: true, stat: 'endurance', penalty: 6 },
        ]),
      ], { hint: 'risqué' }),
      opt('fuir', 'Reculer pendant que c\'est encore possible', sure(
        () => 'Vous reculez. Vous vivez. On sait qui a reculé et on ne l\'oublie pas dans une garnison.',
        [
          { k: 'trait', add: 'lache' },
          { k: 'stat', stat: 'charisme', d: -8 },
          { k: 'job', id: null },
          { k: 'mood', d: -16 },
        ],
      ), { hint: 'lâche' }),
    ],
  }),
];
