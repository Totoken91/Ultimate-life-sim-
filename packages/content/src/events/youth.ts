import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure, trait } from './_helpers.js';

/** Adolescence : 13-17 ans. C'est ici que la voie se choisit, souvent sans le savoir. */
export const YOUTH_EVENTS = [
  ev({
    id: 'youth.premier_amour',
    tags: ['jeunesse', 'amour'],
    minAge: 13,
    maxAge: 22,
    weight: 13,
    once: 'life',
    roles: {
      autre: pick.first(
        pick.known({ minAge: 13, maxAge: 25, excludeSpouse: true }),
        pick.local({ minAge: 13, maxAge: 24 }),
        pick.generate({ minAge: 14, maxAge: 22, bond: { type: 'amitie', label: 'connaissance' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('autre'))}. Ce n'est pas nouveau — vous lui avez déjà parlé cent fois. ` +
      `Ce qui est nouveau, c'est que vous n'arrivez plus à le faire normalement.`,
    options: [
      opt('avouer', 'Le dire', [
        out(byStat('charisme', 1.8), (c) => `${n(c.role('autre'))} le savait déjà. ${e(c.role('autre')) === 'e' ? 'Elle' : 'Il'} attendait que vous le disiez.`, [
          { k: 'rel', to: 'autre', type: 'amour', label: 'aimé', affection: 70, trust: 45, mutual: true },
          { k: 'trait', add: 'amoureux' },
          { k: 'mood', d: 25 },
          { k: 'memory', text: 'Le jour où je l\'ai dit. Et où on m\'a répondu.', salience: 88, tags: ['amour'], actors: ['autre'] },
        ]),
        out(1.2, (c) => `${n(c.role('autre'))} vous regarde avec une douceur insupportable et dit non. Vous auriez préféré de la cruauté.`, [
          { k: 'mood', d: -22 },
          { k: 'rel', to: 'autre', affection: -10 },
          { k: 'memory', text: 'On m\'a dit non, avec douceur. C\'était pire.', salience: 80, tags: ['amour', 'humiliation'], actors: ['autre'] },
        ]),
      ]),
      opt('taire', 'Ne rien dire et attendre', sure(
        (c) => `Vous attendez. Deux ans plus tard, ${n(c.role('autre'))} en épouse un autre et vous êtes au premier rang.`,
        [
          { k: 'mood', d: -18 },
          { k: 'rel', to: 'autre', type: 'amour', label: 'jamais dit', affection: 45 },
          { k: 'memory', text: 'Je n\'ai rien dit. J\'étais au premier rang au mariage.', salience: 84, tags: ['regret', 'amour'], actors: ['autre'] },
          { k: 'trait', add: 'solitaire' },
        ],
      )),
      opt('eviter', 'L\'éviter jusqu\'à ce que ça passe', sure(
        () => 'Ça finit par passer. C\'est ce qui vous inquiète le plus : que ça puisse passer.',
        [{ k: 'stat', stat: 'volonte', d: 4 }, { k: 'mood', d: -8 }],
      )),
    ],
  }),

  ev({
    id: 'youth.recrutement',
    tags: ['jeunesse', 'guerre'],
    minAge: 15,
    maxAge: 24,
    requires: (c) => !c.subject.jobId || c.subject.wealth < 800,
    weight: (c) => 9 + c.subject.stats.force / 12,
    once: 'life',
    roles: {
      sergent: pick.generate({ minAge: 32, maxAge: 55, statMean: 55, bond: { type: 'mentorat', label: 'le sergent recruteur' } }),
    },
    text: (c) =>
      `${n(c.role('sergent'))} recrute sur la place. Solde, gîte, et « de quoi rentrer chez soi avec ` +
      `quelque chose ». Il regarde vos mains en le disant.`,
    options: [
      opt('signer', 'Signer', sure(
        () => 'On vous donne une lance, une écuelle et un nom sur un registre. Le premier hiver enlève toute idée romanesque.',
        [
          { k: 'job', id: 'soldat' },
          { k: 'path', unlock: 'militaire' },
          { k: 'skill', id: 'lame', d: 12 },
          { k: 'stat', stat: 'endurance', d: 5 },
          { k: 'health', d: -6 },
          { k: 'move', settlement: 'roc' },
        ],
      )),
      opt('negocier', 'Négocier une prime avant de signer', [
        out(byStat('charisme', 1.6), () => 'Il rit, puis il paie. Vous entrez au service avec de l\'argent d\'avance et une réputation d\'emmerdeur.', [
          { k: 'job', id: 'soldat' },
          { k: 'path', unlock: 'militaire' },
          { k: 'wealth', d: 300 },
          { k: 'skill', id: 'negoce', d: 6 },
          { k: 'trait', add: 'obstine' },
          { k: 'move', settlement: 'roc' },
        ]),
        out(1.4, () => 'Il ne rit pas. Il passe au suivant sans vous adresser un regard de plus.', [
          { k: 'mood', d: -8 },
        ]),
      ]),
      opt('refuser', 'Refuser', sure(
        () => 'Vous refusez. Deux ans plus tard, on apprend que la moitié de la colonne n\'est pas revenue des Marches.',
        [{ k: 'hidden', id: 'karma', d: 2 }],
      )),
    ],
  }),

  ev({
    id: 'youth.bande',
    tags: ['jeunesse', 'crime'],
    minAge: 13,
    maxAge: 22,
    requires: (c) => c.subject.wealth < 1500,
    weight: (c) => 10 + (c.world.settlement(c.subject.settlement)?.danger ?? 30) / 8,
    once: 'life',
    roles: {
      chef: pick.generate({ minAge: 20, maxAge: 38, statMean: 55, bond: { type: 'amitie', label: 'le chef de bande' } }),
    },
    text: (c) =>
      `${n(c.role('chef'))} vous propose d'entrer dans la bande. Pas une invitation polie : une ` +
      `constatation. « Tu traînes déjà avec nous. Autant que ça rapporte. »`,
    options: [
      opt('entrer', 'Entrer', sure(
        () => 'Vous entrez. Il y a des règles, des parts, et une hiérarchie plus claire que celle de la ville.',
        [
          { k: 'path', unlock: 'criminel' },
          { k: 'skill', id: 'vol', d: 12 },
          { k: 'skill', id: 'intrigue', d: 6 },
          { k: 'wealth', d: 200 },
          { k: 'rel', to: 'chef', type: 'serment', label: 'le chef de bande', affection: 20, respect: 30, mutual: true },
          { k: 'trait', add: 'voleur' },
          { k: 'seed', eventId: 'seed.bande.dette', min: 4, max: 12, actors: ['chef'], note: 'ce que la bande attend de vous' },
        ],
      )),
      opt('refuser', 'Refuser poliment', [
        out(2, (c) => `${n(c.role('chef'))} hausse les épaules. On ne vous en tient pas rigueur. Pas tout de suite.`, [
          { k: 'rel', to: 'chef', from: 'chef', affection: -10 },
        ]),
        out(1, (c) => `On n'aime pas les refus. On vous le fait comprendre dans une ruelle, à trois.`, [
          { k: 'health', d: -16 },
          { k: 'rel', to: 'chef', from: 'chef', type: 'rivalite', label: 'celui qui a dit non', affection: -35, fear: 20 },
        ]),
      ]),
      opt('denoncer', 'Aller voir la garde', [
        out(1.5, () => 'La garde vous écoute et ne fait rien. Deux semaines plus tard, la bande sait qui a parlé.', [
          { k: 'rel', to: 'chef', from: 'chef', type: 'haine', label: 'le mouchard', affection: -70, fear: 10 },
          { k: 'trait', add: 'traque' },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 2, max: 8, actors: ['chef'], note: 'la bande n\'oublie pas' },
        ]),
        out(1, () => 'La garde agit. Trois arrestations, une pendaison. On ne remonte jamais jusqu\'à vous, et vous vivez avec ça.', [
          { k: 'wealth', d: 150 },
          { k: 'hidden', id: 'karma', d: -6 },
          { k: 'memory', text: 'J\'ai parlé. Il y a eu une pendaison. Personne ne l\'a jamais su.', salience: 84, tags: ['secret'] },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'youth.apprentissage',
    tags: ['jeunesse', 'travail'],
    minAge: 13,
    maxAge: 20,
    requires: (c) => !c.subject.jobId,
    weight: 11,
    roles: {
      maitre: pick.first(
        pick.known({ minAge: 30, types: ['mentorat', 'amitie'] }),
        pick.local({ minAge: 32 }),
        pick.generate({ minAge: 38, maxAge: 62, bond: { type: 'mentorat', label: 'le maître' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('maitre'))} cherche quelqu'un. Pas un ami, pas un fils : une paire de bras qui ` +
      `apprend vite et ne pose pas de questions.`,
    options: [
      opt('forge', 'La forge', sure(
        () => 'Le fer, le charbon, et sept ans de brûlures aux avant-bras.',
        [{ k: 'job', id: 'apprenti_forge' }, { k: 'skill', id: 'forge', d: 12 }, { k: 'stat', stat: 'force', d: 4 }],
      )),
      opt('comptoir', 'Le comptoir', sure(
        () => 'Les registres, les poids, les gens. Vous apprenez que le prix d\'une chose n\'a rien à voir avec ce qu\'elle vaut.',
        [{ k: 'job', id: 'colporteur' }, { k: 'skill', id: 'negoce', d: 12 }, { k: 'skill', id: 'calcul', d: 8 }],
      )),
      opt('mer', 'La mer', sure(
        () => 'Six mois d\'affilée sans terre. Vous vomissez trois semaines puis plus jamais.',
        [{ k: 'job', id: 'matelot' }, { k: 'skill', id: 'navigation', d: 12 }, { k: 'trait', add: 'marin' }, { k: 'health', d: -5 }],
      )),
      opt('soins', 'Les simples et les onguents', sure(
        () => 'Les racines, les fièvres, et les gens qui meurent quand même. Surtout ceux-là.',
        [{ k: 'job', id: 'herboriste' }, { k: 'skill', id: 'soin', d: 12 }],
      ), { requires: (c) => c.subject.stats.intelligence >= 45, lockedReason: 'il faut une tête pour ça' }),
    ],
  }),

  ev({
    id: 'youth.humiliation_publique',
    tags: ['jeunesse', 'humiliation'],
    minAge: 13,
    maxAge: 25,
    weight: 8,
    cooldown: { years: 10, scope: 'character' },
    roles: {
      temoin: pick.first(
        pick.known({ minAge: 12, minAffection: 20 }),
        pick.local({ minAge: 12 }),
        pick.generate({ minAge: 15, maxAge: 40, bond: { type: 'amitie', label: 'le témoin' } }),
      ),
    },
    text: (c) =>
      `Ça se passe sur la place, devant tout le monde, et ${n(c.role('temoin'))} est là. ` +
      `Ce n'est pas la honte qui reste. C'est le regard de ${n(c.role('temoin'))}.`,
    options: [
      opt('encaisser', 'Rester debout et encaisser', sure(
        () => 'Vous ne baissez pas les yeux. Ça ne change rien à l\'humiliation mais ça change quelque chose en vous.',
        [
          { k: 'stat', stat: 'volonte', d: 7 },
          { k: 'trait', add: 'endurci' },
          { k: 'mood', d: -14 },
          { k: 'memory', text: 'La place, tout le monde, et moi debout.', salience: 82, tags: ['humiliation'], actors: ['temoin'] },
        ],
      )),
      opt('exploser', 'Exploser', [
        out(byStat('force', 1.3), () => 'Vous renversez tout. On parle de vous pendant des mois, et pas en bien. Mais on ne recommence pas.', [
          { k: 'trait', add: 'violent' },
          { k: 'trait', add: 'notoire' },
          { k: 'stat', stat: 'charisme', d: -4 },
        ]),
        out(1.4, () => 'Vous explosez et vous vous ridiculisez encore plus. Le surnom que vous récoltez ce jour-là vous suit dix ans.', [
          { k: 'stat', stat: 'charisme', d: -7 },
          { k: 'mood', d: -20 },
          { k: 'trait', add: 'rancunier' },
        ]),
      ]),
      opt('partir', 'Partir de la ville', sure(
        () => 'Vous ne rentrez pas chez vous. Vous prenez la route sans savoir où elle va.',
        [
          { k: 'move', settlement: 'orin' },
          { k: 'trait', add: 'solitaire' },
          { k: 'wealth', d: -50 },
          { k: 'hidden', id: 'ambition', d: 8 },
        ],
      ), { hint: 'irréversible' }),
    ],
  }),

  ev({
    id: 'youth.livre',
    tags: ['jeunesse', 'savoir'],
    minAge: 12,
    maxAge: 28,
    requires: (c) => trait(c, 'lettre') || (c.subject.skills['lettres'] ?? 0) > 15,
    weight: 9,
    cooldown: { years: 8, scope: 'character' },
    text: () =>
      'Vous mettez la main sur un livre. Pas un registre : un vrai livre, avec des idées dedans, ' +
      'dont certaines sont interdites à Kaleth depuis deux générations.',
    options: [
      opt('lire', 'Le lire en entier, en cachette', sure(
        () => 'Trois mois, la nuit, à la chandelle. Vous ne pensez plus pareil après. C\'est un problème.',
        [
          { k: 'skill', id: 'lettres', d: 14 },
          { k: 'stat', stat: 'intelligence', d: 6 },
          { k: 'trait', add: 'erudit' },
          { k: 'health', d: -4 },
          { k: 'path', unlock: 'savante' },
          { k: 'memory', text: 'Le livre que je n\'aurais pas dû lire.', salience: 78, tags: ['savoir'] },
        ],
      )),
      opt('vendre', 'Le vendre — ça vaut cher', sure(
        () => 'Un collectionneur paie sans discuter, ce qui vous fait comprendre que vous auriez pu demander plus.',
        [{ k: 'wealth', d: 700 }, { k: 'skill', id: 'negoce', d: 5 }],
      )),
      opt('bruler', 'Le brûler', sure(
        () => 'Vous le brûlez. Vous ne sauriez pas dire pourquoi. Vous y repensez toute votre vie.',
        [{ k: 'trait', add: 'pieux' }, { k: 'memory', text: 'J\'ai brûlé le livre. Je ne sais toujours pas pourquoi.', salience: 70, tags: ['regret'] }],
      )),
    ],
  }),

  ev({
    id: 'youth.depart',
    tags: ['jeunesse', 'voyage'],
    minAge: 15,
    maxAge: 30,
    weight: (c) => 6 + c.subject.hidden.ambition / 12,
    once: 'life',
    text: (c) =>
      `Une caravane part pour ${c.subject.settlement === 'kaleth' ? 'Vardhèn' : 'Kaleth-la-Blanche'} dans trois jours. ` +
      `Il y a une place. Personne ici ne remarquerait votre absence avant une semaine.`,
    options: [
      opt('partir', 'Partir', sure(
        (c) => `Vous partez. La route est longue et vous arrivez avec des mains différentes.`,
        [
          { k: 'move', settlement: 'kaleth' },
          { k: 'skill', id: 'survie', d: 8 },
          { k: 'stat', stat: 'endurance', d: 4 },
          { k: 'hidden', id: 'ambition', d: 10 },
          { k: 'wealth', d: -80 },
          { k: 'chronicle', kind: 'ascension', importance: 2, data: { quoi: 'quitta tout pour la route' } },
        ],
      ), { hint: 'irréversible' }),
      opt('rester', 'Rester', sure(
        () => 'Vous restez. Il y a des raisons. Il y a toujours des raisons.',
        [{ k: 'mood', d: -6 }, { k: 'hidden', id: 'ambition', d: -5 }],
      )),
    ],
  }),

  ev({
    id: 'youth.dette_jeu',
    tags: ['jeunesse', 'dette'],
    minAge: 15,
    maxAge: 45,
    weight: 8,
    cooldown: { years: 12, scope: 'character' },
    roles: {
      creancier: pick.generate({ minAge: 30, maxAge: 55, statMean: 55, bond: { type: 'dette', label: 'le créancier' } }),
    },
    text: (c) =>
      `Vous avez perdu aux dés. Beaucoup. ${n(c.role('creancier'))} note le montant sur une ardoise ` +
      `et vous laisse jusqu'au printemps, ce qui est généreux et n'a rien de rassurant.`,
    options: [
      opt('payer', 'Payer maintenant, quitte à tout vider', sure(
        () => 'Vous payez. Il ne reste rien mais il ne reste rien à devoir non plus.',
        [{ k: 'wealth', d: -600 }, { k: 'stat', stat: 'volonte', d: 3 }],
      ), { requires: (c) => c.subject.wealth >= 600, lockedReason: 'vous n\'avez pas la somme' }),
      opt('travailler', 'Proposer de travailler la dette', sure(
        (c) => `${n(c.role('creancier'))} accepte. Vous découvrez ce qu'il fait vraiment, et vous ne pourrez plus l'ignorer.`,
        [
          { k: 'rel', to: 'creancier', type: 'dette', label: 'le créancier', affection: 5, fear: 25, mutual: true },
          { k: 'skill', id: 'intrigue', d: 10 },
          { k: 'path', unlock: 'criminel' },
          { k: 'seed', eventId: 'seed.dette.recouvrement', min: 3, max: 9, actors: ['creancier'], note: 'ce que vous devez encore' },
        ],
      )),
      opt('fuir', 'Quitter la ville avant le printemps', sure(
        () => 'Vous partez de nuit. On vous cherchera. On cherche longtemps, dans ce métier.',
        [
          { k: 'move', settlement: 'orin' },
          { k: 'trait', add: 'traque' },
          { k: 'rel', to: 'creancier', from: 'creancier', type: 'haine', label: 'le débiteur en fuite', affection: -60 },
          { k: 'seed', eventId: 'seed.dette.recouvrement', min: 5, max: 18, actors: ['creancier'], note: 'la dette que vous avez fuie' },
        ],
      ), { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'youth.maladie_proche',
    tags: ['jeunesse', 'famille', 'maladie'],
    minAge: 10,
    maxAge: 60,
    weight: 9,
    cooldown: { years: 12, scope: 'character' },
    roles: { proche: pick.first(pick.relative({ minAffection: 15 }), pick.known({ minAffection: 30 })) },
    text: (c) =>
      `${n(c.role('proche'))} est alité${e(c.role('proche'))} depuis trois semaines et ne se relève pas. ` +
      `Le médecin veut être payé d'avance.`,
    options: [
      opt('payer', 'Payer le médecin', sure(
        (c) => `Vous videz ce que vous aviez. ${n(c.role('proche'))} se relève. On ne vous remercie pas vraiment — on n'a pas les mots.`,
        [
          { k: 'wealth', d: -500 },
          { k: 'health', d: 25, who: 'proche' },
          { k: 'rel', to: 'proche', from: 'proche', affection: 40, trust: 35 },
          { k: 'hidden', id: 'karma', d: 10 },
        ],
      ), { requires: (c) => c.subject.wealth >= 500, lockedReason: 'vous n\'avez pas 500 sous' }),
      opt('soigner', 'La soigner vous-même', [
        out((c) => 1 + (c.subject.skills['soin'] ?? 0) / 20, (c) => `Vous veillez trois semaines. Ça passe. Vous avez appris des choses que les livres ne disent pas.`, [
          { k: 'health', d: 18, who: 'proche' },
          { k: 'skill', id: 'soin', d: 12 },
          { k: 'health', d: -8 },
          { k: 'rel', to: 'proche', from: 'proche', affection: 45, trust: 45 },
        ]),
        out(1.6, (c) => `Vous faites ce que vous pouvez. Ce n'est pas assez.`, [
          { k: 'kill', who: 'proche', cause: 'de la fièvre, malgré les soins' },
          { k: 'trait', add: 'endeuille' },
          { k: 'memory', text: 'J\'ai veillé trois semaines. Ça n\'a servi à rien.', salience: 90, tags: ['deuil', 'echec'], actors: ['proche'] },
        ]),
      ]),
      opt('rien', 'Ne rien faire', sure(
        (c) => `Vous n'avez rien fait. ${n(c.role('proche'))} meurt un matin de la semaine suivante, et vous n'êtes pas là.`,
        [
          { k: 'kill', who: 'proche', cause: 'de la fièvre, sans personne' },
          { k: 'hidden', id: 'karma', d: -12 },
          { k: 'memory', text: 'Je n\'ai rien fait. Je n\'étais même pas là.', salience: 92, tags: ['deuil', 'honte'], actors: ['proche'] },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'youth.opportunite',
    tags: ['jeunesse', 'fortune'],
    minAge: 14,
    maxAge: 40,
    weight: (c) => 6 + c.subject.hidden.destinee / 15,
    cooldown: { years: 15, scope: 'character' },
    text: () =>
      'Une cargaison sans propriétaire, une information avant les autres, une porte laissée ouverte. ' +
      'L\'occasion est là, elle est nette, et elle ne durera pas une journée.',
    options: [
      opt('saisir', 'Saisir', [
        out(byStat('agilite', 1.4), () => 'Ça marche. Vous ne saurez jamais si c\'était de la chance ou du talent, et vous choisirez de croire au talent.', [
          { k: 'wealth', d: 1400 },
          { k: 'hidden', id: 'ambition', d: 8 },
          { k: 'chronicle', kind: 'fortune', importance: 2, data: { quoi: 'saisit une occasion que personne d\'autre n\'avait vue' } },
        ]),
        out(1.3, () => 'C\'était un piège, ou de la malchance. On vous cherche, maintenant.', [
          { k: 'wealth', d: -300 },
          { k: 'trait', add: 'traque' },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 3, max: 12, actors: [], note: 'ceux que vous avez volés' },
        ]),
      ]),
      opt('laisser', 'Laisser passer', sure(
        () => 'Vous laissez. Quelqu\'un d\'autre prend, et vous le voyez monter les années suivantes.',
        [{ k: 'mood', d: -8 }, { k: 'hidden', id: 'karma', d: 4 }],
      )),
    ],
  }),

  ev({
    id: 'youth.serment',
    tags: ['jeunesse', 'serment'],
    minAge: 14,
    maxAge: 35,
    weight: 7,
    once: 'life',
    roles: { compagnon: pick.known({ minAffection: 40, minAge: 12 }) },
    text: (c) =>
      `${n(c.role('compagnon'))} vous propose un serment. Pas devant un prêtre : entre vous deux, ` +
      `une entaille dans la paume et une phrase. Ça ne vaut rien devant la loi et ça vaut tout.`,
    options: [
      opt('jurer', 'Jurer', sure(
        () => 'Vous jurez. Le sang sèche. Vous ne pourrez plus jamais dire que vous ne saviez pas.',
        [
          { k: 'rel', to: 'compagnon', type: 'serment', label: 'juré', affection: 35, trust: 60, respect: 40, mutual: true },
          { k: 'flag', name: 'serment_jure', value: true },
          { k: 'memory', text: 'Le serment. L\'entaille. La phrase.', salience: 92, tags: ['serment'], actors: ['compagnon'] },
          { k: 'seed', eventId: 'seed.serment.epreuve', min: 6, max: 22, actors: ['compagnon'], note: 'le jour où le serment coûtera' },
        ],
      )),
      opt('refuser', 'Refuser', sure(
        (c) => `Vous refusez. ${n(c.role('compagnon'))} ne dit rien, remet son couteau, et quelque chose s'éteint.`,
        [{ k: 'rel', to: 'compagnon', from: 'compagnon', affection: -30, trust: -25 }, { k: 'mood', d: -8 }],
      )),
    ],
  }),

  ev({
    id: 'youth.reputation',
    tags: ['jeunesse', 'social'],
    minAge: 14,
    maxAge: 50,
    weight: 7,
    cooldown: { years: 10, scope: 'character' },
    text: () =>
      'On raconte quelque chose sur vous en ville. Ce n\'est pas tout à fait faux et ce n\'est pas vrai ' +
      'non plus, et ça se répand plus vite que la vérité ne pourrait le faire.',
    options: [
      opt('dementir', 'Démentir partout, tout le temps', [
        out(byStat('charisme', 1.5), () => 'Vous reprenez la main. Au bout de six mois, plus personne ne s\'en souvient.', [
          { k: 'skill', id: 'rhetorique', d: 8 },
        ]),
        out(1.4, () => 'Plus vous démentez, plus on y croit. C\'est une leçon que vous n\'oublierez pas.', [
          { k: 'trait', add: 'notoire' },
          { k: 'stat', stat: 'charisme', d: -4 },
        ]),
      ]),
      opt('assumer', 'L\'assumer et en rajouter', sure(
        () => 'Vous en rajoutez. On vous craint un peu. On vous invite moins. Vous décidez que ça vous va.',
        [{ k: 'trait', add: 'notoire' }, { k: 'hidden', id: 'influence', d: 8 }, { k: 'stat', stat: 'charisme', d: 3 }],
      )),
      opt('trouver', 'Trouver qui a lancé ça', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 15, () => 'Vous remontez la rumeur jusqu\'à sa source. Ce que vous découvrez vous sert plus que le démenti.', [
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'hidden', id: 'influence', d: 6 },
        ]),
        out(1.2, () => 'Vous remontez trois personnes et vous perdez la trace. Vous vous êtes fait des ennemis en chemin.', [
          { k: 'stat', stat: 'charisme', d: -3 },
          { k: 'skill', id: 'intrigue', d: 5 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'youth.mer_tentation',
    tags: ['jeunesse', 'voyage'],
    minAge: 14,
    maxAge: 35,
    requires: (c) => ['vardhen', 'basvardhen'].includes(c.subject.settlement),
    weight: 8,
    cooldown: { years: 15, scope: 'character' },
    text: () =>
      'Un navire part pour les comptoirs du sud. Trois ans, peut-être quatre. On cherche des bras ' +
      'et on ne pose pas de questions sur ce qu\'on laisse derrière.',
    options: [
      opt('embarquer', 'Embarquer', sure(
        () => 'Trois ans. Vous revenez avec de l\'argent, des cicatrices, et l\'impossibilité de raconter ce que vous avez vu.',
        [
          { k: 'skill', id: 'navigation', d: 20 },
          { k: 'trait', add: 'marin' },
          { k: 'wealth', d: 900 },
          { k: 'stat', stat: 'endurance', d: 6 },
          { k: 'health', d: -10 },
          { k: 'job', id: 'matelot' },
          { k: 'chronicle', kind: 'ascension', importance: 2, data: { quoi: 'prit la mer pour trois ans' } },
        ],
      ), { hint: 'lent' }),
      opt('rester', 'Regarder le navire partir', sure(
        () => 'Vous restez sur le quai jusqu\'à ce qu\'on ne voie plus la voile.',
        [{ k: 'mood', d: -6 }],
      )),
    ],
  }),
];
