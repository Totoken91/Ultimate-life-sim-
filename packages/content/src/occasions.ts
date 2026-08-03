import type { OccasionCtx, OccasionDef } from '@ed/engine';
import {
  GOOD_BASE_PRICE,
  ageOf,
  classRank,
  hunger,
  pick,
  regimeName,
  shortName,
} from '@ed/engine';

/**
 * Les occasions du Rivage (doc 16 §3).
 *
 * Chacune est une **lecture de l'état du monde**, jamais une entrée de menu.
 * Le prix du grain, le groupe qui recrute, le siège vacant, la disette, le
 * voisin qui vient de prendre un apprenti : tout ça existe déjà dans la
 * simulation. On se contente d'ouvrir une porte quand elle est là.
 */

const O = (d: OccasionDef): OccasionDef => d;

const them = (c: OccasionCtx): string => {
  const t = c.maybe('cible');
  return t ? shortName(t) : 'quelqu\'un';
};
const lieu = (c: OccasionCtx): string =>
  c.world.settlement(c.subject.settlement)?.name ?? 'ici';
/** « de Orin-sur-Loë » se dit « d'Orin-sur-Loë ». */
const de = (nom: string): string =>
  'aàâeéèêiîoôuûyAÀEÉÈIÎOÔUÛY'.includes(nom[0] ?? '') ? `d'${nom}` : `de ${nom}`;

/** Le prix d'un bien rapporté à sa référence. 1 = normal, 2 = doublé. */
const cherte = (c: OccasionCtx, good: 'vivres' | 'outils' | 'soins' | 'armes'): number => {
  const p = c.domain?.prices[good];
  return p === undefined ? 1 : p / GOOD_BASE_PRICE[good];
};

