import {
  CLASS_LABELS,
  STAT_IDS,
  STAT_SHORT,
  ageOf,
  band,
  describeFeeling,
  describeHealth,
  describeMood,
  describeWealth,
  pursePhrase,
  UPKEEP,
  describeVital,
  effectiveStat,
  organState,
  painState,
  CONDITION_KIND_LABELS,
  ORGAN_IDS,
  ORGAN_LABELS,
  VITAL_IDS,
  VITAL_LABELS,
  fullName,
  lifeStage,
  relevance,
  shortName,
  livingMembers,
  FACTION_KIND_LABELS,
  GOAL_LABELS,
  DRIVE_LABELS,
  DRIVE_IDS,
  STAT_DESC,
  STAT_LABELS,
  computeDrives,
  emptyCast,
  readRelations,
  upkeepOf,
  statBand,
  GOOD_IDS,
  GOOD_LABELS,
  GOOD_BASE_PRICE,
  SCALE_LABELS,
  describeGovernment,
  regimeName,
  rulerName,
  hunger,
  de,
  ofName,
  type Character,
  type EntityId,
  type StatId,
} from '@ed/engine';
import type { Game } from './game.js';

export interface StatusView {
  name: string;
  year: number;
  age: number;
  stage: string;
  settlement: string;
  house: string | null;
  socialClass: string;
  job: string | null;
  health: string;
  healthValue: number;
  mood: string;
  moodValue: number;
  wealth: string;
  stats: { id: StatId; short: string; label: string; value: number; band: string; desc: string }[];
  titles: string[];
  /** Ce qui entre et ce qui sort chaque année. Lisible, pas répété. */
  income: number;
  upkeep: number;
}

export function status(game: Game): StatusView {
  const p = game.player;
  const world = game.world;
  const house = world.house(p.houseId);
  const job = p.jobId ? game.ruleset.jobs[p.jobId] : undefined;
  return {
    name: fullName(p),
    year: world.year,
    age: game.age,
    stage: lifeStage(game.age),
    settlement: world.settlement(p.settlement)?.name ?? p.settlement,
    house: house ? `Maison ${house.name}` : null,
    socialClass: CLASS_LABELS[p.socialClass],
    job: job?.label ?? null,
    health: describeHealth(p),
    healthValue: p.health,
    mood: describeMood(p),
    moodValue: p.mood,
    wealth: pursePhrase(
      p.wealth,
      // On mesure la bourse au train de vie d'un adulte, et **jamais sous
      // celui d'un homme du commun** : sinon 3 000 sous deviennent « de quoi
      // ne plus jamais y penser » pour un pauvre (dont l'année coûte 90) et
      // retombent à « de quoi tenir » dès qu'il monte d'un rang. L'échelle
      // doit être stable, sans quoi elle ne veut plus rien dire.
      Math.max(
        Number(p.flags['depenseAn'] ?? 0),
        UPKEEP[p.socialClass],
        UPKEEP.commun,
      ),
    ),
    stats: STAT_IDS.map((id) => ({
      id,
      short: STAT_SHORT[id],
      label: STAT_LABELS[id],
      band: statBand(effectiveStat(p, id)),
      desc: STAT_DESC[id],
      value: effectiveStat(p, id),
    })),
    titles: [...p.titles],
    income: Number(p.flags['revenuAn'] ?? 0),
    upkeep: Number(p.flags['depenseAn'] ?? 0),
  };
}

export interface RelationView {
  id: EntityId;
  name: string;
  age: number;
  label: string;
  /** Ce que *l'autre* ressent pour vous — c'est ça qui compte. */
  feeling: string;
  affection: number;
  alive: boolean;
  isSpouse: boolean;
  isChild: boolean;
}

export function relations(game: Game, includeDead = false): RelationView[] {
  const world = game.world;
  const p = game.player;
  const out: RelationView[] = [];
  for (const rel of world.relations.from(p.id)) {
    const other = world.get(rel.to);
    if (!other) continue;
    if (!other.alive && !includeDead) continue;
    const back = world.relations.get(other.id, p.id);
    out.push({
      id: other.id,
      name: shortName(other),
      age: ageOf(other, world.year),
      label: rel.label,
      feeling: back ? describeFeeling(back) : 'vous connaît à peine',
      affection: back?.affection ?? 0,
      alive: other.alive,
      isSpouse: p.spouseId === other.id,
      isChild: p.childrenIds.includes(other.id),
    });
  }
  out.sort(
    (a, b) =>
      Number(b.isSpouse) - Number(a.isSpouse) ||
      Number(b.isChild) - Number(a.isChild) ||
      b.affection - a.affection ||
      a.id - b.id,
  );
  return out;
}

