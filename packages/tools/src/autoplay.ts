import { Rng, ageOf, type Ruleset } from '@ed/engine';
import { Game } from '@ed/game';

export interface AutoplayOptions {
  seed: number;
  /** Nombre maximum de générations jouées avant d'arrêter. */
  generations?: number;
  /** Garde-fou anti-boucle infinie. */
  maxSteps?: number;
  scenarioId?: string;
}

export interface LifeRecord {
  scenario: string;
  birthTier: string;
  ageAtDeath: number;
  cause: string;
  wealthAtDeath: number;
  children: number;
  traits: string[];
  eventsSeen: string[];
  foundedHouse: boolean;
  peakClass: string;
}

export interface AutoplayResult {
  /** Conduites de PNJ jouées pendant la partie (doc 13 §6). */
  npcActions?: Record<string, number>;
  /** Ce que les groupes ont fait de leur côté (doc 14 §6). */
  factionsFounded?: number;
  factionsDissolved?: number;
  factionsStanding?: number;
  clashes?: number;
  fallen?: number;
  seed: number;
  lives: LifeRecord[];
  years: number;
  chronicleEntries: number;
  seedsPlanted: number;
}

/**
 * Joue une partie sans humain : c'est l'outil de QA de l'émergence (doc 01 §9).
 * Il choisit au hasard mais de façon déterministe, ce qui rend chaque run
 * reproductible depuis sa seule graine.
 */
export function autoplay(ruleset: Ruleset, opts: AutoplayOptions): AutoplayResult {
  const game = Game.create(ruleset, {
    seed: opts.seed,
    ...(opts.scenarioId ? { scenarioId: opts.scenarioId } : {}),
  });
  const rng = new Rng(opts.seed).fork('autoplay');
  const maxGenerations = opts.generations ?? 1;
  const maxSteps = opts.maxSteps ?? 40000;

  const lives: LifeRecord[] = [];
  const startYear = game.world.year;
  let generation = 0;
  let eventsSeen: string[] = [];
  let peakClass = game.player.socialClass;
  let seedsPlanted = 0;

  for (let step = 0; step < maxSteps; step++) {
    seedsPlanted = Math.max(seedsPlanted, game.world.seeds.length);
    if (game.player.socialClass !== peakClass) {
      const order = ['esclave', 'miserable', 'pauvre', 'commun', 'aise', 'noble', 'royal'];
      if (order.indexOf(game.player.socialClass) > order.indexOf(peakClass)) {
        peakClass = game.player.socialClass;
      }
    }

    switch (game.phase) {
      case 'naissance':
        game.submit({ t: 'advance' });
        break;

      case 'annee': {
        // une action sur deux, prise au hasard parmi celles qui sont ouvertes
        if (!game.actionUsed && rng.chance(0.5)) {
          const actions = game.availableActions();
          const chosen = rng.pickOrNull(actions);
          if (chosen) {
            game.submit({ t: 'action', actionId: chosen.id });
            break;
          }
        }
        game.submit({ t: 'advance' });
        break;
      }

      case 'evenement': {
        const ev = game.pending[0];
        if (!ev) {
          game.submit({ t: 'advance' });
          break;
        }
        eventsSeen.push(ev.defId);
        const open = ev.options.filter((o) => !o.locked);
        const choice = rng.pickOrNull(open) ?? open[0];
        if (choice) game.submit({ t: 'choose', optionId: choice.id });
        else game.submit({ t: 'advance' });
        break;
      }

      case 'resultat':
        game.submit({ t: 'advance' });
        break;

      case 'mort': {
        const dead = game.player;
        lives.push({
          scenario: String(game.world.chronicle[0]?.data['scenario'] ?? '?'),
          birthTier: String(game.world.chronicle[0]?.data['condition'] ?? '?'),
          ageAtDeath: ageOf(dead, game.world.year),
          cause: dead.causeOfDeath ?? '?',
          wealthAtDeath: dead.wealth,
          children: dead.childrenIds.length,
          traits: [...dead.traits],
          eventsSeen,
          foundedHouse: !!dead.houseId,
          peakClass,
        });
        eventsSeen = [];
        generation++;
        const heirs = game.heirs();
        if (generation >= maxGenerations || heirs.length === 0) {
          return {
            seed: opts.seed,
            lives,
            years: game.world.year - startYear,
            chronicleEntries: game.world.chronicle.length,
            seedsPlanted,
            npcActions: game.world.tally.npcActions,
            factionsFounded: game.world.tally.factionsFounded,
            factionsDissolved: game.world.tally.factionsDissolved,
            factionsStanding: game.world.activeFactions().length,
            clashes: game.world.tally.clashes,
            fallen: game.world.tally.fallen,
          };
        }
        const heir = rng.pick(heirs);
        peakClass = game.world.get(heir.id)?.socialClass ?? peakClass;
        game.submit({ t: 'continueAs', heirId: heir.id });
        break;
      }

      case 'fin':
        return {
          seed: opts.seed,
          lives,
          years: game.world.year - startYear,
          chronicleEntries: game.world.chronicle.length,
          seedsPlanted,
          npcActions: game.world.tally.npcActions,
          factionsFounded: game.world.tally.factionsFounded,
          factionsDissolved: game.world.tally.factionsDissolved,
          factionsStanding: game.world.activeFactions().length,
          clashes: game.world.tally.clashes,
          fallen: game.world.tally.fallen,
        };
    }
  }

  throw new Error(`autoplay : ${maxSteps} pas atteints sans fin (graine ${opts.seed})`);
}
