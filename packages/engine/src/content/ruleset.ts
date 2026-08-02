import type { Rng } from '../rng/rng.js';
import type {
  Character,
  EntityId,
  FlagValue,
  HiddenId,
  RelationType,
  Sex,
  SocialClass,
  Settlement,
  StatId,
} from '../model/types.js';
import type { EventDef, EventCtx, Effect, SelectCtx } from '../events/types.js';
import type { ConditionDef } from '../body/conditions.js';
import type { World } from '../world/world.js';

/**
 * Le moteur définit le *schéma* du contenu ; `packages/content` l'implémente.
 * C'est ce qui permet d'ajouter des centaines de mécaniques sans toucher au coeur
 * (ADR-009), et de charger des packs externes plus tard.
 */

export interface TraitDef {
  id: string;
  label: string;
  desc: string;
  kind: 'inne' | 'acquis' | 'etat';
  /** Modificateurs passifs appliqués par les systèmes. */
  stats?: Partial<Record<StatId, number>>;
  health?: number;
  moodFloor?: number;
  fertility?: number;
  longevity?: number;
  /** Traits incompatibles : poser l'un retire les autres. */
  excludes?: string[];
}

export interface SkillDef {
  id: string;
  label: string;
  family: 'combat' | 'artisanat' | 'savoir' | 'social' | 'crime' | 'commandement' | 'corps';
  stat: StatId;
}

export interface JobDef {
  id: string;
  label: string;
  /** Revenu annuel de base en sous. */
  income: number;
  minAge: number;
  classFloor: SocialClass;
  requires?: (c: SelectCtx) => boolean;
  /** Compétences que le métier fait progresser chaque année. */
  trains: Partial<Record<string, number>>;
  danger: number;
  prestige: number;
  desc: string;
}

export interface CultureDef {
  id: string;
  label: string;
  given: Record<Sex, string[]>;
  families: string[];
  epithets: string[];
  /** Biais d'attributs à la naissance. */
  statBias?: Partial<Record<StatId, number>>;
  values: string[];
}

export interface BondOptions {
  affection?: number;
  trust?: number;
  respect?: number;
  fear?: number;
}

/**
 * Le scénario de naissance travaille impérativement : il peuple l'entourage,
 * noue les liens, plante les premières graines. Le joueur existe déjà quand
 * `setup` est appelé — c'est `ctx.player`.
 */
export interface BirthContext {
  world: World;
  rng: Rng;
  player: Character;
  /** À appeler en premier : fixe le lieu et la culture d'origine du joueur. */
  place(settlement: string, culture?: string): void;
  /** Crée un PNJ complet, déjà inséré dans le monde. Défauts : lieu du joueur. */
  spawn(opts: Partial<SpawnOptions> & { age: number }): Character;
  /** Relation dirigée a → b. */
  bond(
    from: Character,
    to: Character,
    type: RelationType,
    label: string,
    opts?: BondOptions,
  ): void;
  /** Deux arêtes d'un coup, avec des étiquettes distinctes de chaque côté. */
  pair(
    a: Character,
    b: Character,
    type: RelationType,
    labelAB: string,
    labelBA: string,
    opts?: BondOptions,
  ): void;
  remember(
    owner: Character,
    text: string,
    salience: number,
    actors?: Character[],
    tags?: string[],
  ): void;
  /** Plante une conséquence différée dès la naissance : la vérité cachée. */
  seed(eventId: string, min: number, max: number, actors?: Character[], note?: string): void;
  /** Établit un lien de filiation complet (parenté + relation + enfant listé). */
  parentOf(parent: Character, child: Character): void;
}

export interface SpawnOptions {
  culture: string;
  sex?: Sex;
  age: number;
  settlement: string;
  socialClass?: SocialClass;
  statMean?: number;
  family?: string | null;
  given?: string;
  jobId?: string | null;
  wealth?: number;
  traits?: string[];
  lod?: 0 | 1;
}

export interface BirthResult {
  /** Attributs de départ du joueur. */
  stats?: Partial<Record<StatId, number>>;
  hidden?: Partial<Record<HiddenId, number>>;
  traits?: string[];
  wealth?: number;
  health?: number;
  socialClass?: SocialClass;
  settlement?: string;
  culture?: string;
  family?: string | null;
  /** Phrase affichée sur l'écran de naissance. */
  opening: string;
  /** Résumé court, mis en Chronique. */
  condition: string;
  /** Voies déjà fermées ou déjà ouvertes par la naissance. */
  paths?: string[];
  flags?: Record<string, FlagValue>;
}

export type BirthTier =
  | 'catastrophe'
  | 'misere'
  | 'commun'
  | 'aise'
  | 'privilegie'
  | 'exceptionnel';

export interface BirthScenario {
  id: string;
  label: string;
  tier: BirthTier;
  weight: number;
  /** Construit un contexte, pas juste des chiffres (doc 03 §2.1). */
  setup(ctx: BirthContext): BirthResult;
}