export interface SelfView {
  traits: { label: string; desc: string; kind: string }[];
  skills: { label: string; value: number; band: string }[];
  injuries: string[];
  memories: { year: number; text: string }[];
  paths: string[];
  children: { name: string; age: number; alive: boolean }[];
}

export function self(game: Game): SelfView {
  const p = game.player;
  const world = game.world;
  const rs = game.ruleset;

  const traits = p.traits
    .map((id) => rs.traits[id])
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ label: t.label, desc: t.desc, kind: t.kind }));

  const skills = Object.entries(p.skills)
    .filter(([, v]) => v >= 1)
    .map(([id, v]) => ({ label: rs.skills[id]?.label ?? id, value: Math.round(v), band: band(v) }))
    .sort((a, b) => b.value - a.value);

  const memories = world.memories
    .recent(p.id, 10, world.year)
    .filter((m) => relevance(m, world.year) > 2)
    .map((m) => ({ year: m.year, text: m.text }));

  const children = p.childrenIds
    .map((id) => world.get(id))
    .filter((c): c is Character => !!c)
    .map((c) => ({ name: shortName(c), age: ageOf(c, world.year), alive: c.alive }));

  return {
    traits,
    skills,
    injuries: p.injuries.map((i) => i.label),
    memories,
    paths: [...p.paths],
    children,
  };
}

export interface BodyView {
  health: number;
  healthLabel: string;
  organs: { id: string; label: string; value: number; state: string }[];
  vitals: { id: string; label: string; value: number; feeling: string | null }[];
  pain: string | null;
  infection: number;
  conditions: {
    id: string;
    label: string;
    kind: string;
    since: number;
    years: number;
    severity: number;
    sign: string | null;
  }[];
}

/** Ce que le personnage sait de son propre corps — jamais de vocabulaire clinique. */
export function body(game: Game): BodyView {
  const p = game.player;
  const b = p.body;
  const defs = new Map(game.ruleset.conditions.map((d) => [d.id, d]));

  return {
    health: p.health,
    healthLabel: describeHealth(p),
    organs: ORGAN_IDS.map((id) => ({
      id,
      label: ORGAN_LABELS[id],
      value: Math.round(b.organs[id]),
      state: organState(b.organs[id]),
    })),
    vitals: VITAL_IDS.map((id) => ({
      id,
      label: VITAL_LABELS[id],
      value: Math.round(b.vitals[id]),
      feeling: describeVital(id, b.vitals[id]),
    })),
    pain: painState(b.douleur),
    infection: Math.round(b.infection),
    conditions: b.conditions
      .filter((c) => !c.hidden)
      .map((c) => {
        const def = defs.get(c.defId);
        const signs = def?.signs ?? [];
        const index = Math.min(
          Math.max(0, signs.length - 1),
          Math.floor((c.severity / 100) * signs.length),
        );
        return {
          id: c.defId,
          label: def?.label ?? c.defId,
          kind: def ? CONDITION_KIND_LABELS[def.kind] : '',
          since: c.since,
          years: game.world.year - c.since,
          severity: Math.round(c.severity),
          sign: signs[index] ?? null,
        };
      })
      .sort((a, b2) => b2.severity - a.severity),
  };
}

/** Un groupe, tel qu'on en parlerait en ville (doc 14 §4). */
export interface FactionView {
  id: string;
  name: string;
  kind: string;
  seat: string;
  members: number;
  power: number;
  goal: string;
  losses: number;
  since: number;
  /** Emprise sur le lieu du joueur, 0..100. */
  grip: number;
  /** Chez vous. */
  ici: boolean;
  /** Vous en êtes. */
  mien: boolean;
  /** Vous connaissez son chef. */
  connu: boolean;
}

/**
 * Les groupes debout, du plus puissant au plus faible. On ne cache rien :
 * l'écran du monde est un écran de chiffres, pas la tête du personnage.
 */
