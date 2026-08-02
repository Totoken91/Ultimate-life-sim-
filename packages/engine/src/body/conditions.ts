import type { Character } from '../model/types.js';
import type { Rng } from '../rng/rng.js';
import type { World } from '../world/world.js';
import type { ActiveCondition, Body, OrganId, VitalId } from './body.js';
import { clamp } from '../util/math.js';

/**
 * Maux du corps et de l'esprit (doc 12).
 *
 * Un mal n'est **pas un nom dans une liste** : c'est un processus qui attaque
 * des organes, déplace des constantes, évolue dans le temps et se voit par des
 * signes. Le nom vient après — et il dépend de l'époque, parce que le monde ne
 * sait pas nommer ce qu'il ne comprend pas.
 */

export type ConditionKind =
  | 'infection'
  | 'chronique'
  | 'degeneratif'
  | 'genetique'
  | 'carence'
  | 'toxique'
  | 'lesion'
  | 'esprit';

export const CONDITION_KIND_LABELS: Record<ConditionKind, string> = {
  infection: 'mal contagieux',
  chronique: 'mal installé',
  degeneratif: 'mal qui use',
  genetique: 'mal de naissance',
  carence: 'mal du manque',
  toxique: 'mal du poison',
  lesion: 'blessure',
  esprit: 'mal de l\'esprit',
};

export type Course = 'aigu' | 'lent' | 'cyclique' | 'terminal';

export interface ConditionCtx {
  world: World;
  subject: Character;
  body: Body;
  age: number;
  rng: Rng;
  /**
   * Multiplicateur d'apparition. Le scan des maux est la partie chère du tick :
   * on ne l'exécute pas chaque année pour tout le monde, on l'étale et on
   * compense le poids. L'espérance est identique, le coût divisé d'autant.
   */
  onsetScale?: number;
}

export interface ConditionDef {
  id: string;
  /** Ce que le personnage en dit. Le monde n'a pas de mot clinique. */
  label: string;
  /** Ce qu'on en dirait aujourd'hui — jamais montré au joueur médiéval. */
  clinical?: string;
  kind: ConditionKind;
  course: Course;

  /** Dégâts annuels par organe, à sévérité 100. */
  organs?: Partial<Record<OrganId, number>>;
  /** Décalage des constantes vitales, à sévérité 100. */
  vitals?: Partial<Record<VitalId, number>>;
  pain?: number;
  inflammation?: number;
  infectious?: number;

  /** Poids d'apparition annuel. 0 = ne survient jamais spontanément. */
  onset: number | ((c: ConditionCtx) => number);
  /** Une même personne ne l'attrape qu'une fois. */
  once?: boolean;
  /** Aggravation annuelle de la sévérité (négatif = guérit tout seul). */
  drift: number;
  /** Chance annuelle de disparaître d'elle-même, une fois installée. */
  remission?: number;
  /** Sévérité au-delà de laquelle elle tue, et à quelle probabilité. */
  lethal?: { above: number; chance: number };
  /** Reste invisible tant que la sévérité n'atteint pas ce seuil. */
  silentBelow?: number;
  /** Traits posés quand elle s'installe durablement. */
  marks?: string[];
  /** Ce que les autres voient. */
  signs?: string[];
  /** Efficacité d'un soin, si quelqu'un sait soigner. */
  care?: number;
}

/**
 * « mourut **de le** mal du sucre » : les libellés portent leur article, il
 * faut donc contracter. Détail minuscule, mais c'est le genre de faute qui
 * fait sortir un lecteur d'une chronique.
 */
export function causeOf(label: string): string {
  if (label.startsWith('le ')) return `du ${label.slice(3)}`;
  if (label.startsWith('les ')) return `des ${label.slice(4)}`;
  if (label.startsWith('la ')) return `de la ${label.slice(3)}`;
  if (label.startsWith('l\'')) return `de l'${label.slice(2)}`;
  if (label.startsWith('une ')) return `d'une ${label.slice(4)}`;
  if (label.startsWith('un ')) return `d'un ${label.slice(3)}`;
  return `de ${label}`;
}

/**
 * Registre alimenté par le contenu.
 *
 * Les tables d'effets sont **aplaties une fois** : `Object.entries` dans une
 * boucle exécutée six cents fois par an allouait plus que tout le reste du
 * système réuni.
 */
export interface PreparedCondition {
  def: ConditionDef;
  organs: [OrganId, number][];
  vitals: [VitalId, number][];
}

export interface ConditionRegistry {
  byId: Map<string, ConditionDef>;
  all: ConditionDef[];
  prepared: Map<string, PreparedCondition>;
}

export function buildRegistry(defs: readonly ConditionDef[]): ConditionRegistry {
  const byId = new Map<string, ConditionDef>();
  const prepared = new Map<string, PreparedCondition>();
  for (const d of defs) {
    byId.set(d.id, d);
    prepared.set(d.id, {
      def: d,
      organs: Object.entries(d.organs ?? {}) as [OrganId, number][],
      vitals: Object.entries(d.vitals ?? {}) as [VitalId, number][],
    });
  }
  return { byId, all: [...defs], prepared };
}

export function hasCondition(body: Body, id: string): boolean {
  return body.conditions.some((c) => c.defId === id);
}

export function addCondition(
  body: Body,
  def: ConditionDef,
  year: number,
  severity = 10,
): ActiveCondition | null {
  if (def.once && hasCondition(body, def.id)) return null;
  const existing = body.conditions.find((c) => c.defId === def.id);
  if (existing) {
    existing.severity = clamp(existing.severity + severity, 0, 100);
    return existing;
  }
  const active: ActiveCondition = {
    defId: def.id,
    since: year,
    severity: clamp(severity, 1, 100),
    hidden: severity < (def.silentBelow ?? 0),
    treated: false,
  };
  body.conditions.push(active);
  return active;
}

