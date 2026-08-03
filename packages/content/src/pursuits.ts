import type { Effect, PursuitCtx, PursuitDef } from '@ed/engine';
import { classRank, pick, shortName } from '@ed/engine';

/**
 * Les entreprises du Rivage (doc 16 §2).
 *
 * Une entreprise n'est pas une action longue : c'est une **histoire à laquelle
 * on donne du temps**. Elle avance par à-coups, elle peut caler, elle peut mal
 * tourner, et le récit qu'elle produit en chemin vaut souvent plus que ce
 * qu'elle rapporte à la fin.
 */

const P = (d: PursuitDef): PursuitDef => d;

const them = (c: PursuitCtx): string => {
  const t = c.maybe('cible');
  return t ? shortName(t) : 'l\'autre';
};

/** Un fil que l'on tire d'année en année : ce que l'on a vu la dernière fois. */
const step = (c: PursuitCtx, lignes: readonly string[]): string => {
  const i = Math.min(lignes.length - 1, Math.floor((c.pursuit.invested / Math.max(1, c.pursuit.needed)) * lignes.length));
  return lignes[i] ?? lignes[lignes.length - 1] ?? '';
};

export const PURSUITS: PursuitDef[] = [
  // ─── savoir ───────────────────────────────────────────────────────────────

  P({
    id: 'lire',
    label: 'Apprendre à lire',
    kind: 'savoir',
    cost: 6,
    minAge: 6,
    requires: (c) => (c.subject.skills['lettres'] ?? 0) < 30,
    intro: () =>
      'Vous avez trouvé quelqu\'un qui sait, et qui veut bien. Ce sera long et ' +
      'humiliant, et personne autour de vous n\'en voit l\'intérêt.',
    beat: (c) => ({
      text: step(c, [
        'Les lettres ne veulent rien dire. Vous recopiez des formes.',
        'Vous reconnaissez votre nom. C\'est peu et c\'est immense.',
        'Vous lisez lentement, à voix haute, en suivant du doigt.',
        'Vous lisez sans bouger les lèvres. On vous regarde autrement.',
      ]),
      effects: [{ k: 'skill', id: 'lettres', d: 6 }],
    }),
    done: () => ({
      text:
        'Vous lisez. Le monde vient de doubler de taille, et vous ne pourrez ' +
        'plus jamais faire semblant de ne pas comprendre ce qui est écrit.',
      effects: [
        { k: 'trait', add: 'lettre' },
        { k: 'skill', id: 'lettres', d: 20 },
        { k: 'stat', stat: 'intelligence', d: 4 },
        { k: 'chronicle', kind: 'revelation', importance: 3, data: { quoi: 'à lire' } },
      ],
    }),
    tags: ['savoir'],
  }),

  P({
    id: 'metier_maitrise',
    label: 'Devenir bon à quelque chose',
    kind: 'metier',
    cost: 8,
    minAge: 12,
    requires: (c) => !!c.subject.jobId,
    intro: (c) => {
      const job = c.subject.jobId ? c.ruleset.jobs[c.subject.jobId] : undefined;
      return `Vous décidez d'être vraiment ${job?.label.toLowerCase() ?? 'bon'}, et pas seulement de l'être.`;
    },
    beat: (c) => {
      const job = c.subject.jobId ? c.ruleset.jobs[c.subject.jobId] : undefined;
      const skillId = job ? Object.keys(job.trains)[0] : undefined;
      const fx: Effect[] = [];
      if (skillId) fx.push({ k: 'skill', id: skillId, d: 7 });
      return {
        text: step(c, [
          'Vous refaites les gestes jusqu\'à ne plus y penser.',
          'Vous voyez ce qui cloche chez les autres. Vous vous taisez.',
          'On vous demande votre avis. C\'est nouveau.',
          'Ce que vous faites tient. On commence à vous nommer.',
        ]),
        effects: fx,
      };
    },
    done: (c) => {
      const job = c.subject.jobId ? c.ruleset.jobs[c.subject.jobId] : undefined;
      const skillId = job ? Object.keys(job.trains)[0] : undefined;
      const fx: Effect[] = [
        { k: 'hidden', id: 'influence', d: 8 },
        { k: 'wealth', d: Math.max(40, Math.round(c.subject.wealth * 0.15)) },
      ];
      if (skillId) fx.push({ k: 'skill', id: skillId, d: 18 });
      return {
        text: `On ne dit plus « quelqu'un qui fait ça ». On dit votre nom.`,
        effects: fx,
      };
    },
    tags: ['travail'],
  }),

  // ─── coeur ────────────────────────────────────────────────────────────────

  P({
    id: 'courtiser',
    label: 'Faire la cour à quelqu\'un',
    kind: 'coeur',
    cost: 5,
    minAge: 15,
    requires: (c) => !c.subject.spouseId,
    role: pick.local({ minAge: 15, maxAge: 55 }),
    intro: (c) => `Vous commencez à tourner autour de ${them(c)}, mal, comme tout le monde.`,
    beat: (c) => ({
      text: step(c, [
        `${them(c)} vous a répondu. C'était court.`,
        `Vous avez marché ensemble. Vous ne savez plus de quoi vous avez parlé.`,
        `On vous a vus deux fois. Les gens commencent à dire des choses.`,
        `${them(c)} vous attend, maintenant. Ça change tout.`,
      ]),
      effects: [
        { k: 'rel', to: 'cible', type: 'amour', label: 'que je regarde', affection: 14, trust: 5, mutual: true },
      ],
    }),
    hazard: {
      chance: (c) => 0.16 - c.subject.stats.charisme / 900,
      beat: (c) => ({
        text: `Quelqu'un d'autre tournait aussi autour de ${them(c)}. Vous l'apprenez mal.`,
        effects: [{ k: 'rel', to: 'cible', affection: -10 }, { k: 'mood', d: -8 }],
        addNeeded: 2,
      }),
    },
    done: (c) => ({
      text: `${them(c)} a dit oui. Le reste vous appartient.`,
      effects: [
        { k: 'marry', who: 'cible' },
        { k: 'mood', d: 18 },
      ],
    }),
    quit: (c) => ({
      text: `Vous cessez de tourner autour de ${them(c)}. Personne n'en parlera.`,
      effects: [{ k: 'rel', to: 'cible', affection: -12, mutual: true }],
    }),
    tags: ['amour'],
  }),

  P({
    id: 'elever',
    label: 'Élever un enfant pour de bon',
    kind: 'coeur',
    cost: 7,
    minAge: 16,
    role: pick.child({ maxAge: 14 }),
    intro: (c) => `Vous décidez que ${them(c)} ne grandira pas tout seul.`,
    beat: (c) => ({
      text: step(c, [
        `Vous êtes là le soir. C'est déjà plus que ce que vous avez eu.`,
        `Vous lui montrez des choses. Il en retient la moitié, mal.`,
        `Il vous contredit. Vous découvrez que ça vous fait plaisir.`,
        `Il commence à ressembler à quelqu'un que vous n'avez pas choisi.`,
      ]),
      effects: [
        { k: 'rel', to: 'cible', affection: 10, trust: 8, mutual: true },
        { k: 'stat', stat: 'volonte', d: 1, who: 'cible' },
      ],
    }),
    done: (c) => ({
      text: `${them(c)} est quelqu'un. Vous n'y êtes pas pour rien, et vous ne saurez jamais pour combien.`,
      effects: [
        { k: 'stat', stat: 'intelligence', d: 5, who: 'cible' },
        { k: 'stat', stat: 'volonte', d: 5, who: 'cible' },
        { k: 'hidden', id: 'potentiel', d: 10, who: 'cible' },
        { k: 'rel', to: 'cible', affection: 20, trust: 20, mutual: true },
        { k: 'chronicle', kind: 'note', importance: 3, actors: ['subject', 'cible'], data: { texte: 'Un enfant fut élevé, vraiment.' } },
      ],
    }),
    tags: ['famille'],
  }),

  // ─── pouvoir ──────────────────────────────────────────────────────────────

  P({
    id: 'se_faire_un_nom',
    label: 'Se faire un nom',
    kind: 'pouvoir',
    cost: 10,
    minAge: 16,
    requires: (c) => !c.subject.epithet,
    intro: () => 'Vous voulez qu\'on sache qui vous êtes sans qu\'on ait à demander.',
    beat: (c) => ({
      text: step(c, [
        'Vous vous montrez là où l\'on compte les gens.',
        'On vous salue. On ne sait pas encore pourquoi.',
        'Votre nom circule dans des bouches que vous ne connaissez pas.',
        'On raconte sur vous des choses fausses. C\'est bon signe.',
      ]),
      effects: [{ k: 'hidden', id: 'influence', d: 5 }],
    }),
    hazard: {
      chance: () => 0.14,
      beat: () => ({
        text: 'On raconte sur vous quelque chose de laid, et c\'est à moitié vrai.',
        effects: [{ k: 'hidden', id: 'influence', d: -6 }, { k: 'mood', d: -6 }],
        addNeeded: 2,
      }),
    },
    done: (c) => ({
      text: 'On vous appelle autrement, maintenant. Vous n\'avez pas choisi le mot.',
      effects: [
        { k: 'hidden', id: 'influence', d: 16 },
        { k: 'trait', add: 'notoire' },
        {
          k: 'memory',
          text: `On a commencé à m'appeler autrement, à ${c.world.settlement(c.subject.settlement)?.name ?? 'la ville'}.`,
          salience: 65,
          tags: ['renom'],
        },
      ],
    }),
    tags: ['renom'],
  }),

  P({
    id: 'rassembler',
    label: 'Se faire des hommes',
    kind: 'pouvoir',
    cost: 9,
    minAge: 18,
    requires: (c) => c.subject.hidden.influence >= 15,
    intro: () =>
      'Vous commencez à parler à ceux qui n\'ont rien et qui savent se taire. ' +
      'C\'est comme ça que tout commence.',
    beat: (c) => {
      const rng = c.rng.fork('rassembler', c.pursuit.invested);
      const recrue = pick.local({ minAge: 15 })(c);
      const fx: Effect[] = [{ k: 'hidden', id: 'influence', d: 4 }];
      if (recrue && rng.chance(0.65)) {
        c.world.relations.ensure(recrue.id, c.subject.id, 'serment', 'mon chef', c.world.year);
        c.world.relations.modify(recrue.id, c.subject.id, { respect: 20, trust: 12 });
        c.world.relations.ensure(c.subject.id, recrue.id, 'serment', 'mon homme', c.world.year);
        c.world.relations.modify(c.subject.id, recrue.id, { trust: 10 });
        return { text: `${shortName(recrue)} vous a juré quelque chose. Ça compte.`, effects: fx };
      }
      return {
        text: step(c, [
          'On vous écoute sans s\'engager.',
          'Deux ou trois traînent près de vous quand il y a du grabuge.',
          'On vient vous demander ce qu\'il faut faire.',
          'Ils sont là, maintenant. Il va falloir les nourrir.',
        ]),
        effects: fx,
      };
    },
    done: () => ({
      text:
        'Ce que vous avez autour de vous a un nom, et ce nom est le vôtre. ' +
        'Reste à savoir ce que vous allez en faire.',
      effects: [
        { k: 'hidden', id: 'influence', d: 14 },
        { k: 'path', unlock: 'commandement' },
      ],
    }),
    tags: ['pouvoir'],
  }),

  P({
    id: 'fonder_maison',
    label: 'Fonder une maison',
    kind: 'oeuvre',
    cost: 12,
    minAge: 22,
    requires: (c) => !c.subject.houseId && classRank(c.subject.socialClass) >= 3,
    intro: () =>
      'Vous voulez que votre nom continue après vous. C\'est plus cher que tout le reste.',
    beat: (c) => ({
      text: step(c, [
        'Vous achetez ce qui se garde, pas ce qui se mange.',
        'Vous mariez, vous placez, vous faites des dettes utiles.',
        'On commence à dire « les vôtres » comme si c\'était une chose.',
        'Il ne manque plus qu\'un nom et quelqu\'un pour le porter après vous.',
      ]),
      effects: [{ k: 'wealth', d: -Math.max(80, Math.round(c.subject.wealth * 0.08)) }],
    }),
    done: () => ({
      text: 'La maison est fondée. Ce que vous faites maintenant, d\'autres le paieront.',
      effects: [{ k: 'foundHouse' }, { k: 'hidden', id: 'influence', d: 12 }],
    }),
    tags: ['dynastie'],
  }),

  // ─── ombre ────────────────────────────────────────────────────────────────

  P({
    id: 'vengeance',
    label: 'Préparer sa revanche',
    kind: 'ombre',
    cost: 7,
    minAge: 13,
    role: pick.known({ maxAffection: -25 }),
    intro: (c) => `Vous ne pardonnerez pas à ${them(c)}. Vous vous donnez le temps.`,
    beat: (c) => ({
      text: step(c, [
        `Vous apprenez ses habitudes. Il ne se doute de rien.`,
        `Vous savez à qui il doit de l'argent, et à qui il ment.`,
        `Vous avez quelqu'un près de lui qui vous parle.`,
        `Il ne vous reste plus qu'à choisir le moment.`,
      ]),
      effects: [{ k: 'skill', id: 'intrigue', d: 5 }, { k: 'hidden', id: 'corruption', d: 2 }],
    }),
    hazard: {
      chance: () => 0.12,
      beat: (c) => ({
        text: `${them(c)} a compris que vous le regardiez. Il ne dort plus du même sommeil.`,
        effects: [
          { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'qui me guette', affection: -25, fear: 20 },
        ],
        addNeeded: 2,
      }),
    },
    done: (c) => ({
      text: `Vous tenez ${them(c)}. Ce que vous en ferez ne regarde que vous.`,
      effects: [
        { k: 'flag', name: 'tient_sa_revanche', value: true },
        { k: 'rel', to: 'cible', from: 'cible', fear: 45, trust: -30 },
        { k: 'hidden', id: 'influence', d: 6 },
        { k: 'chronicle', kind: 'revelation', importance: 3, actors: ['subject', 'cible'], data: { quoi: 'de quoi tenir un homme' } },
      ],
    }),
    tags: ['vengeance', 'intrigue'],
  }),

  P({
    id: 'fortune',
    label: 'Monter une affaire',
    kind: 'metier',
    cost: 9,
    minAge: 15,
    requires: (c) => c.subject.wealth >= 120,
    intro: () => 'Vous mettez de côté, vous achetez bas, vous attendez. C\'est tout le secret et c\'est long.',
    beat: (c) => {
      const dom = c.world.domainAt(c.subject.settlement);
      const prixVivres = dom?.prices['vivres'] ?? 12;
      // On gagne d'autant plus qu'on a acheté quand c'était bas.
      const gain = Math.round((c.subject.wealth * 0.12 + 40) * (12 / Math.max(4, prixVivres)));
      return {
        text: step(c, [
          'Vous achetez ce que personne ne veut encore.',
          'Vous revendez au bon moment. Ça a marché une fois.',
          'Vous avez un entrepôt, ou ce qui y ressemble.',
          'Des gens travaillent pour vous sans le savoir tout à fait.',
        ]),
        effects: [{ k: 'wealth', d: gain }, { k: 'skill', id: 'negoce', d: 5 }],
      };
    },
    hazard: {
      chance: () => 0.18,
      beat: (c) => ({
        text: 'Une cargaison ne revient pas. Personne ne sait pourquoi, et c\'est votre problème.',
        effects: [{ k: 'wealth', d: -Math.round(c.subject.wealth * 0.25) }, { k: 'mood', d: -10 }],
        addNeeded: 1,
      }),
    },
    done: (c) => ({
      text: 'L\'affaire tourne sans vous. C\'est la définition d\'une affaire.',
      effects: [
        { k: 'wealth', d: Math.max(600, Math.round(c.subject.wealth * 0.6)) },
        { k: 'skill', id: 'negoce', d: 12 },
        { k: 'hidden', id: 'influence', d: 6 },
      ],
    }),
    tags: ['negoce'],
  }),

  P({
    id: 'corps',
    label: 'Se forger un corps',
    kind: 'oeuvre',
    cost: 6,
    minAge: 10,
    maxAge: 55,
    intro: () => 'Vous décidez que votre corps sera une chose sur laquelle on peut compter.',
    beat: (c) => ({
      text: step(c, [
        'Vous avez mal partout et vous recommencez.',
        'Vous portez ce que vous ne portiez pas.',
        'Les gens vous laissent passer sans y penser.',
        'Votre corps ne vous trahit plus.',
      ]),
      effects: [
        { k: 'stat', stat: 'force', d: 2 },
        { k: 'stat', stat: 'endurance', d: 2 },
        { k: 'skill', id: 'lutte', d: 4 },
      ],
    }),
    done: () => ({
      text: 'Vous êtes solide. Ça se voit avant que vous ayez parlé.',
      effects: [
        { k: 'stat', stat: 'force', d: 6 },
        { k: 'stat', stat: 'endurance', d: 6 },
        { k: 'health', d: 8 },
      ],
    }),
    tags: ['corps'],
  }),

  P({
    id: 'verite',
    label: 'Savoir d\'où l\'on vient',
    kind: 'savoir',
    cost: 5,
    minAge: 12,
    requires: (c) => c.subject.fatherId === null || c.subject.motherId === null,
    intro: () => 'Il manque quelqu\'un dans votre histoire. Vous allez le chercher.',
    beat: (c) => ({
      text: step(c, [
        'Vous posez des questions. On vous répond mal.',
        'Un vieux se souvient d\'une chose, et se tait ensuite.',
        'Les dates ne collent pas avec ce qu\'on vous a dit.',
        'Vous savez presque. C\'est le pire moment.',
      ]),
      effects: [{ k: 'skill', id: 'intrigue', d: 3 }],
    }),
    done: (c) => {
      const rng = c.rng.fork('verite', c.subject.id);
      const dur = rng.chance(0.55);
      return {
        text: dur
          ? 'Vous savez. Ce n\'était pas une belle histoire, et personne ne vous doit rien.'
          : 'Vous savez. Ce n\'est pas ce qu\'on vous avait dit, et c\'est mieux.',
        effects: dur
          ? [
              { k: 'trait', add: 'endurci' },
              { k: 'mood', d: -10 },
              { k: 'hidden', id: 'destinee', d: 8 },
              { k: 'chronicle', kind: 'revelation', importance: 4, data: { quoi: 'd\'où il venait' } },
            ]
          : [
              { k: 'mood', d: 14 },
              { k: 'hidden', id: 'destinee', d: 14 },
              { k: 'chronicle', kind: 'revelation', importance: 4, data: { quoi: 'd\'où il venait' } },
            ],
      };
    },
    tags: ['origine'],
  }),
];
