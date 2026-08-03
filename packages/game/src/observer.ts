import {
  Rng,
  ageOf,
  fullName,
  hunger,
  regimeName,
  renderEntry,
  shortName,
  type ChronicleEntry,
  type Ruleset,
  type World,
} from '@ed/engine';
import { Game, type NewGameOptions } from './game.js';

/**
 * **Regarder le monde tourner sans y toucher.**
 *
 * Une demande simple et une conséquence profonde : si le monde n'est
 * intéressant *que* parce qu'on y joue, alors il n'est pas intéressant. Le
 * mode observateur est donc autant un mode de jeu qu'un aveu — il expose sans
 * filet ce que la simulation produit toute seule.
 *
 * Techniquement, ce n'est **pas** un moteur parallèle : c'est la partie
 * normale, avec un fil de vie qui décide tout seul et une succession
 * automatique. Rien n'est ajouté à la simulation, rien n'en est retiré. Ce qui
 * change, c'est ce qu'on en lit : au lieu d'une année à vivre, des **chapitres**
 * — une tranche d'années résumée à ce qui y a compté.
 */

export interface ObservedLine {
  year: number;
  /** `chronique` (ce que l'Histoire retient) ou `rumeur` (ce qui se dit). */
  kind: 'chronique' | 'rumeur' | 'fil';
  text: string;
  /** 1 à 5. Les clients coupent où ils veulent. */
  weight: number;
}

export interface Chapter {
  from: number;
  to: number;
  /** Une phrase qui dit ce qu'a été cette tranche. */
  headline: string;
  lines: ObservedLine[];
  /** Combien de lignes n'ont pas tenu dans le chapitre. */
  omitted: number;
  /** L'état du monde à la fin du chapitre. */
  population: number;
  deaths: number;
  births: number;
  clashes: number;
  upheavals: number;
  /** Le pire manque, 0 à 1. */
  hunger: number;
  breadPrice: number;
  factions: number;
  regimes: string[];
  /** Le fil qu'on suit en ce moment, et depuis quand. */
  following: string;
  followingAge: number;
  /** Successions traversées pendant le chapitre. */
  generations: number;
}

export interface ObserverOptions extends NewGameOptions {
  /** Années par chapitre. Défaut : 25. */
  chapter?: number;
}

/** Ce qu'on garde de la Chronique : les faits, pas les péripéties. */
const SEUIL_CHRONIQUE = 3;

/** Ce qu'un chapitre peut porter avant de redevenir une liste. */
const LIGNES_PAR_CHAPITRE = 14;

export class Observer {
  private readonly game: Game;
  private readonly rng: Rng;
  private readonly taille: number;
  private lastChronicle = 0;
  private lastNews = 0;
  private lastDeaths = 0;
  private lastBirths = 0;
  private lastClashes = 0;
  private lastUpheavals = 0;

  readonly chapters: Chapter[] = [];

  private constructor(game: Game, opts: ObserverOptions) {
    this.game = game;
    this.rng = new Rng(game.world.seed).fork('observateur');
    this.taille = Math.max(1, opts.chapter ?? 25);
  }

  static create(ruleset: Ruleset, opts: ObserverOptions = {}): Observer {
    const game = Game.create(ruleset, opts);
    const obs = new Observer(game, opts);
    obs.lastChronicle = game.world.chronicle.length;
    obs.lastNews = game.world.news.length;
    return obs;
  }

  get world(): World {
    return this.game.world;
  }

  get year(): number {
    return this.game.world.year;
  }

  /** Le monde s'est-il éteint ? Ça arrive, et c'est une fin comme une autre. */
  get over(): boolean {
    return this.game.phase === 'fin';
  }

  /**
   * Avance d'un chapitre. Toutes les décisions du fil suivi sont prises par
   * la même logique que le banc d'émergence : rien de spécial, rien d'optimal
   * — quelqu'un qui vit sa vie sans qu'on la lui souffle.
   */
  next(): Chapter {
    const world = this.game.world;
    const from = world.year;
    const cible = from + this.taille;
    let generations = 0;

    for (let step = 0; step < this.taille * 400 && world.year < cible; step++) {
      if (this.game.phase === 'fin') break;
      if (this.step()) generations += 1;
    }

    return this.harvest(from, generations);
  }