export function removeCondition(body: Body, id: string): void {
  body.conditions = body.conditions.filter((c) => c.defId !== id);
}

/** Signes visibles d'un corps, pour le texte et pour les autres. */
export function visibleSigns(body: Body, registry: ConditionRegistry): string[] {
  const out: string[] = [];
  for (const active of body.conditions) {
    if (active.hidden) continue;
    const def = registry.byId.get(active.defId);
    if (!def?.signs?.length) continue;
    const index = Math.min(def.signs.length - 1, Math.floor((active.severity / 100) * def.signs.length));
    const sign = def.signs[index];
    if (sign) out.push(sign);
  }
  return out;
}

export interface ConditionOutcome {
  /** Maux apparus cette année. */
  appeared: ConditionDef[];
  /** Maux disparus. */
  resolved: ConditionDef[];
  /** Le mal qui a tué, le cas échéant. */
  killedBy: ConditionDef | null;
  /** Traits à poser. */
  marks: string[];
}

const severityFactor = (severity: number): number => severity / 100;

/**
 * Les dégâts déclarés par le contenu sont annuels et cumulés sur des décennies.
 * Sans cette échelle, dix ans de goutte suffisaient à ruiner un rein.
 */
const ORGAN_DAMAGE_SCALE = 0.4;

/**
 * Un tour de maladie : apparition, évolution, dégâts, rémission, mort.
 * Tout est déterministe et borné — aucun appel externe.
 */
export function tickConditions(
  ctx: ConditionCtx,
  registry: ConditionRegistry,
): ConditionOutcome {
  const { body, world, rng } = ctx;
  const out: ConditionOutcome = { appeared: [], resolved: [], killedBy: null, marks: [] };

  // ── apparitions ─────────────────────────────────────────────────────────
  const scale = ctx.onsetScale ?? 1;
  const candidates: { def: ConditionDef; w: number }[] = scale <= 0 ? [] : [];
  for (const def of registry.all) {
    if (def.once && hasCondition(body, def.id)) continue;
    if (hasCondition(body, def.id)) continue;
    const w = typeof def.onset === 'function' ? def.onset(ctx) : def.onset;
    if (w > 0) candidates.push({ def, w });
  }
  // Une seule apparition par an au maximum : on ne veut pas d'un corps qui
  // collectionne les maux en une décennie.
  if (candidates.length > 0) {
    // Le diviseur est le réglage central de tout le système : les poids du
    // contenu expriment des *rapports* entre maux, pas une probabilité. À 450,
    // un adulte ordinaire déclare un mal nommé tous les quinze à vingt ans.
    const totalWeight = candidates.reduce((a, c) => a + c.w, 0);
    const chance = clamp((totalWeight * scale) / 450, 0, 0.35);
    const draw = rng.fork('onset', world.year);
    if (draw.chance(chance)) {
      const picked = draw.weighted(candidates, (c) => c.w);
      if (picked) {
        const active = addCondition(body, picked.def, world.year, draw.int(6, 22));
        if (active) out.appeared.push(picked.def);
      }
    }
  }

  // ── évolution, dégâts, issue ────────────────────────────────────────────
  // Un seul flux d'aléa pour tout le corps : les maux sont parcourus dans un
  // ordre stable, donc le résultat l'est aussi, et on économise autant de
  // dérivations de générateur qu'il y a de maux.
  const r = rng.fork('conditions', world.year);
  for (const active of [...body.conditions]) {
    const entry = registry.prepared.get(active.defId);
    if (!entry) {
      removeCondition(body, active.defId);
      continue;
    }
    const def = entry.def;

    // dérive de la sévérité, atténuée par le soin
    let drift = def.drift;
    if (active.treated && def.care) drift -= def.care;
    if (def.course === 'cyclique') drift += r.int(-4, 4);
    active.severity = clamp(active.severity + drift, 0, 100);
    active.treated = false;

    if (active.severity < (def.silentBelow ?? 0)) active.hidden = true;
    else if (active.hidden) {
      active.hidden = false;
      out.appeared.push(def); // on découvre ce qu'on avait déjà
    }

    const f = severityFactor(active.severity);

    for (const [id, damage] of entry.organs) {
      body.organs[id] = clamp(body.organs[id] - damage * f * ORGAN_DAMAGE_SCALE, 0, 100);
    }
    for (const [id, shift] of entry.vitals) {
      body.vitals[id] = clamp(body.vitals[id] + shift * f * 0.35, 0, 100);
    }
    body.douleur = clamp(body.douleur + (def.pain ?? 0) * f * 0.4, 0, 100);
    body.inflammation = clamp(body.inflammation + (def.inflammation ?? 0) * f * 0.4, 0, 100);
    body.infection = clamp(body.infection + (def.infectious ?? 0) * f * 0.4, 0, 100);

    if (def.marks && active.severity >= 45) {
      for (const m of def.marks) if (!out.marks.includes(m)) out.marks.push(m);
    }

    // rémission
    if (active.severity <= 0 || (def.remission && r.chance(def.remission * (1 - f)))) {
      removeCondition(body, def.id);
      out.resolved.push(def);
      continue;
    }

    // issue fatale
    if (def.lethal && active.severity >= def.lethal.above) {
      const over = (active.severity - def.lethal.above) / Math.max(1, 100 - def.lethal.above);
      if (r.chance(def.lethal.chance * (0.4 + over))) out.killedBy = def;
    }
  }

  return out;
}
