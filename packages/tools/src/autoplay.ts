import { Rng, ageOf, hunger, regimeName, type Ruleset, type World } from '@ed/engine';
import { Game } from '@ed/game';

/** Le pire manque du monde, pour le banc d'émergence. */
function worstHunger(world: World): number {
  let worst = 0;
  for (const d of world.domainList()) {
    if (d.settlement !== null) worst = Math.max(worst, hunger(d));
  }
  return worst;
}

/** Le prix moyen du pain — le chiffre qui dit si le monde mange. */
function breadOf(world: World): number {
  let total = 0;
  let n = 0;
  for (const d of world.domainList()) {
    const p = d.settlement !== null ? d.prices['vivres'] : undefined;
    if (p !== undefined) {
      total += p;
      n += 1;
    }
  }
  return n > 0 ? total / n : 0;
}

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
  /** Renversements de régime, et l'état du pays à la fin (doc 15). */
  upheavals?: number;
  regimes?: string[];
  hunger?: number;
  breadPrice?: number;
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
        // Un joueur automatique dépense son temps comme n'importe qui : il
        // saisit ce qui passe, nourrit ce qu'il a commencé, et parfois ouvre
        // quelque chose. C'est aussi ce qui fait tourner le doc 16 au banc.
        const year = game.year();
        if (year.left < 1) {
          game.submit({ t: 'advance' });
          break;
        }
        const abordables = year.occasions.filter((o) => o.cost <= year.left);
        if (abordables.length > 0 && rng.chance(0.55)) {
          const occ = rng.pick(abordables);
          game.submit({ t: 'seize', occasionId: occ.id });
          break;
        }
        if (year.pursuits.length > 0 && rng.chance(0.6)) {
          const p = rng.pick(year.pursuits);
          game.submit({ t: 'invest', pursuitId: p.id, temps: rng.int(1, year.left) });
          break;
        }
        if (year.openable.length > 0 && rng.chance(0.3)) {
          const d = rng.pick(year.openable);
          game.submit({ t: 'start', pursuitId: d.id });
          break;
        }
        if (year.coups.length > 0 && rng.chance(0.4)) {
          const coup = rng.pick(year.coups);
          game.submit({ t: 'action', actionId: coup.id });
          break;
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
            upheavals: game.world.tally.upheavals,
            regimes: game.world.domainList().filter((d) => d.settlement).map((d) => regimeName(d.government)),
            hunger: worstHunger(game.world),
            breadPrice: breadOf(game.world),
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
          upheavals: game.world.tally.upheavals,
          regimes: game.world.domainList().filter((d) => d.settlement).map((d) => regimeName(d.government)),
          hunger: worstHunger(game.world),
          breadPrice: breadOf(game.world),
        };
    }
  }

  throw new Error(`autoplay : ${maxSteps} pas atteints sans fin (graine ${opts.seed})`);
}
