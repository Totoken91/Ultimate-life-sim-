import type { BirthScenario } from '@ed/engine';

/**
 * 22 scénarios de naissance (doc 03 §2).
 *
 * Trois règles :
 *  - une naissance catastrophique n'est jamais une partie perdue : elle donne
 *    de la Destinée, des traits de survie, et des voies fermées aux nobles ;
 *  - une naissance royale n'est jamais une partie gagnée : elle donne des
 *    rivaux, des obligations et l'impossibilité de disparaître ;
 *  - une naissance sur trois cache une vérité que le joueur ignore. C'est le
 *    meilleur générateur d'histoires du jeu pour un coût dérisoire.
 */
export const BIRTHS: BirthScenario[] = [
  // ─── CATASTROPHE ──────────────────────────────────────────────────────────
  {
    id: 'abandonne',
    label: 'Nourrisson abandonné',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('basvardhen');
      const vieille = ctx.spawn({ age: ctx.rng.int(52, 68), sex: 'f', socialClass: 'miserable' });
      ctx.pair(ctx.player, vieille, 'amitie', 'la vieille', 'le petit', {
        affection: 30,
        trust: 20,
      });
      ctx.remember(
        ctx.player,
        'On m\'a trouvé sous l\'échelle du quai neuf, dans une caisse à poissons.',
        70,
        [vieille],
        ['origine'],
      );
      // Quelqu'un vous a posé là. Un jour, vous saurez qui.
      ctx.seed('seed.truth.origine', 14, 32, [], 'qui vous a abandonné');
      return {
        opening:
          'Vous n\'avez pas de nom. On vous a trouvé dans une caisse, sous l\'échelle du quai neuf, ' +
          'un matin de gel. Une vieille femme sans dents vous a gardé parce que vous ne pleuriez pas.',
        condition: 'trouvé dans une caisse, sans nom',
        family: null,
        socialClass: 'miserable',
        wealth: 0,
        health: 58,
        traits: ['orphelin'],
        hidden: { destinee: 62, ambition: 55 },
      };
    },
  },
  {
    id: 'esclave',
    label: 'Né esclave',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('kaleth');
      const mere = ctx.spawn({ age: ctx.rng.int(19, 30), sex: 'f', socialClass: 'esclave' });
      const maitre = ctx.spawn({ age: ctx.rng.int(38, 58), sex: 'm', socialClass: 'aise' });
      ctx.parentOf(mere, ctx.player);
      ctx.pair(ctx.player, maitre, 'serment', 'le maître', 'la propriété', {
        affection: -30,
        fear: 55,
      });
      ctx.remember(
        ctx.player,
        'Ma mère lavait les sols de la maison Semar. J\'ai appris à marcher entre les seaux.',
        68,
        [mere, maitre],
        ['origine', 'servitude'],
      );
      ctx.seed('seed.esclave.affranchissement', 9, 22, [maitre], 'la question de la liberté');
      return {
        opening:
          'Vous êtes né dans la maison Semar, à Kaleth-la-Blanche. Pas comme fils. Comme bien. ' +
          'Votre mère lave les sols depuis qu\'elle a votre âge, et personne n\'a jamais parlé de fin.',
        condition: 'né en servitude',
        family: null,
        socialClass: 'esclave',
        wealth: 0,
        traits: [],
        hidden: { destinee: 48, ambition: 62, karma: 55 },
      };
    },
  },
  {
    id: 'difforme',
    label: 'Né difforme',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('orin');
      const mere = ctx.spawn({ age: ctx.rng.int(20, 34), sex: 'f', socialClass: 'pauvre' });
      const pere = ctx.spawn({ age: ctx.rng.int(24, 42), sex: 'm', socialClass: 'pauvre' });
      ctx.parentOf(mere, ctx.player);
      ctx.parentOf(pere, ctx.player);
      // Le père n'a jamais accepté. Ça se paiera un jour, d'un côté ou de l'autre.
      ctx.bond(pere, ctx.player, 'sang', 'fils', { affection: -25, respect: -20 });
      ctx.remember(
        ctx.player,
        'La sage-femme a hésité longtemps avant de me tendre à ma mère.',
        75,
        [mere, pere],
        ['origine', 'rejet'],
      );
      ctx.seed('seed.difforme.presage', 10, 26, [], 'ce que votre marque signifie vraiment');
      return {
        opening:
          'La sage-femme vous a regardé longtemps avant de vous tendre à votre mère. Assez longtemps ' +
          'pour que tout le monde comprenne ce qu\'elle envisageait. Votre père n\'a rien dit. Il n\'a rien dit depuis.',
        condition: 'né difforme, à peine toléré',
        socialClass: 'pauvre',
        wealth: 15,
        health: 55,
        traits: ['difforme'],
        hidden: { destinee: 70, volonte: 10 },
        stats: { volonte: 58 },
      };
    },
  },
  {
    id: 'massacre',
    label: 'Né la nuit du feu',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('marches');
      const tante = ctx.spawn({ age: ctx.rng.int(28, 44), sex: 'f', socialClass: 'miserable' });
      ctx.pair(ctx.player, tante, 'sang', 'la tante', 'le petit', { affection: 35, trust: 30 });
      ctx.remember(
        ctx.player,
        'Je suis né la nuit où les Marches ont brûlé. On me l\'a répété mille fois.',
        80,
        [tante],
        ['origine', 'violence'],
      );
      ctx.seed('seed.vengeance.marches', 12, 30, [], 'qui a mis le feu aux Marches');
      return {
        opening:
          'Vous êtes né la nuit où les Marches Grises ont brûlé. Votre mère a accouché dans un fossé, ' +
          'pendant que le hameau partait en fumée derrière elle. Elle n\'a pas vu le matin. Votre tante vous a porté sept lieues.',
        condition: 'né la nuit du massacre des Marches',
        socialClass: 'miserable',
        wealth: 0,
        health: 62,
        traits: ['orphelin', 'survivant'],
        hidden: { destinee: 68, ambition: 50 },
      };
    },
  },
  {
    id: 'maudit',
    label: 'Tenu pour porte-malheur',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('orin');
      const pere = ctx.spawn({ age: ctx.rng.int(26, 45), sex: 'm', socialClass: 'pauvre' });
      ctx.parentOf(pere, ctx.player);
      ctx.bond(pere, ctx.player, 'sang', 'fils', { affection: -40, fear: 25 });
      ctx.remember(
        ctx.player,
        'Ma mère est morte en me mettant au monde. Mon père ne m\'a jamais appelé par mon nom.',
        85,
        [pere],
        ['origine', 'deuil'],
      );
      return {
        opening:
          'Votre mère est morte en vous mettant au monde. Dans les vallées d\'Orin, on appelle ça un présage. ' +
          'Votre père ne vous a jamais appelé par votre nom — seulement « lui ».',
        condition: 'né d\'une morte, tenu pour maudit',
        socialClass: 'pauvre',
        wealth: 20,
        traits: ['marque', 'solitaire'],
        hidden: { destinee: 60, folie: 15 },
      };
    },
  },

  {
    id: 'esprit_ailleurs',
    label: 'L\'enfant qui ne regarde personne',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('orin');
      const mere = ctx.spawn({ age: ctx.rng.int(22, 38), sex: 'f', socialClass: 'pauvre' });
      const pere = ctx.spawn({ age: ctx.rng.int(26, 44), sex: 'm', socialClass: 'pauvre' });
      ctx.parentOf(mere, ctx.player);
      ctx.parentOf(pere, ctx.player);
      // La mère a compris avant tout le monde qu'il n'y avait rien à réparer.
      ctx.bond(mere, ctx.player, 'sang', 'fils', { affection: 60, trust: 50 });
      ctx.bond(pere, ctx.player, 'sang', 'fils', { affection: 5, respect: -15 });
      ctx.remember(
        ctx.player,
        'Ma mère a arrêté d\'essayer de me faire regarder les gens. C\'est là que ça a été mieux.',
        80,
        [mere],
        ['origine'],
      );
      return {
        opening:
          'Vous avez parlé à quatre ans, et d\'un coup, en phrases entières. Vous ne regardez personne ' +
          'dans les yeux et vous savez combien il y a de marches dans l\'escalier du moulin, de la mairie ' +
          'et du temple. Votre père en a honte. Votre mère a cessé d\'essayer de vous corriger, et c\'est ' +
          'le plus grand cadeau qu\'on vous ait fait.',
        condition: 'né avec l\'esprit à part',
        socialClass: 'pauvre',
        wealth: 60,
        traits: ['esprit_a_part'],
        stats: { intelligence: 62 },
        hidden: { potentiel: 72, destinee: 45 },
      };
    },
  },
  {
    id: 'enfant_qui_entend',
    label: 'L\'enfant qui entend',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('orin');
      const mere = ctx.spawn({ age: ctx.rng.int(20, 36), sex: 'f', socialClass: 'pauvre' });
      const vieille = ctx.spawn({ age: ctx.rng.int(58, 76), sex: 'f', socialClass: 'pauvre' });
      ctx.parentOf(mere, ctx.player);
      ctx.pair(ctx.player, vieille, 'mentorat', 'la vieille du gué', 'le petit qui entend', {
        affection: 30,
        respect: 35,
      });
      ctx.remember(
        ctx.player,
        'La vieille du gué est la seule qui ne m\'ait jamais demandé de me taire.',
        82,
        [vieille],
        ['origine'],
      );
      ctx.seed('seed.difforme.presage', 8, 20, [], 'ce que la voix veut vraiment');
      return {
        opening:
          'Il y a quelque chose qui vous parle depuis toujours. Vous avez mis des années à comprendre ' +
          'que les autres n\'entendaient rien. Dans les vallées d\'Orin, on ne dit pas de mot pour ça — ' +
          'on dit seulement « celui qui entend », et on ne le dit pas devant vous.',
        condition: 'né en entendant ce que les autres n\'entendent pas',
        socialClass: 'pauvre',
        wealth: 30,
        traits: ['voix'],
        hidden: { destinee: 66, folie: 30, potentiel: 58 },
      };
    },
  },
  {
    id: 'mutile_enfance',
    label: 'Mutilé avant de savoir marcher',
    tier: 'catastrophe',
    weight: 1.6,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(28, 46), sex: 'm', socialClass: 'miserable' });
      ctx.parentOf(pere, ctx.player);
      ctx.bond(pere, ctx.player, 'sang', 'fils', { affection: 20, trust: 15 });
      ctx.remember(
        ctx.player,
        'La roue du treuil. Mon père n\'en a jamais reparlé une seule fois.',
        88,
        [pere],
        ['origine', 'corps'],
      );
      return {
        opening:
          'La roue du treuil, sur le quai, l\'année de vos deux ans. On vous a recousu à la poix et vous ' +
          'avez survécu, ce qui a étonné tout le monde. Il vous manque un bras et vous ne vous rappelez ' +
          'pas l\'avoir eu. Votre père n\'en a plus jamais reparlé.',
        condition: 'mutilé à deux ans par la roue d\'un treuil',
        socialClass: 'miserable',
        wealth: 5,
        health: 62,
        traits: ['manchot', 'survivant'],
        hidden: { destinee: 55, ambition: 60 },
      };
    },
  },

  // ─── MISÈRE ───────────────────────────────────────────────────────────────
  {
    id: 'orphelinat',
    label: 'Refuge des Sœurs Grises',
    tier: 'misere',
    weight: 5.5,
    setup(ctx) {
      ctx.place('vardhen');
      const soeur = ctx.spawn({ age: ctx.rng.int(40, 60), sex: 'f', socialClass: 'commun' });
      const camarade = ctx.spawn({ age: ctx.rng.int(-1, 3) + 5, socialClass: 'miserable' });
      ctx.pair(ctx.player, soeur, 'mentorat', 'sœur Halde', 'l\'enfant du refuge', {
        affection: 25,
        respect: 30,
      });
      ctx.pair(ctx.player, camarade, 'amitie', 'compagnon de dortoir', 'compagnon de dortoir', {
        affection: 35,
        trust: 30,
      });
      ctx.remember(
        ctx.player,
        'Trente lits, une seule couverture par lit, et sœur Halde qui compte les enfants chaque soir.',
        55,
        [soeur, camarade],
        ['origine'],
      );
      return {
        opening:
          'On vous a laissé au refuge des Sœurs Grises avec un mot que personne n\'a su lire. ' +
          'Trente lits. Une couverture par lit. Sœur Halde compte les enfants chaque soir, et parfois il en manque un.',
        condition: 'élevé au refuge des Sœurs Grises',
        socialClass: 'miserable',
        wealth: 5,
        traits: ['orphelin'],
        hidden: { destinee: 42 },
      };
    },
  },
  {
    id: 'dettes',
    label: 'Famille endettée',
    tier: 'misere',
    weight: 5.5,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(28, 44), sex: 'm', socialClass: 'pauvre' });
      const mere = ctx.spawn({ age: ctx.rng.int(26, 40), sex: 'f', socialClass: 'pauvre' });
      const creancier = ctx.spawn({ age: ctx.rng.int(40, 60), sex: 'm', socialClass: 'aise' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.pair(ctx.player, creancier, 'dette', 'le créancier', 'la garantie', {
        affection: -15,
        fear: 40,
      });
      ctx.remember(
        ctx.player,
        'Chaque saison, l\'homme au registre venait compter ce que nous n\'avions pas.',
        65,
        [creancier, pere],
        ['dette'],
      );
      ctx.seed('seed.dette.recouvrement', 6, 16, [creancier], 'la dette de votre père');
      return {
        opening:
          'Votre père a emprunté pour un bateau qui a coulé avant sa deuxième sortie. ' +
          'L\'homme au registre passe chaque saison. Il ne crie jamais. C\'est ce qui fait peur.',
        condition: 'né sous la dette',
        socialClass: 'pauvre',
        wealth: -80,
        traits: [],
        hidden: { ambition: 55 },
      };
    },
  },
  {
    id: 'rue',
    label: 'Enfant des ruelles',
    tier: 'misere',
    weight: 5.5,
    setup(ctx) {
      ctx.place('basvardhen');
      const mere = ctx.spawn({ age: ctx.rng.int(18, 32), sex: 'f', socialClass: 'miserable' });
      ctx.parentOf(mere, ctx.player);
      const bande = ctx.spawn({ age: ctx.rng.int(9, 14), socialClass: 'miserable' });
      ctx.pair(ctx.player, bande, 'amitie', 'de la bande', 'de la bande', {
        affection: 30,
        trust: 25,
      });
      ctx.remember(
        ctx.player,
        'Ma mère m\'apprenait à reconnaître les pas dans l\'escalier avant même de marcher.',
        60,
        [mere],
        ['origine'],
      );
      return {
        opening:
          'Votre mère loue une pièce au-dessus d\'une tannerie et reçoit des marins. ' +
          'Vous avez appris à reconnaître les pas dans l\'escalier avant de savoir marcher : ceux qui montent doucement, et les autres.',
        condition: 'né dans les ruelles du Bas-Vardhèn',
        socialClass: 'miserable',
        wealth: 8,
        traits: ['mefiant'],
        stats: { agilite: 55 },
        hidden: { ambition: 50 },
      };
    },
  },
  {
    id: 'refugie',
    label: 'Famille en fuite',
    tier: 'misere',
    weight: 5.5,
    setup(ctx) {
      ctx.place('orin');
      const pere = ctx.spawn({ age: ctx.rng.int(30, 46), sex: 'm', socialClass: 'pauvre' });
      const mere = ctx.spawn({ age: ctx.rng.int(28, 42), sex: 'f', socialClass: 'pauvre' });
      const soeur = ctx.spawn({ age: ctx.rng.int(3, 8), sex: 'f', socialClass: 'pauvre' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.parentOf(pere, soeur);
      ctx.parentOf(mere, soeur);
      ctx.pair(ctx.player, soeur, 'sang', 'sœur aînée', 'petit frère', {
        affection: 55,
        trust: 50,
      });
      ctx.remember(
        ctx.player,
        'On ne dit jamais pourquoi nous sommes partis des Marches. On dit seulement qu\'on est partis.',
        62,
        [pere],
        ['origine', 'secret'],
      );
      ctx.seed('seed.truth.fuite', 11, 26, [pere], 'ce que votre père a fui');
      return {
        opening:
          'Votre famille est arrivée à Orin l\'année de votre naissance, avec deux sacs et aucune explication. ' +
          'On ne dit jamais pourquoi on a quitté les Marches. On dit seulement qu\'on est partis.',
        condition: 'né de réfugiés des Marches',
        socialClass: 'pauvre',
        wealth: 40,
        traits: ['mefiant'],
      };
    },
  },

  // ─── COMMUN ───────────────────────────────────────────────────────────────
  {
    id: 'meunier',
    label: 'Enfant de meunier',
    tier: 'commun',
    weight: 8,
    setup(ctx) {
      ctx.place('orin');
      const pere = ctx.spawn({ age: ctx.rng.int(28, 45), sex: 'm', socialClass: 'commun', jobId: 'journalier' });
      const mere = ctx.spawn({ age: ctx.rng.int(26, 42), sex: 'f', socialClass: 'commun' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      const frere = ctx.spawn({ age: ctx.rng.int(2, 6), socialClass: 'commun' });
      ctx.parentOf(pere, frere);
      ctx.parentOf(mere, frere);
      ctx.pair(ctx.player, frere, 'sang', 'aîné', 'cadet', { affection: 30, trust: 25 });
      // Le moulin ira à l'aîné. Cette phrase-là décidera de beaucoup de choses.
      ctx.seed('seed.heritage.moulin', 12, 20, [frere], 'à qui revient le moulin');
      return {
        opening:
          'Le moulin d\'Orin tourne depuis quatre générations et il tournera après vous. ' +
          'C\'est ce que dit votre père. Il ne précise jamais qui le tiendra.',
        condition: 'né au moulin d\'Orin',
        socialClass: 'commun',
        wealth: 260,
        stats: { endurance: 52 },
      };
    },
  },
  {
    id: 'forge',
    label: 'Enfant de forgeron',
    tier: 'commun',
    weight: 8,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(30, 48), sex: 'm', socialClass: 'commun', jobId: 'forgeron' });
      const mere = ctx.spawn({ age: ctx.rng.int(28, 44), sex: 'f', socialClass: 'commun' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.remember(
        ctx.player,
        'Le bruit du marteau m\'a bercé avant les berceuses.',
        45,
        [pere],
        ['origine'],
      );
      return {
        opening:
          'Vous vous êtes endormi au bruit du marteau avant de connaître les berceuses. ' +
          'Votre père fait des clous et des charnières, et une fois par an une lame pour quelqu\'un qui paie bien.',
        condition: 'né dans une forge de Vardhèn',
        socialClass: 'commun',
        wealth: 380,
        stats: { force: 52 },
      };
    },
  },
  {
    id: 'pecheur',
    label: 'Enfant de pêcheur',
    tier: 'commun',
    weight: 8,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(28, 46), sex: 'm', socialClass: 'pauvre', jobId: 'pecheur' });
      const mere = ctx.spawn({ age: ctx.rng.int(26, 42), sex: 'f', socialClass: 'pauvre' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.remember(
        ctx.player,
        'Mon père partait avant l\'aube. Ma mère comptait les barques au retour.',
        50,
        [pere, mere],
        ['origine'],
      );
      ctx.seed('seed.mer.tempete', 5, 14, [pere], 'la mer réclame son dû');
      return {
        opening:
          'Votre père sort avant l\'aube. Votre mère compte les barques au retour, et certains matins ' +
          'elle recompte deux fois. Personne n\'en parle à table.',
        condition: 'né d\'une famille de pêcheurs',
        socialClass: 'pauvre',
        wealth: 120,
        traits: ['marin'],
        stats: { endurance: 53 },
      };
    },
  },
  {
    id: 'soldat',
    label: 'Enfant de soldat',
    tier: 'commun',
    weight: 8,
    setup(ctx) {
      ctx.place('roc');
      const pere = ctx.spawn({ age: ctx.rng.int(28, 44), sex: 'm', socialClass: 'commun', jobId: 'soldat' });
      const mere = ctx.spawn({ age: ctx.rng.int(24, 40), sex: 'f', socialClass: 'commun' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.bond(pere, ctx.player, 'sang', 'fils', { affection: 30, respect: 10 });
      ctx.remember(
        ctx.player,
        'Mon père rentrait six semaines par an et repartait avant qu\'on s\'habitue à lui.',
        55,
        [pere],
        ['origine'],
      );
      return {
        opening:
          'Le Roc, sa garnison, et un village qui la nourrit. Votre père rentre six semaines par an ' +
          'et repart avant qu\'on ait eu le temps de s\'habituer à lui.',
        condition: 'né à l\'ombre du Roc',
        socialClass: 'commun',
        wealth: 200,
        stats: { force: 51, volonte: 51 },
      };
    },
  },
  {
    id: 'boutique',
    label: 'Enfant de boutiquier',
    tier: 'commun',
    weight: 8,
    setup(ctx) {
      ctx.place('vardhen');
      const mere = ctx.spawn({ age: ctx.rng.int(28, 46), sex: 'f', socialClass: 'commun', jobId: 'colporteur' });
      const pere = ctx.spawn({ age: ctx.rng.int(30, 50), sex: 'm', socialClass: 'commun' });
      ctx.parentOf(mere, ctx.player);
      ctx.parentOf(pere, ctx.player);
      ctx.bond(ctx.player, mere, 'sang', 'mère', { affection: 50, respect: 35 });
      return {
        opening:
          'Votre mère tient l\'échoppe et votre père tient les comptes, ce qui est une façon polie ' +
          'de dire que votre mère tient tout. On vous a appris à compter avant à lire.',
        condition: 'né derrière un comptoir',
        socialClass: 'commun',
        wealth: 520,
        stats: { charisme: 52, intelligence: 52 },
      };
    },
  },

  // ─── AISÉ ─────────────────────────────────────────────────────────────────
  {
    id: 'scribe',
    label: 'Enfant de scribe',
    tier: 'aise',
    weight: 6,
    setup(ctx) {
      ctx.place('kaleth');
      const pere = ctx.spawn({ age: ctx.rng.int(32, 52), sex: 'm', socialClass: 'aise', jobId: 'scribe' });
      const mere = ctx.spawn({ age: ctx.rng.int(28, 46), sex: 'f', socialClass: 'aise' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.remember(
        ctx.player,
        'On m\'a mis un stylet dans la main avant que je sache tenir une cuillère.',
        50,
        [pere],
        ['origine'],
      );
      return {
        opening:
          'Votre père copie les registres de Kaleth-la-Blanche. Il connaît la naissance et la mort ' +
          'de chaque personne de la cité, et il sait ce que ça vaut. On vous a mis un stylet dans la main très tôt.',
        condition: 'né dans une maison de scribes',
        socialClass: 'aise',
        wealth: 2200,
        traits: ['lettre'],
        stats: { intelligence: 58 },
      };
    },
  },
  {
    id: 'marchand',
    label: 'Enfant de marchand',
    tier: 'aise',
    weight: 6,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(34, 54), sex: 'm', socialClass: 'aise', jobId: 'marchand' });
      const mere = ctx.spawn({ age: ctx.rng.int(30, 48), sex: 'f', socialClass: 'aise' });
      const aine = ctx.spawn({ age: ctx.rng.int(3, 9), socialClass: 'aise' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.parentOf(pere, aine);
      ctx.parentOf(mere, aine);
      // Une rivalité de comptoir, plantée dès le berceau.
      ctx.pair(ctx.player, aine, 'sang', 'aîné', 'cadet', { affection: 10, respect: 5 });
      ctx.seed('seed.rivalite.fratrie', 10, 22, [aine], 'la rivalité avec votre aîné');
      return {
        opening:
          'La maison sent le poivre et le registre. Votre père achète bas et vend haut, ' +
          'et il a déjà décidé lequel de ses enfants reprendrait le comptoir. Ce n\'est pas vous.',
        condition: 'né cadet d\'une maison de négoce',
        socialClass: 'aise',
        wealth: 3400,
        stats: { charisme: 54, intelligence: 54 },
      };
    },
  },
  {
    id: 'medecin',
    label: 'Enfant de médecin',
    tier: 'aise',
    weight: 6,
    setup(ctx) {
      ctx.place('kaleth');
      const mere = ctx.spawn({ age: ctx.rng.int(32, 50), sex: 'f', socialClass: 'aise', jobId: 'medecin' });
      ctx.parentOf(mere, ctx.player);
      ctx.bond(ctx.player, mere, 'sang', 'mère', { affection: 45, respect: 45 });
      ctx.remember(
        ctx.player,
        'J\'ai vu ma mère perdre un patient et se laver les mains sans rien dire.',
        65,
        [mere],
        ['origine'],
      );
      return {
        opening:
          'Votre mère est médecin, ce qui à Kaleth veut dire qu\'elle a le droit de toucher les morts. ' +
          'Vous avez vu des choses que les autres enfants ne voient pas, et personne n\'a pensé à vous en préserver.',
        condition: 'né dans la maison d\'une médecin',
        socialClass: 'aise',
        wealth: 2800,
        stats: { intelligence: 57 },
        hidden: { destinee: 40 },
      };
    },
  },

  // ─── PRIVILÉGIÉ ───────────────────────────────────────────────────────────
  {
    id: 'noble_cadet',
    label: 'Cadet de petite maison',
    tier: 'privilegie',
    weight: 4.5,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(36, 55), sex: 'm', socialClass: 'noble' });
      const aine = ctx.spawn({ age: ctx.rng.int(4, 11), sex: 'm', socialClass: 'noble' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(pere, aine);
      ctx.bond(pere, ctx.player, 'sang', 'cadet', { affection: 15, respect: 5 });
      ctx.bond(ctx.player, aine, 'sang', 'aîné', { affection: 5, respect: 15 });
      ctx.bond(aine, ctx.player, 'rivalite', 'cadet', { affection: -15, fear: 5 });
      ctx.seed('seed.rivalite.fratrie', 8, 18, [aine], 'votre aîné hérite de tout');
      return {
        opening:
          'Vous portez un nom qui ouvre des portes, et vous êtes né deuxième, ce qui les referme à moitié. ' +
          'Tout ira à votre aîné : la terre, le nom, la place. Il vous restera l\'épée, l\'Église, ou l\'exil.',
        condition: 'né cadet d\'une maison noble',
        socialClass: 'noble',
        wealth: 12000,
        stats: { charisme: 55 },
        hidden: { ambition: 65, influence: 25 },
      };
    },
  },
  {
    id: 'armateur',
    label: 'Héritier d\'armateur',
    tier: 'privilegie',
    weight: 4.5,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(38, 58), sex: 'm', socialClass: 'aise', jobId: 'armateur' });
      const mere = ctx.spawn({ age: ctx.rng.int(32, 50), sex: 'f', socialClass: 'aise' });
      const rival = ctx.spawn({ age: ctx.rng.int(40, 58), sex: 'm', socialClass: 'aise' });
      ctx.parentOf(pere, ctx.player);
      ctx.parentOf(mere, ctx.player);
      ctx.pair(ctx.player, rival, 'rivalite', 'le concurrent de la famille', 'le rejeton', {
        affection: -20,
      });
      ctx.seed('seed.commerce.sabotage', 12, 26, [rival], 'la guerre des comptoirs');
      return {
        opening:
          'Onze navires portent le nom de votre famille. Votre père en parle comme d\'enfants ' +
          'et de ses enfants comme de cargaisons. Un autre homme, en ville, voudrait les onze.',
        condition: 'né héritier d\'une flotte',
        socialClass: 'aise',
        wealth: 46000,
        stats: { intelligence: 55, charisme: 54 },
        hidden: { influence: 35, ambition: 55 },
      };
    },
  },

  // ─── EXCEPTIONNEL ─────────────────────────────────────────────────────────
  {
    id: 'heritier',
    label: 'Héritier d\'une grande maison',
    tier: 'exceptionnel',
    weight: 1,
    setup(ctx) {
      ctx.place('vardhen');
      const pere = ctx.spawn({ age: ctx.rng.int(38, 56), sex: 'm', socialClass: 'royal' });
      const oncle = ctx.spawn({ age: ctx.rng.int(34, 52), sex: 'm', socialClass: 'royal' });
      const precepteur = ctx.spawn({ age: ctx.rng.int(45, 65), socialClass: 'aise', statMean: 58 });
      ctx.parentOf(pere, ctx.player);
      ctx.pair(ctx.player, oncle, 'sang', 'oncle', 'l\'héritier', { affection: 10 });
      // L'oncle sourit beaucoup. Trop.
      ctx.bond(oncle, ctx.player, 'rivalite', 'l\'obstacle', { affection: -45, fear: 10 });
      ctx.pair(ctx.player, precepteur, 'mentorat', 'précepteur', 'l\'élève', {
        affection: 30,
        respect: 40,
      });
      ctx.seed('seed.complot.oncle', 9, 20, [oncle], 'votre oncle veut votre place');
      return {
        opening:
          'On vous a présenté à la cour à trois jours. Vous héritez d\'un nom, d\'une terre, ' +
          'd\'un siège, et d\'un oncle qui sourit beaucoup trop quand on parle de votre santé.',
        condition: 'né héritier d\'une grande maison',
        socialClass: 'royal',
        wealth: 320000,
        stats: { charisme: 58, intelligence: 56 },
        hidden: { influence: 55, ambition: 60, destinee: 55 },
      };
    },
  },
  {
    id: 'prophetise',
    label: 'Enfant annoncé',
    tier: 'exceptionnel',
    weight: 1,
    setup(ctx) {
      ctx.place('kaleth');
      const mere = ctx.spawn({ age: ctx.rng.int(22, 36), sex: 'f', socialClass: 'pauvre' });
      const prophete = ctx.spawn({ age: ctx.rng.int(42, 58), socialClass: 'commun', statMean: 55 });
      ctx.parentOf(mere, ctx.player);
      ctx.pair(ctx.player, prophete, 'mentorat', 'le vieil homme', 'l\'annoncé', {
        affection: 20,
        respect: 45,
      });
      ctx.remember(
        ctx.player,
        'Un vieil homme a dit à ma mère ce que je serais. Elle n\'a jamais voulu me répéter la fin.',
        88,
        [prophete, mere],
        ['prophetie', 'origine'],
      );
      ctx.seed('seed.prophetie.revelation', 10, 20, [prophete], 'la fin de la prophétie');
      return {
        opening:
          'Un vieil homme est entré dans la chambre pendant l\'accouchement. Personne ne l\'avait fait venir. ' +
          'Il a dit trois phrases à votre mère et il est reparti. Elle n\'a jamais voulu vous répéter la troisième.',
        condition: 'annoncé par une prophétie',
        socialClass: 'pauvre',
        wealth: 30,
        hidden: { destinee: 92, potentiel: 78 },
      };
    },
  },
  {
    id: 'derniere_lignee',
    label: 'Dernier d\'une lignée éteinte',
    tier: 'exceptionnel',
    weight: 1,
    setup(ctx) {
      ctx.place('orin');
      const mere = ctx.spawn({ age: ctx.rng.int(24, 38), sex: 'f', socialClass: 'pauvre' });
      ctx.parentOf(mere, ctx.player);
      ctx.bond(ctx.player, mere, 'sang', 'mère', { affection: 50, trust: 40 });
      ctx.remember(
        ctx.player,
        'Ma mère garde un anneau qu\'elle ne porte jamais et qu\'elle refuse de vendre, même l\'hiver.',
        75,
        [mere],
        ['secret', 'origine'],
      );
      // Le joueur ignore ce qu'il est. Il l'apprendra.
      ctx.seed('seed.truth.lignee', 13, 28, [mere], 'ce que vaut l\'anneau de votre mère');
      return {
        opening:
          'Vous grandissez dans une maison de terre battue, à Orin. Votre mère garde un anneau ' +
          'qu\'elle ne porte jamais et qu\'elle a refusé de vendre l\'hiver où vous avez tous eu faim. ' +
          'Elle dit que c\'est un souvenir. Ce n\'en est pas un.',
        condition: 'dernier d\'une lignée que tout le monde croit éteinte',
        socialClass: 'pauvre',
        wealth: 45,
        hidden: { destinee: 80, potentiel: 68 },
      };
    },
  },
];
