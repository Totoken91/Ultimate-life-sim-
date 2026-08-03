import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure } from './_helpers.js';

/**
 * Événements de graine (doc 04 §2) — `seedOnly: true` : jamais tirés au hasard.
 * Ils ne se déclenchent que parce que quelque chose a été fait, parfois trente
 * ans plus tôt. C'est ce système qui transforme une suite de menus en destin.
 */
export const SEED_EVENTS = [
  // ─── rancunes et dettes génériques ────────────────────────────────────────
  ev({
    id: 'seed.rancune.retour',
    seedOnly: true,
    tags: ['consequence', 'rancune'],
    weight: 1,
    roles: {
      ennemi: pick.first(
        pick.known({ maxAffection: -20 }),
        pick.generate({ minAge: 25, maxAge: 65, statMean: 55, bond: { type: 'haine', label: 'un vieux compte' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('ennemi'))} est revenu${e(c.role('ennemi'))} dans votre vie. Pas par hasard. ` +
      `Vous aviez fini par oublier ; ${e(c.role('ennemi')) === 'e' ? 'elle' : 'il'}, non.`,
    options: [
      opt('affronter', 'Régler ça une fois pour toutes', [
        out(byStat('volonte', 1.4), (c) => `Vous ne cédez rien. ${n(c.role('ennemi'))} recule, et cette fois pour de bon.`, [
          { k: 'rel', to: 'ennemi', from: 'ennemi', fear: 40, affection: -10 },
          { k: 'stat', stat: 'volonte', d: 5 },
          { k: 'health', d: -10 },
        ]),
        out(1.5, (c) => `${n(c.role('ennemi'))} a eu des années pour préparer ça. Vous, non.`, [
          { k: 'health', d: -25 },
          { k: 'wealth', d: -600 },
          { k: 'chronicle', kind: 'chute', importance: 3, actors: ['subject', 'ennemi'], data: { quoi: 'une vieille dette réglée à ses dépens' } },
        ]),
      ]),
      opt('payer', 'Payer ce qu\'il faut pour que ça s\'arrête', sure(
        (c) => `Vous payez. ${n(c.role('ennemi'))} s'en va. Vous ne saurez jamais si c'est fini.`,
        [{ k: 'wealth', d: -900 }, { k: 'rel', to: 'ennemi', from: 'ennemi', affection: 15 }],
      ), { requires: (c) => c.subject.wealth >= 900, lockedReason: 'il faudrait 900 sous' }),
      opt('excuser', 'Reconnaître ce que vous avez fait', [
        out(byStat('charisme', 1.5), (c) => `Vous reconnaissez tout. ${n(c.role('ennemi'))} ne s'y attendait pas. Ça ne devient pas de l'amitié, mais ça cesse d'être de la haine.`, [
          { k: 'rel', to: 'ennemi', from: 'ennemi', affection: 45, trust: 20 },
          { k: 'hidden', id: 'karma', d: 15 },
          { k: 'memory', text: 'J\'ai reconnu ce que j\'avais fait. Ça a suffi.', salience: 80, tags: ['paix'], actors: ['ennemi'] },
        ]),
        out(1.4, () => 'On vous écoute jusqu\'au bout, puis on vous frappe quand même. Vous l\'aviez peut-être mérité.', [
          { k: 'health', d: -18 },
          { k: 'hidden', id: 'karma', d: 8 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.dette.faveur',
    seedOnly: true,
    tags: ['consequence', 'dette'],
    weight: 1,
    roles: {
      oblige: pick.first(
        pick.known({ types: ['dette'] }),
        pick.known({ minAffection: 30 }),
        pick.generate({ minAge: 25, maxAge: 60, bond: { type: 'dette', label: 'celui qui vous doit' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('oblige'))} se présente chez vous. Ce que vous aviez fait il y a des années, ` +
      `${e(c.role('oblige')) === 'e' ? 'elle' : 'il'} ne l'a pas oublié — et ${e(c.role('oblige')) === 'e' ? 'elle' : 'il'} est en position de rendre.`,
    options: [
      opt('argent', 'Demander de l\'argent', sure(
        () => 'On paie sans discuter, et la dette est éteinte. Vous avez peut-être vendu trop bas.',
        [{ k: 'wealth', d: 1600 }, { k: 'rel', to: 'oblige', from: 'oblige', affection: -5 }],
      )),
      opt('place', 'Demander une place', sure(
        (c) => `${n(c.role('oblige'))} vous introduit là où vous n'auriez jamais pu entrer seul.`,
        [
          { k: 'hidden', id: 'influence', d: 18 },
          { k: 'class', to: 'commun' },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'entra par une porte qu\'on lui devait' } },
        ],
      )),
      opt('garder', 'Ne rien demander — garder la dette', sure(
        (c) => `Vous ne demandez rien. ${n(c.role('oblige'))} reste votre débiteur, et un débiteur vaut mieux qu'un paiement.`,
        [
          { k: 'rel', to: 'oblige', from: 'oblige', affection: 30, trust: 40 },
          { k: 'flag', name: 'faveur_en_reserve', value: true },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 6, max: 20, actors: ['oblige'], note: 'la faveur que vous gardez en réserve' },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.trahison.retrouvailles',
    seedOnly: true,
    tags: ['consequence', 'trahison'],
    weight: 1,
    roles: { traitre: pick.first(pick.known({ maxAffection: -30 }), pick.generate({ minAge: 30, maxAge: 65 })) },
    text: (c) =>
      `Vous retrouvez ${n(c.role('traitre'))}. Des années ont passé. ${e(c.role('traitre')) === 'e' ? 'Elle' : 'Il'} a vieilli, ` +
      `et ${e(c.role('traitre')) === 'e' ? 'elle' : 'il'} ne vous a pas vu entrer.`,
    options: [
      opt('vengeance', 'Prendre ce qui vous est dû', [
        out(byStat('force', 1.3), () => 'Vous prenez. Ce n\'est pas satisfaisant, contrairement à ce que vous imaginiez pendant toutes ces années.', [
          { k: 'wealth', d: 900 },
          { k: 'health', d: -12 },
          { k: 'hidden', id: 'karma', d: -8 },
          { k: 'mood', d: -6 },
          { k: 'chronicle', kind: 'violence', importance: 3, actors: ['subject', 'traitre'], data: { quoi: 'régla une vieille trahison' } },
        ]),
        out(1.3, () => 'On vous sépare avant que ça aille loin. Vous avez l\'air d\'un vieux fou et c\'est peut-être le cas.', [
          { k: 'stat', stat: 'charisme', d: -5 },
          { k: 'mood', d: -12 },
        ]),
      ]),
      opt('parler', 'Vous asseoir en face et demander pourquoi', sure(
        (c) => `${n(c.role('traitre'))} explique. L'explication est banale, presque pauvre. Vous aviez construit tellement plus autour.`,
        [
          { k: 'mood', d: 12 },
          { k: 'trait', remove: 'rancunier' },
          { k: 'memory', text: 'J\'ai enfin demandé pourquoi. La réponse était minuscule.', salience: 82, tags: ['paix'], actors: ['traitre'] },
        ],
      )),
      opt('partir', 'Sortir sans un mot', sure(
        () => 'Vous sortez. Vous ne saurez jamais. C\'est un choix et il vous appartient.',
        [{ k: 'stat', stat: 'volonte', d: 5 }],
      )),
    ],
  }),

  ev({
    id: 'seed.vendetta',
    seedOnly: true,
    tags: ['consequence', 'violence'],
    weight: 1,
    roles: {
      vengeur: pick.generate({ minAge: 18, maxAge: 45, statMean: 58, bond: { type: 'haine', label: 'le vengeur' } }),
    },
    text: (c) =>
      `${n(c.role('vengeur'))} vous cherche depuis des années. Un frère, un fils, un cousin de ` +
      `quelqu'un que vous avez fait tomber. ${e(c.role('vengeur')) === 'e' ? 'Elle' : 'Il'} vous a trouvé.`,
    options: [
      opt('combattre', 'Vous défendre', [
        out((c) => 0.9 + (c.subject.skills['lame'] ?? 0) / 14 + c.subject.stats.force / 55, () => 'Vous êtes plus vieux mais vous savez des choses qu\'il ignore. Il ne se relève pas.', [
          { k: 'kill', who: 'vengeur', cause: 'tué par celui qu\'il traquait' },
          { k: 'health', d: -22 },
          { k: 'hidden', id: 'karma', d: -6 },
          { k: 'seed', eventId: 'seed.vendetta', min: 8, max: 25, actors: [], note: 'la vendetta continue' },
        ]),
        out(1.8, () => 'Il est plus jeune, plus rapide, et il a passé dix ans à y penser.', [
          { k: 'health', d: -50 },
          { k: 'injure', label: 'un flanc qui ne guérira pas vraiment', permanent: true, stat: 'endurance', penalty: 10 },
        ]),
      ]),
      opt('fuir', 'Partir avant qu\'il n\'agisse', sure(
        () => 'Vous quittez tout dans la nuit. Vous recommencez ailleurs, plus vieux et plus pauvre.',
        [
          { k: 'move', settlement: 'kaleth' },
          { k: 'wealth', d: -1200 },
          { k: 'trait', add: 'traque' },
        ],
      )),
      opt('reconnaitre', 'Lui dire la vérité sur ce qui s\'est passé', [
        out(byStat('charisme', 1.4), (c) => `Vous racontez tout, sans rien arranger. ${n(c.role('vengeur'))} pleure et s'en va. La chaîne s'arrête là.`, [
          { k: 'rel', to: 'vengeur', from: 'vengeur', affection: 25, trust: 20 },
          { k: 'hidden', id: 'karma', d: 25 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: '{sujet} brisa une vendetta avec la vérité.' } },
        ]),
        out(1.5, () => 'Il écoute et il frappe quand même. Il avait besoin de le faire plus que de comprendre.', [
          { k: 'health', d: -35 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.justice.rattrape',
    seedOnly: true,
    tags: ['consequence', 'justice'],
    weight: 1,
    roles: { officier: pick.generate({ minAge: 32, maxAge: 58, socialClass: 'commun', statMean: 55, bond: { type: 'rivalite', label: 'l\'officier' } }) },
    text: (c) =>
      `${n(c.role('officier'))} a rouvert un dossier. Vieux, mal ficelé, mais votre nom est dedans ` +
      `et il a le temps.`,
    options: [
      opt('nier', 'Tout nier', [
        out(byStat('charisme', 1.3), () => 'Vous niez avec assez d\'aplomb. Le dossier retourne dans une caisse.', [
          { k: 'trait', remove: 'recherche' },
          { k: 'skill', id: 'rhetorique', d: 8 },
        ]),
        out(1.5, () => 'Il a un témoin. Vous ne saviez pas qu\'il y avait un témoin.', [
          { k: 'wealth', d: -1500 },
          { k: 'health', d: -15 },
          { k: 'trait', add: 'marque_infamie' },
          { k: 'chronicle', kind: 'chute', importance: 3, data: { quoi: 'un vieux crime rattrapé' } },
        ]),
      ]),
      opt('acheter', 'Acheter le dossier', sure(
        () => 'Le dossier disparaît. L\'officier ne disparaît pas, lui.',
        [
          { k: 'wealth', d: -2200 },
          { k: 'trait', remove: 'recherche' },
          { k: 'rel', to: 'officier', type: 'dette', label: 'l\'officier acheté', affection: 0, fear: 25, mutual: true },
          { k: 'seed', eventId: 'seed.corruption.chantage', min: 3, max: 12, actors: ['officier'], note: 'l\'officier que vous avez payé' },
        ],
      ), { requires: (c) => c.subject.wealth >= 2200, lockedReason: 'il faudrait 2 200 sous' }),
      opt('avouer', 'Avouer', sure(
        () => 'Vous avouez. La peine est plus légère que ce qu\'on vous promettait, et vous dormez mieux les années suivantes.',
        [
          { k: 'wealth', d: -700 },
          { k: 'health', d: -10 },
          { k: 'trait', remove: 'recherche' },
          { k: 'trait', add: 'marque_infamie' },
          { k: 'hidden', id: 'karma', d: 18 },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.corruption.chantage',
    seedOnly: true,
    tags: ['consequence', 'chantage'],
    weight: 1,
    roles: { maitre: pick.first(pick.known({ types: ['dette'] }), pick.generate({ minAge: 35, maxAge: 60, statMean: 58 })) },
    text: (c) =>
      `${n(c.role('maitre'))} vous rappelle qu'${e(c.role('maitre')) === 'e' ? 'elle' : 'il'} sait. ` +
      `Ce n'est plus une faveur : c'est un abonnement.`,
    options: [
      opt('ceder', 'Céder encore', sure(
        () => 'Vous cédez. Ce sera plus cher la prochaine fois. Ça l\'est toujours.',
        [
          { k: 'wealth', d: -1400 },
          { k: 'hidden', id: 'corruption', d: 10 },
          { k: 'mood', d: -10 },
          { k: 'seed', eventId: 'seed.corruption.chantage', min: 3, max: 9, actors: ['maitre'], note: 'le chantage continue' },
        ],
      )),
      opt('avouer', 'Tout révéler vous-même', sure(
        () => 'Vous prenez les devants. Ça coûte votre réputation et ça vous rend le sommeil.',
        [
          { k: 'stat', stat: 'charisme', d: -10 },
          { k: 'trait', add: 'notoire' },
          { k: 'hidden', id: 'karma', d: 20 },
          { k: 'rel', to: 'maitre', from: 'maitre', affection: -40 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: '{sujet} avoua avant qu\'on l\'y force.' } },
        ],
      )),
      opt('supprimer', 'Faire taire définitivement', [
        out((c) => 0.9 + (c.subject.skills['intrigue'] ?? 0) / 14, (c) => `${n(c.role('maitre'))} meurt d'une chute d'escalier. Personne ne pose de question. Vous, si, chaque nuit.`, [
          { k: 'kill', who: 'maitre', cause: 'd\'une chute d\'escalier très opportune' },
          { k: 'hidden', id: 'corruption', d: 25 },
          { k: 'hidden', id: 'karma', d: -30 },
          { k: 'trait', add: 'hante' },
          { k: 'memory', text: 'L\'escalier. Ce n\'était pas une chute.', salience: 98, tags: ['secret', 'meurtre'], actors: ['maitre'] },
        ]),
        out(1.6, () => 'Il avait prévu ça. La lettre part chez le magistrat le jour même.', [
          { k: 'trait', add: 'recherche' },
          { k: 'wealth', d: -1000 },
          { k: 'seed', eventId: 'seed.justice.rattrape', min: 1, max: 4, actors: [], note: 'la lettre partie chez le magistrat' },
        ]),
      ], { hint: 'irréversible' }),
    ],
  }),

  ev({
    id: 'seed.secret.leve',
    seedOnly: true,
    tags: ['consequence', 'secret'],
    weight: 1,
    roles: { concerne: pick.first(pick.known({}), pick.generate({ minAge: 25, maxAge: 60 })) },
    text: (c) =>
      `Le secret que vous gardiez sur ${n(c.role('concerne'))} est sorti — pas par vous, mais tout le ` +
      `monde croira que c'est par vous.`,
    options: [
      opt('assumer', 'Laisser croire', sure(
        (c) => `Vous ne démentez pas. ${n(c.role('concerne'))} vous tient pour responsable jusqu'à la fin de ses jours.`,
        [
          { k: 'rel', to: 'concerne', from: 'concerne', type: 'haine', label: 'celui qui a parlé', affection: -70 },
          { k: 'hidden', id: 'influence', d: 8 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 4, max: 15, actors: ['concerne'], note: 'le secret éventé' },
        ],
      )),
      opt('trouver', 'Trouver qui a parlé', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 12, (c) => `Vous remontez la fuite et vous le prouvez. ${n(c.role('concerne'))} vous doit désormais bien plus qu'un silence.`, [
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'rel', to: 'concerne', from: 'concerne', type: 'dette', label: 'celui qui m\'a lavé', affection: 45, trust: 50 },
        ]),
        out(1.4, () => 'Vous ne trouvez rien et vous avez fouillé partout. Maintenant tout le monde est certain que c\'était vous.', [
          { k: 'stat', stat: 'charisme', d: -8 },
          { k: 'trait', add: 'notoire' },
        ]),
      ]),
    ],
  }),

  // ─── graines de naissance ─────────────────────────────────────────────────
  ev({
    id: 'seed.truth.origine',
    seedOnly: true,
    tags: ['revelation', 'origine'],
    weight: 1,
    roles: {
      messager: pick.generate({ minAge: 45, maxAge: 75, statMean: 52, bond: { type: 'amitie', label: 'l\'inconnu du quai' } }),
    },
    text: (c) =>
      `${n(c.role('messager'))} vous aborde sur le quai. « Je t'ai posé là. J'avais mes raisons. ` +
      `Tu veux les entendre ou tu veux que je m'en aille ? »`,
    options: [
      opt('ecouter', 'Écouter', sure(
        () => 'Vous écoutez tout. Ce n\'est ni beau ni excusable, mais ça a un sens, et un sens vaut mieux que rien du tout.',
        [
          { k: 'hidden', id: 'destinee', d: 10 },
          { k: 'trait', remove: 'orphelin' },
          { k: 'mood', d: 20 },
          { k: 'rel', to: 'messager', type: 'sang', label: 'celui qui m\'a posé là', affection: 10, mutual: true },
          { k: 'memory', text: 'J\'ai su pourquoi on m\'avait laissé dans la caisse.', salience: 100, tags: ['origine', 'revelation'], actors: ['messager'] },
          { k: 'chronicle', kind: 'revelation', importance: 5, data: { quoi: 'qui l\'avait abandonné' } },
        ],
      )),
      opt('frapper', 'Ne pas écouter', sure(
        (c) => `Vous ${e(c.role('messager')) === 'e' ? 'la' : 'le'} laissez sur le quai. Vous ne saurez jamais. Vous y penserez chaque année.`,
        [
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'trait', add: 'rancunier' },
          { k: 'memory', text: 'On est venu me dire pourquoi. J\'ai refusé d\'entendre.', salience: 95, tags: ['origine'], actors: ['messager'] },
        ],
      ), { hint: 'irréversible' }),
    ],
  }),

  ev({
    id: 'seed.truth.lignee',
    seedOnly: true,
    tags: ['revelation', 'dynastie'],
    weight: 1,
    roles: { temoin: pick.first(pick.parent(), pick.known({ minAge: 40 }), pick.generate({ minAge: 55, maxAge: 80 })) },
    text: (c) =>
      `${n(c.role('temoin'))} pose l'anneau sur la table. « Ce n'est pas un souvenir. C'est un sceau. ` +
      `Il y a un nom dessus et c'est le tien. »`,
    options: [
      opt('revendiquer', 'Le prendre et faire valoir ce nom', [
        out(byStat('charisme', 1.4), () => 'Trois notaires, deux ans, et une reconnaissance qui vaut plus que de l\'or. Vous n\'êtes plus qui vous étiez ce matin.', [
          { k: 'class', to: 'noble' },
          { k: 'wealth', d: 8000 },
          { k: 'hidden', id: 'influence', d: 30 },
          { k: 'foundHouse' },
          { k: 'chronicle', kind: 'ascension', importance: 5, data: { quoi: 'fit reconnaître une lignée qu\'on croyait éteinte' } },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 3, max: 12, actors: [], note: 'ceux que votre nom dérange' },
        ]),
        out(1.5, () => 'On vous rit au nez pendant deux ans, puis on cesse de rire, puis on cesse de vous répondre. Vous vous ruinez en démarches.', [
          { k: 'wealth', d: -1500 },
          { k: 'trait', add: 'obstine' },
          { k: 'hidden', id: 'ambition', d: 15 },
        ]),
      ], { hint: 'lent' }),
      opt('vendre', 'Le vendre', sure(
        () => 'Un collectionneur de Kaleth paie très cher. Vous êtes riche pour deux ans et vous n\'êtes plus personne pour toujours.',
        [{ k: 'wealth', d: 5000 }, { k: 'hidden', id: 'destinee', d: -25 }],
      ), { hint: 'irréversible' }),
      opt('garder', 'Le garder sans rien faire', sure(
        () => 'Vous le gardez. Vous le regardez parfois. Vos enfants le trouveront après votre mort et se poseront des questions.',
        [
          { k: 'flag', name: 'sceau_lignee', value: true },
          { k: 'seed', eventId: 'seed.truth.lignee', min: 10, max: 25, actors: [], note: 'le sceau attend encore' },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.prophetie.revelation',
    seedOnly: true,
    tags: ['revelation', 'destin'],
    weight: 1,
    roles: { prophete: pick.first(pick.known({ minAge: 60 }), pick.generate({ minAge: 68, maxAge: 88 })) },
    text: (c) =>
      `${n(c.role('prophete'))} est mourant${e(c.role('prophete'))} et vous fait appeler. ` +
      `« La troisième phrase. Ta mère n'a jamais voulu te la dire. Moi je vais mourir, alors. »`,
    options: [
      opt('entendre', 'Entendre la troisième phrase', [
        out(2, () => 'Il la dit. Ce n\'est pas une promesse de gloire. C\'est un avertissement, et il vous concerne.', [
          { k: 'hidden', id: 'destinee', d: 20 },
          { k: 'hidden', id: 'folie', d: 10 },
          { k: 'stat', stat: 'volonte', d: 8 },
          { k: 'flag', name: 'prophetie_connue', value: true },
          { k: 'memory', text: 'La troisième phrase. Je la répète chaque nuit.', salience: 100, tags: ['prophetie'] },
          { k: 'chronicle', kind: 'note', importance: 5, data: { texte: '{sujet} entendit la fin de sa prophétie.' } },
        ]),
        out(1.2, () => 'Il ouvre la bouche et meurt. Il n\'y a jamais eu de troisième phrase, ou bien il y en a une et vous ne la connaîtrez pas.', [
          { k: 'kill', who: 'prophete', cause: 'sans avoir fini sa phrase' },
          { k: 'hidden', id: 'folie', d: 15 },
          { k: 'trait', add: 'hante' },
        ]),
      ]),
      opt('refuser', 'Refuser d\'entendre', sure(
        () => 'Vous sortez de la chambre. Vous décidez ce que vous serez sans qu\'on vous le dise. C\'est peut-être le plus courageux.',
        [
          { k: 'stat', stat: 'volonte', d: 12 },
          { k: 'hidden', id: 'destinee', d: -10 },
          { k: 'trait', add: 'obstine' },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.esclave.affranchissement',
    seedOnly: true,
    tags: ['revelation', 'servitude'],
    weight: 1,
    roles: { maitre: pick.first(pick.known({ types: ['serment'] }), pick.generate({ minAge: 45, maxAge: 70, socialClass: 'aise' })) },
    text: (c) =>
      `${n(c.role('maitre'))} vieillit et fait ses comptes. Il vous propose l'affranchissement contre ` +
      `une somme que vous ne possédez pas, ou contre douze ans de plus.`,
    options: [
      opt('payer', 'Payer', sure(
        () => 'Vous payez. Le papier est signé. Vous sortez par la porte de devant pour la première fois de votre vie.',
        [
          { k: 'wealth', d: -1200 },
          { k: 'class', to: 'pauvre' },
          { k: 'trait', add: 'affranchi' },
          { k: 'chronicle', kind: 'ascension', importance: 5, data: { quoi: 'racheta sa propre liberté' } },
        ],
      ), { requires: (c) => c.subject.wealth >= 1200, lockedReason: 'il faudrait 1 200 sous' }),
      opt('servir', 'Servir douze ans de plus', sure(
        () => 'Douze ans. Vous sortez libre, vieux, et vous connaissez la maison mieux que ses propriétaires.',
        [
          { k: 'class', to: 'pauvre' },
          { k: 'trait', add: 'affranchi' },
          { k: 'trait', add: 'endurci' },
          { k: 'health', d: -15 },
          { k: 'skill', id: 'intrigue', d: 15 },
          { k: 'hidden', id: 'influence', d: 10 },
        ],
      ), { hint: 'lent' }),
      opt('fuir', 'Fuir cette nuit', [
        out(byStat('agilite', 1.4), () => 'Vous passez le mur et vous ne vous retournez pas. On vous cherche trois mois puis on renonce.', [
          { k: 'class', to: 'miserable' },
          { k: 'move', settlement: 'basvardhen' },
          { k: 'trait', add: 'affranchi' },
          { k: 'trait', add: 'traque' },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 's\'enfuit de la maison qui le possédait' } },
        ]),
        out(1.5, () => 'On vous rattrape avant l\'aube. Ce qui suit vous marque au fer et vous ne réessaierez pas.', [
          { k: 'trait', add: 'marque_infamie' },
          { k: 'health', d: -28 },
          { k: 'rel', to: 'maitre', from: 'maitre', fear: 40, affection: -30 },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'seed.difforme.presage',
    seedOnly: true,
    tags: ['revelation', 'mystere'],
    weight: 1,
    roles: { vieille: pick.generate({ minAge: 60, maxAge: 85, sex: 'f', statMean: 52, bond: { type: 'mentorat', label: 'la vieille des collines' } }) },
    text: (c) =>
      `${n(c.role('vieille'))} vous arrête sur la route et regarde votre marque sans gêne. ` +
      `« On en a tué trois comme toi dans cette vallée. Les trois avaient raison. »`,
    options: [
      opt('suivre', 'La suivre', sure(
        () => 'Vous passez un hiver chez elle. Vous apprenez des choses qui ne s\'écrivent pas et qui ne s\'expliquent pas.',
        [
          { k: 'hidden', id: 'destinee', d: 22 },
          { k: 'skill', id: 'soin', d: 15 },
          { k: 'trait', add: 'guerisseur' },
          { k: 'trait', add: 'notoire' },
          { k: 'rel', to: 'vieille', type: 'mentorat', label: 'la vieille des collines', affection: 35, respect: 50, mutual: true },
        ],
      )),
      opt('refuser', 'Continuer votre route', sure(
        () => 'Vous continuez. Vous repensez à ses mots trop souvent pour quelqu\'un qui n\'y croit pas.',
        [{ k: 'hidden', id: 'folie', d: 6 }, { k: 'stat', stat: 'volonte', d: 4 }],
      )),
    ],
  }),

  ev({
    id: 'seed.vengeance.marches',
    seedOnly: true,
    tags: ['revelation', 'vengeance'],
    weight: 1,
    roles: { responsable: pick.generate({ minAge: 45, maxAge: 70, socialClass: 'noble', statMean: 58, bond: { type: 'haine', label: 'celui qui a donné l\'ordre' } }) },
    text: (c) =>
      `Vous apprenez un nom : ${n(c.role('responsable'))}. C'est lui qui a donné l'ordre, la nuit où ` +
      `les Marches ont brûlé. Il vit à trois jours de route et il ne se cache pas.`,
    options: [
      opt('tuer', 'Y aller', [
        out((c) => 0.8 + (c.subject.skills['lame'] ?? 0) / 12 + c.subject.stats.volonte / 60, () => 'Vous y allez. C\'est fait. Vous vous attendiez à ressentir quelque chose et il n\'y a rien du tout.', [
          { k: 'kill', who: 'responsable', cause: 'égorgé pour une nuit d\'incendie' },
          { k: 'trait', add: 'traque' },
          { k: 'hidden', id: 'karma', d: -10 },
          { k: 'mood', d: -10 },
          { k: 'chronicle', kind: 'violence', importance: 5, data: { quoi: 'vengea les Marches Grises' } },
          { k: 'seed', eventId: 'seed.vendetta', min: 5, max: 18, actors: [], note: 'la maison de celui que vous avez tué' },
        ]),
        out(1.6, () => 'Il a des gardes. Vous n\'aviez pas pensé aux gardes.', [
          { k: 'health', d: -40 },
          { k: 'trait', add: 'recherche' },
        ]),
      ], { hint: 'irréversible' }),
      opt('denoncer', 'Le faire savoir partout', [
        out(byStat('charisme', 1.4), () => 'Vous parlez, vous écrivez, vous payez pour qu\'on répète. En six ans, il perd tout, légalement.', [
          { k: 'hidden', id: 'influence', d: 20 },
          { k: 'skill', id: 'rhetorique', d: 12 },
          { k: 'wealth', d: -800 },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 'ruina publiquement le brûleur des Marches' } },
        ]),
        out(1.4, () => 'On vous fait taire par des voies légales, ce qui est plus humiliant qu\'un coup de couteau.', [
          { k: 'wealth', d: -900 },
          { k: 'mood', d: -18 },
        ]),
      ], { hint: 'lent' }),
      opt('laisser', 'Laisser tomber', sure(
        () => 'Vous n\'y allez pas. Ce n\'est pas de la lâcheté : c\'est un calcul, et le calcul vous laisse en vie.',
        [{ k: 'trait', remove: 'rancunier' }, { k: 'mood', d: 10 }, { k: 'stat', stat: 'volonte', d: 3 }],
      )),
    ],
  }),

  ev({
    id: 'seed.truth.fuite',
    seedOnly: true,
    tags: ['revelation', 'famille'],
    weight: 1,
    roles: { pere: pick.first(pick.parent(), pick.relative({ minAge: 40 }), pick.generate({ minAge: 50, maxAge: 75 })) },
    text: (c) =>
      `${n(c.role('pere'))} vous dit enfin pourquoi vous avez quitté les Marches. Ce n'est pas ce ` +
      `que vous imaginiez, et c'est bien pire.`,
    options: [
      opt('pardonner', 'Écouter jusqu\'au bout et rester', sure(
        (c) => `Vous restez assis. À la fin, vous ne dites rien, mais vous ne partez pas. ${n(c.role('pere'))} pleure pour la première fois de sa vie devant vous.`,
        [
          { k: 'rel', to: 'pere', affection: 25, trust: 20, mutual: true },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'memory', text: 'La nuit où il m\'a tout dit. Je suis resté.', salience: 95, tags: ['famille', 'revelation'], actors: ['pere'] },
        ],
      )),
      opt('rompre', 'Sortir et ne plus revenir', sure(
        (c) => `Vous sortez. ${n(c.role('pere'))} meurt quelques années plus tard sans que vous ayez repassé la porte.`,
        [
          { k: 'rel', to: 'pere', type: 'haine', label: 'ce qu\'il a fait', affection: -60 },
          { k: 'trait', add: 'solitaire' },
          { k: 'mood', d: -15 },
        ],
      ), { hint: 'irréversible' }),
      opt('utiliser', 'Vous en servir', sure(
        (c) => `Vous notez tout. Un jour, ce que vous savez sur ${n(c.role('pere'))} vaudra quelque chose. Ce jour arrive plus vite que prévu.`,
        [
          { k: 'flag', name: 'secret_familial', value: true },
          { k: 'skill', id: 'intrigue', d: 10 },
          { k: 'hidden', id: 'corruption', d: 12 },
          { k: 'seed', eventId: 'seed.corruption.chantage', min: 4, max: 14, actors: ['pere'], note: 'ce que vous savez sur votre père' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'seed.dette.recouvrement',
    seedOnly: true,
    tags: ['consequence', 'dette'],
    weight: 1,
    roles: { creancier: pick.first(pick.known({ types: ['dette'] }), pick.generate({ minAge: 40, maxAge: 65, socialClass: 'aise' })) },
    text: (c) =>
      `${n(c.role('creancier'))} vient réclamer. Il a un registre, deux hommes, et le droit pour lui.`,
    options: [
      opt('payer', 'Payer', sure(
        () => 'Vous payez tout. Le registre se referme. Vous n\'avez plus rien mais vous ne devez plus rien.',
        [{ k: 'wealth', d: -1400 }, { k: 'mood', d: 10 }],
      ), { requires: (c) => c.subject.wealth >= 1400, lockedReason: 'vous n\'avez pas la somme' }),
      opt('travailler', 'Proposer votre travail', sure(
        (c) => `${n(c.role('creancier'))} accepte. Six ans de votre vie, et il le sait très bien.`,
        [
          { k: 'wealth', d: 200 },
          { k: 'health', d: -12 },
          { k: 'rel', to: 'creancier', type: 'dette', label: 'le créancier', fear: 30, mutual: true },
          { k: 'skill', id: 'negoce', d: 8 },
        ],
      )),
      opt('resister', 'Refuser', [
        out(byStat('force', 1.2), () => 'Vous mettez un des hommes à terre. On s\'en va. On revient toujours, dans ce métier.', [
          { k: 'health', d: -16 },
          { k: 'rel', to: 'creancier', from: 'creancier', type: 'haine', label: 'le mauvais payeur', affection: -50 },
          { k: 'seed', eventId: 'seed.dette.recouvrement', min: 2, max: 6, actors: ['creancier'], note: 'la dette n\'est pas éteinte' },
        ]),
        out(1.8, () => 'On vous casse une jambe dans les règles de l\'art, sans excès, comme un métier.', [
          { k: 'health', d: -25 },
          { k: 'injure', label: 'une jambe mal ressoudée', permanent: true, stat: 'agilite', penalty: 10 },
          { k: 'seed', eventId: 'seed.dette.recouvrement', min: 2, max: 5, actors: ['creancier'], note: 'la dette court toujours' },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'seed.heritage.moulin',
    seedOnly: true,
    tags: ['consequence', 'famille', 'heritage'],
    weight: 1,
    roles: { frere: pick.first(pick.relative({ types: ['sang'] }), pick.generate({ minAge: 18, maxAge: 40 })) },
    text: (c) =>
      `Le moulin est à donner et il n'y a qu'une place. ${n(c.role('frere'))} et vous êtes dans la ` +
      `même pièce et personne ne parle.`,
    options: [
      opt('prendre', 'Le réclamer', [
        out(byStat('volonte', 1.3), (c) => `On vous le donne. ${n(c.role('frere'))} part de la vallée dans le mois et ne vous écrit jamais.`, [
          { k: 'wealth', d: 2200 },
          { k: 'class', to: 'commun' },
          { k: 'rel', to: 'frere', from: 'frere', type: 'haine', label: 'celui qui a pris le moulin', affection: -65 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 8, max: 25, actors: ['frere'], note: 'le moulin que vous avez pris' },
        ]),
        out(1.4, (c) => `On le donne à ${n(c.role('frere'))}. On vous explique que c'est l'usage. L'usage a bon dos.`, [
          { k: 'mood', d: -16 },
          { k: 'hidden', id: 'ambition', d: 12 },
        ]),
      ]),
      opt('ceder', 'Le lui laisser', sure(
        (c) => `Vous cédez sans rien demander. ${n(c.role('frere'))} ne l'oubliera pas, et vous non plus.`,
        [
          { k: 'rel', to: 'frere', from: 'frere', type: 'dette', label: 'celui qui m\'a laissé le moulin', affection: 50, trust: 45 },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 8, max: 22, actors: ['frere'], note: 'le moulin que vous avez cédé' },
        ],
      )),
      opt('vendre', 'Proposer de le vendre et partager', [
        out(byStat('charisme', 1.3), () => 'On vend. Vous partagez. Personne ne se parle plus mais personne ne se hait.', [
          { k: 'wealth', d: 1100 },
          { k: 'skill', id: 'negoce', d: 8 },
        ]),
        out(1.5, () => 'La famille refuse en bloc. On vous regarde comme si vous aviez proposé de vendre un parent.', [
          { k: 'rel', to: 'frere', from: 'frere', affection: -30 },
          { k: 'stat', stat: 'charisme', d: -3 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.mer.tempete',
    seedOnly: true,
    tags: ['consequence', 'mer', 'deuil'],
    weight: 1,
    roles: { marin: pick.first(pick.parent(), pick.relative({}), pick.known({ minAffection: 20 })) },
    text: (c) =>
      `La tempête a duré deux jours. Au troisième matin, les barques rentrent. Celle de ` +
      `${n(c.role('marin'))} n'est pas là.`,
    options: [
      opt('chercher', 'Sortir le chercher', [
        out(2, (c) => `Vous le trouvez accroché à une vergue, à demi mort de froid. Il ne vous remerciera jamais assez et n'essaiera même pas.`, [
          { k: 'health', d: -15 },
          { k: 'rel', to: 'marin', from: 'marin', type: 'dette', label: 'celui qui est venu me chercher', affection: 65, trust: 60 },
          { k: 'trait', add: 'courageux' },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'sortit en pleine tempête et ramena quelqu\'un' } },
        ]),
        out(2, (c) => `Vous cherchez trois jours. Vous ne trouvez qu'une planche avec la marque de la barque.`, [
          { k: 'kill', who: 'marin', cause: 'emporté par la tempête' },
          { k: 'trait', add: 'endeuille' },
          { k: 'health', d: -12 },
          { k: 'memory', text: 'Trois jours en mer. Une planche, rien d\'autre.', salience: 96, tags: ['deuil', 'mer'], actors: ['marin'] },
        ]),
      ], { hint: 'risqué' }),
      opt('attendre', 'Attendre sur le quai', sure(
        (c) => `Vous attendez jusqu'à la nuit du quatrième jour. Puis vous rentrez, parce qu'il faut bien rentrer.`,
        [
          { k: 'kill', who: 'marin', cause: 'emporté par la tempête' },
          { k: 'trait', add: 'endeuille' },
          { k: 'mood', d: -25 },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.rivalite.fratrie',
    seedOnly: true,
    tags: ['consequence', 'famille', 'rivalite'],
    weight: 1,
    roles: { aine: pick.first(pick.relative({ types: ['sang'] }), pick.generate({ minAge: 18, maxAge: 45 })) },
    text: (c) =>
      `${n(c.role('aine'))} a ce que vous n'aurez pas. Ce n'est même pas de sa faute et c'est ` +
      `précisément ce qui rend la chose insupportable.`,
    options: [
      opt('surpasser', 'Construire quelque chose de plus grand ailleurs', sure(
        () => 'Vous partez et vous bâtissez. Ça prend vingt ans. Ça vaut le coup.',
        [
          { k: 'hidden', id: 'ambition', d: 20 },
          { k: 'stat', stat: 'volonte', d: 8 },
          { k: 'wealth', d: 600 },
          { k: 'rel', to: 'aine', respect: 10, affection: -10 },
        ],
      )),
      opt('detruire', 'Le faire tomber', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 12, (c) => `${n(c.role('aine'))} tombe. Votre famille se doute de quelque chose sans pouvoir le prouver. On vous parle moins.`, [
          { k: 'rel', to: 'aine', from: 'aine', type: 'haine', label: 'celui qui m\'a fait tomber', affection: -85 },
          { k: 'hidden', id: 'corruption', d: 20 },
          { k: 'wealth', d: 1200 },
          { k: 'chronicle', kind: 'trahison', importance: 4, actors: ['aine', 'subject'], data: { quoi: 'entre frères' } },
        ]),
        out(1.5, () => 'Ça se retourne complètement. On vous chasse de la famille et on ne reprend jamais contact.', [
          { k: 'trait', add: 'exile' },
          { k: 'wealth', d: -800 },
          { k: 'move', settlement: 'basvardhen' },
        ]),
      ], { hint: 'cruel' }),
      opt('reconcilier', 'Lui parler franchement', [
        out(byStat('charisme', 1.4), (c) => `${n(c.role('aine'))} ne savait pas. Ça ne règle rien de matériel et ça règle tout le reste.`, [
          { k: 'rel', to: 'aine', affection: 45, trust: 40, mutual: true },
          { k: 'mood', d: 18 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 6, max: 20, actors: ['aine'], note: 'votre aîné vous doit quelque chose' },
        ]),
        out(1.3, () => 'On vous écoute avec une condescendance parfaite. C\'est la dernière fois que vous essayez.', [
          { k: 'rel', to: 'aine', affection: -35 },
          { k: 'trait', add: 'rancunier' },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.commerce.sabotage',
    seedOnly: true,
    tags: ['consequence', 'commerce'],
    weight: 1,
    roles: { rival: pick.first(pick.known({ maxAffection: -10 }), pick.generate({ minAge: 40, maxAge: 65, socialClass: 'aise' })) },
    text: (c) =>
      `Deux navires perdus en un an, ce n'est plus de la malchance. ${n(c.role('rival'))} a racheté ` +
      `les créances de votre famille et attend tranquillement.`,
    options: [
      opt('riposter', 'Riposter par les mêmes moyens', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 12, () => 'Un incendie de comptoir, deux capitaines débauchés. Il recule. La guerre s\'arrête faute de combattants.', [
          { k: 'skill', id: 'intrigue', d: 14 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'wealth', d: 2000 },
          { k: 'rel', to: 'rival', from: 'rival', fear: 40, affection: -40 },
        ]),
        out(1.5, () => 'Il avait prévu la riposte. Vous perdez le reste de la flotte en dix-huit mois.', [
          { k: 'wealth', d: -6000 },
          { k: 'class', to: 'commun' },
          { k: 'chronicle', kind: 'ruine', importance: 4, data: { quoi: 'perdit la flotte familiale' } },
        ]),
      ], { hint: 'risqué' }),
      opt('vendre', 'Vendre pendant qu\'il y a encore un prix', sure(
        () => 'Vous vendez tout. Vous êtes riche, sans navire, et libre — ce qui n\'est pas rien.',
        [
          { k: 'wealth', d: 9000 },
          { k: 'job', id: null },
          { k: 'chronicle', kind: 'fortune', importance: 3, data: { quoi: 'vendit la flotte avant l\'effondrement' } },
        ],
      )),
      opt('allier', 'Lui proposer une fusion', [
        out(byStat('charisme', 1.5), () => 'Il accepte parce que c\'est plus rentable que de vous écraser. Vous devenez son associé minoritaire et son problème permanent.', [
          { k: 'wealth', d: 3500 },
          { k: 'rel', to: 'rival', type: 'serment', label: 'l\'associé qui voulait me ruiner', affection: -10, respect: 40, mutual: true },
          { k: 'skill', id: 'negoce', d: 15 },
        ]),
        out(1.4, () => 'Il refuse en riant. Il n\'a aucune raison d\'accepter et il vous le fait remarquer.', [
          { k: 'mood', d: -14 },
          { k: 'wealth', d: -1500 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.complot.oncle',
    seedOnly: true,
    tags: ['consequence', 'complot', 'politique'],
    weight: 1,
    roles: { oncle: pick.first(pick.relative({ maxAffection: 0 }), pick.known({ maxAffection: -20 }), pick.generate({ minAge: 40, maxAge: 65, socialClass: 'royal' })) },
    text: (c) =>
      `Votre goûteur est mort dans la nuit. Personne ne prononce le nom de ${n(c.role('oncle'))}, ` +
      `et c'est bien pour ça que tout le monde y pense.`,
    options: [
      opt('frapper', 'Frapper le premier', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 10 + c.subject.stats.volonte / 60, (c) => `${n(c.role('oncle'))} est arrêté avant l'aube et exécuté avant midi. On vous regarde autrement à partir de ce jour.`, [
          { k: 'kill', who: 'oncle', cause: 'exécuté pour trahison' },
          { k: 'hidden', id: 'influence', d: 25 },
          { k: 'hidden', id: 'corruption', d: 15 },
          { k: 'trait', add: 'notoire' },
          { k: 'chronicle', kind: 'violence', importance: 5, data: { quoi: 'fit exécuter son oncle' } },
          { k: 'seed', eventId: 'seed.vendetta', min: 6, max: 20, actors: [], note: 'les fils de votre oncle' },
        ]),
        out(1.6, () => 'Vous accusez sans preuve. La cour se retourne contre vous et vous perdez la moitié de vos appuis.', [
          { k: 'hidden', id: 'influence', d: -20 },
          { k: 'wealth', d: -4000 },
          { k: 'seed', eventId: 'seed.complot.oncle', min: 2, max: 6, actors: ['oncle'], note: 'votre oncle n\'a pas renoncé' },
        ]),
      ], { hint: 'irréversible' }),
      opt('preuve', 'Réunir des preuves d\'abord', [
        out((c) => 1 + (c.subject.skills['intrigue'] ?? 0) / 9, (c) => `Deux ans de patience. Quand vous frappez, tout est en ordre et personne ne conteste.`, [
          { k: 'kill', who: 'oncle', cause: 'jugé et pendu, pièces à l\'appui' },
          { k: 'skill', id: 'intrigue', d: 18 },
          { k: 'hidden', id: 'influence', d: 30 },
          { k: 'chronicle', kind: 'ascension', importance: 5, data: { quoi: 'démonta un complot familial pièce par pièce' } },
        ]),
        out(1.7, () => 'Vous mettez trop de temps. La deuxième tentative ne rate pas.', [
          { k: 'health', d: -45 },
          { k: 'injure', label: 'un poison qui n\'a pas fini son travail', permanent: true, stat: 'endurance', penalty: 12 },
        ]),
      ], { hint: 'lent' }),
      opt('partir', 'Renoncer à tout et disparaître', sure(
        () => 'Vous partez, sans titre, sans nom, avec ce que vous pouvez porter. Vous vivez. C\'est un choix que peu de gens comprendraient.',
        [
          { k: 'class', to: 'commun' },
          { k: 'move', settlement: 'orin' },
          { k: 'wealth', d: -20000 },
          { k: 'trait', add: 'exile' },
          { k: 'chronicle', kind: 'chute', importance: 4, data: { quoi: 'abandonna son rang pour rester en vie' } },
        ],
      ), { hint: 'irréversible' }),
    ],
  }),

  // ─── graines posées par le jeu lui-même ───────────────────────────────────
  ev({
    id: 'seed.objet.revelation',
    seedOnly: true,
    tags: ['mystere', 'revelation'],
    weight: 1,
    text: () =>
      'Vous comprenez enfin. Ce que l\'inconnu vous a laissé ouvre quelque chose — une trappe, ' +
      'une caisse, un compte chez un changeur mort depuis vingt ans.',
    options: [
      opt('ouvrir', 'Ouvrir', [
        out(2, () => 'De l\'argent. Beaucoup. Et un papier qui explique de qui il vient et pourquoi il vous revient.', [
          { k: 'wealth', d: 4500 },
          { k: 'hidden', id: 'destinee', d: 15 },
          { k: 'chronicle', kind: 'fortune', importance: 4, data: { quoi: 'trouva ce que l\'inconnu lui avait laissé' } },
        ]),
        out(1.4, () => 'Des lettres. Rien que des lettres, de quelqu\'un que vous n\'avez jamais connu, qui parlait de vous.', [
          { k: 'hidden', id: 'destinee', d: 22 },
          { k: 'mood', d: 20 },
          { k: 'memory', text: 'Les lettres. Quelqu\'un a pensé à moi pendant quarante ans.', salience: 95, tags: ['revelation'] },
        ]),
        out(1, () => 'Un nom, une adresse à Kaleth, et une phrase : « ne viens que si tu es prêt ».', [
          { k: 'hidden', id: 'destinee', d: 12 },
          { k: 'seed', eventId: 'seed.objet.revelation', min: 5, max: 15, actors: [], note: 'l\'adresse à Kaleth' },
        ]),
      ]),
      opt('ignorer', 'Ne pas ouvrir', sure(
        () => 'Vous décidez de ne pas savoir. Il y a une paix là-dedans, et une lâcheté aussi.',
        [{ k: 'hidden', id: 'destinee', d: -10 }, { k: 'mood', d: 5 }],
      )),
    ],
  }),

  ev({
    id: 'seed.vieille.legs',
    seedOnly: true,
    tags: ['consequence', 'bonte'],
    weight: 1,
    roles: { vieille: pick.first(pick.known({ minAge: 55 }), pick.generate({ minAge: 65, maxAge: 85, sex: 'f' })) },
    text: (c) =>
      `${n(c.role('vieille'))} est morte cette semaine. Un clerc vous cherche depuis deux jours : ` +
      `elle avait laissé un papier, et votre nom est dessus.`,
    options: [
      opt('accepter', 'Accepter', sure(
        () => 'Une maison d\'une pièce, des économies de quarante ans, et une lettre de six lignes. Vous relisez les six lignes plus souvent que vous ne comptez l\'argent.',
        [
          { k: 'wealth', d: 1300 },
          { k: 'class', to: 'pauvre' },
          { k: 'mood', d: 20 },
          { k: 'memory', text: 'Elle m\'a tout laissé. Six lignes.', salience: 90, tags: ['bonte'], actors: ['vieille'] },
          { k: 'chronicle', kind: 'fortune', importance: 3, data: { quoi: 'hérita de la vieille de la fontaine' } },
        ],
      )),
      opt('refuser', 'Refuser — sa famille en a plus besoin', sure(
        () => 'Vous refusez. Sa famille de Kaleth prend tout et ne vous remercie pas. Vous ne le regrettez pas.',
        [{ k: 'hidden', id: 'karma', d: 20 }, { k: 'trait', add: 'genereux' }],
      )),
    ],
  }),

  ev({
    id: 'seed.bande.dette',
    seedOnly: true,
    tags: ['consequence', 'crime'],
    weight: 1,
    roles: { chef: pick.first(pick.known({ types: ['serment'] }), pick.generate({ minAge: 28, maxAge: 50, statMean: 56 })) },
    text: (c) =>
      `${n(c.role('chef'))} vous demande de faire quelque chose que vous ne voulez pas faire. ` +
      `Ce n'est pas une proposition : c'est ce que vous devez pour être entré.`,
    options: [
      opt('faire', 'Le faire', sure(
        () => 'Vous le faites. Vous êtes des leurs pour de bon. Il y a une nuit dont vous ne parlerez à personne.',
        [
          { k: 'wealth', d: 900 },
          { k: 'hidden', id: 'corruption', d: 20 },
          { k: 'hidden', id: 'karma', d: -18 },
          { k: 'rel', to: 'chef', from: 'chef', affection: 30, trust: 45 },
          { k: 'trait', add: 'endurci' },
          { k: 'memory', text: 'Ce qu\'on m\'a demandé de faire pour être des leurs.', salience: 92, tags: ['secret', 'crime'], actors: ['chef'] },
        ],
      )),
      opt('refuser', 'Refuser', [
        out(byStat('volonte', 1.3), (c) => `Vous refusez et vous tenez le regard. ${n(c.role('chef'))} vous laisse partir. On ne saura jamais pourquoi.`, [
          { k: 'rel', to: 'chef', from: 'chef', affection: -30, respect: 35 },
          { k: 'stat', stat: 'volonte', d: 8 },
          { k: 'hidden', id: 'karma', d: 12 },
        ]),
        out(1.6, () => 'On ne refuse pas. On vous le fait comprendre pendant une heure, dans une cave.', [
          { k: 'health', d: -30 },
          { k: 'injure', label: 'une mâchoire qui craque quand vous mangez', permanent: true, stat: 'charisme', penalty: 4 },
          { k: 'trait', add: 'traque' },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.serment.epreuve',
    seedOnly: true,
    tags: ['consequence', 'serment'],
    weight: 1,
    roles: { jure: pick.first(pick.known({ types: ['serment'] }), pick.known({ minAffection: 30 }), pick.generate({ minAge: 25, maxAge: 55 })) },
    text: (c) =>
      `${n(c.role('jure'))} vient réclamer le serment. Ce qu'${e(c.role('jure')) === 'e' ? 'elle' : 'il'} demande ` +
      `vous coûtera tout ce que vous avez construit depuis.`,
    options: [
      opt('tenir', 'Tenir parole', sure(
        (c) => `Vous tenez. Vous perdez ce que vous perdez. ${n(c.role('jure'))} sait ce que ça vous a coûté, et personne d'autre ne le saura jamais.`,
        [
          { k: 'wealth', d: -3000 },
          { k: 'rel', to: 'jure', from: 'jure', affection: 60, trust: 90, respect: 70 },
          { k: 'stat', stat: 'volonte', d: 10 },
          { k: 'hidden', id: 'karma', d: 25 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: 'Il tint un serment qui lui coûta tout.' } },
        ],
      )),
      opt('rompre', 'Rompre le serment', sure(
        (c) => `Vous rompez. ${n(c.role('jure'))} ne crie pas, ne menace pas. ${e(c.role('jure')) === 'e' ? 'Elle' : 'Il'} vous regarde et s'en va, et c'est pire que tout.`,
        [
          { k: 'trait', add: 'parjure' },
          { k: 'rel', to: 'jure', from: 'jure', type: 'haine', label: 'le parjure', affection: -95, trust: -100 },
          { k: 'hidden', id: 'karma', d: -25 },
          { k: 'stat', stat: 'charisme', d: -8 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 5, max: 18, actors: ['jure'], note: 'le serment que vous avez rompu' },
        ],
      ), { hint: 'irréversible' }),
    ],
  }),

  ev({
    id: 'seed.eleve.retour',
    seedOnly: true,
    tags: ['consequence', 'transmission'],
    weight: 1,
    roles: { eleve: pick.first(pick.known({ types: ['mentorat'] }), pick.generate({ minAge: 28, maxAge: 50, statMean: 58 })) },
    text: (c) =>
      `${n(c.role('eleve'))} revient. ${e(c.role('eleve')) === 'e' ? 'Elle' : 'Il'} a réussi — mieux que vous, ` +
      `plus vite que vous, avec ce que vous ${e(c.role('eleve')) === 'e' ? 'lui' : 'lui'} avez appris.`,
    options: [
      opt('fier', 'En être fier, sans réserve', sure(
        () => 'Vous le dites et vous le pensez. C\'est plus difficile que ça n\'en a l\'air et ça vous grandit.',
        [
          { k: 'rel', to: 'eleve', affection: 45, respect: 40, mutual: true },
          { k: 'mood', d: 22 },
          { k: 'hidden', id: 'influence', d: 12 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 3, max: 12, actors: ['eleve'], note: 'ce que votre élève vous doit' },
        ],
      )),
      opt('jaloux', 'Lui rappeler d\'où ça vient', sure(
        (c) => `Vous le lui rappelez une fois de trop. ${n(c.role('eleve'))} paie sa dette et cesse de venir.`,
        [
          { k: 'wealth', d: 800 },
          { k: 'rel', to: 'eleve', from: 'eleve', affection: -40, respect: -30 },
          { k: 'mood', d: -12 },
        ],
      )),
      opt('demander', 'Lui demander une place', sure(
        (c) => `${n(c.role('eleve'))} vous prend chez ${e(c.role('eleve')) === 'e' ? 'elle' : 'lui'}. Le renversement est complet et vous vous y faites plus vite que prévu.`,
        [
          { k: 'wealth', d: 1600 },
          { k: 'class', to: 'aise' },
          { k: 'rel', to: 'eleve', respect: 30, mutual: true },
        ],
      )),
    ],
  }),

  ev({
    id: 'seed.enfant.rival',
    seedOnly: true,
    tags: ['consequence', 'famille', 'rivalite'],
    weight: 1,
    roles: { enfant: pick.first(pick.child({}), pick.relative({ minAge: 15 }), pick.generate({ minAge: 20, maxAge: 40 })) },
    text: (c) =>
      `${n(c.role('enfant'))} n'est plus un enfant. ${e(c.role('enfant')) === 'e' ? 'Elle' : 'Il'} a des appuis, ` +
      `de l'argent, et une raison de vous en vouloir que vous connaissez très bien.`,
    options: [
      opt('ceder', 'Lui céder ce qu\'il réclame', sure(
        (c) => `Vous cédez. ${n(c.role('enfant'))} prend et vous laisse en paix. Ce n'est pas une réconciliation, c'est une reddition, et vous êtes fatigué.`,
        [
          { k: 'wealth', d: -2500 },
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 15, respect: -20 },
          { k: 'mood', d: -8 },
        ],
      )),
      opt('combattre', 'Vous défendre', [
        out(byStat('volonte', 1.3), (c) => `Vous tenez bon. ${n(c.role('enfant'))} recule et ne vous parle plus pendant douze ans.`, [
          { k: 'rel', to: 'enfant', from: 'enfant', type: 'haine', label: 'mon propre sang', affection: -70, fear: 25 },
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'mood', d: -18 },
        ]),
        out(1.6, (c) => `${n(c.role('enfant'))} gagne. Vous perdez la maison, la place, et le reste. On vous laisse une chambre.`, [
          { k: 'wealth', d: -6000 },
          { k: 'class', to: 'pauvre' },
          { k: 'trait', add: 'brise' },
          { k: 'chronicle', kind: 'chute', importance: 5, actors: ['subject', 'enfant'], data: { quoi: 'dépouillé par son propre enfant' } },
        ]),
      ]),
      opt('parler', 'Reconnaître ce que vous avez fait', [
        out(byStat('charisme', 1.3), (c) => `Vous reconnaissez tout, sans excuse. ${n(c.role('enfant'))} pleure, ce qu'${e(c.role('enfant')) === 'e' ? 'elle' : 'il'} n'avait pas fait depuis l'enfance.`, [
          { k: 'rel', to: 'enfant', affection: 50, trust: 40, mutual: true },
          { k: 'hidden', id: 'karma', d: 20 },
          { k: 'mood', d: 25 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: 'Le père et l\'enfant se parlèrent enfin, trop tard et pas trop tard.' } },
        ]),
        out(1.4, () => 'Vous parlez. On vous écoute. Rien ne change. Certaines choses ne se réparent pas.', [
          { k: 'mood', d: -14 },
          { k: 'hidden', id: 'karma', d: 8 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'seed.succession.jalousie',
    seedOnly: true,
    tags: ['consequence', 'famille', 'heritage'],
    weight: 1,
    roles: { lese: pick.first(pick.child({ minAge: 14 }), pick.relative({ minAge: 16 }), pick.generate({ minAge: 20, maxAge: 45 })) },
    text: (c) =>
      `${n(c.role('lese'))} a compris ce que le testament dit. ${e(c.role('lese')) === 'e' ? 'Elle' : 'Il'} ne crie pas. ` +
      `${e(c.role('lese')) === 'e' ? 'Elle' : 'Il'} vous demande, très calmement, de vous expliquer.`,
    options: [
      opt('expliquer', 'Expliquer honnêtement', [
        out(byStat('charisme', 1.4), () => 'Vous expliquez. Ça n\'efface pas l\'injustice mais ça l\'éclaire, et l\'injustice éclairée se supporte mieux.', [
          { k: 'rel', to: 'lese', from: 'lese', affection: 20, respect: 30 },
          { k: 'hidden', id: 'karma', d: 8 },
        ]),
        out(1.4, () => 'Votre explication ne tient pas debout et vous vous en apercevez en la donnant.', [
          { k: 'rel', to: 'lese', from: 'lese', type: 'rivalite', label: 'le lésé', affection: -45 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 3, max: 12, actors: ['lese'], note: 'celui que le testament a lésé' },
        ]),
      ]),
      opt('modifier', 'Modifier le testament', sure(
        (c) => `Vous rééquilibrez. ${n(c.role('lese'))} est apaisé${e(c.role('lese'))} ; quelqu'un d'autre ne l'est plus.`,
        [
          { k: 'rel', to: 'lese', from: 'lese', affection: 40, trust: 30 },
          { k: 'seed', eventId: 'seed.succession.jalousie', min: 2, max: 8, actors: [], note: 'le testament remanié' },
        ],
      )),
      opt('refuser', 'Refuser de vous justifier', sure(
        () => 'Vous ne vous justifiez pas. C\'est votre droit. C\'est aussi la dernière conversation que vous aurez.',
        [
          { k: 'rel', to: 'lese', from: 'lese', type: 'haine', label: 'celui qui n\'a rien expliqué', affection: -60 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 2, max: 10, actors: ['lese'], note: 'le silence du testament' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'seed.batard.reclamation',
    seedOnly: true,
    tags: ['consequence', 'famille', 'secret'],
    weight: 1,
    roles: { enfant: pick.generate({ minAge: 16, maxAge: 35, statMean: 55, bond: { type: 'sang', label: 'l\'enfant qu\'on avait caché' } }) },
    text: (c) =>
      `${n(c.role('enfant'))} se présente à votre porte avec un visage que vous reconnaissez trop bien. ` +
      `${e(c.role('enfant')) === 'e' ? 'Elle' : 'Il'} ne demande pas d'argent. ${e(c.role('enfant')) === 'e' ? 'Elle' : 'Il'} demande un nom.`,
    options: [
      opt('reconnaitre', 'Le reconnaître devant tout le monde', sure(
        (c) => `Vous le reconnaissez. Votre foyer encaisse mal. ${n(c.role('enfant'))} a un nom pour la première fois de sa vie.`,
        [
          { k: 'rel', to: 'enfant', type: 'sang', label: 'mon enfant', affection: 35, mutual: true },
          { k: 'hidden', id: 'karma', d: 20 },
          { k: 'stat', stat: 'charisme', d: -5 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: '{sujet} reconnut publiquement un enfant caché.' } },
        ],
      ), { hint: 'irréversible' }),
      opt('payer', 'L\'acheter une dernière fois', sure(
        (c) => `${n(c.role('enfant'))} prend l'argent parce qu'${e(c.role('enfant')) === 'e' ? 'elle' : 'il'} en a besoin, et vous regarde d'une façon que vous n'oublierez pas.`,
        [
          { k: 'wealth', d: -2000 },
          { k: 'rel', to: 'enfant', from: 'enfant', type: 'haine', label: 'celui qui a payé au lieu de nommer', affection: -70 },
          { k: 'hidden', id: 'karma', d: -15 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 5, max: 18, actors: ['enfant'], note: 'l\'enfant que vous avez payé' },
        ],
      )),
      opt('chasser', 'Le chasser', sure(
        () => 'Vous fermez la porte. Vous entendez les pas s\'éloigner. Vous les entendrez longtemps.',
        [
          { k: 'rel', to: 'enfant', from: 'enfant', type: 'haine', label: 'celui qui a fermé la porte', affection: -95 },
          { k: 'hidden', id: 'karma', d: -25 },
          { k: 'trait', add: 'hante' },
          { k: 'seed', eventId: 'seed.vendetta', min: 6, max: 20, actors: ['enfant'], note: 'l\'enfant que vous avez chassé' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),
];
