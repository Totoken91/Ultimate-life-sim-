import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure, trait } from './_helpers.js';

/** Âge adulte : s'établir, construire, et découvrir ce que ça coûte. */
export const ADULT_EVENTS = [
  ev({
    id: 'adult.promotion',
    tags: ['travail', 'ascension'],
    minAge: 20,
    maxAge: 60,
    requires: (c) => !!c.subject.jobId && c.subject.jobYears >= 4,
    weight: 10,
    cooldown: { years: 8, scope: 'character' },
    roles: {
      patron: pick.first(
        pick.known({ minAge: 35, types: ['mentorat', 'serment'] }),
        pick.local({ minAge: 38 }),
        pick.generate({ minAge: 42, maxAge: 65, statMean: 55, bond: { type: 'mentorat', label: 'le maître' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('patron'))} vous fait venir. Il y a une place au-dessus de la vôtre et deux ` +
      `personnes pour la prendre. Vous êtes l'une des deux.`,
    options: [
      opt('merite', 'La demander franchement', [
        out(byStat('charisme', 1.5), () => 'On vous la donne. Vous apprendrez plus tard que ça s\'est joué à peu de chose.', [
          { k: 'wealth', d: 900 },
          { k: 'skill', id: 'commandement', d: 8 },
          { k: 'chronicle', kind: 'ascension', importance: 2, data: { quoi: 'obtint la place qu\'il visait' } },
        ]),
        out(1.3, () => 'On la donne à l\'autre. On vous explique pourquoi et l\'explication est humiliante parce qu\'elle est juste.', [
          { k: 'mood', d: -14 },
          { k: 'hidden', id: 'ambition', d: 8 },
        ]),
      ]),
      opt('saper', 'Faire savoir ce que vous savez sur l\'autre', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 12, () => 'La place est à vous. L\'autre part de la ville. Vous dormez très bien, ce qui devrait vous inquiéter.', [
          { k: 'wealth', d: 900 },
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'hidden', id: 'corruption', d: 12 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 6, max: 20, actors: [], note: 'celui que vous avez écarté' },
        ]),
        out(1.4, (c) => `Ça se retourne. ${n(c.role('patron'))} apprend d'où vient la rumeur et vous regarde différemment jusqu'à la fin.`, [
          { k: 'rel', to: 'patron', from: 'patron', affection: -40, trust: -50 },
          { k: 'trait', add: 'notoire' },
        ]),
      ], { hint: 'cruel' }),
      opt('rien', 'Ne rien faire', sure(
        () => 'Vous ne faites rien. On donne la place à l\'autre. Vous restez à la vôtre, et vous y êtes bien, ou vous vous le dites.',
        [{ k: 'trait', add: 'content' }, { k: 'hidden', id: 'ambition', d: -6 }],
      )),
    ],
  }),

  ev({
    id: 'adult.affaire',
    tags: ['travail', 'fortune'],
    minAge: 20,
    maxAge: 65,
    requires: (c) => c.subject.wealth >= 800,
    weight: 9,
    cooldown: { years: 7, scope: 'character' },
    roles: {
      associe: pick.first(
        pick.known({ minAge: 20, minAffection: 10 }),
        pick.generate({ minAge: 28, maxAge: 55, statMean: 55, bond: { type: 'amitie', label: 'l\'associé' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('associe'))} vous propose de mettre en commun. Le calcul tient, à condition que ` +
      `personne ne mente sur ce qu'il apporte.`,
    options: [
      opt('investir', 'Mettre la moitié de ce que vous avez', [
        out(2, () => 'Ça marche. Pas de fortune, mais un flux régulier, et le flux vaut mieux que le tas.', [
          { k: 'wealth', d: 1800 },
          { k: 'skill', id: 'negoce', d: 10 },
          { k: 'rel', to: 'associe', affection: 20, trust: 25, mutual: true },
        ]),
        out(1.5, (c) => `${n(c.role('associe'))} disparaît avec la mise au bout de huit mois. On ne le revoit pas dans la région.`, [
          { k: 'wealth', d: -1200 },
          { k: 'rel', to: 'associe', type: 'haine', label: 'celui qui est parti{e} avec ma mise', affection: -70, trust: -80 },
          { k: 'trait', add: 'mefiant' },
          { k: 'seed', eventId: 'seed.trahison.retrouvailles', min: 8, max: 25, actors: ['associe'], note: 'celui qui vous a volé' },
        ]),
        out(1, () => 'Un naufrage, un incendie, une saisie. Tout part en une nuit et ce n\'est la faute de personne.', [
          { k: 'wealth', d: -900 },
          { k: 'mood', d: -18 },
          { k: 'chronicle', kind: 'ruine', importance: 3, data: { quoi: 'perdit sa mise en une nuit' } },
        ]),
      ], { hint: 'risqué' }),
      opt('prudent', 'Mettre une petite part seulement', sure(
        () => 'Vous mettez peu. Vous gagnez peu. C\'est un choix que vous referez toute votre vie, et qui vous définit.',
        [{ k: 'wealth', d: 300 }, { k: 'skill', id: 'negoce', d: 4 }, { k: 'trait', add: 'avare' }],
      )),
      opt('refuser', 'Refuser', sure(
        (c) => `Vous refusez. ${n(c.role('associe'))} trouve quelqu'un d'autre. Deux ans plus tard, vous ne savez pas si vous avez eu raison.`,
        [{ k: 'rel', to: 'associe', from: 'associe', affection: -12 }],
      )),
    ],
  }),

  ev({
    id: 'adult.injustice',
    tags: ['social', 'justice'],
    minAge: 16,
    maxAge: 70,
    weight: 9,
    cooldown: { years: 9, scope: 'character' },
    roles: {
      victime: pick.first(pick.known({ minAffection: -20 }), pick.local({}), pick.generate({})),
      puissant: pick.generate({ minAge: 35, maxAge: 65, socialClass: 'aise', statMean: 55, bond: { type: 'rivalite', label: 'le notable' } }),
    },
    text: (c) =>
      `${n(c.role('puissant'))} fait chasser ${n(c.role('victime'))} de chez ${e(c.role('victime')) === 'e' ? 'elle' : 'lui'} ` +
      `pour une dette qui n'existe probablement pas. Personne ne dit rien. Vous êtes là.`,
    options: [
      opt('intervenir', 'Intervenir publiquement', [
        out(byStat('charisme', 1.4), (c) => `Vous parlez fort et vous parlez bien. ${n(c.role('puissant'))} recule devant témoins — il ne vous le pardonnera jamais.`, [
          { k: 'rel', to: 'victime', from: 'victime', type: 'dette', label: 'celui qui m\'a défendu', affection: 55, trust: 50 },
          { k: 'rel', to: 'puissant', from: 'puissant', type: 'rivalite', label: 'l\'insolent', affection: -50 },
          { k: 'hidden', id: 'karma', d: 14 },
          { k: 'hidden', id: 'influence', d: 8 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 4, max: 15, actors: ['puissant'], note: 'le notable que vous avez humilié' },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'tint tête à un notable devant témoins' } },
        ]),
        out(1.5, (c) => `On vous fait taire. Deux hommes, une ruelle, et un message clair. ${n(c.role('victime'))} est chassé${e(c.role('victime'))} quand même.`, [
          { k: 'health', d: -18 },
          { k: 'rel', to: 'puissant', from: 'puissant', affection: -40, fear: 10 },
          { k: 'trait', add: 'rancunier' },
        ]),
      ]),
      opt('aider', 'Ne rien dire, mais l\'aider après', sure(
        (c) => `Vous attendez la nuit et vous apportez ce que vous pouvez. ${n(c.role('victime'))} ne l'oublie pas. ${n(c.role('puissant'))} ne le sait pas.`,
        [
          { k: 'wealth', d: -200 },
          { k: 'rel', to: 'victime', from: 'victime', type: 'dette', label: 'celui qui est venu{e} la nuit', affection: 45, trust: 55 },
          { k: 'hidden', id: 'karma', d: 10 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 5, max: 20, actors: ['victime'], note: 'la dette de celui que vous avez aidé' },
        ],
      )),
      opt('profiter', 'Racheter la maison à vil prix', sure(
        (c) => `Vous rachetez pour un quart de sa valeur. ${n(c.role('puissant'))} vous trouve du goût. ${n(c.role('victime'))} vous croise parfois et ne dit rien.`,
        [
          { k: 'wealth', d: -400 },
          { k: 'class', to: 'commun' },
          { k: 'rel', to: 'puissant', type: 'amitie', label: 'le notable', affection: 25, mutual: true },
          { k: 'rel', to: 'victime', from: 'victime', type: 'haine', label: 'celui qui a pris ma maison', affection: -75 },
          { k: 'hidden', id: 'karma', d: -18 },
          { k: 'hidden', id: 'corruption', d: 12 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 6, max: 22, actors: ['victime'], note: 'la maison que vous avez rachetée' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'adult.maladie',
    tags: ['maladie', 'corps'],
    minAge: 25,
    maxAge: 90,
    weight: (c) => 5 + Math.max(0, c.age - 35) / 4,
    cooldown: { years: 10, scope: 'character' },
    text: () =>
      'Quelque chose ne va pas. Ça a commencé doucement et ça ne repart plus. Le corps envoie un ' +
      'message que vous mettez des mois à accepter de lire.',
    options: [
      opt('medecin', 'Consulter', sure(
        () => 'On vous donne un nom pour ce que vous avez, ce qui ne le soigne pas mais aide bizarrement.',
        [{ k: 'wealth', d: -400 }, { k: 'health', d: 8 }],
      ), { requires: (c) => c.subject.wealth >= 400, lockedReason: 'un médecin coûte 400 sous' }),
      opt('travailler', 'Continuer à travailler et ne rien dire', sure(
        () => 'Vous tenez. Vous tenez longtemps. Vous le paierez d\'un coup, plus tard.',
        [{ k: 'health', d: -16 }, { k: 'stat', stat: 'volonte', d: 4 }, { k: 'trait', add: 'endurci' }],
      )),
      opt('reposer', 'Vous arrêter le temps qu\'il faudra', sure(
        () => 'Vous vous arrêtez. Ça coûte cher en argent et en réputation. Vous vous relevez.',
        [{ k: 'health', d: 16 }, { k: 'wealth', d: -350 }],
      )),
    ],
  }),

  ev({
    id: 'adult.pouvoir_local',
    tags: ['politique', 'ascension'],
    minAge: 25,
    maxAge: 65,
    requires: (c) => c.subject.stats.charisme >= 50 || (c.subject.skills['rhetorique'] ?? 0) >= 25,
    weight: 7,
    once: 'life',
    text: () =>
      'Le quartier cherche quelqu\'un pour parler en son nom devant l\'échevinage. Ce n\'est pas un ' +
      'titre, ce n\'est pas payé, et tout le monde vous connaîtra.',
    options: [
      opt('accepter', 'Accepter', sure(
        () => 'Vous parlez, on vous écoute, et vous découvrez que la moitié du pouvoir consiste à savoir qui doit quoi à qui.',
        [
          { k: 'path', unlock: 'politique' },
          { k: 'hidden', id: 'influence', d: 18 },
          { k: 'skill', id: 'rhetorique', d: 12 },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'title', add: 'porte-parole du quartier' },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'devint la voix de son quartier' } },
        ],
      )),
      opt('refuser', 'Refuser — ça n\'apporte que des ennuis', sure(
        () => 'Vous refusez. On prend quelqu\'un d\'autre, moins bon, et le quartier s\'en porte plus mal. Ça vous agace pendant dix ans.',
        [{ k: 'mood', d: -6 }],
      )),
    ],
  }),

  ev({
    id: 'adult.dilemme_loyaute',
    tags: ['social', 'trahison'],
    minAge: 18,
    maxAge: 70,
    weight: 8,
    cooldown: { years: 12, scope: 'character' },
    roles: {
      ami: pick.known({ minAffection: 35, minAge: 14 }),
      autorite: pick.generate({ minAge: 35, maxAge: 60, socialClass: 'aise', statMean: 55, bond: { type: 'rivalite', label: 'l\'officier' } }),
    },
    text: (c) =>
      `${n(c.role('autorite'))} sait que vous savez où est ${n(c.role('ami'))}. On ne vous menace pas ` +
      `— on vous explique calmement ce que vous gagnez à parler et ce que vous perdez à vous taire.`,
    options: [
      opt('taire', 'Vous taire', [
        out(byStat('volonte', 1.6), (c) => `Vous tenez. ${n(c.role('ami'))} le saura, un jour, par quelqu'un d'autre.`, [
          { k: 'health', d: -14 },
          { k: 'wealth', d: -300 },
          { k: 'rel', to: 'ami', from: 'ami', affection: 40, trust: 60, respect: 45 },
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'memory', text: 'Je n\'ai pas parlé. Ça a coûté ce que ça a coûté.', salience: 88, tags: ['loyaute'], actors: ['ami'] },
        ]),
        out(1.2, () => 'Vous tenez trois jours. Le quatrième, vous ne tenez plus. Ce que vous dites suffit.', [
          { k: 'health', d: -22 },
          { k: 'rel', to: 'ami', from: 'ami', type: 'haine', label: 'celui qui a parlé', affection: -70, trust: -90 },
          { k: 'trait', add: 'brise' },
          { k: 'chronicle', kind: 'trahison', importance: 4, actors: ['ami', 'subject'], data: { quoi: 'sous la contrainte' } },
        ]),
      ]),
      opt('parler', 'Parler', sure(
        (c) => `Vous parlez. On vous paie. ${n(c.role('ami'))} ne revient pas et tout le monde finit par savoir pourquoi.`,
        [
          { k: 'wealth', d: 800 },
          { k: 'rel', to: 'ami', from: 'ami', type: 'haine', label: 'le traître', affection: -90, trust: -100 },
          { k: 'trait', add: 'parjure' },
          { k: 'hidden', id: 'karma', d: -25 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'chronicle', kind: 'trahison', importance: 4, actors: ['ami', 'subject'], data: { quoi: 'contre paiement' } },
          { k: 'seed', eventId: 'seed.trahison.retrouvailles', min: 6, max: 22, actors: ['ami'], note: 'celui que vous avez livré' },
        ],
      ), { hint: 'irréversible' }),
      opt('prevenir', 'Prévenir votre ami et fuir avec lui', sure(
        () => 'Vous partez tous les deux, de nuit, sans rien. Vous recommencez ailleurs, plus pauvres et plus liés.',
        [
          { k: 'move', settlement: 'marches' },
          { k: 'wealth', d: -400 },
          { k: 'rel', to: 'ami', type: 'serment', label: 'compagnon de fuite', affection: 60, trust: 70, mutual: true },
          { k: 'trait', add: 'traque' },
        ],
      ), { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'adult.heritage_recu',
    tags: ['fortune', 'famille'],
    minAge: 18,
    maxAge: 70,
    weight: 5,
    once: 'life',
    roles: { defunt: pick.relative({ minAge: 45, alive: false }) },
    text: (c) =>
      `${n(c.role('defunt'))} est mort${e(c.role('defunt'))} sans que vous ayez eu le temps de régler ` +
      `ce qu'il y avait à régler. Il reste des affaires, une maison, et des dettes qu'on ne vous avait pas dites.`,
    options: [
      opt('accepter', 'Accepter l\'héritage, dettes comprises', sure(
        () => 'Vous prenez tout. Il faudra deux ans pour éponger, mais la maison est à vous.',
        [{ k: 'wealth', d: -400 }, { k: 'class', to: 'commun' }, { k: 'chronicle', kind: 'fortune', importance: 2, data: { quoi: 'reprit la maison et les dettes' } }],
      )),
      opt('refuser', 'Refuser', sure(
        () => 'Vous refusez. On vend tout aux enchères et vous regardez partir des objets que vous connaissiez par cœur.',
        [{ k: 'mood', d: -12 }, { k: 'wealth', d: 150 }],
      )),
    ],
  }),

  ev({
    id: 'adult.rival',
    tags: ['social', 'rivalite'],
    minAge: 20,
    maxAge: 70,
    weight: 8,
    cooldown: { years: 10, scope: 'character' },
    roles: {
      rival: pick.first(
        pick.known({ maxAffection: -15 }),
        pick.local({ minAge: 20 }),
        pick.generate({ minAge: 25, maxAge: 55, statMean: 55, bond: { type: 'rivalite', label: 'le rival' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('rival'))} monte plus vite que vous et le fait savoir. Vous vous retrouvez face à ` +
      `face plus souvent que le hasard ne l'expliquerait.`,
    options: [
      opt('surpasser', 'Travailler deux fois plus', [
        out(byStat('volonte', 1.5), () => 'Vous le dépassez. Ça vous a coûté cinq ans de sommeil et vous ne savez plus faire autrement.', [
          { k: 'wealth', d: 700 },
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'health', d: -8 },
          { k: 'rel', to: 'rival', from: 'rival', respect: 30, affection: -10 },
        ]),
        out(1.3, () => 'Vous vous épuisez et il monte quand même. Il y a des gens comme ça.', [
          { k: 'health', d: -14 },
          { k: 'mood', d: -14 },
        ]),
      ]),
      opt('allier', 'Lui proposer une alliance', [
        out(byStat('charisme', 1.3), (c) => `${n(c.role('rival'))} accepte. Vous êtes plus forts à deux et vous vous surveillez chaque jour.`, [
          { k: 'rel', to: 'rival', type: 'serment', label: 'l\'ancien rival', affection: 20, trust: 10, respect: 40, mutual: true },
          { k: 'wealth', d: 500 },
        ]),
        out(1.5, () => 'On refuse et on répète votre proposition partout. Vous passez pour faible.', [
          { k: 'stat', stat: 'charisme', d: -4 },
          { k: 'mood', d: -10 },
        ]),
      ]),
      opt('detruire', 'Le détruire', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 10, (c) => `Il tombe. Vous n'avez pas eu besoin de mentir, seulement de choisir les vérités.`, [
          { k: 'skill', id: 'intrigue', d: 14 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'rel', to: 'rival', from: 'rival', type: 'haine', label: 'celui qui m\'a détruit', affection: -90 },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'brisa son rival' } },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 5, max: 20, actors: ['rival'], note: 'celui que vous avez brisé' },
        ]),
        out(1.4, () => 'Ça se sait. On ne vous en veut pas d\'avoir essayé, on vous en veut d\'avoir raté.', [
          { k: 'stat', stat: 'charisme', d: -6 },
          { k: 'trait', add: 'notoire' },
          { k: 'hidden', id: 'corruption', d: 8 },
        ]),
      ], { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'adult.retour_lieu',
    tags: ['memoire', 'social'],
    minAge: 28,
    maxAge: 80,
    weight: 6,
    cooldown: { years: 15, scope: 'character' },
    text: (c) =>
      `Vous repassez par un endroit de votre enfance. C'est plus petit que dans votre souvenir. ` +
      `Tout est plus petit.`,
    options: [
      opt('rester', 'Rester un moment', sure(
        () => 'Vous restez jusqu\'à la nuit. Il ne se passe rien. C\'est exactement ce qu\'il fallait.',
        [{ k: 'mood', d: 12 }, { k: 'memory', text: 'Je suis retourné là-bas. C\'était plus petit.', salience: 55, tags: ['memoire'] }],
      )),
      opt('partir', 'Ne pas s\'arrêter', sure(
        () => 'Vous ne ralentissez même pas. Vous en êtes fier et vous ne savez pas pourquoi.',
        [{ k: 'stat', stat: 'volonte', d: 3 }, { k: 'mood', d: -4 }],
      )),
    ],
  }),

  ev({
    id: 'adult.eleve',
    tags: ['social', 'transmission'],
    minAge: 30,
    maxAge: 75,
    requires: (c) => Object.values(c.subject.skills).some((v) => v >= 45),
    weight: 7,
    cooldown: { years: 12, scope: 'character' },
    roles: {
      eleve: pick.first(
        pick.local({ minAge: 10, maxAge: 22 }),
        pick.generate({ minAge: 11, maxAge: 20, bond: { type: 'mentorat', label: 'l\'apprenti' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('eleve'))} vous suit partout et pose des questions que vous ne vous étiez plus posées ` +
      `depuis vingt ans.`,
    options: [
      opt('former', 'Le former vraiment', sure(
        (c) => `Vous transmettez tout. ${n(c.role('eleve'))} vous dépassera peut-être. C'est le but et c'est désagréable.`,
        [
          { k: 'rel', to: 'eleve', type: 'mentorat', label: 'mon apprenti', affection: 40, respect: 30, mutual: true },
          { k: 'hidden', id: 'influence', d: 10 },
          { k: 'skill', id: 'commandement', d: 8 },
          { k: 'seed', eventId: 'seed.eleve.retour', min: 12, max: 30, actors: ['eleve'], note: 'ce que votre élève deviendra' },
        ],
      )),
      opt('garder', 'Ne transmettre que le nécessaire', sure(
        () => 'Vous gardez l\'essentiel pour vous. C\'est prudent. Ça vous laisse seul avec votre savoir jusqu\'au bout.',
        [{ k: 'rel', to: 'eleve', from: 'eleve', affection: -15, respect: 10 }, { k: 'trait', add: 'solitaire' }],
      )),
      opt('chasser', 'Le renvoyer', sure(
        () => 'Vous le renvoyez. Il apprend ailleurs, moins bien, et il vous en veut longtemps.',
        [{ k: 'rel', to: 'eleve', from: 'eleve', type: 'rivalite', label: 'celui qui m\'a renvoyé', affection: -40 }],
      )),
    ],
  }),

  ev({
    id: 'adult.crise_foi',
    tags: ['foi', 'interieur'],
    minAge: 20,
    maxAge: 85,
    weight: 6,
    cooldown: { years: 18, scope: 'character' },
    text: () =>
      'Quelque chose que vous croyiez s\'est fissuré. Pas d\'un coup : par usure. Vous vous surprenez ' +
      'à répéter des mots auxquels vous ne croyez plus.',
    options: [
      opt('perdre', 'Laisser tomber', sure(
        () => 'Vous cessez de faire semblant. Le monde ne s\'écroule pas. C\'est presque décevant.',
        [{ k: 'trait', add: 'impie' }, { k: 'stat', stat: 'volonte', d: -3 }, { k: 'stat', stat: 'intelligence', d: 4 }],
      )),
      opt('renforcer', 'S\'y accrocher plus fort', sure(
        () => 'Vous priez davantage. Ça tient. La question revient chaque nuit et vous la faites taire chaque matin.',
        [{ k: 'trait', add: 'pieux' }, { k: 'stat', stat: 'volonte', d: 6 }, { k: 'hidden', id: 'folie', d: 4 }],
      )),
      opt('chercher', 'Chercher ailleurs', sure(
        () => 'Vous lisez, vous demandez, vous voyagez un peu. Vous ne trouvez pas de réponse mais vous trouvez de meilleures questions.',
        [{ k: 'stat', stat: 'intelligence', d: 6 }, { k: 'skill', id: 'lettres', d: 8 }, { k: 'hidden', id: 'destinee', d: 5 }],
      )),
    ],
  }),

  ev({
    id: 'adult.peste',
    tags: ['catastrophe', 'maladie'],
    minAge: 5,
    maxAge: 90,
    weight: 3.5,
    cooldown: { years: 30, scope: 'world' },
    text: () =>
      'La maladie entre dans la ville par les quais, comme toujours. En trois semaines, on cesse de ' +
      'compter. Les portes marquées à la craie se multiplient dans votre rue.',
    options: [
      opt('fuir', 'Partir tout de suite', sure(
        () => 'Vous partez avant la fermeture des portes. Vous survivez. Vous n\'êtes pas sûr d\'avoir bien fait.',
        [
          { k: 'move', settlement: 'orin' },
          { k: 'wealth', d: -300 },
          { k: 'hidden', id: 'karma', d: -5 },
          { k: 'chronicle', kind: 'note', importance: 3, data: { texte: 'La peste vint par les quais. Il partit avant qu\'on ferme les portes.' } },
        ],
      )),
      opt('rester', 'Rester et aider', [
        out(2, () => 'Vous portez de l\'eau, vous fermez des yeux. La maladie vous épargne, on ne saura jamais pourquoi.', [
          { k: 'health', d: -18 },
          { k: 'hidden', id: 'karma', d: 22 },
          { k: 'skill', id: 'soin', d: 14 },
          { k: 'trait', add: 'guerisseur' },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 'resta pendant la peste' } },
        ]),
        out(2, () => 'Vous la prenez. Trois semaines de noir. Vous en sortez, mais pas entier.', [
          { k: 'health', d: -35 },
          { k: 'trait', add: 'survivant' },
          { k: 'injure', label: 'des poumons qui sifflent depuis la peste', permanent: true, stat: 'endurance', penalty: 8 },
        ]),
      ]),
      opt('profiter', 'Acheter tout ce que les fuyards bradent', sure(
        () => 'Vous achetez pour rien ce qui vaudra cher dans deux ans. Personne ne vous le pardonnera, et vous serez riche.',
        [
          { k: 'wealth', d: 2500 },
          { k: 'hidden', id: 'karma', d: -20 },
          { k: 'hidden', id: 'corruption', d: 18 },
          { k: 'trait', add: 'notoire' },
          { k: 'health', d: -12 },
          { k: 'chronicle', kind: 'fortune', importance: 3, data: { quoi: 's\'enrichit sur la peste' } },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'adult.fonder_maison',
    tags: ['dynastie', 'ascension'],
    minAge: 25,
    maxAge: 75,
    requires: (c) =>
      !c.subject.houseId && c.subject.wealth >= 6000 && c.subject.childrenIds.length >= 1,
    weight: 14,
    text: (c) =>
      `Vous avez de quoi. Vous avez des enfants. Un notaire de Vardhèn peut enregistrer un nom, ` +
      `et à partir de là ce nom existe — pour les contrats, pour les mariages, pour l'Histoire.`,
    options: [
      opt('fonder', 'Fonder votre maison', sure(
        (c) => `C'est fait. Ce que vous êtes ne mourra plus tout à fait avec vous.`,
        [
          { k: 'foundHouse' },
          { k: 'wealth', d: -3000 },
          { k: 'hidden', id: 'influence', d: 20 },
          { k: 'title', add: 'chef de maison' },
        ],
      )),
      opt('attendre', 'Attendre d\'avoir davantage', sure(
        () => 'Vous attendez. Il y a toujours une bonne raison d\'attendre.',
        [{ k: 'hidden', id: 'ambition', d: 4 }],
      )),
    ],
  }),
];