export function factions(game: Game): FactionView[] {
  const world = game.world;
  const me = game.player;
  const out: FactionView[] = world.activeFactions().map((f) => ({
    id: f.id,
    name: f.name,
    kind: FACTION_KIND_LABELS[f.kind],
    seat: world.settlement(f.seat)?.name ?? f.seat,
    members: livingMembers(world, f).length,
    power: f.power,
    goal: GOAL_LABELS[f.goal],
    losses: f.losses,
    since: f.foundedYear,
    grip: Math.round(f.grip[me.settlement] ?? 0),
    ici: f.seat === me.settlement,
    mien: f.leaderId === me.id || f.memberIds.includes(me.id),
    connu: !!world.relations.get(me.id, f.leaderId),
  }));
  out.sort((a, b) => b.power - a.power || (a.id < b.id ? -1 : 1));
  return out;
}

/**
 * Le domaine où l'on vit, tel qu'on le raconterait (doc 11 §7) : des
 * conséquences humaines avant des chiffres.
 */
export interface DomainView {
  id: string;
  name: string;
  scale: string;
  population: number;
  /** « chefferie », « république »… déduit des sept axes. */
  regime: string;
  /** La phrase complète, sans tableau. */
  loi: string;
  ruler: string;
  legitimacy: number;
  unrest: number;
  treasury: number;
  /** Manque de vivres et d'eau, 0..100. */
  faim: number;
  /** Les prix qui bougent, avec leur écart au prix de référence. */
  prices: { good: string; price: number; ratio: number }[];
  /** Ce que le lieu produit en trop, et ce qui lui manque. */
  surplus: string[];
  manques: string[];
  ici: boolean;
}

export function domains(game: Game): DomainView[] {
  const world = game.world;
  const chezMoi = game.player.settlement;
  return world.domainList().map((d) => {
    const prices = GOOD_IDS.filter((g) => d.prices[g] !== undefined)
      .map((g) => ({
        good: GOOD_LABELS[g],
        price: d.prices[g] ?? 0,
        ratio: (d.prices[g] ?? 0) / GOOD_BASE_PRICE[g],
      }))
      .sort((a, b) => b.ratio - a.ratio);
    const surplus: string[] = [];
    const manques: string[] = [];
    for (const g of GOOD_IDS) {
      const prod = d.production[g] ?? 0;
      const besoin = d.consumption[g] ?? 0;
      if (prod > besoin * 1.25 && prod > 0.5) surplus.push(GOOD_LABELS[g]);
      if ((d.shortage[g] ?? 0) > 0.12) manques.push(GOOD_LABELS[g]);
    }
    return {
      id: d.id,
      name: d.name,
      scale: SCALE_LABELS[d.scale],
      population: d.population,
      regime: regimeName(d.government),
      loi: describeGovernment(d.government),
      ruler: rulerName(world, d),
      legitimacy: Math.round(d.legitimacy),
      unrest: Math.round(d.unrest),
      treasury: d.treasury,
      faim: Math.round(hunger(d) * 100),
      prices: prices.slice(0, 7),
      surplus,
      manques,
      ici: d.settlement === chezMoi,
    };
  });
}

/**
 * Ce que votre personnage veut (doc 18 §2).
 *
 * Le moteur calcule ces dix manques pour chaque PNJ depuis le doc 13 ; le
 * joueur a exactement les mêmes et ne les voyait pas. C'est la réponse directe
 * à « j'ai l'impression de jouer dans le vide » : une boussole qui ne dicte
 * rien, mais qui dit où ça tire.
 */
export interface UrgeView {
  id: string;
  label: string;
  /** 0 à 100. */
  force: number;
  /** Une phrase à la première personne. */
  phrase: string;
}

const URGE_PHRASES: Record<string, string> = {
  survie: 'Vous ne tiendrez pas comme ça.',
  securite: 'Vous ne dormez pas tranquille.',
  lien: 'Vous êtes seul, et ça pèse.',
  descendance: 'Vous voudriez que quelque chose vous survive.',
  statut: 'Vous en avez assez qu\'on ne vous voie pas.',
  richesse: 'Vous comptez trop souvent ce qu\'il vous reste.',
  pouvoir: 'Vous supportez mal qu\'un autre décide pour vous.',
  vengeance: 'Il y a quelqu\'un à qui vous pensez trop souvent.',
  savoir: 'Il y a des choses que vous voulez comprendre.',
  sens: 'Vous vous demandez ce qui restera.',
};

