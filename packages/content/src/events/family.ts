import { pick } from '@ed/engine';
import { byStat, e, ev, n, opt, out, sure } from './_helpers.js';

/** Alliance, descendance, et tout ce qui vient avec. */
export const FAMILY_EVENTS = [
  ev({
    id: 'family.demande',
    tags: ['famille', 'amour'],
    minAge: 16,
    maxAge: 55,
    requires: (c) => !c.subject.spouseId,
    weight: (c) => 10 + c.subject.stats.charisme / 10,
    cooldown: { years: 4, scope: 'character' },
    roles: {
      parti: pick.first(
        pick.known({ minAge: 16, maxAge: 50, minAffection: 30, excludeSpouse: true, where: (o) => !o.spouseId }),
        pick.local({ minAge: 17, maxAge: 45, where: (o) => !o.spouseId }),
        pick.generate({ minAge: 18, maxAge: 40, bond: { type: 'amitie', label: 'connaissance', affection: 20 } }),
      ),
    },
    text: (c) =>
      `${n(c.role('parti'))} est libre, vous êtes libre, et vos deux familles trouvent que ça a du sens. ` +
      `Ce n'est pas de l'amour. Ce n'est pas rien non plus.`,
    options: [
      opt('epouser', 'Demander sa main', [
        out((c) => 2 + (c.rel('parti')?.affection ?? 0) / 25, (c) => `On dit oui. Le contrat est signé chez le notaire et la noce dure deux jours.`, [
          { k: 'marry', who: 'parti' },
          { k: 'wealth', d: -300 },
          { k: 'mood', d: 18 },
        ]),
        out(1, (c) => `On dit non. Poliment, et devant du monde. Vous mettez des mois à repasser dans cette rue.`, [
          { k: 'mood', d: -16 },
          { k: 'rel', to: 'parti', affection: -20 },
        ]),
      ]),
      opt('attendre', 'Attendre mieux', sure(
        () => 'Vous attendez. Quelquefois, mieux arrive.',
        [{ k: 'hidden', id: 'ambition', d: 3 }],
      )),
    ],
  }),

  ev({
    id: 'family.mariage_arrange',
    tags: ['famille', 'politique'],
    minAge: 15,
    maxAge: 40,
    requires: (c) =>
      !c.subject.spouseId && ['aise', 'noble', 'royal'].includes(c.subject.socialClass),
    weight: 12,
    cooldown: { years: 6, scope: 'character' },
    roles: {
      promis: pick.generate({ minAge: 16, maxAge: 45, socialClass: 'noble', statMean: 50, bond: { type: 'mariage', label: 'le parti proposé' } }),
      arrangeur: pick.first(pick.parent(), pick.relative({ minAge: 30 }), pick.generate({ minAge: 45, maxAge: 70 })),
    },
    text: (c) =>
      `${n(c.role('arrangeur'))} a tout arrangé. Le contrat est avantageux, les terres se touchent, ` +
      `et vous rencontrerez ${n(c.role('promis'))} le jour de la noce.`,
    options: [
      opt('accepter', 'Accepter', sure(
        (c) => `Vous acceptez. ${n(c.role('promis'))} n'est ni bien ni mal — c'est quelqu'un d'autre, voilà tout. On finit par s'arranger, ou pas.`,
        [
          { k: 'marry', who: 'promis' },
          { k: 'wealth', d: 4000 },
          { k: 'hidden', id: 'influence', d: 12 },
          { k: 'rel', to: 'arrangeur', from: 'arrangeur', affection: 20, respect: 15 },
        ],
      )),
      opt('refuser', 'Refuser', sure(
        (c) => `Vous refusez devant témoins. ${n(c.role('arrangeur'))} ne vous adresse plus la parole pendant six ans, et l'alliance va à une autre famille.`,
        [
          { k: 'rel', to: 'arrangeur', from: 'arrangeur', type: 'rivalite', label: 'l\'ingrat', affection: -50, trust: -40 },
          { k: 'stat', stat: 'volonte', d: 6 },
          { k: 'wealth', d: -1500 },
          { k: 'trait', add: 'obstine' },
        ],
      ), { hint: 'irréversible' }),
      opt('negocier', 'Accepter, mais poser vos conditions', [
        out(byStat('charisme', 1.4), () => 'On grince, puis on cède sur l\'essentiel. Vous entrez dans ce mariage avec quelque chose en main.', [
          { k: 'marry', who: 'promis' },
          { k: 'wealth', d: 6500 },
          { k: 'hidden', id: 'influence', d: 16 },
          { k: 'skill', id: 'negoce', d: 8 },
        ]),
        out(1.3, () => 'On refuse vos conditions et on retire l\'offre. Personne n\'y gagne, ce qui est le propre des négociations ratées.', [
          { k: 'mood', d: -12 },
          { k: 'rel', to: 'arrangeur', from: 'arrangeur', affection: -25 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'family.enfant',
    tags: ['famille'],
    minAge: 16,
    maxAge: 48,
    requires: (c) => !!c.subject.spouseId && c.subject.childrenIds.length < 9,
    weight: 16,
    cooldown: { years: 2, scope: 'character' },
    roles: { epoux: pick.spouse() },
    text: (c) =>
      `Un enfant s'annonce. Dans ce monde, un enfant sur trois ne voit pas ses cinq ans — personne ` +
      `ne le dit à voix haute, tout le monde y pense.`,
    options: [
      opt('accueillir', 'L\'accueillir', [
        out(5, () => 'L\'accouchement se passe. L\'enfant crie fort, ce qui est bon signe.', [
          { k: 'child' },
          { k: 'wealth', d: -150 },
          { k: 'mood', d: 15 },
        ]),
        out(1.2, (c) => `L'enfant naît et ne respire pas. On l'enterre sans nom, comme le veut l'usage.`, [
          { k: 'mood', d: -30 },
          { k: 'trait', add: 'endeuille' },
          { k: 'memory', text: 'L\'enfant qui n\'a pas respiré. On ne lui a pas donné de nom.', salience: 94, tags: ['deuil'] },
          { k: 'chronicle', kind: 'note', importance: 3, data: { texte: 'Un enfant naquit sans souffle. On l\'enterra sans nom.' } },
        ]),
        out(0.6, () => 'L\'enfant vit. Votre époux, non. On vous le dit dans le couloir.', [
          { k: 'child' },
          { k: 'kill', who: 'epoux', cause: 'des suites de l\'accouchement' },
          { k: 'trait', add: 'endeuille' },
          { k: 'mood', d: -35 },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'family.enfant_difficile',
    tags: ['famille', 'conflit'],
    minAge: 28,
    maxAge: 80,
    requires: (c) => c.subject.childrenIds.length > 0,
    weight: 11,
    cooldown: { years: 6, scope: 'character' },
    roles: { enfant: pick.child({ minAge: 8 }) },
    text: (c) =>
      `${n(c.role('enfant'))} vous tient tête. Pas une colère d'enfant : une position, tenue, argumentée, ` +
      `et vous voyez très bien de qui ${e(c.role('enfant')) === 'e' ? 'elle' : 'il'} tient ça.`,
    options: [
      opt('ecraser', 'Imposer votre autorité', [
        out(2, (c) => `${n(c.role('enfant'))} cède. Vous avez gagné. Quelque chose s'est refermé et vous le sentez.`, [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: -25, fear: 30, respect: -10 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 6, max: 20, actors: ['enfant'], note: 'l\'enfant que vous avez écrasé' },
        ]),
        out(1.5, (c) => `${n(c.role('enfant'))} ne cède pas. ${e(c.role('enfant')) === 'e' ? 'Elle' : 'Il'} part de la maison dans l'année.`, [
          { k: 'rel', to: 'enfant', from: 'enfant', type: 'rivalite', label: 'l\'enfant parti', affection: -50 },
          { k: 'mood', d: -18 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 5, max: 18, actors: ['enfant'], note: 'l\'enfant qui est parti' },
        ]),
      ]),
      opt('ecouter', 'L\'écouter jusqu\'au bout', sure(
        (c) => `Vous écoutez. ${n(c.role('enfant'))} a raison sur deux points et vous le dites. C'est le jour où vous cessez d'être seulement un parent.`,
        [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 35, trust: 40, respect: 45 },
          { k: 'rel', to: 'enfant', affection: 20, respect: 25 },
          { k: 'stat', stat: 'intelligence', d: 2 },
        ],
      )),
      opt('former', 'En faire votre héritier de fait', sure(
        (c) => `Vous décidez que ce sera ${n(c.role('enfant'))}. Les autres l'apprennent et ne l'oublieront pas.`,
        [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 30, respect: 40 },
          { k: 'flag', name: 'heritier_designe', value: true },
          { k: 'skill', id: 'commandement', d: 6, who: 'enfant' },
          { k: 'seed', eventId: 'seed.succession.jalousie', min: 4, max: 16, actors: ['enfant'], note: 'la désignation de l\'héritier' },
        ],
      )),
    ],
  }),

  ev({
    id: 'family.infidelite',
    tags: ['famille', 'trahison'],
    minAge: 20,
    maxAge: 65,
    requires: (c) => !!c.subject.spouseId,
    weight: 7,
    cooldown: { years: 12, scope: 'character' },
    roles: { epoux: pick.spouse(), tiers: pick.first(pick.known({ minAge: 18, excludeSpouse: true }), pick.generate({ minAge: 20, maxAge: 45 })) },
    text: (c) =>
      `Vous apprenez que ${n(c.role('epoux'))} voit ${n(c.role('tiers'))}. Vous l'apprenez par quelqu'un ` +
      `qui a pris plaisir à vous le dire, ce qui ajoute une couche.`,
    options: [
      opt('confronter', 'Confronter', [
        out(2, (c) => `${n(c.role('epoux'))} ne nie pas. Vous restez ensemble parce qu'il faut bien, et plus rien n'est pareil.`, [
          { k: 'rel', to: 'epoux', affection: -45, trust: -60 },
          { k: 'mood', d: -22 },
          { k: 'memory', text: 'Le soir où j\'ai demandé et où on n\'a pas nié.', salience: 90, tags: ['trahison'], actors: ['epoux'] },
        ]),
        out(1.2, (c) => `${n(c.role('epoux'))} nie tout, avec une conviction qui vous fait douter de vous. C'est peut-être le pire.`, [
          { k: 'rel', to: 'epoux', trust: -40 },
          { k: 'hidden', id: 'folie', d: 8 },
          { k: 'mood', d: -18 },
        ]),
      ]),
      opt('taire', 'Ne rien dire et attendre', sure(
        () => 'Vous ne dites rien. Vous regardez. Vous accumulez. C\'est une façon de vivre.',
        [
          { k: 'rel', to: 'epoux', affection: -25, trust: -45 },
          { k: 'trait', add: 'rancunier' },
          { k: 'skill', id: 'intrigue', d: 8 },
          { k: 'seed', eventId: 'seed.rancune.retour', min: 4, max: 14, actors: ['tiers'], note: 'celui ou celle qui vous a pris votre place' },
        ],
      )),
      opt('vengeance', 'Vous en prendre au tiers', [
        out(2, (c) => `${n(c.role('tiers'))} quitte la ville avec deux côtes cassées. ${n(c.role('epoux'))} ne vous regarde plus jamais de la même façon.`, [
          { k: 'health', d: -35, who: 'tiers' },
          { k: 'rel', to: 'tiers', from: 'tiers', type: 'haine', label: 'celui qui m\'a brisé les côtes', affection: -80, fear: 45 },
          { k: 'rel', to: 'epoux', affection: -30, fear: 35 },
          { k: 'trait', add: 'violent' },
          { k: 'hidden', id: 'karma', d: -12 },
          { k: 'chronicle', kind: 'violence', importance: 3, data: { quoi: 'régla une affaire de lit à coups de poing' } },
        ]),
        out(1.2, () => 'Ça tourne mal. La garde s\'en mêle et c\'est vous qu\'on emmène.', [
          { k: 'health', d: -20 },
          { k: 'wealth', d: -600 },
          { k: 'trait', add: 'recherche' },
          { k: 'trait', add: 'notoire' },
        ]),
      ], { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'family.parent_vieux',
    tags: ['famille', 'vieillesse'],
    minAge: 25,
    maxAge: 70,
    weight: 9,
    cooldown: { years: 10, scope: 'character' },
    roles: { parent: pick.parent({ minAge: 55 }) },
    text: (c) =>
      `${n(c.role('parent'))} ne peut plus vivre seul${e(c.role('parent'))}. Personne ne le dit clairement ` +
      `mais tout le monde regarde dans votre direction.`,
    options: [
      opt('prendre', 'Le prendre chez vous', sure(
        (c) => `Vous ${e(c.role('parent')) === 'e' ? 'la' : 'le'} prenez. C'est long, c'est lourd, et vous avez le temps de dire ce qui n'avait jamais été dit.`,
        [
          { k: 'wealth', d: -600 },
          { k: 'rel', to: 'parent', affection: 30, mutual: true },
          { k: 'mood', d: -6 },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'memory', text: 'Les deux dernières années. On a fini par se parler.', salience: 85, tags: ['famille'], actors: ['parent'] },
        ],
      )),
      opt('payer', 'Payer quelqu\'un pour s\'en occuper', sure(
        () => 'Vous payez. C\'est propre, c\'est correct, et vous n\'y allez que trois fois.',
        [{ k: 'wealth', d: -1200 }, { k: 'rel', to: 'parent', from: 'parent', affection: -10 }],
      ), { requires: (c) => c.subject.wealth >= 1200, lockedReason: 'vous n\'avez pas 1 200 sous' }),
      opt('rien', 'Ne rien faire', sure(
        (c) => `Vous ne faites rien. ${n(c.role('parent'))} meurt dans l'année, seul${e(c.role('parent'))}, et vous l'apprenez avec deux semaines de retard.`,
        [
          { k: 'kill', who: 'parent', cause: 'seul, dans une pièce froide' },
          { k: 'hidden', id: 'karma', d: -18 },
          { k: 'memory', text: 'Je n\'y suis pas allé. On me l\'a dit deux semaines après.', salience: 95, tags: ['honte', 'deuil'], actors: ['parent'] },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'family.mort_enfant',
    tags: ['famille', 'deuil'],
    minAge: 20,
    maxAge: 85,
    requires: (c) => c.subject.childrenIds.length > 0,
    weight: 5,
    cooldown: { years: 15, scope: 'character' },
    roles: { enfant: pick.child({ maxAge: 12 }) },
    text: (c) =>
      `${n(c.role('enfant'))} est malade et ça va vite. Le médecin veut une somme que vous n'avez ` +
      `probablement pas, et il ne promet rien.`,
    options: [
      opt('tout', 'Tout donner', [
        out(2.5, (c) => `Ça passe. ${n(c.role('enfant'))} se relève. Vous êtes ruiné et vous vous en fichez complètement.`, [
          { k: 'wealth', d: -2500 },
          { k: 'health', d: 30, who: 'enfant' },
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 45, trust: 50 },
        ]),
        out(2, (c) => `Vous donnez tout et ça ne suffit pas. C'est la pire combinaison possible.`, [
          { k: 'wealth', d: -2500 },
          { k: 'kill', who: 'enfant', cause: 'de la fièvre, à quelques années' },
          { k: 'trait', add: 'endeuille' },
          { k: 'trait', add: 'brise' },
          { k: 'mood', d: -45 },
        ]),
      ]),
      opt('soigner', 'Le veiller vous-même', [
        out((c) => 1 + (c.subject.skills['soin'] ?? 0) / 12, () => 'Vous ne dormez pas pendant onze jours. Le douzième, la fièvre tombe.', [
          { k: 'health', d: 22, who: 'enfant' },
          { k: 'health', d: -12 },
          { k: 'skill', id: 'soin', d: 10 },
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 50, trust: 55 },
        ]),
        out(2, (c) => `Vous ne dormez pas pendant onze jours. Le douzième, c'est fini.`, [
          { k: 'kill', who: 'enfant', cause: 'de la fièvre, veillé jusqu\'au bout' },
          { k: 'trait', add: 'endeuille' },
          { k: 'mood', d: -40 },
          { k: 'memory', text: 'Onze nuits. Je n\'ai pas dormi une seule.', salience: 100, tags: ['deuil'], actors: ['enfant'] },
        ]),
      ]),
    ],
  }),

  ev({
    id: 'family.batard',
    tags: ['famille', 'secret'],
    minAge: 18,
    maxAge: 60,
    weight: 5,
    cooldown: { years: 20, scope: 'character' },
    roles: {
      autre: pick.first(
        pick.known({ minAge: 18, maxAge: 45, excludeSpouse: true }),
        pick.generate({ minAge: 19, maxAge: 40 }),
      ),
    },
    text: (c) =>
      `${n(c.role('autre'))} vous fait dire qu'il y a un enfant, et que l'enfant est de vous. ` +
      `Vous faites le compte des mois. Le compte tient.`,
    options: [
      opt('reconnaitre', 'Le reconnaître', sure(
        () => 'Vous le reconnaissez. Votre foyer l\'apprend, la ville l\'apprend, et l\'enfant a un nom.',
        [
          { k: 'child', withRole: 'autre' },
          { k: 'wealth', d: -400 },
          { k: 'hidden', id: 'karma', d: 10 },
          { k: 'chronicle', kind: 'revelation', importance: 3, data: { quoi: 'reconnut un enfant né hors mariage' } },
        ],
      ), { hint: 'irréversible' }),
      opt('payer', 'Payer pour que ça reste discret', sure(
        (c) => `Vous payez chaque année. ${n(c.role('autre'))} tient parole. L'enfant grandit ailleurs, avec votre visage.`,
        [
          { k: 'wealth', d: -900 },
          { k: 'flag', name: 'batard_cache', value: true },
          { k: 'rel', to: 'autre', type: 'dette', label: 'le secret', affection: 0, fear: 15, mutual: true },
          { k: 'seed', eventId: 'seed.batard.reclamation', min: 14, max: 32, actors: ['autre'], note: 'l\'enfant que vous avez payé pour cacher' },
        ],
      )),
      opt('nier', 'Nier en bloc', sure(
        (c) => `Vous niez. ${n(c.role('autre'))} ne revient pas. L'enfant grandit quelque part et apprendra un jour qui vous êtes.`,
        [
          { k: 'rel', to: 'autre', from: 'autre', type: 'haine', label: 'celui qui a nié', affection: -75 },
          { k: 'hidden', id: 'karma', d: -15 },
          { k: 'seed', eventId: 'seed.batard.reclamation', min: 16, max: 34, actors: ['autre'], note: 'l\'enfant que vous avez renié' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'family.veuvage',
    tags: ['famille', 'deuil'],
    minAge: 25,
    maxAge: 90,
    requires: (c) => !c.subject.spouseId && c.subject.childrenIds.length > 0,
    weight: 6,
    cooldown: { years: 10, scope: 'character' },
    roles: {
      parti: pick.first(
        pick.local({ minAge: 20, maxAge: 55, where: (o) => !o.spouseId }),
        pick.generate({ minAge: 22, maxAge: 50, bond: { type: 'amitie', label: 'le parti qu\'on vous propose' } }),
      ),
    },
    text: () =>
      'La maison est trop grande maintenant. On vous conseille de vous remarier, on vous le conseille ' +
      'même beaucoup, et la personne qui vous le conseille a toujours quelqu\'un à proposer.',
    options: [
      opt('remarier', 'Se remarier', sure(
        (c) => `Vous épousez ${n(c.role('parti'))}. C'est raisonnable. Ce n'est pas la même chose et vous ne le direz jamais à voix haute.`,
        [
          { k: 'marry', who: 'parti' },
          { k: 'wealth', d: -250 },
          { k: 'mood', d: 8 },
        ],
      )),
      opt('seul', 'Rester seul', sure(
        () => 'Vous restez seul. Les gens finissent par cesser d\'en parler, ce qui est un soulagement et une petite mort.',
        [{ k: 'trait', add: 'solitaire' }, { k: 'stat', stat: 'volonte', d: 4 }, { k: 'mood', d: -8 }],
      )),
    ],
  }),
];
