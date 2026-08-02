import type { ActionDef, Effect } from '@ed/engine';
import { hasTrait } from '@ed/engine';
import { JOBS } from './jobs.js';

/**
 * Une action volontaire par an (doc 05 §2). Elles ne remplacent pas les
 * événements : elles donnent au joueur une prise sur sa vie entre deux
 * occasions qu'il n'a pas choisies.
 */
export const ACTIONS: ActionDef[] = [
  {
    id: 'travail_acharne',
    label: 'Travailler comme un forcené',
    category: 'travail',
    desc: 'Plus d\'heures, plus de revenus, moins de santé.',
    minAge: 10,
    requires: (c) => !!c.subject.jobId,
    run: (c) => {
      const job = JOBS[c.subject.jobId ?? ''];
      const gain = Math.round((job?.income ?? 200) * 0.55);
      const trained = Object.keys(job?.trains ?? {})[0];
      const fx: Effect[] = [
        { k: 'wealth', d: gain },
        { k: 'health', d: -5 },
        { k: 'mood', d: -4 },
      ];
      if (trained) fx.push({ k: 'skill', id: trained, d: 2.5 });
      return { text: `Vous y laissez vos nuits. ${gain} sous de plus, et un dos qui proteste.`, effects: fx };
    },
  },
  {
    id: 'chercher_travail',
    label: 'Chercher du travail',
    category: 'travail',
    desc: 'Faire le tour des ateliers, des quais et des comptoirs.',
    minAge: 8,
    requires: (c) => !c.subject.jobId,
    run: (c) => {
      const age = c.age;
      const eligible = Object.values(JOBS).filter(
        (j) => j.minAge <= age && (!j.requires || j.requires(c)),
      );
      const rng = c.rng;
      const found = rng.chance(0.35 + c.subject.stats.charisme / 300)
        ? rng.weighted(eligible, (j) => 1 / (1 + j.prestige / 12))
        : null;
      if (!found) {
        return {
          text: 'Rien. Partout la même phrase : « repasse au printemps ».',
          effects: [{ k: 'mood', d: -6 }],
        };
      }
      return {
        text: `On vous prend comme ${found.label.toLowerCase()}. ${found.desc}`,
        effects: [{ k: 'job', id: found.id }],
      };
    },
  },
  {
    id: 'entrainement',
    label: 'Entraîner votre corps',
    category: 'corps',
    desc: 'Force et endurance, à la dure.',
    minAge: 8,
    run: (c) => {
      const gain = c.rng.int(1, 3);
      return {
        text: 'Vous portez, vous courez, vous recommencez. Le corps suit, lentement.',
        effects: [
          { k: 'stat', stat: 'force', d: gain },
          { k: 'stat', stat: 'endurance', d: gain },
          { k: 'health', d: 3 },
          { k: 'skill', id: 'lutte', d: 2 },
        ],
      };
    },
  },
  {
    id: 'etudier',
    label: 'Étudier',
    category: 'esprit',
    desc: 'Lire, compter, apprendre. Il faut savoir lire, ou payer quelqu\'un.',
    minAge: 6,
    run: (c) => {
      const lettre = hasTrait(c.subject, 'lettre') || (c.subject.skills['lettres'] ?? 0) > 10;
      if (!lettre) {
        return {
          text: 'Vous payez un scribe pour vous apprendre les rudiments. C\'est lent et humiliant.',
          effects: [
            { k: 'wealth', d: -80 },
            { k: 'skill', id: 'lettres', d: 6 },
          ],
        };
      }
      return {
        text: 'Vous lisez tout ce qui vous tombe sous la main, y compris ce qui ne vous concerne pas.',
        effects: [
          { k: 'skill', id: 'lettres', d: 4 },
          { k: 'skill', id: 'calcul', d: 2 },
          { k: 'stat', stat: 'intelligence', d: c.rng.int(0, 2) },
        ],
      };
    },
  },
  {
    id: 'socialiser',
    label: 'Fréquenter du monde',
    category: 'social',
    desc: 'Les tavernes, les places, les enterrements. C\'est là qu\'on se fait connaître.',
    minAge: 10,
    run: (c) => {
      const rng = c.rng;
      const fx: Effect[] = [
        { k: 'wealth', d: -40 },
        { k: 'mood', d: 8 },
        { k: 'skill', id: 'rhetorique', d: 2 },
        { k: 'hidden', id: 'influence', d: 2 },
      ];
      if (rng.chance(0.3)) {
        return {
          text: 'Vous rencontrez quelqu\'un qui compte. On se souviendra de votre nom.',
          effects: [...fx, { k: 'hidden', id: 'influence', d: 5 }, { k: 'stat', stat: 'charisme', d: 1 }],
        };
      }
      return { text: 'Une année de conversations sans importance, ce qui en a plus qu\'on ne croit.', effects: fx };
    },
  },
  {
    id: 'voler',
    label: 'Voler',
    category: 'crime',
    desc: 'Prendre à ceux qui ont. Le risque monte avec l\'habitude.',
    minAge: 7,
    run: (c) => {
      const rng = c.rng;
      const skill = c.subject.skills['vol'] ?? 0;
      const success = rng.chance(0.35 + skill / 200 + c.subject.stats.agilite / 300);
      if (success) {
        const loot = Math.round(80 + skill * 12 + rng.int(0, 200));
        return {
          text: `Une année discrète et rentable. ${loot} sous que personne ne réclamera.`,
          effects: [
            { k: 'wealth', d: loot },
            { k: 'skill', id: 'vol', d: 3 },
            { k: 'hidden', id: 'karma', d: -4 },
          ],
        };
      }
      return {
        text: 'On vous prend la main dans le sac. Vous vous en sortez, mais votre visage est connu.',
        effects: [
          { k: 'health', d: -10 },
          { k: 'trait', add: 'recherche' },
          { k: 'skill', id: 'vol', d: 1 },
          { k: 'seed', eventId: 'seed.justice.rattrape', min: 1, max: 6, actors: [], note: 'le vol raté' },
        ],
      };
    },
  },
  {
    id: 'mendier',
    label: 'Mendier',
    category: 'crime',
    desc: 'Tendre la main. Ça rapporte peu et ça coûte autre chose.',
    minAge: 4,
    hidden: (c) => c.subject.wealth > 2000,
    run: (c) => {
      const gain = Math.round(20 + c.subject.stats.charisme * 1.2 + c.rng.int(0, 40));
      return {
        text: `Une année de mains tendues. ${gain} sous, et un peu moins de vous-même.`,
        effects: [
          { k: 'wealth', d: gain },
          { k: 'mood', d: -8 },
          { k: 'stat', stat: 'charisme', d: c.rng.chance(0.3) ? 1 : 0 },
        ],
      };
    },
  },
  {
    id: 'soigner',
    label: 'Prendre soin de vous',
    category: 'corps',
    desc: 'Manger correctement, dormir, payer l\'herboriste.',
    minAge: 5,
    run: () => ({
      text: 'Une année sans excès. Le corps vous rend ce que vous lui donnez.',
      effects: [
        { k: 'health', d: 14 },
        { k: 'mood', d: 6 },
        { k: 'wealth', d: -150 },
      ],
    }),
  },
  {
    id: 'economiser',
    label: 'Vivre de rien',
    category: 'travail',
    desc: 'Réduire tout au minimum et mettre de côté.',
    minAge: 12,
    run: () => ({
      text: 'Un hiver sans feu, un pain de moins par semaine. La bourse grossit.',
      effects: [
        { k: 'wealth', d: 220 },
        { k: 'health', d: -6 },
        { k: 'mood', d: -8 },
      ],
    }),
  },
  {
    id: 'voyager',
    label: 'Prendre la route',
    category: 'voie',
    desc: 'Changer de ville. Tout recommencer ailleurs.',
    minAge: 12,
    run: (c) => {
      const options = ['vardhen', 'basvardhen', 'kaleth', 'orin', 'roc', 'marches'].filter(
        (s) => s !== c.subject.settlement,
      );
      const dest = c.rng.pick(options);
      const name = c.world.settlement(dest)?.name ?? dest;
      return {
        text: `Trois semaines de route. Vous arrivez à ${name} sans y connaître personne.`,
        effects: [
          { k: 'move', settlement: dest },
          { k: 'wealth', d: -120 },
          { k: 'skill', id: 'survie', d: 3 },
          { k: 'hidden', id: 'ambition', d: 3 },
        ],
      };
    },
  },
  {
    id: 'courtiser',
    label: 'Chercher à vous établir',
    category: 'social',
    desc: 'Se faire voir, se faire présenter, se faire remarquer.',
    minAge: 15,
    requires: (c) => !c.subject.spouseId,
    run: (c) => {
      const chance = 0.25 + c.subject.stats.charisme / 250 + (c.subject.wealth > 2000 ? 0.12 : 0);
      if (!c.rng.chance(chance)) {
        return {
          text: 'Vous vous montrez, on vous regarde poliment, et rien ne se passe.',
          effects: [{ k: 'mood', d: -5 }, { k: 'skill', id: 'rhetorique', d: 1 }],
        };
      }
      return {
        text: 'Quelqu\'un s\'intéresse à vous. Ça pourrait aller quelque part.',
        effects: [
          { k: 'flag', name: 'courtise', value: true },
          { k: 'mood', d: 10 },
          { k: 'stat', stat: 'charisme', d: 1 },
        ],
      };
    },
  },
  {
    id: 'comploter',
    label: 'Tisser des liens utiles',
    category: 'social',
    desc: 'Savoir qui doit quoi à qui, et s\'en servir.',
    minAge: 14,
    run: (c) => ({
      text: 'Vous écoutez plus que vous ne parlez. En un an, vous savez des choses.',
      effects: [
        { k: 'skill', id: 'intrigue', d: 4 },
        { k: 'hidden', id: 'influence', d: 4 },
        { k: 'wealth', d: -60 },
        ...(c.rng.chance(0.2) ? ([{ k: 'flag', name: 'secret_detenu', value: true }] as Effect[]) : []),
      ],
    }),
  },
  {
    id: 'prier',
    label: 'Prier',
    category: 'esprit',
    desc: 'Ce qui tient debout quand rien d\'autre ne tient.',
    minAge: 6,
    run: (c) => ({
      text: c.rng.chance(0.15)
        ? 'Quelque chose répond, ou vous le croyez, et la différence n\'a aucune importance.'
        : 'Rien ne répond. Vous continuez quand même, et ça vous tient debout.',
      effects: [
        { k: 'stat', stat: 'volonte', d: c.rng.int(0, 2) },
        { k: 'mood', d: 7 },
        { k: 'hidden', id: 'destinee', d: 1 },
      ],
    }),
  },
  {
    id: 'reposer',
    label: 'Ne rien faire de particulier',
    category: 'corps',
    desc: 'Laisser l\'année passer.',
    run: () => ({
      text: 'L\'année passe sans que vous la forciez.',
      effects: [{ k: 'health', d: 4 }, { k: 'mood', d: 3 }],
    }),
  },
  {
    id: 'entrainer_arme',
    label: 'Vous entraîner aux armes',
    category: 'corps',
    desc: 'La lame, l\'arc, la lutte. Il faut du temps et un maître.',
    minAge: 12,
    run: (c) => ({
      text: 'Deux heures par jour, tous les jours. Vous prenez des coups pour apprendre à ne plus en prendre.',
      effects: [
        { k: 'skill', id: 'lame', d: 4 },
        { k: 'skill', id: 'lutte', d: 2 },
        { k: 'stat', stat: 'force', d: c.rng.int(0, 2) },
        { k: 'wealth', d: -100 },
        { k: 'health', d: -3 },
      ],
    }),
  },
  {
    id: 'investir',
    label: 'Placer votre argent',
    category: 'travail',
    desc: 'Une part de cargaison, un prêt, une caution. Ça peut monter ou tout perdre.',
    minAge: 16,
    requires: (c) => c.subject.wealth >= 500,
    run: (c) => {
      const mise = Math.round(c.subject.wealth * 0.4);
      const roll = c.rng.float();
      if (roll < 0.45) {
        const gain = Math.round(mise * (0.3 + c.rng.float() * 0.7));
        return {
          text: `La cargaison arrive. ${gain} sous de bénéfice.`,
          effects: [{ k: 'wealth', d: gain }, { k: 'skill', id: 'negoce', d: 3 }],
        };
      }
      if (roll < 0.8) {
        return {
          text: 'Rien ne bouge. Vous récupérez votre mise à quelques sous près.',
          effects: [{ k: 'skill', id: 'negoce', d: 2 }],
        };
      }
      return {
        text: `Perdu. ${mise} sous partis avec une coque au fond de la rade.`,
        effects: [{ k: 'wealth', d: -mise }, { k: 'skill', id: 'negoce', d: 3 }, { k: 'mood', d: -12 }],
      };
    },
  },
];