/** Les manques du joueur, du plus criant au moins, filtrés au significatif. */
export function urges(game: Game): UrgeView[] {
  const world = game.world;
  const me = game.player;
  const cast = emptyCast();
  const read = readRelations(world, me, cast);
  let kids = 0;
  for (const id of me.childrenIds) if (world.get(id)?.alive) kids += 1;
  const drives = computeDrives({
    self: me,
    world,
    ruleset: game.ruleset,
    age: game.age,
    cast,
    grudge: read.grudge,
    allies: read.allies,
    enemies: read.enemies,
    bonds: read.bonds,
    kids,
    upkeep: upkeepOf(me, world.year),
    danger: world.settlement(me.settlement)?.danger ?? 0,
  });
  return DRIVE_IDS.map((id) => ({
    id,
    label: DRIVE_LABELS[id],
    force: Math.round(drives[id] * 100),
    phrase: URGE_PHRASES[id] ?? '',
  }))
    .filter((u) => u.force >= 18)
    .sort((a, b) => b.force - a.force)
    .slice(0, 4);
}

export interface WorldView {
  settlement: { name: string; description: string; size: string; danger: string };
  year: number;
  mode: string;
  activeSeeds: number;
  knownPeople: number;
  /** Ce que les autres ont fait pendant que vous viviez votre vie (doc 13 §4). */
  news: { year: number; text: string; ici: boolean }[];
}

export function worldView(game: Game): WorldView {
  const world = game.world;
  const s = world.settlement(game.player.settlement);
  return {
    settlement: {
      name: s?.name ?? game.player.settlement,
      description: s?.description ?? '',
      size: s?.size ?? '',
      danger:
        (s?.danger ?? 0) > 65 ? 'très dangereux' : (s?.danger ?? 0) > 40 ? 'rude' : 'calme',
    },
    year: world.year,
    mode: world.mode,
    activeSeeds: world.seeds.length,
    knownPeople: world.relations.from(game.player.id).length,
    news: world.recentNews(15, 30).map((n) => ({
      year: n.year,
      text: n.text,
      ici: n.place === game.player.settlement,
    })),
  };
}

// ─── votre place (doc 18 §4) ─────────────────────────────────────────────────

export interface StepView {
  id: string;
  /** Ce qu'on a, ou ce qu'on n'a pas encore. */
  label: string;
  done: boolean;
  /** Comment y arriver — la phrase qui manquait au jeu. */
  how: string;
  /** Ce que ça a changé, une fois obtenu. */
  got: string;
}

export interface StandingView {
  /** Une phrase qui dit ce que vous êtes, aujourd'hui, pour les autres. */
  title: string;
  /** Combien de marches sur combien. */
  done: number;
  total: number;
  steps: StepView[];
  /** Les trois prochaines, dans l'ordre où on les prend d'habitude. */
  next: StepView[];
}

/**
 * **Où vous en êtes, et ce qui vient après.**
 *
 * Le joueur disait : « je comprends rien à comment évoluer ». Il avait raison —
 * le jeu simulait une ascension sans jamais la nommer. Cette vue ne simule
 * rien : elle *lit* l'état du monde et le dit en marches. Aucune ne s'impose,
 * aucune ne se coche à la main ; on les franchit en jouant, et on peut mourir
 * sans en avoir pris une seule.
 */
