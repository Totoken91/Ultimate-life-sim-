import type { Rng } from '../rng/rng.js';
import type { Effect } from '../events/types.js';
import type { Character } from '../model/types.js';
import type { Cast, DriveId, Drives, Situation } from './drives.js';
import { topDrives } from './drives.js';

/** Qui l'action prend pour cible, dans la distribution déjà résolue. */
export type CastRole = keyof Cast;

/** Jusqu'où la nouvelle porte. Ce qui est intime ne sort pas du foyer. */
export type NewsReach = 'intime' | 'local' | 'monde';

export interface NpcActionCtx {
  readonly sit: Situation;
  readonly self: Character;
  /** Résolu depuis `target`. `null` si l'action ne vise personne. */
  readonly target: Character | null;
  readonly age: number;
  readonly rng: Rng;
}

/**
 * Une action de PNJ (doc 13 §2).
 *
 * Elle ne décrit pas une intention : elle décrit **ce qu'elle assouvit**. Le
 * moteur fait le reste. Ajouter une conduite au monde, c'est ajouter une entrée
 * dans un tableau — jamais toucher au sélecteur.
 */
export interface NpcActionDef {
  id: string;
  label: string;
  /** Part de chaque pulsion que l'action apaise, de 0 à 1. */
  serves: Partial<Record<DriveId, number>>;
  /** Rôle visé. Absent = l'action se suffit à elle-même. */
  target?: CastRole;
  minAge?: number;
  maxAge?: number;
  /** Années avant de pouvoir recommencer. */
  cooldown?: number;
  /** Filtre dur : faux = l'action n'existe pas cette année. */
  requires?: (c: NpcActionCtx) => boolean;
  /** Multiplicateur d'occasion. Défaut 1 ; zéro écarte l'action. */
  weight?: (c: NpcActionCtx) => number;
  effects: (c: NpcActionCtx) => Effect[];
  /** Ce que le monde en raconte. Absent = l'action est muette. */
  news?: (c: NpcActionCtx) => string;
  reach?: NewsReach;
  tags?: string[];
}

/**
 * Actions rangées par pulsion. Sans cet index, chaque PNJ évaluerait la
 * trentaine d'actions du catalogue ; avec, il n'en regarde qu'une dizaine.
 */
export class ActionIndex {
  private readonly byDrive = new Map<DriveId, NpcActionDef[]>();
  readonly all: readonly NpcActionDef[];

  constructor(actions: readonly NpcActionDef[]) {
    this.all = [...actions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const def of this.all) {
      for (const drive of Object.keys(def.serves) as DriveId[]) {
        if ((def.serves[drive] ?? 0) <= 0) continue;
        let bucket = this.byDrive.get(drive);
        if (!bucket) this.byDrive.set(drive, (bucket = []));
        bucket.push(def);
      }
    }
  }

  /** Les actions servant au moins une des pulsions données, sans doublon. */
  candidates(drives: readonly DriveId[]): NpcActionDef[] {
    const out: NpcActionDef[] = [];
    for (const d of drives) {
      for (const def of this.byDrive.get(d) ?? []) {
        if (!out.includes(def)) out.push(def);
      }
    }
    return out;
  }
}

export interface Decision {
  def: NpcActionDef;
  target: Character | null;
  utility: number;
}

/** Seuil sous lequel un PNJ passe son année sans rien tenter. */
const APATHIE = 0.06;

/**
 * Choix utilitaire (doc 13 §3).
 *
 * L'utilité est le produit scalaire des pulsions et de ce que l'action apaise,
 * modulé par l'occasion. On ne prend pas systématiquement la meilleure : on tire
 * au sort *pondéré par le carré* de l'utilité. Toujours prendre le maximum
 * produit des villages entiers qui font la même chose la même année.
 */
export function chooseAction(
  sit: Situation,
  drives: Drives,
  index: ActionIndex,
  rng: Rng,
): Decision | null {
  // Quatre pulsions et non trois : à trois, une rancune vive restait toujours
  // derrière « comprendre » et « ne pas être seul », et personne dans le monde
  // ne réglait jamais ses comptes.
  const wanted = topDrives(drives, 4, 0.1);
  if (wanted.length === 0) return null;

  const candidates = index.candidates(wanted);
  const picked: Decision[] = [];

  for (const def of candidates) {
    if (def.minAge !== undefined && sit.age < def.minAge) continue;
    if (def.maxAge !== undefined && sit.age > def.maxAge) continue;

    if (def.cooldown) {
      const last = sit.self.flags[`ai:${def.id}`];
      if (typeof last === 'number' && sit.world.year - last < def.cooldown) continue;
    }

    const target = def.target ? sit.cast[def.target] : null;
    if (def.target && !target) continue;
    if (target && !target.alive) continue;

    let utility = 0;
    for (const d of Object.keys(def.serves) as DriveId[]) {
      utility += (def.serves[d] ?? 0) * drives[d];
    }
    if (utility <= 0) continue;

    const ctx: NpcActionCtx = { sit, self: sit.self, target, age: sit.age, rng };
    if (def.requires && !def.requires(ctx)) continue;
    if (def.weight) {
      const w = def.weight(ctx);
      if (w <= 0) continue;
      utility *= w;
    }
    if (utility < APATHIE) continue;

    picked.push({ def, target, utility });
  }

  if (picked.length === 0) return null;
  return rng.weighted(picked, (d) => d.utility * d.utility);
}
