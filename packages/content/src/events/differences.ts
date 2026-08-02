import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure, trait } from './_helpers.js';

/**
 * Événements des naissances difficiles (doc 09 §5bis).
 *
 * Règle d'écriture : ce qui coûte n'est jamais la condition, c'est le regard.
 * Chaque trait ouvre une porte que personne d'autre n'a — et en ferme une autre
 * que tout le monde franchit sans y penser.
 */
export const DIFFERENCE_EVENTS = [
  // ─── l'esprit à part ──────────────────────────────────────────────────────
  ev({
    id: 'diff.motif',
    tags: ['difference', 'savoir'],
    minAge: 6,
    requires: (c) => trait(c, 'esprit_a_part'),
    weight: 14,
    cooldown: { years: 6, scope: 'character' },
    text: () =>
      'Vous avez vu quelque chose. Pas deviné : vu. Les mêmes sacs, les mêmes jours, le même ' +
      'homme qui détourne les yeux au même moment. Personne d\'autre ne l\'a remarqué parce que ' +
      'personne d\'autre ne regarde les choses, seulement les gens.',
    options: [
      opt('dire', 'Le dire à quelqu\'un', [
        out(byStat('charisme', 1.2), () => 'On vous écoute jusqu\'au bout, cette fois. Vous aviez raison, et on vous doit quelque chose.', [
          { k: 'hidden', id: 'influence', d: 10 },
          { k: 'wealth', d: 250 },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'memory', text: 'J\'ai dit ce que j\'avais vu. Cette fois, on m\'a cru.', salience: 75, tags: ['reconnaissance'] },
        ]),
        out(1.8, () => 'On vous coupe à la troisième phrase. « Il recommence. » Vous aviez raison et ça ne change rien.', [
          { k: 'mood', d: -14 },
          { k: 'stat', stat: 'volonte', d: 4 },
          { k: 'memory', text: 'J\'avais raison. Personne n\'a écouté jusqu\'au bout.', salience: 80, tags: ['humiliation'] },
        ]),
      ]),
      opt('garder', 'Le garder pour vous et continuer d\'observer', sure(
        () => 'Vous notez. Vous notez tout. Un jour, ce que vous savez vaudra plus que ce que les autres croient savoir.',
        [
          { k: 'skill', id: 'intrigue', d: 12 },
          { k: 'stat', stat: 'intelligence', d: 3 },
          { k: 'flag', name: 'observateur', value: true },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 6, max: 20, actors: [], note: 'ce que vous avez vu et gardé' },
        ],
      )),
      opt('vendre', 'Le vendre à qui saura s\'en servir', [
        out(2, () => 'On paie sans discuter, ce qui vous apprend que vous auriez pu demander plus.', [
          { k: 'wealth', d: 600 },
          { k: 'skill', id: 'negoce', d: 6 },
          { k: 'hidden', id: 'corruption', d: 6 },
        ]),
        out(1.2, () => 'L\'acheteur s\'en sert, et quelqu\'un finit dans le canal. Vous refaites le lien tout seul, six mois plus tard.', [
          { k: 'wealth', d: 600 },
          { k: 'hidden', id: 'karma', d: -12 },
          { k: 'trait', add: 'hante' },
        ]),
      ], { hint: 'risqué' }),
    ],
  }),

  ev({
    id: 'diff.foule',
    tags: ['difference', 'corps'],
    minAge: 4,
    requires: (c) => trait(c, 'esprit_a_part'),
    weight: 11,
    cooldown: { years: 5, scope: 'character' },
    text: () =>
      'Le marché, un jour de fête. Trop de voix, trop de mains, une cloche quelque part et ' +
      'l\'odeur du poisson. Ça monte, ça monte, et il n\'y a nulle part où aller.',
    options: [
      opt('tenir', 'Tenir jusqu\'au bout', sure(
        () => 'Vous tenez. Vous vomissez dans une ruelle après, seul. Personne ne saura ce que ça a coûté.',
        [{ k: 'stat', stat: 'volonte', d: 6 }, { k: 'health', d: -8 }, { k: 'mood', d: -12 }],
      )),
      opt('fuir', 'Partir tout de suite, sans expliquer', sure(
        () => 'Vous partez au milieu d\'une phrase. On en parle pendant trois semaines. Vous, vous respirez.',
        [{ k: 'mood', d: 8 }, { k: 'stat', stat: 'charisme', d: -3 }, { k: 'trait', add: 'solitaire' }],
      )),
      opt('routine', 'Vous fabriquer une façon de traverser ça', sure(
        () => 'Compter les pavés. Toujours le même chemin, toujours à la même heure. Ça marche, et vous ne le direz à personne.',
        [
          { k: 'stat', stat: 'volonte', d: 4 },
          { k: 'mood', d: 6 },
          { k: 'flag', name: 'rituel', value: true },
          { k: 'memory', text: 'Compter les pavés. C\'est comme ça que je passe.', salience: 55, tags: ['refuge'] },
        ],
      )),
    ],
  }),

  // ─── celui qui entend ─────────────────────────────────────────────────────
  ev({
    id: 'diff.voix_juste',
    tags: ['difference', 'mystere'],
    minAge: 7,
    requires: (c) => trait(c, 'voix'),
    weight: 13,
    cooldown: { years: 7, scope: 'character' },
    text: () =>
      'La voix a dit de ne pas y aller. Elle dit beaucoup de choses et elle a tort la plupart ' +
      'du temps. Mais elle l\'a dit avant, et deux hommes attendaient au bout du chemin.',
    options: [
      opt('ecouter', 'L\'écouter, désormais', sure(
        () => 'Vous obéissez. Elle a raison une fois sur quatre, ce qui est énorme et ingérable.',
        [
          { k: 'hidden', id: 'destinee', d: 14 },
          { k: 'hidden', id: 'folie', d: 10 },
          { k: 'stat', stat: 'volonte', d: -4 },
          { k: 'flag', name: 'obeit_aux_voix', value: true },
        ],
      )),
      opt('resister', 'Refuser de lui obéir, quoi qu\'elle dise', sure(
        () => 'Vous décidez seul, toujours. C\'est épuisant et c\'est la seule chose qui vous appartienne.',
        [
          { k: 'stat', stat: 'volonte', d: 10 },
          { k: 'hidden', id: 'folie', d: -8 },
          { k: 'trait', add: 'obstine' },
        ],
      )),
      opt('parler', 'En parler à quelqu\'un', [
        out(2, (c) => `On vous écoute avec une prudence nouvelle. À Kaleth, on aurait appelé ça un don.`, [
          { k: 'trait', add: 'notoire' },
          { k: 'hidden', id: 'destinee', d: 10 },
          { k: 'skill', id: 'rhetorique', d: 6 },
        ]),
        out(2, () => 'Le mot fait le tour du bourg en deux jours. On ne vous parle plus pareil. On ne vous parle plus beaucoup.', [
          { k: 'stat', stat: 'charisme', d: -8 },
          { k: 'trait', add: 'notoire' },
          { k: 'mood', d: -14 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 3, max: 14, actors: [], note: 'ceux qui vous croient possédé' },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'diff.voix_accusation',
    tags: ['difference', 'violence'],
    minAge: 10,
    requires: (c) => trait(c, 'voix') || trait(c, 'marque'),
    weight: 9,
    cooldown: { years: 12, scope: 'character' },
    roles: {
      accusateur: pick.first(
        pick.local({ minAge: 20 }),
        pick.generate({ minAge: 30, maxAge: 60, bond: { type: 'rivalite', label: 'l\'accusateur' } }),
      ),
    },
    text: (c) =>
      `Une bête est morte, un enfant est tombé malade, et ${n(c.role('accusateur'))} a prononcé ` +
      `votre nom devant douze personnes. Personne ne dit non. Personne ne dit oui non plus.`,
    options: [
      opt('nier', 'Nier, calmement, devant tout le monde', [
        out(byStat('volonte', 1.4), (c) => `Vous ne tremblez pas. C'est ça qui les arrête — pas vos mots, votre calme.`, [
          { k: 'stat', stat: 'volonte', d: 8 },
          { k: 'rel', to: 'accusateur', from: 'accusateur', affection: -30, fear: 30 },
          { k: 'memory', text: 'Douze personnes, et je n\'ai pas tremblé.', salience: 88, tags: ['epreuve'] },
        ]),
        out(1.6, () => 'On vous chasse du bourg avant la nuit. Vous emportez ce que vous portez.', [
          { k: 'trait', add: 'exile' },
          { k: 'move', settlement: 'marches' },
          { k: 'wealth', d: -200 },
          { k: 'chronicle', kind: 'chute', importance: 4, data: { quoi: 'fut chassé pour ce qu\'il entendait' } },
        ]),
      ]),
      opt('assumer', 'Dire que oui, vous entendez — et que ça vient d\'ailleurs', [
        out((c) => 1 + c.subject.hidden.destinee / 40, () => 'Un desservant de passage vous emmène. On ne vous chasse pas : on vous étudie, et c\'est presque pire, et c\'est une porte.', [
          { k: 'move', settlement: 'kaleth' },
          { k: 'path', unlock: 'mystique' },
          { k: 'trait', add: 'pieux' },
          { k: 'hidden', id: 'destinee', d: 20 },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: 'fut emmené à Kaleth pour ce qu\'il entendait' } },
        ]),
        out(1.7, () => 'On vous attache trois jours dans la grange. Le quatrième, la vieille du gué vous détache sans un mot.', [
          { k: 'health', d: -22 },
          { k: 'trait', add: 'endurci' },
          { k: 'hidden', id: 'folie', d: 12 },
        ]),
      ], { hint: 'risqué' }),
      opt('accuser', 'Retourner l\'accusation contre lui', [
        out(byStat('charisme', 1.3), (c) => `Vous rappelez à voix haute ce que ${n(c.role('accusateur'))} devait au meunier. La foule change de cible en une phrase.`, [
          { k: 'rel', to: 'accusateur', from: 'accusateur', type: 'haine', label: 'celui qui a retourné la foule', affection: -70 },
          { k: 'skill', id: 'rhetorique', d: 12 },
          { k: 'hidden', id: 'corruption', d: 8 },
          { k: 'seed', eventId: 'seed.vendetta', min: 4, max: 16, actors: ['accusateur'], note: 'celui que vous avez livré à la foule' },
        ]),
        out(1.5, () => 'Ça ne prend pas. Vous avez l\'air de ce qu\'ils disaient que vous étiez.', [
          { k: 'stat', stat: 'charisme', d: -8 },
          { k: 'trait', add: 'notoire' },
          { k: 'mood', d: -16 },
        ]),
      ], { hint: 'cruel' }),
    ],
  }),

  // ─── l'esprit lent ────────────────────────────────────────────────────────
  ev({
    id: 'diff.sous_estime',
    tags: ['difference', 'social'],
    minAge: 10,
    requires: (c) => trait(c, 'simple'),
    weight: 12,
    cooldown: { years: 8, scope: 'character' },
    roles: {
      bavard: pick.first(
        pick.known({ minAge: 16 }),
        pick.local({ minAge: 18 }),
        pick.generate({ minAge: 22, maxAge: 55 }),
      ),
    },
    text: (c) =>
      `${n(c.role('bavard'))} parle devant vous comme si vous n'étiez pas là. Les gens font ça ` +
      `depuis toujours. Ce qu'${e(c.role('bavard')) === 'e' ? 'elle' : 'il'} vient de dire, ` +
      `${e(c.role('bavard')) === 'e' ? 'elle' : 'il'} ne l'aurait dit à personne d'autre.`,
    options: [
      opt('retenir', 'Ne rien montrer et tout retenir', sure(
        () => 'Vous ne comprenez pas tout. Vous retenez tout. La différence vous servira longtemps.',
        [
          { k: 'skill', id: 'intrigue', d: 10 },
          { k: 'flag', name: 'secret_detenu', value: true },
          { k: 'seed', eventId: 'seed.secret.leve', min: 5, max: 18, actors: ['bavard'], note: 'ce qu\'on a dit devant vous' },
        ],
      )),
      opt('prevenir', 'Prévenir celui que ça concerne', sure(
        (c) => `Vous y allez, avec vos mots à vous. On met du temps à comprendre, puis on comprend, et on ne vous regarde plus pareil.`,
        [
          { k: 'hidden', id: 'karma', d: 14 },
          { k: 'rel', to: 'bavard', from: 'bavard', affection: -35, fear: 15 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 4, max: 15, actors: [], note: 'celui que vous avez prévenu' },
        ],
      )),
      opt('rien', 'Laisser passer', sure(
        () => 'Vous laissez passer. C\'est ce que vous faites toujours, et c\'est peut-être pour ça qu\'on parle devant vous.',
        [{ k: 'mood', d: -5 }],
      )),
    ],
  }),

  // ─── mutilé ───────────────────────────────────────────────────────────────
  ev({
    id: 'diff.manchot_travail',
    tags: ['difference', 'travail'],
    minAge: 11,
    requires: (c) => trait(c, 'manchot') || trait(c, 'boiteux') || trait(c, 'aveugle'),
    weight: 12,
    cooldown: { years: 9, scope: 'character' },
    text: () =>
      'On vous a refusé une place, encore. Pas méchamment — on vous a expliqué, avec des ' +
      'regrets sincères, pourquoi ce n\'était pas possible. C\'est la quatrième fois cette saison.',
    options: [
      opt('insister', 'Insister jusqu\'à ce qu\'on cède', [
        out(byStat('volonte', 1.5), () => 'Vous revenez chaque matin pendant cinq semaines. Le sixième lundi, on vous met à l\'essai pour avoir la paix. Vous ne repartez plus.', [
          { k: 'stat', stat: 'volonte', d: 8 },
          { k: 'trait', add: 'obstine' },
          { k: 'wealth', d: 200 },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'obtint par l\'usure une place qu\'on lui refusait' } },
        ]),
        out(1.6, () => 'Au bout de cinq semaines, on vous fait chasser. Toute la rue a regardé.', [
          { k: 'mood', d: -18 },
          { k: 'trait', add: 'rancunier' },
        ]),
      ]),
      opt('contourner', 'Trouver ce que vous faites mieux qu\'eux', sure(
        () => 'Vous cherchez le métier qui n\'a pas besoin de ce qui vous manque. Vous le trouvez. Personne ne vous l\'a montré.',
        [
          { k: 'skill', id: 'calcul', d: 10 },
          { k: 'skill', id: 'negoce', d: 8 },
          { k: 'stat', stat: 'intelligence', d: 4 },
          { k: 'wealth', d: 150 },
        ],
      )),
      opt('rancune', 'Retenir chaque nom', sure(
        () => 'Vous notez chaque visage et chaque phrase polie. Un jour, certains auront besoin de vous.',
        [
          { k: 'trait', add: 'rancunier' },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 10, max: 28, actors: [], note: 'ceux qui vous ont fermé la porte' },
        ],
      )),
    ],
  }),
];
