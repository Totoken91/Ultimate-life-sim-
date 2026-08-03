import type { NpcActionDef, NpcActionCtx, Effect, JobDef, Rng } from '@ed/engine';
import { shortName, classRank, de } from '@ed/engine';
import { JOBS } from './jobs.js';
import { SKILLS } from './skills.js';

/**
 * Ce que les habitants du Rivage savent faire tout seuls (doc 13).
 *
 * Chaque entrée dit ce qu'elle *apaise*, jamais quand la jouer : le sélecteur
 * s'en charge. Écrire une nouvelle conduite ne demande donc jamais de toucher
 * au moteur — c'est toute la raison d'être de ce format.
 */

const A = (d: NpcActionDef): NpcActionDef => d;

/**
 * Tables aplaties une fois pour toutes. `Object.values()` dans une décision
 * jouée deux cents fois par année allouait plus que tout le reste du système
 * réuni — la même leçon qu'au corps (doc 12 §3).
 */
const JOB_LIST: readonly JobDef[] = Object.values(JOBS);
const SKILL_IDS: readonly string[] = Object.keys(SKILLS);

/** Tire au sort parmi les éléments qui conviennent, sans construire de liste. */
function pickWhere<T>(list: readonly T[], ok: (x: T) => boolean, rng: Rng): T | null {
  let n = 0;
  for (const x of list) if (ok(x)) n += 1;
  if (n === 0) return null;
  let k = rng.int(0, n - 1);
  for (const x of list) {
    if (!ok(x)) continue;
    if (k === 0) return x;
    k -= 1;
  }
  return null;
}

/** Nom de la cible, ou une périphrase si elle n'existe pas. */
const them = (c: NpcActionCtx): string => (c.target ? shortName(c.target) : 'quelqu\'un');
const me = (c: NpcActionCtx): string => shortName(c.self);
/** Accord du participe. « Farah est parti » est une faute que le joueur voit. */
const e = (c: NpcActionCtx): string => (c.self.sex === 'f' ? 'e' : '');
const place = (c: NpcActionCtx): string =>
  c.sit.world.settlement(c.self.settlement)?.name ?? 'ailleurs';

/** `de` + élision devant un nom propre : « d'Emran », « de Sorel ». */
const of = (nom: string): string => de(nom);

const richerThan = (c: NpcActionCtx, n: number): boolean => c.self.wealth >= n;