export function standing(game: Game): StandingView {
  const world = game.world;
  const me = game.player;
  const age = game.age;

  const mesBiens = world.holdingsOf(me.id);
  const maFaction = world.activeFactions().find(
    (f) => f.leaderId === me.id || f.memberIds.includes(me.id),
  );
  const jeMene = maFaction?.leaderId === me.id;
  const maison = world.house(me.houseId);
  const jeSuisChef = maison?.headId === me.id;
  const domaine = world.domainList().find((d) => d.rulerId === me.id);
  let enfants = 0;
  for (const id of me.childrenIds) if (world.get(id)?.alive) enfants += 1;
  const generations = maison ? maison.headHistory.length : 0;

  const steps: StepView[] = [
    {
      id: 'grandir',
      label: 'Passer l\'enfance',
      done: age >= 16,
      how: 'Tenir jusqu\'à seize ans. Beaucoup n\'y arrivent pas.',
      got: 'Votre année vous appartient : on ne décide plus pour vous.',
    },
    {
      id: 'metier',
      label: 'Avoir un métier',
      done: !!me.jobId,
      how: 'Un voisin qui exerce cherche parfois quelqu\'un à former — guettez l\'occasion. Ou apprenez, puis proposez-vous.',
      got: 'De quoi entre chaque année sans que vous ayez à le voler.',
    },
    {
      id: 'toit',
      label: 'Un toit à vous',
      done: mesBiens.length > 0,
      how: 'Amassez de quoi acheter, puis achetez chez vous. Un bien se paie encore chaque année après.',
      got: 'On sait où vous trouver, et vous dormez mieux.',
    },
    {
      id: 'foyer',
      label: 'Quelqu\'un à côté de vous',
      done: !!world.get(me.spouseId)?.alive,
      how: 'Faites la cour. Ça prend des années, et ça se refuse.',
      got: 'Vous n\'êtes plus seul à porter ce que vous portez.',
    },
    {
      id: 'sang',
      label: 'Du sang après vous',
      done: enfants > 0,
      how: 'Un foyer, du temps, et un peu de chance.',
      got: 'Il y a désormais quelqu\'un à qui tout ça pourra revenir.',
    },
    {
      id: 'nom',
      label: 'Un nom qu\'on connaît',
      done: me.hidden.influence >= 35,
      how: 'Se faire un nom se mène sur plusieurs années. Les coups d\'éclat aident, les scandales aussi.',
      got: 'On vous écoute avant de savoir ce que vous valez.',
    },
    {
      id: 'hommes',
      label: 'Des hommes à vous',
      done: !!maFaction,
      how: 'Rassemblez des gens — ou entrez chez ceux qui recrutent. Il en faut trois pour que ça tienne debout.',
      got: jeMene ? 'Ils font ce que vous dites.' : 'Vous n\'êtes plus seul quand ça tourne mal.',
    },
    {
      id: 'maison',
      label: 'Fonder une maison',
      done: !!maison,
      how: 'Un nom, de quoi vivre, et une descendance. Une maison se fonde, elle ne s\'achète pas.',
      got: 'Votre nom survit à votre corps.',
    },
    {
      id: 'terre',
      label: 'Gouverner',
      done: !!domaine,
      how: 'Le pouvoir se prend là où il tombe : quand personne ne gouverne, quand le mécontentement monte, quand vos hommes sont plus nombreux que les leurs.',
      got: `Vous décidez pour ${domaine?.name ?? 'les autres'}, et on vous en tient responsable.`,
    },
    {
      id: 'dynastie',
      label: 'Durer plus qu\'une vie',
      done: generations >= 3,
      how: 'Transmettre, puis que l\'héritier transmette à son tour. Trois chefs de maison, et ce n\'est plus vous : c\'est une lignée.',
      got: 'On ne compte plus les hommes, on compte les règnes.',
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const lieu = world.settlement(me.settlement)?.name ?? me.settlement;

  // Le titre dit ce que *les autres* verraient. On prend la marche la plus
  // haute franchie, pas la somme.
  const elle = me.sex === 'f';
  let title: string;
  if (domaine) title = `qui gouverne ${domaine.name}`;
  else if (jeSuisChef && maison) title = `${elle ? 'cheffe' : 'chef'} de la maison ${maison.name}`;
  else if (jeMene && maFaction) title = `on vous suit : ${maFaction.name}`;
  // « des la bande à Sorel » : un nom de groupe porte déjà son article. La
  // contraction seule se lit comme une apposition et marche pour les trois
  // formes — « de la bande à Sorel », « des gens de Semar », « du comptoir
  // de Toven ».
  else if (maFaction) title = ofName(maFaction.name);
  else if (me.hidden.influence >= 35) title = `un nom qu'on connaît à ${lieu}`;
  else if (mesBiens.length > 0) title = `${elle ? 'établie' : 'établi'} à ${lieu}`;
  else if (me.jobId) title = `${game.ruleset.jobs[me.jobId]?.label ?? 'artisan'} à ${lieu}`;
  else if (age < 16) title = `${elle ? 'une gosse' : 'un gosse'} ${de(lieu)}`;
  else title = `personne, pour l'instant, à ${lieu}`;

  return {
    title,
    done,
    total: steps.length,
    steps,
    next: steps.filter((s) => !s.done).slice(0, 3),
  };
}
