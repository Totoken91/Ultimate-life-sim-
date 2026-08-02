import { pick } from '@ed/engine';
import { e, ev, n, opt, out, sure } from './_helpers.js';

/**
 * Vieillesse et fin. La rareté du dernier palier d'une vie, c'est le temps —
 * et ce qu'on transmet avant de le perdre (doc 00 §1).
 */
export const LATE_EVENTS = [
  ev({
    id: 'late.corps',
    tags: ['vieillesse', 'corps'],
    minAge: 55,
    weight: 12,
    cooldown: { years: 6, scope: 'character' },
    text: (c) =>
      `Vous avez ${c.age} ans. Ce matin, un geste que vous faisiez sans y penser depuis quarante ans ` +
      `ne passe plus. Ce n'est pas douloureux. C'est juste fini.`,
    options: [
      opt('adapter', 'Vous adapter', sure(
        () => 'Vous trouvez une autre façon de faire. Vous en trouverez d\'autres. C\'est ça, vieillir.',
        [{ k: 'stat', stat: 'volonte', d: 4 }, { k: 'mood', d: -4 }],
      )),
      opt('forcer', 'Forcer', sure(
        () => 'Vous forcez. Vous y arrivez. Vous payez la semaine suivante et vous recommencez quand même.',
        [{ k: 'health', d: -10 }, { k: 'stat', stat: 'endurance', d: 2 }, { k: 'trait', add: 'obstine' }],
      )),
    ],
  }),

  ev({
    id: 'late.transmission',
    tags: ['vieillesse', 'famille', 'dynastie'],
    minAge: 50,
    requires: (c) => c.subject.childrenIds.length > 0,
    weight: 12,
    cooldown: { years: 10, scope: 'character' },
    roles: { enfant: pick.child({ minAge: 14 }) },
    text: (c) =>
      `${n(c.role('enfant'))} a l'âge. Il faut décider ce que vous transmettez, et à qui, pendant que ` +
      `vous êtes encore en état de décider.`,
    options: [
      opt('tout', 'Tout lui apprendre, sans rien garder', sure(
        (c) => `Vous donnez tout : le métier, les contacts, ce que vous devez et à qui. ${n(c.role('enfant'))} sera meilleur${e(c.role('enfant'))} que vous.`,
        [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: 40, respect: 55, trust: 50 },
          { k: 'skill', id: 'commandement', d: 8, who: 'enfant' },
          { k: 'stat', stat: 'intelligence', d: 4, who: 'enfant' },
          { k: 'flag', name: 'heritier_forme', value: true },
          { k: 'chronicle', kind: 'ascension', importance: 3, actors: ['enfant'], data: { quoi: 'reçut tout de son parent' } },
        ],
      )),
      opt('epreuve', 'Le mettre à l\'épreuve avant', [
        out(2, (c) => `${n(c.role('enfant'))} réussit. Vous transmettez, et cette fois ${e(c.role('enfant')) === 'e' ? 'elle' : 'il'} sait que ça se mérite.`, [
          { k: 'rel', to: 'enfant', from: 'enfant', respect: 45, affection: 10 },
          { k: 'stat', stat: 'volonte', d: 6, who: 'enfant' },
          { k: 'flag', name: 'heritier_forme', value: true },
        ]),
        out(1.4, (c) => `${n(c.role('enfant'))} échoue et le sait. Ça reste entre vous deux et ça reste pour toujours.`, [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: -30, respect: 15 },
          { k: 'seed', eventId: 'seed.enfant.rival', min: 3, max: 14, actors: ['enfant'], note: 'l\'épreuve qu\'il a ratée' },
        ]),
      ]),
      opt('rien', 'Ne rien transmettre', sure(
        () => 'Vous gardez tout. Ce que vous savez mourra avec vous et c\'est peut-être ce que vous vouliez.',
        [
          { k: 'rel', to: 'enfant', from: 'enfant', affection: -35, respect: -20 },
          { k: 'trait', add: 'avare' },
        ],
      ), { hint: 'cruel' }),
    ],
  }),

  ev({
    id: 'late.regret',
    tags: ['vieillesse', 'memoire'],
    minAge: 58,
    weight: 10,
    cooldown: { years: 8, scope: 'character' },
    text: () =>
      'Vous y repensez de plus en plus souvent. Toujours la même scène, toujours le même moment, ' +
      'et la même impression qu\'il aurait suffi de peu.',
    options: [
      opt('reparer', 'Essayer de réparer', [
        out(2, () => 'Vous écrivez, vous allez voir, vous dites ce qu\'il fallait dire. Ça ne répare rien et ça change tout.', [
          { k: 'mood', d: 22 },
          { k: 'hidden', id: 'karma', d: 12 },
          { k: 'memory', text: 'Je suis allé le dire. Trop tard, mais je l\'ai dit.', salience: 85, tags: ['paix'] },
        ]),
        out(1.3, () => 'Il n\'y a plus personne à qui le dire. Vous restez avec la phrase dans la bouche.', [
          { k: 'mood', d: -14 },
          { k: 'trait', add: 'hante' },
        ]),
      ]),
      opt('accepter', 'Accepter', sure(
        () => 'Vous décidez de vivre avec. C\'est une décision, pas une résignation, et la nuance compte.',
        [{ k: 'stat', stat: 'volonte', d: 5 }, { k: 'mood', d: 8 }],
      )),
    ],
  }),

  ev({
    id: 'late.testament',
    tags: ['vieillesse', 'dynastie'],
    minAge: 60,
    weight: 11,
    once: 'life',
    text: (c) =>
      `Un notaire de passage propose de coucher vos volontés par écrit. Vous avez ${c.age} ans ` +
      `et vous savez très bien pourquoi il passe justement maintenant.`,
    options: [
      opt('aine', 'Tout à l\'aîné', sure(
        () => 'Vous suivez l\'usage. C\'est net, ça ne se discute pas, et les autres l\'apprendront à votre enterrement.',
        [
          { k: 'flag', name: 'testament', value: 'aine' },
          { k: 'wealth', d: -100 },
          { k: 'seed', eventId: 'seed.succession.jalousie', min: 1, max: 8, actors: [], note: 'le testament' },
        ],
      )),
      opt('partage', 'Partager entre tous', sure(
        () => 'Vous partagez. Personne n\'est content, ce qui prouve peut-être que c\'était juste.',
        [{ k: 'flag', name: 'testament', value: 'partage' }, { k: 'wealth', d: -100 }],
      )),
      opt('merite', 'Au plus capable, quel qu\'il soit', sure(
        () => 'Vous nommez celui que vous jugez le meilleur. Vous savez exactement ce que ça va provoquer.',
        [
          { k: 'flag', name: 'testament', value: 'merite' },
          { k: 'wealth', d: -100 },
          { k: 'seed', eventId: 'seed.succession.jalousie', min: 1, max: 6, actors: [], note: 'le testament au mérite' },
        ],
      )),
      opt('rien', 'Ne rien écrire', sure(
        () => 'Vous renvoyez le notaire. Ils se débrouilleront. C\'est peut-être la dernière chose que vous leur ferez.',
        [{ k: 'seed', eventId: 'seed.succession.jalousie', min: 1, max: 5, actors: [], note: 'l\'absence de testament' }],
      )),
    ],
  }),

  ev({
    id: 'late.veille',
    tags: ['vieillesse', 'mort'],
    minAge: 65,
    requires: (c) => c.subject.health < 45,
    weight: 14,
    cooldown: { years: 5, scope: 'character' },
    text: () =>
      'Vous ne vous relevez plus tous les jours. On vient vous voir plus souvent, et on parle plus doucement ' +
      'près de la porte.',
    options: [
      opt('parler', 'Faire venir tout le monde et parler', sure(
        () => 'Vous dites ce que vous avez à dire. Certains pleurent, certains non. Vous avez été entendu.',
        [
          { k: 'mood', d: 25 },
          { k: 'hidden', id: 'karma', d: 10 },
          { k: 'chronicle', kind: 'note', importance: 4, data: { texte: 'Il fit venir les siens et dit ce qu\'il avait à dire.' } },
        ],
      )),
      opt('seul', 'Demander qu\'on vous laisse', sure(
        () => 'Vous demandez le silence. On vous l\'accorde. C\'est ce que vous vouliez et c\'est très long.',
        [{ k: 'mood', d: -10 }, { k: 'stat', stat: 'volonte', d: 4 }],
      )),
      opt('lutter', 'Ne pas vous coucher', sure(
        () => 'Vous vous levez chaque matin, même quand ça n\'a plus de sens. Surtout quand ça n\'a plus de sens.',
        [{ k: 'health', d: 8 }, { k: 'trait', add: 'obstine' }, { k: 'stat', stat: 'volonte', d: 6 }],
      )),
    ],
  }),

  ev({
    id: 'late.jeune',
    tags: ['vieillesse', 'transmission'],
    minAge: 55,
    weight: 8,
    cooldown: { years: 12, scope: 'character' },
    roles: {
      jeune: pick.first(
        pick.local({ minAge: 12, maxAge: 24 }),
        pick.generate({ minAge: 13, maxAge: 22, bond: { type: 'mentorat', label: 'le gamin qui pose des questions' } }),
      ),
    },
    text: (c) =>
      `${n(c.role('jeune'))} vous pose la question qu'on vous a posée il y a cinquante ans, avec le ` +
      `même air de croire qu'il y a une réponse.`,
    options: [
      opt('vrai', 'Dire la vérité', sure(
        () => 'Vous dites la vérité, qui est décevante. Le gamin s\'en va. Il reviendra dans dix ans, et il aura compris.',
        [
          { k: 'rel', to: 'jeune', type: 'mentorat', label: 'le gamin des questions', affection: 20, mutual: true },
          { k: 'hidden', id: 'influence', d: 6 },
        ],
      )),
      opt('mentir', 'Mentir un peu, pour lui laisser ça', sure(
        () => 'Vous embellissez. Le gamin repart avec des étoiles. Vous ne savez pas si vous lui avez rendu service.',
        [{ k: 'rel', to: 'jeune', from: 'jeune', affection: 35, respect: 40 }, { k: 'mood', d: 8 }],
      )),
    ],
  }),

  ev({
    id: 'late.bilan',
    tags: ['vieillesse', 'interieur'],
    minAge: 62,
    weight: 9,
    cooldown: { years: 9, scope: 'character' },
    text: (c) =>
      `Une nuit sans sommeil, comme souvent maintenant. Vous faites le compte : ce que vous avez, ` +
      `ce que vous avez perdu, ce que vous avez fait faire aux autres.`,
    options: [
      opt('fier', 'Vous en trouver quitte', sure(
        () => 'Vous vous en trouvez quitte. C\'est peut-être faux. Ça vous permet de dormir.',
        [{ k: 'mood', d: 16 }, { k: 'health', d: 4 }],
      )),
      opt('lucide', 'Regarder tout, sans arrangement', sure(
        () => 'Vous regardez tout, y compris ce que vous évitiez. Vous ne dormez pas, mais vous vous levez plus droit.',
        [{ k: 'stat', stat: 'volonte', d: 8 }, { k: 'mood', d: -12 }, { k: 'hidden', id: 'karma', d: 6 }],
      )),
    ],
  }),
];