export const OCCASIONS: OccasionDef[] = [
  // ─── ce que les prix ouvrent ──────────────────────────────────────────────

  O({
    id: 'grain_bas',
    cost: 1,
    minAge: 12,
    when: (c) => cherte(c, 'vivres') < 0.72 && c.subject.wealth >= 60,
    weight: (c) => 1.4 + (c.subject.skills['negoce'] ?? 0) / 60,
    label: (c) => `Acheter du grain pendant qu'il ne vaut rien à ${lieu(c)}`,
    detail: (c) =>
      `Le grain est tombé à ${(c.domain?.prices['vivres'] ?? 0).toFixed(1)} sous. ` +
      `Il ne restera pas là.`,
    take: (c) => {
      const mise = Math.round(c.subject.wealth * 0.3);
      const gain = Math.round(mise * (1.25 + (1 - cherte(c, 'vivres')) * 1.1));
      return {
        text: `Vous achetez, vous stockez, vous attendez. L'hiver fera le reste.`,
        effects: [
          { k: 'wealth', d: -mise + gain },
          { k: 'skill', id: 'negoce', d: 3 },
        ],
      };
    },
    window: 2,
    tags: ['negoce'],
  }),

  O({
    id: 'disette_speculation',
    cost: 2,
    minAge: 14,
    when: (c) => !!c.domain && hunger(c.domain) > 0.15 && c.subject.wealth >= 200,
    weight: (c) => 0.8 + c.subject.hidden.corruption / 60,
    label: (c) => `Vendre cher à ceux qui ont faim`,
    detail: (c) =>
      `Il manque ${Math.round(hunger(c.domain!) * 100)} % de ce qu'il faut à ${lieu(c)}. ` +
      `Ceux qui ont des réserves n'ont jamais autant valu.`,
    take: (c) => ({
      text:
        'Vous vendez au prix que la faim accepte. On vous paie, et on se souvient de vous.',
      effects: [
        { k: 'wealth', d: Math.round(c.subject.wealth * 0.35) },
        { k: 'hidden', id: 'karma', d: -10 },
        { k: 'hidden', id: 'influence', d: 4 },
        { k: 'trait', add: 'notoire' },
      ],
    }),
    tags: ['negoce', 'crime'],
  }),

  O({
    id: 'greniers',
    cost: 2,
    minAge: 14,
    when: (c) => !!c.domain && hunger(c.domain) > 0.2 && c.subject.wealth >= 400,
    weight: (c) => 0.7 + (c.subject.traits.includes('genereux') ? 1.2 : 0),
    label: () => 'Nourrir ceux qui n\'ont rien',
    detail: (c) => `On enterre des enfants à ${lieu(c)}. Vous avez de quoi en sauver quelques-uns.`,
    take: (c) => ({
      text: 'Vous donnez jusqu\'à ce que ça se voie. On n\'oubliera pas de sitôt.',
      effects: [
        { k: 'wealth', d: -Math.round(c.subject.wealth * 0.3) },
        { k: 'hidden', id: 'karma', d: 14 },
        { k: 'hidden', id: 'influence', d: 10 },
        { k: 'mood', d: 8 },
        { k: 'chronicle', kind: 'note', importance: 3, data: { texte: `On mangea grâce à quelqu'un, à ${lieu(c)}.` } },
      ],
    }),
    tags: ['vertu'],
  }),

  // ─── ce que les groupes ouvrent ───────────────────────────────────────────

  O({
    id: 'bande_recrute',
    cost: 2,
    minAge: 14,
    when: (c) => !!c.localPower && !c.faction && c.localPower.goal === 'croitre',
    weight: (c) => 1 + (c.subject.wealth < 80 ? 0.9 : 0),
    label: (c) => `Entrer chez ${c.localPower?.name ?? 'eux'}`,
    detail: (c) =>
      `On cherche des bras chez ${c.localPower?.name ?? 'eux'}. Ils sont ` +
      `${c.localPower?.memberIds.length ?? 0} et tiennent une partie ${de(lieu(c))}.`,
    take: (c) => {
      const f = c.localPower;
      if (!f) return { text: 'Ils ont changé d\'avis.', effects: [] };
      const chef = c.world.get(f.leaderId);
      if (chef) {
        c.world.relations.ensure(c.subject.id, chef.id, 'serment', 'mon chef', c.world.year);
        c.world.relations.modify(c.subject.id, chef.id, { respect: 18, trust: 10 });
        c.world.relations.ensure(chef.id, c.subject.id, 'serment', 'mon homme', c.world.year);
        c.world.relations.modify(chef.id, c.subject.id, { trust: 8 });
        f.memberIds.push(c.subject.id);
      }
      return {
        text: `Vous avez juré. On ne vous demande pas encore quoi.`,
        effects: [
          { k: 'hidden', id: 'influence', d: 6 },
          { k: 'skill', id: 'lutte', d: 4 },
        ],
      };
    },
    tags: ['serment'],
  }),

  O({
    id: 'bande_besoin',
    cost: 2,
    minAge: 15,
    when: (c) => !!c.faction && (c.faction.goal === 'abattre' || c.faction.goal === 'venger'),
    weight: () => 1.3,
    label: (c) => `${c.faction?.name} a besoin de vous`,
    detail: () => 'Ce n\'est pas une demande. On vous attend au bout de la rue.',
    take: (c) => {
      const f = c.faction;
      const rng = c.rng.fork('bande.besoin', c.world.year);
      const chef = f ? c.world.get(f.leaderId) : undefined;
      if (chef) c.world.relations.modify(chef.id, c.subject.id, { trust: 14, respect: 12 });
      const bien = rng.chance(0.6 + c.subject.stats.force / 300);
      return bien
        ? {
            text: 'Vous y allez. Ça se passe vite et vous n\'y laissez qu\'une lèvre fendue.',
            effects: [
              { k: 'skill', id: 'lutte', d: 6 },
              { k: 'health', d: -6 },
              { k: 'hidden', id: 'influence', d: 5 },
            ],
          }
        : {
            text: 'Vous y allez. Vous rentrez, et c\'est déjà quelque chose.',
            effects: [
              { k: 'health', d: -18 },
              { k: 'injure', label: 'une côte qui n\'a jamais bien repris', stat: 'endurance', penalty: 3 },
              { k: 'hidden', id: 'influence', d: 3 },
            ],
          };
    },
    tags: ['violence'],
  }),

  // ─── ce que le pouvoir ouvre ──────────────────────────────────────────────

  O({
    id: 'siege_vacant',
    cost: 3,
    minAge: 20,
    when: (c) =>
      !!c.domain &&
      c.domain.rulerId === null &&
      c.domain.government.power !== 'personne',
    weight: (c) => 0.6 + c.subject.hidden.ambition / 70 + c.subject.hidden.influence / 90,
    label: (c) => `Personne ne gouverne ${c.domain?.name ?? lieu(c)}`,
    detail: (c) =>
      `${regimeName(c.domain!.government)} sans personne dedans. ` +
      `On y accède ${c.domain!.government.access === 'sang' ? 'par le sang' : 'autrement'}, ` +
      `et vous n'êtes pas le seul à y penser.`,
    take: (c) => {
      const dom = c.domain;
      if (!dom) return { text: 'La place a été prise.', effects: [] };
      const rng = c.rng.fork('siege', c.world.year);
      const merite =
        c.subject.hidden.influence * 0.5 +
        c.subject.stats.charisme * 0.4 +
        classRank(c.subject.socialClass) * 8;
      if (!rng.chance(0.2 + merite / 220)) {
        return {
          text: 'On a écouté quelqu\'un d\'autre. Vous avez appris qui vous n\'êtes pas encore.',
          effects: [{ k: 'mood', d: -8 }, { k: 'hidden', id: 'ambition', d: 5 }],
        };
      }
      dom.rulerId = c.subject.id;
      dom.ruledSince = c.world.year;
      return {
        text: `Vous gouvernez ${dom.name}. Vous allez découvrir ce que ça coûte.`,
        effects: [
          { k: 'title', add: dom.name },
          { k: 'hidden', id: 'influence', d: 18 },
          { k: 'chronicle', kind: 'ascension', importance: 4, data: { quoi: `prit ${dom.name}` } },
        ],
      };
    },
    window: 2,
    tags: ['pouvoir'],
  }),

  O({
    id: 'impot_lourd',
    cost: 1,
    minAge: 16,
    when: (c) => !!c.domain && c.domain.unrest > 55 && c.domain.rulerId !== c.subject.id,
    weight: (c) => 0.7 + (c.subject.traits.includes('courageux') ? 0.8 : 0),
    label: (c) => `Prendre la parole contre ceux qui gouvernent ${lieu(c)}`,
    detail: (c) =>
      `Le mécontentement est à ${Math.round(c.domain!.unrest)} et personne n'ose le dire tout haut.`,
    take: (c) => {
      const dom = c.domain;
      const rng = c.rng.fork('impot', c.world.year);
      const ecoute = rng.chance(0.35 + c.subject.stats.charisme / 200);
      if (dom) dom.unrest = Math.min(100, dom.unrest + (ecoute ? 6 : 1));
      return ecoute
        ? {
            text: 'On vous écoute. Certains vous suivent des yeux quand vous partez.',
            effects: [
              { k: 'hidden', id: 'influence', d: 9 },
              { k: 'skill', id: 'rhetorique', d: 5 },
              { k: 'trait', add: 'notoire' },
            ],
          }
        : {
            text: 'On vous laisse parler, puis on retourne au travail. Quelqu\'un a retenu votre nom.',
            effects: [{ k: 'mood', d: -5 }, { k: 'flag', name: 'vu_parler', value: true }],
          };
    },
    tags: ['politique'],
  }),

  // ─── ce que les gens ouvrent ──────────────────────────────────────────────

  O({
    id: 'maitre',
    cost: 2,
    minAge: 8,
    maxAge: 30,
    role: pick.local({ minAge: 28, where: (c) => !!c.jobId }),
    when: (c) => !c.subject.jobId,
    weight: () => 1.5,
    label: (c) => `${them(c)} cherche quelqu'un à former`,
    detail: (c) => {
      const t = c.maybe('cible');
      const job = t?.jobId ? c.ruleset.jobs[t.jobId] : undefined;
      return `${job?.label ?? 'Un métier'}. Ce n'est pas le vôtre, mais c'est un métier.`;
    },
    take: (c) => {
      const t = c.maybe('cible');
      const job = t?.jobId ? c.ruleset.jobs[t.jobId] : undefined;
      if (!job || !t) return { text: 'La place a été donnée à un autre.', effects: [] };
      const skillId = Object.keys(job.trains)[0];
      return {
        text: `Vous entrez chez ${shortName(t)}. On vous fera surtout balayer, la première année.`,
        effects: [
          { k: 'job', id: job.id },
          { k: 'rel', to: 'cible', type: 'mentorat', label: 'mon maître', affection: 10, respect: 25 },
          { k: 'rel', to: 'cible', from: 'cible', type: 'mentorat', label: 'mon élève', affection: 10 },
          ...(skillId ? [{ k: 'skill' as const, id: skillId, d: 8 }] : []),
        ],
      };
    },
    tags: ['travail'],
  }),

  O({
    id: 'dette_appelee',
    cost: 1,
    minAge: 14,
    role: pick.known({ types: ['dette'] }),
    when: () => true,
    weight: () => 1.1,
    label: (c) => `${them(c)} vient réclamer`,
    detail: () => 'Ce que vous devez a une date, et c\'est aujourd\'hui.',
    take: (c) => {
      const somme = Math.max(30, Math.round(Math.abs(c.subject.wealth) * 0.15));
      if (c.subject.wealth >= somme) {
        return {
          text: 'Vous payez. On ne vous en aimera pas plus, mais on vous respectera.',
          effects: [
            { k: 'wealth', d: -somme },
            { k: 'rel', to: 'cible', from: 'cible', respect: 20, trust: 15 },
          ],
        };
      }
      return {
        text: 'Vous n\'avez pas. On vous laisse un an, et ça ne s\'oublie pas.',
        effects: [
          { k: 'rel', to: 'cible', from: 'cible', type: 'rivalite', label: 'qui me doit', affection: -25 },
          { k: 'trait', add: 'endette' },
        ],
      };
    },
    tags: ['dette'],
  }),

  O({
    id: 'rival_seul',
    cost: 1,
    minAge: 13,
    role: pick.known({ maxAffection: -40 }),
    when: () => true,
    weight: (c) => 0.7 + c.subject.hidden.corruption / 80,
    label: (c) => `${them(c)} est seul ce soir`,
    detail: () => 'Vous savez où. Vous savez que personne ne regardera.',
    take: (c) => {
      const rng = c.rng.fork('seul', c.world.year);
      const t = c.maybe('cible');
      const moi = c.subject.stats.force + (c.subject.skills['lutte'] ?? 0);
      const lui = (t?.stats.force ?? 50) + (t?.skills['lutte'] ?? 0);
      const gagne = rng.chance(moi / Math.max(1, moi + lui));
      return gagne
        ? {
            text: `${them(c)} rentrera chez lui autrement qu'il n'est parti.`,
            effects: [
              { k: 'health', d: -22, who: 'cible' },
              { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'qui m\'a attendu', affection: -30, fear: 35 },
              { k: 'hidden', id: 'karma', d: -6 },
              { k: 'chronicle', kind: 'violence', importance: 2, actors: ['subject', 'cible'] },
            ],
          }
        : {
            text: 'Il vous attendait aussi. Vous avez été plus lent.',
            effects: [
              { k: 'health', d: -20 },
              { k: 'rel', to: 'cible', from: 'cible', fear: -10, affection: -15 },
            ],
          };
    },
    tags: ['violence'],
  }),

  O({
    id: 'mariage_arrange',
    cost: 2,
    minAge: 15,
    maxAge: 45,
    role: pick.relative({ minAge: 30 }),
    when: (c) => !c.subject.spouseId && classRank(c.subject.socialClass) >= 2,
    weight: () => 0.9,
    label: (c) => `${them(c)} vous a trouvé quelqu'un`,
    detail: () => 'Vous ne l\'avez jamais vu. C\'est ainsi qu\'on fait, ici.',
    take: (c) => {
      const rng = c.rng.fork('arrange', c.world.year);
      const promis = pick.local({ minAge: 16, maxAge: 50 })(c);
      if (!promis) return { text: 'L\'arrangement a échoué avant vous.', effects: [] };
      const chanceux = rng.chance(0.4);
      c.world.relations.ensure(c.subject.id, promis.id, 'mariage', 'époux', c.world.year);
      c.world.relations.ensure(promis.id, c.subject.id, 'mariage', 'époux', c.world.year);
      c.subject.spouseId = promis.id;
      promis.spouseId = c.subject.id;
      promis.lod = 0;
      c.world.tally.marriages += 1;
      c.world.relations.modify(c.subject.id, promis.id, { affection: chanceux ? 30 : 4, trust: 10 });
      c.world.relations.modify(promis.id, c.subject.id, { affection: chanceux ? 28 : 6, trust: 10 });
      return {
        text: chanceux
          ? `${shortName(promis)}. Vous avez eu de la chance, et vous le savez.`
          : `${shortName(promis)}. Vous apprendrez à vivre à côté.`,
        effects: [
          { k: 'wealth', d: Math.round(200 + classRank(c.subject.socialClass) * 400) },
          { k: 'chronicle', kind: 'mariage', importance: 3 },
        ],
      };
    },
    tags: ['famille'],
  }),

  O({
    id: 'vieux_qui_sait',
    cost: 1,
    minAge: 8,
    role: pick.local({ minAge: 62 }),
    when: (c) => (c.subject.skills['lettres'] ?? 0) < 60,
    weight: () => 0.8,
    label: (c) => `${them(c)} veut parler à quelqu'un`,
    detail: (c) => {
      const elle = c.maybe('cible')?.sex === 'f';
      return `${elle ? 'Elle' : 'Il'} n'a plus grand monde et ${elle ? 'elle' : 'il'} sait des choses qu'on ne réécrira pas.`;
    },
    take: (c) => ({
      text: `Vous écoutez ${them(c)} pendant des heures. Vous ne comprenez qu'un tiers, pour l'instant.`,
      effects: [
        { k: 'skill', id: 'lettres', d: 5 },
        { k: 'stat', stat: 'intelligence', d: 2 },
        {
          k: 'rel',
          to: 'cible',
          type: 'mentorat',
          label: c.maybe('cible')?.sex === 'f' ? 'la vieille' : 'le vieux',
          affection: 18,
          respect: 14,
          mutual: true,
        },
        {
          k: 'memory',
          text: `Ce que le vieux m'a raconté, et que je n'ai pas encore compris.`,
          salience: 55,
          actors: ['cible'],
          tags: ['savoir'],
        },
      ],
    }),
    window: 2,
    tags: ['savoir'],
  }),

  // ─── ce que le corps et l'âge ouvrent ─────────────────────────────────────

  O({
    id: 'soigneur',
    cost: 1,
    minAge: 6,
    when: (c) => c.subject.health < 72 && c.subject.wealth >= 30,
    weight: (c) => 0.9 + (72 - c.subject.health) / 40,
    label: () => 'Aller voir quelqu\'un qui sait soigner',
    detail: (c) =>
      cherte(c, 'soins') > 1.5
        ? 'Les soins sont hors de prix ici. On vous prendra tout ce que vous avez.'
        : 'Ça ne coûte pas grand-chose. Ça ne marche pas toujours.',
    take: (c) => {
      const rng = c.rng.fork('soin', c.world.year);
      const cout = Math.round(30 * cherte(c, 'soins'));
      const bon = rng.chance(0.62 + (c.subject.wealth > cout * 4 ? 0.12 : 0));
      return {
        text: bon
          ? 'On vous a fait boire quelque chose d\'amer. Trois jours après, vous alliez mieux.'
          : 'On vous a fait boire quelque chose d\'amer. Vous avez été plus mal avant d\'être moins mal.',
        effects: [
          { k: 'wealth', d: -cout },
          { k: 'health', d: bon ? 12 : -5 },
        ],
      };
    },
    tags: ['corps'],
  }),

  O({
    id: 'transmettre',
    cost: 2,
    minAge: 45,
    role: pick.child({}),
    when: (c) => ageOf(c.subject, c.world.year) >= 45,
    weight: (c) => 0.8 + (ageOf(c.subject, c.world.year) - 45) / 40,
    label: (c) => `Dire à ${them(c)} ce que vous ne direz qu'une fois`,
    detail: () => 'Vous n\'aurez pas toujours le temps, et vous commencez à le savoir.',
    take: (c) => ({
      text: `Vous parlez longtemps. ${them(c)} n'en retiendra pas ce que vous croyez.`,
      effects: [
        { k: 'rel', to: 'cible', affection: 22, trust: 18, mutual: true },
        { k: 'stat', stat: 'volonte', d: 4, who: 'cible' },
        { k: 'hidden', id: 'destinee', d: 6, who: 'cible' },
        {
          k: 'memory',
          text: `Ce que je lui ai dit ce jour-là, et que je n'ai plus jamais répété.`,
          salience: 75,
          actors: ['cible'],
          tags: ['heritage'],
        },
      ],
    }),
    window: 3,
    tags: ['heritage'],
  }),

  O({
    id: 'partir_ailleurs',
    cost: 3,
    minAge: 14,
    when: (c) => {
      const ici = c.domain;
      if (!ici) return false;
      // On part quand ailleurs est visiblement mieux : moins cher, moins affamé.
      for (const d of c.world.domainList()) {
        if (d.settlement === null || d.settlement === c.subject.settlement) continue;
        if (hunger(d) + 0.12 < hunger(ici)) return true;
      }
      return false;
    },
    weight: (c) => 0.7 + (c.subject.wealth < 100 ? 0.6 : 0),
    label: () => 'Partir ailleurs',
    detail: (c) => {
      let best = '';
      let bestH = 9;
      for (const d of c.world.domainList()) {
        if (d.settlement === null || d.settlement === c.subject.settlement) continue;
        const h = hunger(d);
        if (h < bestH) {
          bestH = h;
          best = d.name;
        }
      }
      return `On mange mieux à ${best}. Tout le monde le sait, personne ne bouge.`;
    },
    take: (c) => {
      let best = c.subject.settlement;
      let bestH = 9;
      for (const d of c.world.domainList()) {
        if (d.settlement === null || d.settlement === c.subject.settlement) continue;
        const h = hunger(d);
        if (h < bestH) {
          bestH = h;
          best = d.settlement;
        }
      }
      return {
        text: 'Vous partez avec ce que vous pouvez porter. Le reste, vous l\'oublierez.',
        effects: [
          { k: 'move', settlement: best },
          { k: 'mood', d: 4 },
          {
            k: 'memory',
            text: 'Le jour où je suis parti sans me retourner.',
            salience: 60,
            tags: ['depart'],
          },
        ],
      };
    },
    tags: ['depart'],
  }),
];
