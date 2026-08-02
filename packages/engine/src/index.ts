// ─── aléatoire ──────────────────────────────────────────────────────────────
export { Rng, hashKey, type RngKeyPart } from './rng/rng.js';

// ─── utilitaires ────────────────────────────────────────────────────────────
export { clamp, lerp, drift, diminishing, band } from './util/math.js';
export { wealthBand, formatSous, describeWealth } from './util/money.js';

// ─── modèle ─────────────────────────────────────────────────────────────────
export * from './model/types.js';
export {
  ageOf,
  lifeStage,
  fullName,
  shortName,
  effectiveStat,
  injuryPenalty,
  statTotal,
  hasTrait,
  skill,
  flag,
  hasFlag,
  classRank,
  isAdult,
  statCeiling,
  addInjury,
  modHidden,
  livingChildren,
} from './model/character.js';

// ─── monde ──────────────────────────────────────────────────────────────────
export { World, type WorldMode, type WorldOptions, type TagHit } from './world/world.js';
export { RelationGraph, describeFeeling } from './world/relations.js';
export {
  MemoryStore,
  relevance,
  MEMORY_BUDGET_FOCUS,
  MEMORY_BUDGET_ACTIVE,
} from './world/memory.js';
export { spawnCharacter, spawnChild } from './world/spawn.js';

// ─── contenu (schéma) ───────────────────────────────────────────────────────
export type {
  Ruleset,
  BondOptions,
  TraitDef,
  SkillDef,
  JobDef,
  CultureDef,
  BirthScenario,
  BirthContext,
  BirthResult,
  BirthTier,
  ActionDef,
  SpawnOptions,
  ValidationIssue,
} from './content/ruleset.js';
export { validateRuleset } from './content/ruleset.js';

// ─── événements ─────────────────────────────────────────────────────────────
export type {
  Effect,
  EffectList,
  EventCtx,
  EventDef,
  EventOption,
  EventResolution,
  Outcome,
  OptionHint,
  PendingEvent,
  PendingOption,
  Ref,
  RolePicker,
  SelectCtx,
} from './events/types.js';
export { EventEngine, makeEventCtx, makeSelectCtx } from './events/engine.js';
export { applyEffect, applyEffects, killCharacter } from './events/effects.js';
export { pick, type KnownFilter, type GenerateOptions } from './events/roles.js';

// ─── systèmes ───────────────────────────────────────────────────────────────
export {
  SystemRegistry,
  PHASE_ORDER,
  type System,
  type TickContext,
  type TickPhase,
} from './systems/types.js';
export { mortalityRisk, describeHealth, describeMood } from './systems/vitals.js';
export { UPKEEP } from './systems/economy.js';

// ─── simulation ─────────────────────────────────────────────────────────────
export {
  Simulation,
  defaultRegistry,
  type SimulationOptions,
  type YearOpening,
  type YearClosing,
} from './sim/simulation.js';

export {
  createLife,
  heirsOf,
  continueAsHeir,
  strangersFor,
  continueAsStranger,
  continueAsNewborn,
  materializeCircle,
  type NewLife,
  type HeirOption,
  type StrangerOption,
} from './sim/newLife.js';

// ─── chronique ──────────────────────────────────────────────────────────────
export { renderChronicle, renderEntry, renderEpitaph } from './chronicle/render.js';
export type { ChronicleOptions } from './chronicle/render.js';

// ─── sauvegarde ─────────────────────────────────────────────────────────────
export {
  SAVE_VERSION,
  snapshot,
  restore,
  migrate,
  worldHash,
  MIGRATIONS,
  type WorldSnapshot,
  type Migration,
} from './save/save.js';
