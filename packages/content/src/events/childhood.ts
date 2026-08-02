import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure, trait } from './_helpers.js';

/**
 * Enfance : 0-12 ans.
 *
 * ADR-013 : on ne l'expédie pas en quatre clics. C'est ici que se fabriquent
 * les traits, les rancunes et les vérités cachées — la meilleure matière
 * narrative du jeu.
 */
export const CHILDHOOD_EVENTS = [
  ev({
    id: 'child.premier_vol',
    tags: ['enfance', 'crime'],
    minAge: 5,
    maxAge: 12,
    weight: (c) => (c.subject.wealth < 300 ? 14 : 5),
    once: 'life',
    roles: {
      victime: pick.first(
        pick.known({ minAge: 25, maxAge: 70 }),
        pick.local({ minAge: 25, maxAge: 70 }),
        pick.generate({ minAge: 30, maxAge: 60, bond: { type: 'amitie', label: 'l\'artisan' } }),
      ),
    },
    text: (c) =>
      `L'étal de ${n(c.role('victime'))} est sans surveillance. Il y a de quoi manger deux jours, ` +
      `et personne ne regarde de votre côté. Vous avez ${c.age} ans et vous savez déjà que ` +
      `ces moments-là ne durent pas.`,
    options: [
      opt('prendre', 'Prendre et courir', [
        out(byStat('agilite', 2.2), (c) => `Vous êtes loin avant que ${n(c.role('victime'))} lève les yeux. Ce soir-là, vous mangez.`, [
          { k: 'wealth', d: 30 },
          { k: 'skill', id: 'vol', d: 6 },
          { k: 'trait', add: 'voleur' },
          { k: 'memory', text: 'Mon premier vol. Personne ne m\'a vu. C\'était facile.', salience: 60, tags: ['vol', 'origine'], actors: ['victime'] },
        ]),
        out(1, (c) => `Une main vous attrape le poignet. ${n(c.role('victime'))} ne crie pas — c'est pire. ${c.role('victime').sex === 'f' ? 'Elle' : 'Il'} vous regarde longtemps, puis vous laisse partir sans le pain.`, [
          { k: 'rel', to: 'victime', from: 'victime', type: 'rivalite', label: 'le petit voleur', affection: -35, trust: -40 },
          { k: 'memory', text: 'Je me suis fait prendre. On ne m\'a pas frappé. On s\'est souvenu de mon visage.', salience: 72, tags: ['vol', 'humiliation'], actors: ['victime'] },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 14, max: 30, actors: ['victime'], note: 'le vol de votre enfance' },
        ]),
      ]),
      opt('demander', 'Demander', [
        out(byStat('charisme', 1.6), (c) => `${n(c.role('victime'))} vous tend un quignon sans un mot et retourne à son ouvrage. Ce n'est pas de la pitié. C'est autre chose.`, [
          { k: 'wealth', d: 8 },
          { k: 'rel', to: 'victime', type: 'amitie', label: 'l\'artisan', affection: 20, trust: 15, mutual: true },
          { k: 'memory', text: 'J\'ai demandé au lieu de prendre. On m\'a donné.', salience: 55, tags: ['bonte'], actors: ['victime'] },
        ]),
        out(1, () => 'On vous chasse d\'un revers de main, comme un chien. Vous rentrez le ventre vide.', [
          { k: 'mood', d: -10 },
          { k: 'hidden', id: 'ambition', d: 4 },
        ]),
      ]),
      opt('partir', 'Passer votre chemin', sure(
        () => 'Vous continuez. La faim, vous connaissez. Ce que vous ne connaissez pas encore, c\'est ce que ça coûte de toujours passer son chemin.',
        [{ k: 'hidden', id: 'karma', d: 3 }, { k: 'mood', d: -5 }],
      )),
    ],
  }),

  ev({
    id: 'child.coups',
    tags: ['enfance', 'violence'],
    minAge: 4,
    maxAge: 12,
    weight: (c) => (c.subject.socialClass === 'miserable' || c.subject.socialClass === 'esclave' ? 12 : 6),
    cooldown: { years: 4, scope: 'character' },
    roles: {
      adulte: pick.first(
        pick.known({ minAge: 20, maxAge: 999, maxAffection: 20 }),
        pick.local({ minAge: 20 }),
        pick.generate({ minAge: 25, maxAge: 55, bond: { type: 'rivalite', label: 'l\'homme' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('adulte'))} vous frappe. Pour quelque chose que vous avez fait, ou pour quelque chose ` +
      `qui n'a rien à voir avec vous — à cet âge, la différence n'est pas encore claire.`,
    options: [
      opt('encaisser', 'Encaisser sans un bruit', sure(
        () => 'Vous ne criez pas. Vous ne pleurez pas. Quelque chose se ferme et ne se rouvrira pas.',
        [
          { k: 'trait', add: 'endurci' },
          { k: 'stat', stat: 'volonte', d: 4 },
          { k: 'health', d: -6 },
          { k: 'memory', text: 'Je n\'ai pas crié. C\'est tout ce que j\'avais.', salience: 78, tags: ['violence'], actors: ['adulte'] },
        ],
      )),
      opt('rendre', 'Rendre le coup', [
        out(byStat('force', 1.4), (c) => `Vous mordez. ${n(c.role('adulte'))} recule, surpris${e(c.role('adulte'))}. On vous frappera encore, mais plus jamais aussi facilement.`, [
          { k: 'trait', add: 'violent' },
          { k: 'stat', stat: 'force', d: 3 },
          { k: 'health', d: -12 },
          { k: 'rel', to: 'adulte', from: 'adulte', affection: -25, fear: 20 },
        ]),
        out(2, () => 'Vous essayez. Ça se passe très mal. Vous mettez trois semaines à remarcher normalement.', [
          { k: 'health', d: -22 },
          { k: 'injure', label: 'une hanche qui se rappelle à vous les jours de pluie', permanent: true, stat: 'agilite', penalty: 5 },
          { k: 'trait', add: 'rancunier' },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 12, max: 28, actors: ['adulte'], note: 'ce qu\'on vous a fait enfant' },
        ]),
      ]),
      opt('fuir', 'Fuir', sure(
        () => 'Vous courez. Vous êtes bon pour ça. Vous le serez encore mieux avec les années.',
        [{ k: 'stat', stat: 'agilite', d: 4 }, { k: 'trait', add: 'lache' }, { k: 'mood', d: -8 }],
      ), { hint: 'lâche' }),
    ],
  }),

  ev({
    id: 'child.faim',
    tags: ['enfance', 'misere'],
    minAge: 3,
    maxAge: 14,
    requires: (c) => c.subject.wealth < 120,
    weight: 13,
    cooldown: { years: 3, scope: 'character' },
    text: () =>
      'Il n\'y a rien depuis deux jours. La faim n\'est plus une douleur, c\'est un bruit de fond ' +
      'qui couvre tout le reste.',
    options: [
      opt('fouiller', 'Fouiller les rebuts', [
        out(3, () => 'Vous trouvez de quoi tenir. Ce n\'était pas fait pour être mangé, mais ça l\'a été.', [
          { k: 'health', d: -5 },
          { k: 'wealth', d: 5 },
        ]),
        out(1, () => 'Vous trouvez, vous mangez, et vous passez la nuit à rendre. Vous vous rappellerez de l\'odeur toute votre vie.', [
          { k: 'health', d: -18 },
          { k: 'memory', text: 'La nuit où j\'ai mangé ce qu\'il ne fallait pas.', salience: 50, tags: ['faim'] },
        ]),
      ]),
      opt('mendier', 'Tendre la main', [
        out(byStat('charisme', 1.8), () => 'Une femme s\'arrête. Elle ne vous regarde pas mais elle laisse quelque chose.', [
          { k: 'wealth', d: 25 },
        ]),
        out(1.5, () => 'Personne. Toute la journée, personne.', [{ k: 'mood', d: -12 }, { k: 'health', d: -8 }]),
      ]),
      opt('endurer', 'Ne rien faire et attendre', sure(
        () => 'Vous attendez. Le corps apprend à faire avec. C\'est une compétence qui vous servira.',
        [{ k: 'health', d: -12 }, { k: 'stat', stat: 'endurance', d: 4 }, { k: 'skill', id: 'survie', d: 4 }],
      )),
    ],
  }),

  ev({
    id: 'child.ami',
    tags: ['enfance', 'lien'],
    minAge: 5,
    maxAge: 13,
    weight: 11,
    once: 'life',
    roles: {
      gamin: pick.first(
        pick.known({ minAge: 4, maxAge: 15, types: ['amitie'] }),
        pick.local({ minAge: 4, maxAge: 15 }),
        pick.generate({ minAge: 5, maxAge: 14, bond: { type: 'amitie', label: 'compagnon' } }),
      ),
    },
    text: (c) =>
      `Trois plus grands vous ont coincé contre le mur. ${n(c.role('gamin'))}, que vous connaissez ` +
      `à peine, s'est mis${e(c.role('gamin'))} devant vous sans qu'on lui demande rien.`,
    options: [
      opt('ensemble', 'Vous battre à ses côtés', [
        out(2, (c) => `Vous prenez tous les deux une correction. Assis dans la boue, ${n(c.role('gamin'))} rit. Vous riez aussi. C'est le début de quelque chose.`, [
          { k: 'health', d: -10 },
          { k: 'rel', to: 'gamin', type: 'amitie', label: 'ami d\'enfance', affection: 55, trust: 45, mutual: true },
          { k: 'memory', text: 'On s\'est fait battre ensemble. C\'est comme ça que ça a commencé.', salience: 80, tags: ['amitie'], actors: ['gamin'] },
          { k: 'trait', add: 'courageux' },
        ]),
      ]),
      opt('fuir', 'Profiter de la diversion pour filer', sure(
        (c) => `Vous courez. Vous entendez les coups derrière vous. ${n(c.role('gamin'))} ne vous a plus jamais adressé la parole.`,
        [
          { k: 'rel', to: 'gamin', from: 'gamin', type: 'rivalite', label: 'celui qui a fui', affection: -50, trust: -60 },
          { k: 'trait', add: 'lache' },
          { k: 'hidden', id: 'karma', d: -8 },
          { k: 'memory', text: 'J\'ai couru. On m\'avait défendu et j\'ai couru.', salience: 85, tags: ['honte'], actors: ['gamin'] },
        ],
      )),
    ],
  }),

  ev({
    id: 'child.lettres',
    tags: ['enfance', 'savoir'],
    minAge: 6,
    maxAge: 13,
    weight: (c) => 8 + c.subject.stats.intelligence / 12,
    once: 'life',
    roles: {
      maitre: pick.first(
        pick.known({ minAge: 30, types: ['mentorat'] }),
        pick.local({ minAge: 35 }),
        pick.generate({ minAge: 40, maxAge: 70, statMean: 58, bond: { type: 'mentorat', label: 'le lettré' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('maitre'))} vous a vu regarder les signes sur les enseignes. ` +
      `« Tu veux savoir ce que ça dit ? » Personne ne vous a jamais proposé ça.`,
    options: [
      opt('apprendre', 'Apprendre, chaque jour, pendant des mois', [
        out(byStat('intelligence', 2), () => 'Ça prend deux hivers. Un matin, les signes cessent d\'être des signes et deviennent des mots. Vous ne serez plus jamais le même.', [
          { k: 'trait', add: 'lettre' },
          { k: 'skill', id: 'lettres', d: 22 },
          { k: 'stat', stat: 'intelligence', d: 5 },
          { k: 'rel', to: 'maitre', type: 'mentorat', label: 'celui qui m\'a appris à lire', affection: 45, respect: 60, mutual: true },
          { k: 'memory', text: 'Le jour où les signes sont devenus des mots.', salience: 90, tags: ['savoir', 'origine'], actors: ['maitre'] },
        ]),
        out(1, () => 'Vous essayez. Les lettres ne veulent pas rentrer. Au bout de six mois, on cesse d\'en parler.', [
          { k: 'skill', id: 'lettres', d: 6 },
          { k: 'mood', d: -6 },
        ]),
      ]),
      opt('refuser', 'Refuser — il y a du travail', sure(
        () => 'Vous dites non. Vous y repenserez souvent, plus tard, chaque fois qu\'on vous tendra un papier que vous ne pourrez pas lire.',
        [{ k: 'wealth', d: 40 }, { k: 'memory', text: 'On m\'a proposé d\'apprendre à lire. J\'ai dit non.', salience: 65, tags: ['regret'], actors: ['maitre'] }],
      )),
    ],
  }),

  ev({
    id: 'child.travail',
    tags: ['enfance', 'travail'],
    minAge: 7,
    maxAge: 12,
    requires: (c) => !c.subject.jobId && c.subject.wealth < 2000,
    weight: 12,
    once: 'life',
    text: () =>
      'On vous met au travail. Pas une décision, pas une discussion : un matin, on vous réveille plus tôt ' +
      'et l\'enfance est finie.',
    options: [
      opt('quais', 'Porter aux quais', sure(
        () => 'Des caisses plus lourdes que vous, du lever au coucher. Vous grandissez tordu mais vous grandissez.',
        [
          { k: 'job', id: 'coursier' },
          { k: 'stat', stat: 'endurance', d: 6 },
          { k: 'health', d: -5 },
          { k: 'skill', id: 'survie', d: 5 },
        ],
      )),
      opt('atelier', 'Entrer en apprentissage', sure(
        () => 'Sept ans à balayer, à souffler, à regarder. C\'est long. C\'est un métier au bout.',
        [
          { k: 'job', id: 'apprenti_forge' },
          { k: 'wealth', d: -30 },
          { k: 'skill', id: 'forge', d: 8 },
        ],
      ), {
        requires: (c) => c.subject.wealth >= 30,
        lockedReason: 'un apprentissage se paie',
      }),
      opt('refuser', 'Refuser et disparaître dans la ville', sure(
        () => 'Vous ne rentrez pas. La ville est grande et elle a de la place pour un enfant de plus, un moment.',
        [
          { k: 'trait', add: 'solitaire' },
          { k: 'skill', id: 'vol', d: 8 },
          { k: 'stat', stat: 'agilite', d: 4 },
          { k: 'wealth', d: -20 },
        ],
      )),
    ],
  }),

  ev({
    id: 'child.fievre',
    tags: ['enfance', 'maladie'],
    minAge: 1,
    maxAge: 12,
    weight: (c) => 10 + (100 - c.subject.health) / 6,
    cooldown: { years: 6, scope: 'character' },
    text: () =>
      'La fièvre vous prend un soir et ne redescend pas. Trois jours de plafond qui bouge, ' +
      'de voix trop fortes, et de mains fraîches sur le front.',
    options: [
      opt('tenir', 'Tenir', [
        out((c) => 2 + c.subject.hidden.genetique / 30, () => 'Le quatrième matin, la fièvre tombe. Vous êtes maigre et vous tenez à peine debout, mais vous êtes là.', [
          { k: 'health', d: -12 },
          { k: 'trait', add: 'survivant' },
        ]),
        out(1, () => 'La fièvre tombe, mais elle emporte quelque chose avec elle. Vous ne serez jamais tout à fait aussi solide.', [
          { k: 'health', d: -22 },
          { k: 'stat', stat: 'endurance', d: -8 },
          { k: 'trait', add: 'maladif' },
        ]),
      ]),
      opt('herboriste', 'Faire venir l\'herboriste', sure(
        () => 'Une décoction amère, trois nuits de veille payées. La fièvre cède plus vite qu\'elle n\'aurait dû.',
        [{ k: 'wealth', d: -60 }, { k: 'health', d: -5 }],
      ), {
        requires: (c) => c.subject.wealth >= 60,
        lockedReason: 'l\'herboriste ne vient pas pour rien',
      }),
    ],
  }),

  ev({
    id: 'child.chien',
    tags: ['enfance', 'lien'],
    minAge: 5,
    maxAge: 13,
    weight: 8,
    once: 'life',
    text: () =>
      'Un chien maigre vous suit depuis trois jours. Il ne mendie pas, il ne mord pas, il suit. ' +
      'Vous n\'avez pas de quoi le nourrir.',
    options: [
      opt('garder', 'Le garder', sure(
        () => 'Vous partagez ce que vous n\'avez pas. Il dort contre vous et l\'hiver est moins froid. Il durera quatre ans.',
        [
          { k: 'mood', d: 15 },
          { k: 'wealth', d: -25 },
          { k: 'trait', add: 'compatissant' },
          { k: 'memory', text: 'Le chien qui m\'a suivi. Je l\'ai gardé quatre ans.', salience: 68, tags: ['attachement'] },
        ],
      )),
      opt('chasser', 'Le chasser à coups de pierre', sure(
        () => 'Il revient deux fois. La troisième pierre porte. Il ne revient plus.',
        [{ k: 'hidden', id: 'karma', d: -5 }, { k: 'mood', d: -6 }, { k: 'trait', add: 'cruel' }],
      ), ),
      opt('vendre', 'Le vendre au tanneur', sure(
        () => 'Douze sous. Vous mangez deux jours. Vous n\'oubliez pas comment il vous a regardé.',
        [
          { k: 'wealth', d: 12 },
          { k: 'hidden', id: 'karma', d: -10 },
          { k: 'memory', text: 'J\'ai vendu le chien qui me suivait. Pour douze sous.', salience: 70, tags: ['honte'] },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'child.moquerie',
    tags: ['enfance', 'humiliation'],
    minAge: 5,
    maxAge: 14,
    weight: (c) =>
      trait(c, 'difforme') || trait(c, 'boiteux') || trait(c, 'marque') || trait(c, 'chetif') ? 16 : 5,
    cooldown: { years: 5, scope: 'character' },
    roles: {
      meneur: pick.first(
        pick.local({ minAge: 6, maxAge: 16 }),
        pick.generate({ minAge: 7, maxAge: 15, bond: { type: 'rivalite', label: 'le petit chef' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('meneur'))} a trouvé un surnom pour vous et les autres l'ont repris en une journée. ` +
      `C'est le genre de chose qui colle des années.`,
    options: [
      opt('ignorer', 'Faire comme si vous n\'entendiez pas', sure(
        () => 'Vous ne réagissez pas. Ils se lassent au bout de deux saisons. Vous, jamais.',
        [
          { k: 'stat', stat: 'volonte', d: 5 },
          { k: 'mood', d: -12 },
          { k: 'trait', add: 'rancunier' },
          { k: 'memory', text: 'Le surnom qu\'ils m\'avaient trouvé. Je m\'en souviens encore.', salience: 65, tags: ['humiliation'], actors: ['meneur'] },
        ],
      )),
      opt('frapper', 'Casser le nez du meneur', [
        out(byStat('force', 1.5), (c) => `${n(c.role('meneur'))} saigne. Plus personne n'emploie le surnom devant vous. Derrière votre dos, c'est autre chose.`, [
          { k: 'rel', to: 'meneur', from: 'meneur', type: 'haine', label: 'celui qui m\'a cassé le nez', affection: -45, fear: 35 },
          { k: 'trait', add: 'violent' },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 10, max: 25, actors: ['meneur'], note: 'le nez que vous avez cassé' },
        ]),
        out(1.2, () => 'Vous ratez. Ils sont quatre. Vous rentrez avec une dent en moins et le surnom en plus.', [
          { k: 'health', d: -14 },
          { k: 'injure', label: 'une dent de devant manquante', permanent: true, stat: 'charisme', penalty: 3 },
          { k: 'mood', d: -14 },
        ]),
      ]),
      opt('rire', 'Rire avec eux', sure(
        () => 'Vous riez le plus fort. Le surnom devient une plaisanterie que vous contrôlez. C\'est une forme de victoire, si on n\'y regarde pas de trop près.',
        [{ k: 'stat', stat: 'charisme', d: 5 }, { k: 'trait', add: 'menteur' }, { k: 'mood', d: -4 }],
      )),
    ],
  }),

  ev({
    id: 'child.parents',
    tags: ['enfance', 'famille'],
    minAge: 4,
    maxAge: 14,
    weight: 9,
    cooldown: { years: 6, scope: 'character' },
    roles: { parent: pick.parent() },
    text: (c) =>
      `Ça crie de l'autre côté de la cloison, encore. ${n(c.role('parent'))} a une voix que vous ne ` +
      `lui connaissiez pas.`,
    options: [
      opt('intervenir', 'Entrer et vous interposer', [
        out(2, (c) => `Le silence tombe d'un coup. Ils vous regardent. Ce soir-là s'arrête, mais quelque chose est cassé pour de bon.`, [
          { k: 'rel', to: 'parent', affection: -10, respect: -15 },
          { k: 'stat', stat: 'volonte', d: 4 },
          { k: 'memory', text: 'Le soir où je suis entré dans la pièce.', salience: 72, tags: ['famille'], actors: ['parent'] },
        ]),
        out(1, () => 'Vous prenez le coup destiné à l\'autre. On ne vous en remercie jamais.', [
          { k: 'health', d: -12 },
          { k: 'trait', add: 'endurci' },
          { k: 'rel', to: 'parent', affection: -25, fear: 25 },
        ]),
      ]),
      opt('ecouter', 'Rester derrière la cloison et écouter', sure(
        () => 'Vous écoutez tout. Vous apprenez des choses qu\'un enfant ne devrait pas savoir : sur l\'argent, sur les autres, sur vous.',
        [
          { k: 'stat', stat: 'intelligence', d: 3 },
          { k: 'trait', add: 'mefiant' },
          { k: 'skill', id: 'intrigue', d: 5 },
          { k: 'mood', d: -8 },
        ],
      )),
      opt('sortir', 'Sortir et marcher jusqu\'à ce que ça s\'arrête', sure(
        () => 'Vous connaissez toutes les rues à cette heure-là. C\'est devenu une habitude.',
        [{ k: 'trait', add: 'solitaire' }, { k: 'skill', id: 'survie', d: 4 }, { k: 'mood', d: -5 }],
      )),
    ],
  }),

  ev({
    id: 'child.don',
    tags: ['enfance', 'mystere'],
    minAge: 5,
    maxAge: 12,
    weight: (c) => 4 + c.subject.hidden.destinee / 12,
    once: 'life',
    roles: {
      inconnu: pick.generate({ minAge: 45, maxAge: 75, bond: { type: 'amitie', label: 'l\'inconnu' } }),
    },
    text: (c) =>
      `Un inconnu s'arrête devant vous, vous regarde plus longtemps qu'il ne faut, et vous tend ` +
      `un objet enveloppé de toile. « Garde-le. Tu sauras quand. » ${n(c.role('inconnu'))} s'en va sans se retourner.`,
    options: [
      opt('garder', 'Le garder sans l\'ouvrir', sure(
        () => 'Vous le cachez. Vous y pensez chaque semaine pendant des années. Vous n\'ouvrez pas.',
        [
          { k: 'flag', name: 'objet_inconnu', value: true },
          { k: 'hidden', id: 'destinee', d: 8 },
          { k: 'memory', text: 'L\'inconnu et son paquet. « Tu sauras quand. »', salience: 88, tags: ['mystere'], actors: ['inconnu'] },
          { k: 'seed', eventId: 'seed.objet.revelation', min: 10, max: 30, actors: [], note: 'ce que contient le paquet' },
        ],
      )),
      opt('ouvrir', 'L\'ouvrir tout de suite', [
        out(2, () => 'Une clé en fer noir, sans rien autour. Elle n\'ouvre aucune porte que vous connaissez.', [
          { k: 'flag', name: 'cle_noire', value: true },
          { k: 'hidden', id: 'destinee', d: 6 },
          { k: 'seed', eventId: 'seed.objet.revelation', min: 8, max: 25, actors: [], note: 'la clé en fer noir' },
        ]),
        out(1, () => 'Rien. Un caillou gris, poli par la mer. Vous vous sentez idiot d\'y avoir cru — et vous le gardez quand même.', [
          { k: 'mood', d: -4 },
          { k: 'flag', name: 'caillou', value: true },
        ]),
      ]),
      opt('vendre', 'Le vendre sans l\'ouvrir', sure(
        () => 'Le brocanteur en donne trente sous sans discuter, ce qui aurait dû vous alerter.',
        [{ k: 'wealth', d: 30 }, { k: 'hidden', id: 'destinee', d: -6 }],
      )),
    ],
  }),

  ev({
    id: 'child.noyade',
    tags: ['enfance', 'danger'],
    minAge: 5,
    maxAge: 13,
    weight: 7,
    once: 'life',
    roles: {
      gosse: pick.first(
        pick.local({ minAge: 3, maxAge: 12 }),
        pick.generate({ minAge: 4, maxAge: 11, bond: { type: 'amitie', label: 'le gamin du quartier' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('gosse'))} est tombé${e(c.role('gosse'))} dans le canal et ne remonte pas. ` +
      `Vous êtes le plus près. Vous ne savez pas nager.`,
    options: [
      opt('sauter', 'Sauter', [
        out(byStat('endurance', 1.6), (c) => `Vous ne savez pas nager mais l'eau n'est pas si profonde. Vous ${lui(c.role('gosse')) === 'elle' ? 'la' : 'le'} sortez. Toute la rue l'apprend avant le soir.`, [
          { k: 'health', d: -8 },
          { k: 'rel', to: 'gosse', from: 'gosse', type: 'dette', label: 'celui qui m\'a sauvé', affection: 60, trust: 55 },
          { k: 'trait', add: 'courageux' },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'chronicle', kind: 'ascension', importance: 3, data: { quoi: 'sauva un enfant de la noyade' } },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 12, max: 30, actors: ['gosse'], note: 'la dette de celui que vous avez sauvé' },
        ]),
        out(1, () => 'Vous coulez tous les deux. Un batelier vous repêche. L\'autre enfant, non.', [
          { k: 'health', d: -25 },
          { k: 'trait', add: 'hante' },
          { k: 'kill', who: 'gosse', cause: 'noyé dans le canal' },
          { k: 'memory', text: 'J\'ai sauté. Je n\'ai ramené personne.', salience: 92, tags: ['deuil', 'echec'], actors: ['gosse'] },
        ]),
      ]),
      opt('crier', 'Crier à l\'aide', [
        out(2, () => 'Un homme arrive en courant et plonge. Il ressort l\'enfant, vivant. Vous n\'avez rien fait, et vous le savez.', [
          { k: 'mood', d: -6 },
        ]),
        out(1.4, (c) => `Personne n'arrive à temps. On repêche ${n(c.role('gosse'))} à la nuit.`, [
          { k: 'kill', who: 'gosse', cause: 'noyé dans le canal' },
          { k: 'memory', text: 'J\'ai crié. J\'ai seulement crié.', salience: 80, tags: ['honte'] },
          { k: 'trait', add: 'hante' },
        ]),
      ]),
      opt('partir', 'Partir sans rien dire', sure(
        () => 'Vous vous éloignez vite. On retrouvera l\'enfant le lendemain. Personne ne saura que vous étiez là.',
        [
          { k: 'kill', who: 'gosse', cause: 'noyé dans le canal' },
          { k: 'hidden', id: 'karma', d: -18 },
          { k: 'trait', add: 'cruel' },
          { k: 'memory', text: 'J\'étais là. Je suis parti. Personne ne l\'a jamais su.', salience: 95, tags: ['secret', 'honte'] },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'child.temple',
    tags: ['enfance', 'foi'],
    minAge: 6,
    maxAge: 14,
    weight: 7,
    once: 'life',
    roles: {
      desservant: pick.generate({ minAge: 40, maxAge: 70, statMean: 52, bond: { type: 'mentorat', label: 'le desservant' } }),
    },
    text: (c) =>
      `${n(c.role('desservant'))} vous remarque au fond du temple, où vous vous étiez seulement mis à l'abri de la pluie. ` +
      `« Tu reviens souvent. Tu cherches quoi ? »`,
    options: [
      opt('rester', 'Rester et écouter', sure(
        () => 'Vous revenez chaque semaine. On vous apprend les textes, les gestes, et surtout : à qui parler et comment.',
        [
          { k: 'trait', add: 'pieux' },
          { k: 'skill', id: 'rhetorique', d: 10 },
          { k: 'skill', id: 'lettres', d: 8 },
          { k: 'rel', to: 'desservant', type: 'mentorat', label: 'le desservant', affection: 35, respect: 45, mutual: true },
        ],
      )),
      opt('voler', 'Repérer où sont les offrandes', [
        out(byStat('agilite', 1.5), () => 'Le tronc est mal fermé. Vous prenez ce qu\'il faut et pas plus — c\'est ce qui fait qu\'on ne s\'en aperçoit pas.', [
          { k: 'wealth', d: 90 },
          { k: 'skill', id: 'vol', d: 8 },
          { k: 'hidden', id: 'karma', d: -8 },
        ]),
        out(1, (c) => `${n(c.role('desservant'))} vous attrape la main dans le tronc. On ne vous dénonce pas. On vous fait promettre. Vous détestez ça.`, [
          { k: 'rel', to: 'desservant', from: 'desservant', type: 'dette', label: 'l\'enfant du tronc', affection: -10, trust: -20 },
          { k: 'seed', eventId: 'seed.dette.faveur', min: 10, max: 26, actors: ['desservant'], note: 'ce que le desservant n\'a pas dit' },
        ]),
      ], { hint: 'risqué' }),
      opt('partir', 'Sortir sous la pluie', sure(
        () => 'Vous préférez la pluie. C\'est un choix que vous referez souvent.',
        [{ k: 'trait', add: 'impie' }, { k: 'health', d: -3 }],
      )),
    ],
  }),

  ev({
    id: 'child.cachette',
    tags: ['enfance', 'lieu'],
    minAge: 5,
    maxAge: 13,
    weight: 8,
    once: 'life',
    text: () =>
      'Vous trouvez un endroit : sous une coque retournée, derrière un mur écroulé, au bout d\'un couloir ' +
      'que personne n\'emprunte. Un endroit à vous.',
    options: [
      opt('secret', 'N\'en parler à personne', sure(
        () => 'Vous y allez chaque fois que le monde devient trop bruyant. C\'est le seul endroit où vous respirez.',
        [
          { k: 'mood', d: 14 },
          { k: 'flag', name: 'cachette', value: true },
          { k: 'memory', text: 'Mon endroit. Personne ne l\'a jamais su.', salience: 60, tags: ['refuge'] },
        ],
      )),
      opt('partager', 'Le montrer à quelqu\'un', [
        out(3, () => 'Vous y êtes deux, maintenant. C\'est mieux.', [
          { k: 'mood', d: 18 },
          { k: 'flag', name: 'cachette', value: true },
        ]),
        out(1, () => 'Trois jours plus tard, il y a du monde. Ce n\'est plus votre endroit. Ce n\'est plus un endroit du tout.', [
          { k: 'mood', d: -14 },
          { k: 'trait', add: 'mefiant' },
          { k: 'memory', text: 'J\'ai montré mon endroit à quelqu\'un. Je ne l\'ai plus jamais eu.', salience: 66, tags: ['trahison'] },
        ]),
      ], {
        requires: (c) => c.world.relations.from(c.subject.id).some((r) => r.affection > 30),
        lockedReason: 'il faudrait quelqu\'un en qui vous ayez confiance',
      }),
    ],
  }),

  ev({
    id: 'child.mensonge',
    tags: ['enfance', 'social'],
    minAge: 6,
    maxAge: 13,
    weight: 9,
    once: 'life',
    roles: { adulte: pick.first(pick.parent(), pick.known({ minAge: 20 }), pick.local({ minAge: 20 })) },
    text: (c) =>
      `Quelque chose est cassé et ${n(c.role('adulte'))} demande qui. Tout le monde attend. ` +
      `Ce n'est pas vous — mais c'est presque vous.`,
    options: [
      opt('mentir', 'Accuser quelqu\'un d\'autre', [
        out(byStat('charisme', 1.7), () => 'On vous croit. Un autre prend la correction. Vous découvrez ce jour-là que mentir marche, et que c\'est un problème.', [
          { k: 'trait', add: 'menteur' },
          { k: 'skill', id: 'rhetorique', d: 6 },
          { k: 'hidden', id: 'karma', d: -8 },
          { k: 'memory', text: 'La première fois où j\'ai menti et où ça a marché.', salience: 62, tags: ['mensonge'] },
        ]),
        out(1, (c) => `${n(c.role('adulte'))} ne vous croit pas une seconde. C'est pire que d'avoir avoué.`, [
          { k: 'rel', to: 'adulte', from: 'adulte', affection: -20, trust: -35 },
          { k: 'health', d: -8 },
        ]),
      ]),
      opt('avouer', 'Dire la vérité même si elle vous accuse', sure(
        (c) => `Vous prenez la punition. ${n(c.role('adulte'))} ne dit rien sur le moment, mais ne l'oublie pas.`,
        [
          { k: 'health', d: -6 },
          { k: 'rel', to: 'adulte', from: 'adulte', affection: 15, trust: 40, respect: 25 },
          { k: 'hidden', id: 'karma', d: 8 },
        ],
      )),
      opt('taire', 'Ne rien dire du tout', sure(
        () => 'Vous fixez le sol. Le silence dure. Personne n\'est puni et personne n\'est content.',
        [{ k: 'stat', stat: 'volonte', d: 3 }, { k: 'trait', add: 'solitaire' }],
      )),
    ],
  }),

  ev({
    id: 'child.mort',
    tags: ['enfance', 'mort'],
    minAge: 5,
    maxAge: 14,
    weight: (c) => (c.world.settlement(c.subject.settlement)?.danger ?? 30) / 6,
    once: 'life',
    text: () =>
      'Il y a un corps dans la ruelle, à moitié couvert par une bâche. Des adultes discutent à côté ' +
      'comme s\'il n\'était pas là. Vous n\'aviez jamais vu ça de si près.',
    options: [
      opt('regarder', 'Regarder jusqu\'au bout', sure(
        () => 'Vous regardez longtemps. Quelque chose se règle dans votre tête ce jour-là : la mort n\'est pas une idée, c\'est un objet.',
        [
          { k: 'trait', add: 'endurci' },
          { k: 'stat', stat: 'volonte', d: 5 },
          { k: 'mood', d: -10 },
          { k: 'memory', text: 'Le premier mort que j\'ai vraiment regardé.', salience: 82, tags: ['mort'] },
        ],
      )),
      opt('fouiller', 'Attendre que les adultes partent et fouiller', [
        out(2, () => 'Une bourse, une bague, une dent en or. Vous mangez pendant trois semaines et vous ne dormez pas bien pendant six mois.', [
          { k: 'wealth', d: 180 },
          { k: 'hidden', id: 'karma', d: -12 },
          { k: 'trait', add: 'endurci' },
          { k: 'memory', text: 'J\'ai fouillé un mort. Ça m\'a nourri trois semaines.', salience: 78, tags: ['honte', 'survie'] },
        ]),
        out(1, () => 'On vous voit faire. On ne vous frappe même pas — on vous regarde comme une bête, et c\'est bien pire.', [
          { k: 'trait', add: 'notoire' },
          { k: 'mood', d: -16 },
        ]),
      ], { hint: 'cruel' }),
      opt('fuir', 'Partir en courant', sure(
        () => 'Vous courez et vous vomissez au coin de la rue. Vous rêverez de la bâche pendant des années.',
        [{ k: 'mood', d: -14 }, { k: 'trait', add: 'hante' }],
      )),
    ],
  }),

  ev({
    id: 'child.soldats',
    tags: ['enfance', 'guerre'],
    minAge: 5,
    maxAge: 14,
    weight: 6,
    cooldown: { years: 8, scope: 'character' },
    text: () =>
      'Une colonne traverse la ville. Des hommes gris, des chevaux fatigués, et un silence qui fait ' +
      'rentrer les gens chez eux. On dit qu\'ils reviennent des Marches.',
    options: [
      opt('suivre', 'Les suivre jusqu\'au camp', [
        out(2, () => 'Un sergent vous donne un quignon et vous laisse regarder les armes. Vous ne pensez plus qu\'à ça pendant trois ans.', [
          { k: 'skill', id: 'lame', d: 5 },
          { k: 'path', unlock: 'militaire' },
          { k: 'memory', text: 'Le camp des soldats. Les armes posées contre les tentes.', salience: 70, tags: ['guerre'] },
        ]),
        out(1, () => 'On vous chasse à coups de plat d\'épée. Vous rentrez avec une marque sur l\'épaule et une idée fixe.', [
          { k: 'health', d: -8 },
          { k: 'stat', stat: 'volonte', d: 4 },
        ]),
      ]),
      opt('cacher', 'Vous cacher jusqu\'à ce qu\'ils passent', sure(
        () => 'Vous les regardez par une fente. Vous comptez les chevaux. Vous vous souviendrez du nombre.',
        [{ k: 'stat', stat: 'intelligence', d: 2 }, { k: 'trait', add: 'mefiant' }],
      )),
    ],
  }),

  ev({
    id: 'child.entraide',
    tags: ['enfance', 'bonte'],
    minAge: 6,
    maxAge: 14,
    weight: 8,
    cooldown: { years: 7, scope: 'character' },
    roles: {
      vieille: pick.first(
        pick.known({ minAge: 55 }),
        pick.local({ minAge: 55 }),
        pick.generate({ minAge: 58, maxAge: 80, bond: { type: 'amitie', label: 'la voisine' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('vieille'))} n'arrive plus à porter son eau depuis la fontaine. Personne ne l'aide. ` +
      `Ce n'est pas de la méchanceté : personne ne la voit.`,
    options: [
      opt('aider', 'Porter son eau, tous les jours', sure(
        (c) => `Vous le faites pendant deux ans. ${n(c.role('vieille'))} vous raconte la ville d'avant, les noms des familles, qui doit quoi à qui. Ça vaut plus que de l'argent.`,
        [
          { k: 'rel', to: 'vieille', type: 'amitie', label: 'la vieille de la fontaine', affection: 50, trust: 45, mutual: true },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'hidden', id: 'karma', d: 10 },
          { k: 'trait', add: 'compatissant' },
          { k: 'seed', eventId: 'seed.vieille.legs', min: 3, max: 10, actors: ['vieille'], note: 'ce que la vieille vous laissera' },
        ],
      )),
      opt('payer', 'Lui proposer de le faire contre paiement', sure(
        () => 'Elle accepte. Deux sous par semaine. C\'est un arrangement, pas une amitié, et vous préférez ça.',
        [
          { k: 'wealth', d: 60 },
          { k: 'rel', to: 'vieille', type: 'amitie', label: 'la vieille de la fontaine', affection: 15, mutual: true },
          { k: 'skill', id: 'negoce', d: 5 },
        ],
      )),
      opt('rien', 'Passer votre chemin', sure(
        () => 'Vous passez. Comme tout le monde. Elle meurt l\'hiver suivant et vous apprenez qu\'elle avait de la famille à Kaleth qui n\'est jamais venue.',
        [{ k: 'hidden', id: 'karma', d: -3 }],
      )),
    ],
  }),

  ev({
    id: 'child.vol_subi',
    tags: ['enfance', 'perte'],
    minAge: 5,
    maxAge: 14,
    requires: (c) => c.subject.wealth > 20,
    weight: 8,
    cooldown: { years: 6, scope: 'character' },
    roles: {
      voleur: pick.first(
        pick.local({ minAge: 8, maxAge: 25 }),
        pick.generate({ minAge: 10, maxAge: 22, bond: { type: 'rivalite', label: 'celui qui m\'a volé' } }),
      ),
    },
    text: (c) =>
      `On vous a pris tout ce que vous aviez. Vous avez vu qui : ${n(c.role('voleur'))}. ` +
      `Vous êtes plus petit${e(c.subject)} et vous êtes seul${e(c.subject)}.`,
    options: [
      opt('poursuivre', 'Le poursuivre quand même', [
        out(byStat('volonte', 1.4), (c) => `Vous ne lâchez pas. Six rues. ${n(c.role('voleur'))} finit par rendre, moins par peur que par lassitude. On vous regarde autrement, après ça.`, [
          { k: 'wealth', d: 0 },
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'rel', to: 'voleur', from: 'voleur', respect: 25, fear: 15 },
          { k: 'trait', add: 'obstine' },
        ]),
        out(1.5, () => 'Vous le rattrapez. C\'était une erreur. On vous laisse dans une flaque avec deux côtes fêlées.', [
          { k: 'wealth', d: -100 },
          { k: 'health', d: -18 },
          { k: 'trait', add: 'rancunier' },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 10, max: 24, actors: ['voleur'], note: 'celui qui vous a volé enfant' },
        ]),
      ]),
      opt('denoncer', 'Aller le dire à la garde', [
        out(2, () => 'La garde s\'en occupe. Vous ne revoyez pas votre argent, mais vous ne revoyez plus le voleur non plus.', [
          { k: 'wealth', d: -60 },
          { k: 'trait', add: 'notoire' },
          { k: 'rel', to: 'voleur', from: 'voleur', type: 'haine', label: 'le mouchard', affection: -50 },
        ]),
        out(1.5, () => 'La garde vous rit au nez. Dans les ruelles, on apprend que vous êtes allé les voir. C\'est la pire chose qui pouvait arriver.', [
          { k: 'wealth', d: -60 },
          { k: 'trait', add: 'notoire' },
          { k: 'mood', d: -12 },
        ]),
      ]),
      opt('accepter', 'Ne rien faire', sure(
        () => 'Vous ne dites rien. Vous recommencez à zéro. Vous avez déjà l\'habitude et ça vous inquiète.',
        [{ k: 'wealth', d: -60 }, { k: 'stat', stat: 'endurance', d: 3 }, { k: 'mood', d: -8 }],
      )),
    ],
  }),

  ev({
    id: 'child.talent',
    tags: ['enfance', 'don'],
    minAge: 7,
    maxAge: 14,
    weight: (c) => 3 + c.subject.hidden.potentiel / 10,
    once: 'life',
    text: (c) =>
      `Il y a une chose que vous faites mieux que les autres, et vous venez de vous en rendre compte. ` +
      `Pas un peu mieux : beaucoup mieux. Vous avez ${c.age} ans et personne ne vous l'a appris.`,
    options: [
      opt('mains', 'Vos mains — vous réparez ce que les adultes jettent', sure(
        () => 'Vous démontez, vous comprenez, vous remontez. On commence à vous apporter des choses cassées.',
        [{ k: 'skill', id: 'artisanat', d: 16 }, { k: 'stat', stat: 'agilite', d: 5 }, { k: 'wealth', d: 40 }],
      )),
      opt('tete', 'Votre tête — vous retenez tout', sure(
        () => 'Les chiffres, les visages, les dettes de chacun. Vous ne prenez jamais de notes et vous ne vous trompez jamais.',
        [{ k: 'skill', id: 'calcul', d: 16 }, { k: 'stat', stat: 'intelligence', d: 5 }],
      )),
      opt('bouche', 'Votre bouche — vous obtenez des choses en parlant', sure(
        () => 'Les gens font ce que vous dites et se demandent après pourquoi. Vous, vous savez pourquoi.',
        [{ k: 'skill', id: 'rhetorique', d: 16 }, { k: 'stat', stat: 'charisme', d: 5 }],
      )),
      opt('corps', 'Votre corps — vous ne tombez jamais', sure(
        () => 'Les toits, les cordages, les rebords. Vous allez là où les adultes ne peuvent pas.',
        [{ k: 'skill', id: 'vol', d: 8 }, { k: 'stat', stat: 'agilite', d: 8 }],
      )),
    ],
  }),
];

function lui(c: { sex: string }): string {
  return c.sex === 'f' ? 'elle' : 'lui';
}
