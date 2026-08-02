import type { Character, EventDef, Ruleset, Rng } from '@ed/engine';
import { validateRuleset } from '@ed/engine';

import { CULTURES } from './world/cultures.js';
import { SETTLEMENTS } from './world/settlements.js';
import { SKILLS } from './skills.js';
import { TRAITS } from './traits.js';
import { JOBS } from './jobs.js';
import { BIRTHS } from './births.js';
import { ACTIONS } from './actions.js';
import { CONDITIONS } from './conditions.js';

import { CHILDHOOD_EVENTS } from './events/childhood.js';
import { YOUTH_EVENTS } from './events/youth.js';
import { ADULT_EVENTS } from './events/adult.js';
import { FAMILY_EVENTS } from './events/family.js';
import { SHADOW_EVENTS } from './events/shadow.js';
import { LATE_EVENTS } from './events/late.js';
import { DIFFERENCE_EVENTS } from './events/differences.js';
import { SEED_EVENTS } from './events/seeds.js';

export const EVENTS: EventDef[] = [
  ...CHILDHOOD_EVENTS,
  ...YOUTH_EVENTS,
  ...ADULT_EVENTS,
  ...FAMILY_EVENTS,
  ...SHADOW_EVENTS,
  ...LATE_EVENTS,
  ...DIFFERENCE_EVENTS,
  ...SEED_EVENTS,
];

const HOUSE_PREFIXES = ['', '', '', 'de ', 'du '];

export const RIVAGE: Ruleset = {
  id: 'rivage',
  traits: TRAITS,
  skills: SKILLS,
  jobs: JOBS,
  cultures: CULTURES,
  settlements: SETTLEMENTS,
  births: BIRTHS,
  events: EVENTS,
  actions: ACTIONS,
  conditions: CONDITIONS,

  nameFor(rng: Rng, culture: string, sex) {
    const def = CULTURES[culture] ?? CULTURES['vardhen'];
    if (!def) return { given: 'Sans-Nom', family: '' };
    return {
      given: rng.pick(def.given[sex]),
      family: rng.pick(def.families),
    };
  },

  houseNameFor(rng: Rng, founder: Character) {
    const def = CULTURES[founder.culture] ?? CULTURES['vardhen'];
    const base = founder.family ?? (def ? rng.pick(def.families) : 'Sans-Nom');
    return `${rng.pick(HOUSE_PREFIXES)}${base}`.trim();
  },
};

export { CULTURES, SETTLEMENTS, SKILLS, TRAITS, JOBS, BIRTHS, ACTIONS, CONDITIONS };

/**
 * Validation au chargement (doc 01 §6) : un pack invalide fait échouer le
 * démarrage, pas la partie à trois heures de jeu.
 */
export function loadRuleset(): Ruleset {
  const issues = validateRuleset(RIVAGE);
  const errors = issues.filter((i) => i.level === 'erreur');
  if (errors.length > 0) {
    const lines = errors.map((e) => `  ${e.where} — ${e.message}`).join('\n');
    throw new Error(`Contenu invalide (${errors.length} erreur(s)) :\n${lines}`);
  }
  return RIVAGE;
}

export function rulesetIssues(): ReturnType<typeof validateRuleset> {
  return validateRuleset(RIVAGE);
}