export const NPC_ACTIONS: NpcActionDef[] = [
  // ─── survivre ─────────────────────────────────────────────────────────────

  A({
    id: 'mendier',
    label: 'tendre la main',
    serves: { survie: 0.55, richesse: 0.15 },
    minAge: 5,
    requires: (c) => c.self.wealth < c.sit.upkeep,
    weight: (c) => (classRank(c.self.socialClass) <= 2 ? 1.3 : 0.35),
    effects: (c) => [
      { k: 'wealth', d: Math.round(c.sit.upkeep * (0.2 + c.rng.float() * 0.4)) },
      { k: 'mood', d: -3 },
    ],
    news: (c) => `${me(c)} fait la manche à ${place(c)}.`,
    reach: 'intime',
    tags: ['misere'],
  }),

  A({
    id: 'chercher_travail',
    label: 'chercher un maître',
    serves: { survie: 0.5, richesse: 0.4, statut: 0.2 },
    minAge: 12,
    cooldown: 3,
    requires: (c) => !c.self.jobId,
    weight: (c) => 1 + c.self.stats.charisme / 160,
    effects: (c) => {
      const plafond = 12 + classRank(c.self.socialClass) * 12;
      const job = pickWhere(JOB_LIST, (j) => j.minAge <= c.age && j.prestige <= plafond, c.rng);
      if (!job) return [{ k: 'mood', d: -2 }];
      return [
        { k: 'job', id: job.id },
        { k: 'mood', d: 4 },
      ];
    },
    news: (c) => `${me(c)} cherche à se placer.`,
    reach: 'intime',
    tags: ['travail'],
  }),

  A({
    id: 'changer_de_metier',
    label: 'viser plus haut',
    serves: { statut: 0.45, richesse: 0.45 },
    minAge: 16,
    cooldown: 8,
    requires: (c) => !!c.self.jobId,
    weight: (c) => {
      const cur = c.self.jobId ? c.sit.ruleset.jobs[c.self.jobId] : undefined;
      return cur && c.self.jobYears >= 4 ? 1 : 0;
    },
    effects: (c) => {
      const cur = c.self.jobId ? c.sit.ruleset.jobs[c.self.jobId] : undefined;
      const floor = cur?.prestige ?? 0;
      const job = pickWhere(
        JOB_LIST,
        (j) => j.prestige > floor && j.prestige <= floor + 20 && j.minAge <= c.age,
        c.rng,
      );
      // Monter demande du talent ; sinon on reste où l'on est, humilié.
      const merite = c.self.stats.intelligence + c.self.stats.charisme;
      if (!job || !c.rng.chance(0.25 + merite / 500)) {
        return [{ k: 'mood', d: -4 }];
      }
      return [
        { k: 'job', id: job.id },
        { k: 'mood', d: 8 },
        { k: 'hidden', id: 'influence', d: 2 },
      ];
    },
    news: (c) => `${me(c)} a changé de métier.`,
    reach: 'intime',
    tags: ['travail', 'ascension'],
  }),

  A({
    id: 'se_soigner',
    label: 'aller voir quelqu\'un qui sait',
    serves: { survie: 0.65, securite: 0.2 },
    minAge: 4,
    cooldown: 2,
    // Plus on va mal, plus on finit par y aller. Sans ce poids, mendier et
    // chercher un maître servaient la même pulsion et gagnaient toujours.
    weight: (c) => 0.7 + (82 - c.self.health) / 45,
    // Conduite morte pendant longtemps, et pas pour la raison qu'on croyait :
    // ce n'était pas l'argent, c'est que **la santé d'un vivant ne descend
    // jamais sous 64**. Le corps emporte les gens avant. On va voir le
    // guérisseur quand on commence à aller mal, pas quand on agonise.
    requires: (c) => c.self.health < 82 && richerThan(c, 12),
    effects: (c) => {
      const cout = Math.min(c.self.wealth, 10 + Math.round(c.sit.upkeep * 0.15));
      // À cette époque, un remède sur trois aggrave. C'est le prix du soin.
      const bon = c.rng.chance(0.62);
      return [
        { k: 'wealth', d: -cout },
        { k: 'health', d: bon ? 7 + c.rng.int(0, 6) : -4 },
      ];
    },
    news: (c) => `${me(c)} s'est fait soigner.`,
    reach: 'intime',
    tags: ['corps'],
  }),

  A({
    id: 'partir',
    label: 'plier bagage',
    serves: { survie: 0.35, securite: 0.5, richesse: 0.25 },
    minAge: 15,
    cooldown: 12,
    weight: (c) => (c.sit.enemies >= 2 || c.self.wealth < 0 ? 1.2 : 0.25),
    effects: (c) => {
      const dest = pickWhere(
        c.sit.ruleset.settlements,
        (s) => s.id !== c.self.settlement,
        c.rng,
      );
      if (!dest) return [];
      return [
        { k: 'move', settlement: dest.id },
        { k: 'mood', d: 3 },
        {
          k: 'memory',
          text: `Je suis parti de ${place(c)} sans me retourner.`,
          salience: 45,
          tags: ['depart'],
        },
      ];
    },
    news: (c) => `${me(c)} a quitté ${place(c)}.`,
    reach: 'local',
    tags: ['depart'],
  }),

  // ─── ne pas être seul ─────────────────────────────────────────────────────

  A({
    id: 'courtiser',
    label: 'faire la cour',
    serves: { lien: 0.6, descendance: 0.5 },
    target: 'pretendant',
    minAge: 16,
    maxAge: 60,
    requires: (c) => !c.self.spouseId,
    weight: (c) => 0.8 + c.self.stats.charisme / 90,
    effects: (c) => {
      const chaud = 8 + c.rng.int(0, 14) + Math.round(c.self.stats.charisme / 8);
      return [
        {
          k: 'rel',
          to: 'cible',
          type: 'amour',
          label: 'que je regarde',
          affection: chaud,
          trust: 4,
          mutual: true,
        },
      ];
    },
    news: (c) => `${me(c)} fait la cour à ${them(c)}.`,
    reach: 'intime',
    tags: ['amour'],
  }),

  A({
    id: 'se_lier',
    label: 'se faire un ami',
    serves: { lien: 0.5, securite: 0.15, statut: 0.1 },
    target: 'voisin',
    minAge: 8,
    requires: (c) => !!c.target && !c.target.isPlayer,
    weight: (c) => 0.7 + c.self.stats.charisme / 130,
    effects: () => [
      { k: 'rel', to: 'cible', type: 'amitie', label: 'compagnon', affection: 12, trust: 8, mutual: true },
      { k: 'mood', d: 3 },
    ],
    news: (c) => `${me(c)} et ${them(c)} sont devenus proches.`,
    reach: 'intime',
    tags: ['amitie'],
  }),

  A({
    id: 'se_reconcilier',
    label: 'faire le premier pas',
    serves: { lien: 0.35, securite: 0.5 },
    target: 'rival',
    minAge: 12,
    cooldown: 5,
    // Il faut de la volonté pour aller vers quelqu'un qu'on hait.
    weight: (c) => (c.self.stats.volonte > 55 && !c.self.traits.includes('rancunier') ? 1 : 0.2),
    effects: (c) => {
      if (!c.rng.chance(0.45)) return [{ k: 'mood', d: -5 }];
      return [
        { k: 'rel', to: 'cible', affection: 30, trust: 10, mutual: true },
        { k: 'mood', d: 6 },
      ];
    },
    news: (c) => `${me(c)} et ${them(c)} se sont reparlé.`,
    reach: 'local',
    tags: ['paix'],
  }),

  A({
    id: 'veiller',
    label: 'veiller sur les siens',
    serves: { lien: 0.4, sens: 0.25 },
    target: 'enfant',
    minAge: 18,
    effects: () => [
      { k: 'rel', to: 'cible', affection: 8, trust: 6, mutual: true },
      { k: 'health', d: 2, who: 'cible' },
      { k: 'mood', d: 3 },
    ],
    news: (c) => `${me(c)} veille sur ${them(c)}.`,
    reach: 'intime',
    tags: ['famille'],
  }),

  A({
    id: 'honorer_parent',
    label: 'rendre ce qu\'on doit',
    serves: { lien: 0.3, sens: 0.3 },
    target: 'parent',
    minAge: 16,
    cooldown: 4,
    requires: (c) => richerThan(c, 60),
    effects: (c) => [
      { k: 'wealth', d: -Math.round(c.self.wealth * 0.05) },
      { k: 'wealth', d: Math.round(c.self.wealth * 0.05), who: 'cible' },
      { k: 'rel', to: 'cible', affection: 10, respect: 6, mutual: true },
    ],
    news: (c) => `${me(c)} soutient ${them(c)}.`,
    reach: 'intime',
    tags: ['famille'],
  }),

  // ─── compter aux yeux des autres ──────────────────────────────────────────

  A({
    id: 'prendre_ombrage',
    label: 'prendre quelqu\'un en grippe',
    serves: { statut: 0.4, securite: 0.2, vengeance: 0.2 },
    target: 'voisin',
    minAge: 14,
    cooldown: 7,
    // Sans cette conduite, le monde n'engendrait aucune inimitié : personne
    // n'atteignait jamais le seuil de rancune, et toute la famille « faire
    // payer » restait lettre morte. L'inégalité est le premier moteur du drame.
    requires: (c) =>
      !!c.target &&
      !c.target.isPlayer &&
      (classRank(c.target.socialClass) > classRank(c.self.socialClass) ||
        c.target.wealth > Math.max(200, c.self.wealth * 2)),
    weight: (c) =>
      0.5 +
      c.self.hidden.ambition / 110 +
      (c.self.traits.includes('rancunier') ? 0.7 : 0) +
      (c.self.traits.includes('content') ? -0.35 : 0),
    effects: () => [
      // -45 et non -32 : la rancune décroît de 2,5 % par an et les PNJ ne
      // décident qu'une année sur quatre. Une inimitié trop tiède repassait
      // sous le seuil avant que son porteur ait eu l'occasion d'en faire
      // quelque chose — le monde fabriquait des rivaux qui s'oubliaient.
      { k: 'rel', to: 'cible', type: 'rivalite', label: 'que je ne peux pas voir', affection: -45, respect: -12 },
      { k: 'rel', to: 'cible', from: 'cible', type: 'rivalite', label: 'qui me jalouse', affection: -20 },
    ],
    news: (c) => `${me(c)} ne peut plus voir ${them(c)} en peinture.`,
    reach: 'intime',
    tags: ['rivalite'],
  }),

  A({
    id: 'faire_etalage',
    label: 'se montrer',
    serves: { statut: 0.55 },
    minAge: 16,
    cooldown: 9,
    requires: (c) => richerThan(c, Math.max(1200, c.sit.upkeep * 10)),
    effects: (c) => {
      const cout = Math.round(c.self.wealth * 0.12);
      const fx: Effect[] = [{ k: 'wealth', d: -cout }, { k: 'hidden', id: 'influence', d: 3 }];
      // Le respect ne s'achète pas : il se paie chez ceux qui vous voient.
      // `toward()` trie : prendre « les six premiers » d'un parcours non trié
      // rendrait la partie dépendante de l'ordre d'insertion des arêtes, donc
      // différente après un rechargement. Ici, la correction passe avant le coût.
      for (const rel of c.sit.world.relations.toward(c.self.id).slice(0, 6)) {
        c.sit.world.relations.modify(rel.from, c.self.id, { respect: 5 });
      }
      return fx;
    },
    news: (c) => `${me(c)} a fait parler de sa fortune à ${place(c)}.`,
    reach: 'local',
    tags: ['faste'],
  }),

  A({
    id: 'fonder_maison',
    label: 'fonder une maison',
    serves: { statut: 0.7, sens: 0.5, pouvoir: 0.3 },
    minAge: 28,
    // Une maison doit rester un événement. Première version : deux cent dix
    // maisons fondées en quarante-cinq ans — le titre ne voulait plus rien
    // dire. Deuxième version : aucune en quarante-cinq ans. Il faut du nom,
    // de la fortune *et* une descendance à qui la laisser.
    requires: (c) =>
      !c.self.houseId &&
      c.self.wealth >= 25000 &&
      c.self.childrenIds.length >= 1 &&
      c.self.hidden.influence >= 42 &&
      classRank(c.self.socialClass) >= 3,
    weight: () => 1.6,
    effects: () => [
      { k: 'foundHouse' },
      { k: 'hidden', id: 'influence', d: 8 },
    ],
    news: (c) => `${me(c)} a fondé une maison à ${place(c)}.`,
    reach: 'monde',
    tags: ['dynastie'],
  }),

  A({
    id: 'prendre_epithete',
    label: 'se faire un nom',
    serves: { statut: 0.4, sens: 0.2 },
    minAge: 25,
    cooldown: 20,
    requires: (c) => !c.self.epithet && c.self.hidden.influence >= 38,
    effects: (c) => [
      { k: 'hidden', id: 'influence', d: 4 },
      {
        k: 'memory',
        text: `On a commencé à m'appeler autrement, à ${place(c)}.`,
        salience: 55,
        tags: ['renom'],
      },
    ],
    news: (c) => `On commence à connaître le nom ${of(me(c))}.`,
    reach: 'local',
    tags: ['renom'],
  }),

  // ─── avoir de quoi ────────────────────────────────────────────────────────

  A({
    id: 'commercer',
    label: 'tenter une affaire',
    serves: { richesse: 0.6, statut: 0.15 },
    minAge: 14,
    cooldown: 2,
    requires: (c) => richerThan(c, 120),
    weight: (c) => 0.6 + (c.self.skills['negoce'] ?? 0) / 60,
    effects: (c) => {
      const mise = Math.round(c.self.wealth * 0.25);
      const talent = (c.self.skills['negoce'] ?? 0) / 100 + c.self.stats.intelligence / 200;
      const gain = c.rng.chance(0.42 + talent * 0.3)
        ? Math.round(mise * (0.4 + c.rng.float() * 1.1))
        : -Math.round(mise * (0.3 + c.rng.float() * 0.6));
      return [
        { k: 'wealth', d: gain },
        { k: 'skill', id: 'negoce', d: 1.5 },
        { k: 'mood', d: gain > 0 ? 4 : -5 },
      ];
    },
    news: (c) => `${me(c)} a monté une affaire.`,
    reach: 'intime',
    tags: ['negoce'],
  }),

  A({
    id: 'voler',
    label: 'prendre ce qui traîne',
    serves: { richesse: 0.55, survie: 0.35 },
    target: 'voisin',
    minAge: 8,
    cooldown: 2,
    requires: (c) => !!c.target && c.target.wealth > 50,
    weight: (c) =>
      (0.35 + c.self.hidden.corruption / 45) *
      (c.self.wealth < c.sit.upkeep ? 1.6 : 0.7) *
      (c.self.traits.includes('voleur') ? 1.8 : 1),
    effects: (c) => {
      const butin = Math.round((c.target?.wealth ?? 0) * (0.05 + c.rng.float() * 0.15));
      const adresse = (c.self.skills['vol'] ?? 0) / 100 + c.self.stats.agilite / 220;
      const fx: Effect[] = [
        { k: 'wealth', d: butin },
        { k: 'wealth', d: -butin, who: 'cible' },
        { k: 'skill', id: 'vol', d: 2 },
        { k: 'hidden', id: 'karma', d: -2 },
      ];
      // Se faire prendre, c'est se faire un ennemi pour la vie.
      if (!c.rng.chance(0.45 + adresse * 0.4)) {
        fx.push(
          { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'voleur', affection: -45, trust: -35 },
          { k: 'flag', name: 'vu_voler', value: true },
        );
      }
      return fx;
    },
    news: (c) => `On a volé ${them(c)} à ${place(c)}.`,
    reach: 'local',
    tags: ['crime'],
  }),

  A({
    id: 'extorquer',
    label: 'faire payer sa protection',
    serves: { richesse: 0.5, pouvoir: 0.35 },
    target: 'voisin',
    minAge: 18,
    cooldown: 3,
    requires: (c) =>
      !!c.target && c.self.stats.force > 55 && c.self.hidden.corruption > 40 && c.target.wealth > 100,
    effects: (c) => {
      const somme = Math.round((c.target?.wealth ?? 0) * 0.12);
      return [
        { k: 'wealth', d: somme },
        { k: 'wealth', d: -somme, who: 'cible' },
        { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'celui qui prend', affection: -30, fear: 35 },
        { k: 'hidden', id: 'karma', d: -3 },
        { k: 'hidden', id: 'influence', d: 2 },
      ];
    },
    news: (c) => `${me(c)} rançonne ${them(c)}.`,
    reach: 'local',
    tags: ['crime', 'pouvoir'],
  }),

  A({
    id: 'preter',
    label: 'prêter de l\'argent',
    serves: { richesse: 0.3, pouvoir: 0.3, lien: 0.15 },
    target: 'voisin',
    minAge: 20,
    cooldown: 3,
    requires: (c) => richerThan(c, 2000) && !!c.target && c.target.wealth < c.self.wealth / 4,
    effects: (c) => {
      const somme = Math.round(c.self.wealth * 0.08);
      return [
        { k: 'wealth', d: -somme },
        { k: 'wealth', d: somme, who: 'cible' },
        { k: 'rel', to: 'cible', type: 'dette', label: 'me doit', respect: 5 },
        { k: 'rel', to: 'cible', from: 'cible', type: 'dette', label: 'créancier', affection: 8, fear: 10 },
      ];
    },
    news: (c) => `${them(c)} a emprunté à ${me(c)}.`,
    reach: 'intime',
    tags: ['negoce', 'pouvoir'],
  }),

  // ─── décider du sort des autres ───────────────────────────────────────────

  A({
    id: 's_allier',
    label: 'se mettre au service d\'un plus grand',
    serves: { pouvoir: 0.45, securite: 0.4, statut: 0.25 },
    // On jure à quelqu'un qui a déjà des hommes. C'est ce qui fait qu'une
    // allégeance en appelle une autre, et qu'un réseau finit par avoir un nom.
    target: 'patron',
    minAge: 16,
    cooldown: 10,
    requires: (c) =>
      !!c.target &&
      !c.target.isPlayer &&
      (classRank(c.target.socialClass) >= classRank(c.self.socialClass) ||
        c.target.hidden.influence > c.self.hidden.influence + 10),
    effects: () => [
      { k: 'rel', to: 'cible', type: 'serment', label: 'mon seigneur', respect: 25, trust: 15 },
      { k: 'rel', to: 'cible', from: 'cible', type: 'serment', label: 'mon homme', trust: 10, affection: 6 },
      { k: 'hidden', id: 'influence', d: 3 },
    ],
    news: (c) => `${me(c)} s'est engagé${e(c)} auprès ${of(them(c))}.`,
    reach: 'local',
    tags: ['serment'],
  }),

  A({
    id: 'recruter',
    label: 'rassembler des hommes',
    serves: { pouvoir: 0.55 },
    target: 'cadet',
    minAge: 22,
    cooldown: 3,
    requires: (c) => c.self.hidden.influence >= 30 && richerThan(c, 500),
    effects: (c) => [
      { k: 'wealth', d: -Math.round(c.self.wealth * 0.06) },
      { k: 'rel', to: 'cible', from: 'cible', type: 'serment', label: 'mon chef', respect: 20, trust: 12 },
      { k: 'rel', to: 'cible', type: 'serment', label: 'mon homme', trust: 8 },
      { k: 'hidden', id: 'influence', d: 4 },
    ],
    news: (c) => `${me(c)} a pris ${them(c)} à son service.`,
    reach: 'local',
    tags: ['pouvoir'],
  }),

  A({
    id: 'intriguer',
    label: 'travailler quelqu\'un dans le dos',
    serves: { pouvoir: 0.4, vengeance: 0.4, statut: 0.2 },
    target: 'rival',
    minAge: 15,
    cooldown: 3,
    weight: (c) => 0.5 + (c.self.skills['intrigue'] ?? 0) / 70 + c.self.stats.intelligence / 200,
    effects: (c) => {
      const habile = c.rng.chance(0.4 + (c.self.skills['intrigue'] ?? 0) / 200);
      const fx: Effect[] = [{ k: 'skill', id: 'intrigue', d: 2.5 }];
      if (habile) {
        fx.push({ k: 'hidden', id: 'influence', d: 3 });
        for (const rel of c.sit.world.relations.toward(c.target?.id ?? c.self.id).slice(0, 5)) {
          c.sit.world.relations.modify(rel.from, rel.to, { respect: -6, trust: -5 });
        }
      } else {
        // Une manœuvre découverte se retourne : c'est ce qui rend l'intrigue chère.
        fx.push({ k: 'rel', to: 'cible', from: 'cible', affection: -20, trust: -20 });
      }
      return fx;
    },
    news: (c) => `On dit du mal ${of(them(c))} à ${place(c)}.`,
    reach: 'local',
    tags: ['intrigue'],
  }),

  A({
    id: 'prendre_la_tete',
    label: 'prendre la tête de la maison',
    serves: { pouvoir: 0.7, statut: 0.5 },
    minAge: 20,
    cooldown: 15,
    requires: (c) => {
      const house = c.sit.world.house(c.self.houseId);
      if (!house || house.headId === c.self.id) return false;
      const chef = c.sit.world.get(house.headId);
      // On ne conteste que ce qui vacille : un chef mort, ou une loi du plus fort.
      return !chef || !chef.alive || house.law === 'combat';
    },
    effects: (c) => {
      const house = c.sit.world.house(c.self.houseId);
      if (!house) return [];
      house.headId = c.self.id;
      house.headHistory.push(c.self.id);
      return [
        { k: 'hidden', id: 'influence', d: 10 },
        { k: 'chronicle', kind: 'ascension', importance: 3, data: { maison: house.name } },
      ];
    },
    news: (c) => `${me(c)} a pris la tête de sa maison.`,
    reach: 'monde',
    tags: ['dynastie', 'pouvoir'],
  }),

  // ─── faire payer ──────────────────────────────────────────────────────────

  A({
    id: 'menacer',
    label: 'menacer',
    serves: { vengeance: 0.4, securite: 0.3, pouvoir: 0.2 },
    target: 'rival',
    minAge: 13,
    cooldown: 2,
    effects: () => [
      { k: 'rel', to: 'cible', from: 'cible', fear: 20, affection: -8 },
      { k: 'rel', to: 'cible', affection: -5 },
      { k: 'mood', d: 3 },
    ],
    news: (c) => `${me(c)} a menacé ${them(c)} devant témoins.`,
    reach: 'local',
    tags: ['violence'],
  }),

  A({
    id: 'agresser',
    label: 'lever la main',
    serves: { vengeance: 0.65 },
    target: 'rival',
    minAge: 14,
    cooldown: 4,
    weight: (c) =>
      (0.4 + c.self.stats.force / 130) * (c.self.traits.includes('violent') ? 1.9 : 1),
    effects: (c) => {
      const moi = c.self.stats.force + (c.self.skills['lutte'] ?? 0);
      const lui = (c.target?.stats.force ?? 50) + (c.target?.skills['lutte'] ?? 0);
      const gagne = c.rng.chance(moi / Math.max(1, moi + lui));
      const fx: Effect[] = [
        { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'qui m\'a frappé', affection: -30, fear: 20 },
        // Frapper quelqu'un ne calme pas : on se donne raison. Sans cette
        // ligne, la haine d'un agresseur plafonnait et personne n'allait
        // jamais jusqu'au bout.
        { k: 'rel', to: 'cible', affection: -14 },
        { k: 'skill', id: 'lutte', d: 2 },
        { k: 'hidden', id: 'karma', d: -2 },
      ];
      fx.push(gagne ? { k: 'health', d: -14, who: 'cible' } : { k: 'health', d: -12 });
      return fx;
    },
    news: (c) => `${me(c)} s'en est pris${e(c)} à ${them(c)}.`,
    reach: 'local',
    tags: ['violence'],
  }),

  A({
    id: 'tuer',
    label: 'en finir',
    serves: { vengeance: 0.95 },
    target: 'rival',
    minAge: 15,
    cooldown: 25,
    requires: (c) =>
      !!c.sit.grudge &&
      // Mesuré : la haine la plus profonde que le monde produise tourne autour
      // de -59. Un seuil à -80, puis à -70, rendait le meurtre littéralement
      // impossible entre PNJ. On cale le seuil sur ce que le monde fabrique.
      c.sit.grudge.affection <= -55 &&
      (c.self.hidden.corruption > 40 || c.self.hidden.folie > 45 || c.self.traits.includes('violent')),
    weight: () => 0.55,
    effects: (c) => {
      const moi = c.self.stats.force + (c.self.skills['lame'] ?? 0) * 1.5;
      const lui = (c.target?.stats.force ?? 50) + (c.target?.skills['lame'] ?? 0) * 1.5;
      if (!c.rng.chance(moi / Math.max(1, moi + lui) + 0.15)) {
        // Rater un meurtre est pire que de ne pas l'avoir tenté.
        return [
          { k: 'health', d: -22 },
          { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'qui a voulu me tuer', affection: -60, fear: 40 },
          { k: 'trait', add: 'notoire' },
        ];
      }
      return [
        { k: 'kill', who: 'cible', cause: 'un meurtre' },
        { k: 'hidden', id: 'karma', d: -18 },
        { k: 'hidden', id: 'corruption', d: 8 },
        { k: 'trait', add: 'violent' },
        { k: 'chronicle', kind: 'crime', importance: 3, actors: ['subject', 'cible'] },
      ];
    },
    news: (c) => `${them(c)} est mort. On regarde ${me(c)} de travers.`,
    reach: 'monde',
    tags: ['violence', 'crime'],
  }),

  A({
    id: 'denoncer',
    label: 'dénoncer publiquement',
    serves: { vengeance: 0.45, statut: 0.2, securite: 0.2 },
    target: 'rival',
    minAge: 14,
    cooldown: 6,
    weight: (c) => 0.6 + c.self.stats.charisme / 140,
    effects: (c) => {
      const cru = c.rng.chance(0.35 + c.self.stats.charisme / 250);
      if (!cru) return [{ k: 'mood', d: -6 }, { k: 'rel', to: 'cible', from: 'cible', affection: -15 }];
      return [
        { k: 'hidden', id: 'karma', d: -1 },
        { k: 'rel', to: 'cible', from: 'cible', type: 'haine', label: 'qui m\'a dénoncé', affection: -35 },
        { k: 'trait', add: 'notoire', who: 'cible' },
      ];
    },
    news: (c) => `${me(c)} a accusé ${them(c)} en public.`,
    reach: 'local',
    tags: ['intrigue'],
  }),

  // ─── comprendre ───────────────────────────────────────────────────────────

  A({
    id: 'apprendre',
    label: 'apprendre quelque chose',
    serves: { savoir: 0.6, statut: 0.1 },
    minAge: 7,
    weight: (c) => 0.7 + c.self.stats.intelligence / 130,
    effects: (c) => {
      const id = c.rng.pickOrNull(SKILL_IDS);
      if (!id) return [];
      return [
        { k: 'skill', id, d: 2 + c.rng.int(0, 3) },
        { k: 'mood', d: 2 },
      ];
    },
    tags: ['savoir'],
  }),

  A({
    id: 'enseigner',
    label: 'transmettre son métier',
    serves: { savoir: 0.35, sens: 0.4, lien: 0.2, statut: 0.15 },
    target: 'cadet',
    minAge: 28,
    cooldown: 14,
    requires: (c) => !!c.self.jobId && (c.self.skills[Object.keys(c.sit.ruleset.jobs[c.self.jobId ?? '']?.trains ?? {})[0] ?? ''] ?? 0) >= 25,
    effects: (c) => {
      const job = c.self.jobId ? c.sit.ruleset.jobs[c.self.jobId] : undefined;
      const skillId = job ? Object.keys(job.trains)[0] : undefined;
      const fx: Effect[] = [
        { k: 'rel', to: 'cible', type: 'mentorat', label: 'mon élève', affection: 12, respect: 6 },
        { k: 'rel', to: 'cible', from: 'cible', type: 'mentorat', label: 'mon maître', affection: 15, respect: 25 },
      ];
      if (skillId) fx.push({ k: 'skill', id: skillId, d: 5, who: 'cible' });
      return fx;
    },
    news: (c) => `${me(c)} a pris ${them(c)} en apprentissage.`,
    reach: 'intime',
    tags: ['savoir', 'travail'],
  }),

  // ─── laisser quelque chose ────────────────────────────────────────────────

  A({
    id: 'transmettre',
    label: 'transmettre',
    serves: { sens: 0.6, lien: 0.2 },
    target: 'enfant',
    minAge: 45,
    cooldown: 6,
    effects: (c) => [
      { k: 'rel', to: 'cible', affection: 12, trust: 10, mutual: true },
      { k: 'stat', stat: 'volonte', d: 2, who: 'cible' },
      {
        k: 'memory',
        text: `${shortName(c.target ?? c.self)} m'a écouté, cette fois-là.`,
        salience: 50,
        actors: ['cible'],
        tags: ['heritage'],
      },
    ],
    news: (c) => `${me(c)} prépare ${them(c)} à prendre la suite.`,
    reach: 'intime',
    tags: ['heritage'],
  }),

  A({
    id: 'se_retirer',
    label: 'se retirer',
    serves: { sens: 0.55, survie: 0.35 },
    minAge: 52,
    cooldown: 10,
    requires: (c) => !!c.self.jobId && c.self.health < 65,
    effects: () => [
      { k: 'job', id: null },
      { k: 'mood', d: 8 },
      { k: 'health', d: 4 },
    ],
    news: (c) => `${me(c)} a posé ses outils.`,
    reach: 'intime',
    tags: ['vieillesse'],
  }),

  A({
    id: 'faire_le_bien',
    label: 'donner à ceux qui n\'ont rien',
    serves: { sens: 0.45, statut: 0.2 },
    minAge: 20,
    cooldown: 3,
    requires: (c) => richerThan(c, Math.max(400, c.sit.upkeep * 4)),
    weight: (c) =>
      (c.self.traits.includes('genereux') ? 2 : 1) * (c.self.traits.includes('avare') ? 0.1 : 1),
    effects: (c) => [
      { k: 'wealth', d: -Math.round(c.self.wealth * 0.07) },
      { k: 'hidden', id: 'karma', d: 5 },
      { k: 'hidden', id: 'influence', d: 2 },
      { k: 'mood', d: 5 },
    ],
    news: (c) => `${me(c)} a fait l'aumône à ${place(c)}.`,
    reach: 'intime',
    tags: ['vertu'],
  }),

  A({
    id: 'pelerinage',
    label: 'partir en pèlerinage',
    serves: { sens: 0.5, savoir: 0.2 },
    minAge: 25,
    cooldown: 15,
    requires: (c) => richerThan(c, 300),
    weight: (c) => (c.self.traits.includes('pieux') ? 2.2 : 0.6),
    effects: (c) => [
      { k: 'wealth', d: -Math.round(c.self.wealth * 0.1) },
      { k: 'hidden', id: 'karma', d: 4 },
      { k: 'mood', d: 10 },
      { k: 'health', d: c.rng.chance(0.25) ? -8 : 1 },
      {
        k: 'memory',
        text: 'J\'ai marché longtemps, et je suis revenu autre.',
        salience: 60,
        tags: ['foi'],
      },
    ],
    news: (c) => `${me(c)} est parti${e(c)} en pèlerinage.`,
    reach: 'intime',
    tags: ['foi'],
  }),
];