/** Action volontaire du joueur, une par année (doc 05 §2). */
export interface ActionDef {
  id: string;
  label: string;
  category: 'travail' | 'corps' | 'esprit' | 'social' | 'crime' | 'voie';
  desc: string;
  minAge?: number;
  maxAge?: number;
  requires?: (c: SelectCtx) => boolean;
  hidden?: (c: SelectCtx) => boolean;
  /** Résultat de l'action — texte + effets. */
  run(c: EventCtx): { text: string; effects: Effect[] };
}

export interface Ruleset {
  id: string;
  traits: Record<string, TraitDef>;
  skills: Record<string, SkillDef>;
  jobs: Record<string, JobDef>;
  cultures: Record<string, CultureDef>;
  settlements: Settlement[];
  births: BirthScenario[];
  events: EventDef[];
  actions: ActionDef[];
  /** Maux du corps et de l'esprit (doc 12). */
  conditions: ConditionDef[];
  /** Tire un nom cohérent avec la culture. */
  nameFor(rng: Rng, culture: string, sex: Sex): { given: string; family: string };
  /** Nom de maison proposé à la fondation. */
  houseNameFor(rng: Rng, founder: Character): string;
}

export interface ValidationIssue {
  level: 'erreur' | 'avertissement';
  where: string;
  message: string;
}

/**
 * Validation au chargement (doc 01 §6) : un pack invalide fait échouer le
 * démarrage, pas la partie à trois heures de jeu.
 */
export function validateRuleset(rs: Ruleset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (where: string, message: string): void => {
    issues.push({ level: 'erreur', where, message });
  };
  const warn = (where: string, message: string): void => {
    issues.push({ level: 'avertissement', where, message });
  };

  const eventIds = new Set<string>();
  for (const e of rs.events) {
    if (eventIds.has(e.id)) err(`event:${e.id}`, 'identifiant dupliqué');
    eventIds.add(e.id);
    if (e.options.length === 0) err(`event:${e.id}`, 'aucune option');
    const optIds = new Set<string>();
    for (const o of e.options) {
      if (optIds.has(o.id)) err(`event:${e.id}`, `option dupliquée « ${o.id} »`);
      optIds.add(o.id);
      if (o.outcomes.length === 0) err(`event:${e.id}/${o.id}`, 'aucune issue');
    }
    if (e.minAge !== undefined && e.maxAge !== undefined && e.minAge > e.maxAge) {
      err(`event:${e.id}`, `minAge (${e.minAge}) > maxAge (${e.maxAge})`);
    }
    if (e.tags.length === 0) warn(`event:${e.id}`, 'aucun tag — échappe à la saturation');
  }

  // Toutes les graines pointent-elles vers un événement existant ?
  for (const e of rs.events) {
    for (const o of e.options) {
      for (const out of o.outcomes) {
        if (typeof out.effects === 'function') continue;
        for (const fx of out.effects) {
          if (fx.k === 'seed' && !eventIds.has(fx.eventId)) {
            err(`event:${e.id}/${o.id}`, `graine vers un événement inconnu « ${fx.eventId} »`);
          }
          if (fx.k === 'trait') {
            for (const t of [fx.add, fx.remove]) {
              if (t && !rs.traits[t]) err(`event:${e.id}/${o.id}`, `trait inconnu « ${t} »`);
            }
          }
          if (fx.k === 'skill' && !rs.skills[fx.id]) {
            err(`event:${e.id}/${o.id}`, `compétence inconnue « ${fx.id} »`);
          }
          if (fx.k === 'job' && fx.id && !rs.jobs[fx.id]) {
            err(`event:${e.id}/${o.id}`, `métier inconnu « ${fx.id} »`);
          }
        }
      }
    }
  }

  const settlementIds = new Set(rs.settlements.map((s) => s.id));
  for (const s of rs.settlements) {
    if (!rs.cultures[s.culture]) {
      err(`settlement:${s.id}`, `culture inconnue « ${s.culture} »`);
    }
  }
  for (const j of Object.values(rs.jobs)) {
    for (const skillId of Object.keys(j.trains)) {
      if (!rs.skills[skillId]) err(`job:${j.id}`, `compétence inconnue « ${skillId} »`);
    }
  }
  for (const t of Object.values(rs.traits)) {
    for (const x of t.excludes ?? []) {
      if (!rs.traits[x]) err(`trait:${t.id}`, `exclusion vers un trait inconnu « ${x} »`);
    }
  }
  const conditionIds = new Set<string>();
  for (const c of rs.conditions ?? []) {
    if (conditionIds.has(c.id)) err(`condition:${c.id}`, 'identifiant dupliqué');
    conditionIds.add(c.id);
    for (const m of c.marks ?? []) {
      if (!rs.traits[m]) err(`condition:${c.id}`, `trait inconnu « ${m} »`);
    }
    if (c.lethal && (c.lethal.above < 0 || c.lethal.above > 100)) {
      err(`condition:${c.id}`, `seuil létal hors bornes (${c.lethal.above})`);
    }
    if (!c.signs || c.signs.length === 0) {
      warn(`condition:${c.id}`, 'aucun signe visible — le monde ne peut pas la voir');
    }
  }

  if (rs.births.length === 0) err('births', 'aucun scénario de naissance');
  if (settlementIds.size === 0) err('settlements', 'aucune implantation');

  return issues;
}

export type { Character, EntityId };