  /** Un pas de simulation. Renvoie `true` si le fil a changé de personne. */
  private step(): boolean {
    const game = this.game;
    const rng = this.rng;

    switch (game.phase) {
      case 'naissance':
      case 'resultat':
        game.submit({ t: 'advance' });
        return false;

      case 'evenement': {
        const ev = game.pending[0];
        if (!ev) {
          game.submit({ t: 'advance' });
          return false;
        }
        const ouvertes = ev.options.filter((o) => !o.locked);
        const choix = rng.pickOrNull(ouvertes) ?? ouvertes[0];
        if (choix) game.submit({ t: 'choose', optionId: choix.id });
        else game.submit({ t: 'advance' });
        return false;
      }

      case 'annee': {
        const y = game.year();
        if (y.left < 1) {
          game.submit({ t: 'advance' });
          return false;
        }
        const abordables = y.occasions.filter((o) => o.cost <= y.left);
        if (abordables.length > 0 && rng.chance(0.55)) {
          game.submit({ t: 'seize', occasionId: rng.pick(abordables).id });
          return false;
        }
        if (y.pursuits.length > 0 && rng.chance(0.6)) {
          const p = rng.pick(y.pursuits);
          game.submit({ t: 'invest', pursuitId: p.id, temps: rng.int(1, y.left) });
          return false;
        }
        if (y.openable.length > 0 && rng.chance(0.3)) {
          game.submit({ t: 'start', pursuitId: rng.pick(y.openable).id });
          return false;
        }
        if (y.coups.length > 0 && rng.chance(0.35)) {
          game.submit({ t: 'action', actionId: rng.pick(y.coups).id });
          return false;
        }
        game.submit({ t: 'advance' });
        return false;
      }

      case 'mort': {
        // Le fil ne s'arrête pas à un cadavre. On suit d'abord le sang, puis
        // n'importe qui d'autre, puis un nouveau-né : c'est ce qui permet de
        // regarder cinq siècles d'affilée.
        const heritiers = this.game.heirs();
        if (heritiers.length > 0) {
          game.submit({ t: 'continueAs', heirId: rng.pick(heritiers).id });
          return true;
        }
        const inconnus = this.game.strangers();
        if (inconnus.length > 0) {
          game.submit({ t: 'follow', id: rng.pick(inconnus).id });
          return true;
        }
        game.submit({ t: 'newborn' });
        return true;
      }

      default:
        game.submit({ t: 'advance' });
        return false;
    }
  }

  /** Ce que la tranche écoulée a produit, trié par ce qui compte. */
  private harvest(from: number, generations: number): Chapter {
    const world = this.game.world;
    const lines: ObservedLine[] = [];

    for (let i = this.lastChronicle; i < world.chronicle.length; i++) {
      const e = world.chronicle[i] as ChronicleEntry;
      if (e.importance < SEUIL_CHRONIQUE) continue;
      lines.push({ year: e.year, kind: 'chronique', text: renderEntry(e), weight: e.importance });
    }
    this.lastChronicle = world.chronicle.length;

    for (let i = this.lastNews; i < world.news.length; i++) {
      const n = world.news[i];
      if (!n || n.reach !== 'monde') continue;
      lines.push({ year: n.year, kind: 'rumeur', text: n.text, weight: 3 });
    }
    this.lastNews = world.news.length;

    // Un chapitre est un **résumé**, pas un journal : on garde ce qui pèse le
    // plus, puis on le remet dans l'ordre du temps. Sans ce tri, vingt-cinq
    // années d'élévations de maisons couvraient les deux guerres.
    const gardees = lines
      .slice()
      .sort((a, b) => b.weight - a.weight || a.year - b.year)
      .slice(0, LIGNES_PAR_CHAPITRE)
      .sort((a, b) => a.year - b.year || b.weight - a.weight);

    const t = world.tally;
    const deaths = t.deaths - this.lastDeaths;
    const births = t.births - this.lastBirths;
    const clashes = t.clashes - this.lastClashes;
    const upheavals = t.upheavals - this.lastUpheavals;
    this.lastDeaths = t.deaths;
    this.lastBirths = t.births;
    this.lastClashes = t.clashes;
    this.lastUpheavals = t.upheavals;

    let pire = 0;
    let pain = 0;
    let n = 0;
    const regimes: string[] = [];
    for (const d of world.domainList()) {
      if (d.settlement === null) continue;
      pire = Math.max(pire, hunger(d));
      const p = d.prices['vivres'];
      if (p !== undefined) {
        pain += p;
        n += 1;
      }
      regimes.push(regimeName(d.government));
    }

    const suivi = world.player;
    const chapter: Chapter = {
      from,
      to: world.year,
      headline: headline({ births, deaths, clashes, upheavals, hunger: pire, generations }),
      lines: gardees,
      omitted: lines.length - gardees.length,
      population: world.living().length,
      deaths,
      births,
      clashes,
      upheavals,
      hunger: pire,
      breadPrice: n > 0 ? pain / n : 0,
      factions: world.activeFactions().length,
      regimes,
      following: suivi.alive ? fullName(suivi) : shortName(suivi),
      followingAge: ageOf(suivi, world.year),
      generations,
    };
    this.chapters.push(chapter);
    return chapter;
  }
}

/**
 * Le titre d'un chapitre. Il n'invente rien : il nomme ce qui domine, et dit
 * franchement quand rien ne domine — les siècles calmes existent, et une
 * chronique qui prétend le contraire ment.
 */
function headline(s: {
  births: number;
  deaths: number;
  clashes: number;
  upheavals: number;
  hunger: number;
  generations: number;
}): string {
  if (s.hunger > 0.3) return 'Des années de faim.';
  if (s.clashes >= 3) return 'On s\'est beaucoup battu.';
  if (s.upheavals >= 3) return 'Rien n\'a tenu en place.';
  if (s.deaths > s.births * 1.6) return 'On a plus enterré que baptisé.';
  if (s.births > s.deaths * 1.6) return 'Le monde s\'est rempli.';
  if (s.upheavals >= 1) return 'Un pouvoir est tombé.';
  if (s.clashes >= 1) return 'Il y a eu du sang.';
  if (s.generations >= 2) return 'Le fil a changé de mains, deux fois.';
  return 'Rien qui mérite un titre.';
}
