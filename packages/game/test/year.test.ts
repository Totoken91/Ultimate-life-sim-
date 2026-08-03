import { describe, it, expect } from 'vitest';
import { loadRuleset } from '@ed/content';
import { Game } from '@ed/game';
import { ABANDON_APRES, TEMPS_BASE, estimateCost, timeBudget } from '@ed/engine';

const ruleset = loadRuleset();

function fresh(seed = 4242) {
  const game = Game.create(ruleset, { seed, mode: 'chronique' });
  game.submit({ t: 'advance' });
  return game;
}

/**
 * TypeScript rétrécit `game.phase` après un `if`, alors que `submit` la change
 * en dessous. On lit donc la phase sans laisser le typage se faire des idées.
 */
const at = (g: Game, phase: string): boolean => (g.phase as string) === phase;

/** Passe l'écran de résultat, s'il y en a un. */
function settle(game: Game): void {
  if (at(game, 'resultat')) game.submit({ t: 'advance' });
}

/** Amène le joueur à un âge donné en laissant filer les années. */
function grow(game: Game, until: number): void {
  for (let i = 0; i < 400 && game.age < until && !at(game, 'fin'); i++) {
    if (at(game, 'evenement') && game.pending.length > 0) {
      const o = game.pending[0]!.options.find((x) => !x.locked);
      if (o) {
        game.submit({ t: 'choose', optionId: o.id });
        continue;
      }
    }
    if (at(game, 'mort')) {
      const h = game.heirs();
      if (h[0]) game.submit({ t: 'continueAs', heirId: h[0].id });
      else break;
      continue;
    }
    game.submit({ t: 'advance' });
  }
}

describe('le temps d\'une année', () => {
  it('un enfant n\'a pas l\'année d\'un adulte', () => {
    const game = fresh();
    const enfant = timeBudget(game.world, game.player).total;
    expect(enfant).toBeLessThan(TEMPS_BASE);
    grow(game, 25);
    if (!at(game, 'fin')) {
      expect(timeBudget(game.world, game.player).total).toBeGreaterThan(enfant);
    }
  });

  it('chaque charge est une chose qu\'on peut lire dans sa vie', () => {
    const game = fresh();
    grow(game, 30);
    const b = timeBudget(game.world, game.player);
    for (const ch of b.charges) {
      expect(ch.label.length).toBeGreaterThan(3);
      expect(ch.cost).toBeGreaterThan(0);
    }
    // On garde toujours de quoi faire une chose.
    expect(b.total).toBeGreaterThanOrEqual(1);
  });

  it('on ne peut pas dépenser plus de temps qu\'on en a', () => {
    const game = fresh();
    grow(game, 30);
    if (at(game, 'fin')) return;
    let garde = 0;
    while (game.timeLeft > 0 && garde++ < 20) {
      const y = game.year();
      const coup = y.coups[0];
      if (!coup) break;
      game.submit({ t: 'action', actionId: coup.id });
      settle(game);
      if (!at(game, 'annee')) break;
    }
    expect(game.spent).toBeLessThanOrEqual(game.budget.total);
    expect(game.timeLeft).toBeGreaterThanOrEqual(0);
  });

  it('souffler consomme tout ce qui reste et fait du bien', () => {
    const game = fresh();
    grow(game, 26);
    if (!at(game, 'annee')) return;
    const avant = game.player.mood;
    game.submit({ t: 'rest' });
    expect(game.timeLeft).toBe(0);
    expect(game.player.mood).toBeGreaterThanOrEqual(avant);
  });
});

describe('les entreprises', () => {
  it('coûtent plus ou moins selon qui l\'on est', () => {
    const game = fresh();
    const def = ruleset.pursuits.find((p) => p.id === 'lire');
    expect(def).toBeDefined();
    const vif = { ...game.player, stats: { ...game.player.stats, intelligence: 95 } };
    const lent = { ...game.player, stats: { ...game.player.stats, intelligence: 15 } };
    expect(estimateCost(def!, vif)).toBeLessThan(estimateCost(def!, lent));
  });

  it('avancent quand on y met du temps, et racontent quelque chose', () => {
    const game = fresh();
    grow(game, 20);
    if (!at(game, 'annee')) return;
    const ouvrables = game.openablePursuits();
    if (ouvrables.length === 0) return;
    game.submit({ t: 'start', pursuitId: ouvrables[0]!.id });
    expect(game.outcome?.text.length).toBeGreaterThan(20);
    game.submit({ t: 'advance' });
    expect(game.pursuits.length).toBe(1);

    const avant = game.pursuits[0]!.invested;
    // On avance jusqu'à pouvoir y remettre du temps.
    for (let i = 0; i < 12 && !at(game, 'fin'); i++) {
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      if (at(game, 'resultat')) {
        game.submit({ t: 'advance' });
        continue;
      }
      if (at(game, 'annee') && game.timeLeft > 0 && game.pursuits.length > 0) {
        game.submit({ t: 'invest', pursuitId: game.pursuits[0]!.id, temps: 1 });
        break;
      }
      if (at(game, 'annee')) game.submit({ t: 'advance' });
    }
    if (game.pursuits.length > 0) {
      expect(game.pursuits[0]!.invested).toBeGreaterThan(avant);
    }
    expect(game.outcome?.text.length).toBeGreaterThan(10);
  });

  it('s\'éteignent toutes seules si on les laisse dormir', () => {
    const game = fresh();
    grow(game, 20);
    if (!at(game, 'annee')) return;
    const ouvrables = game.openablePursuits();
    if (ouvrables.length === 0) return;
    game.submit({ t: 'start', pursuitId: ouvrables[0]!.id });
    game.submit({ t: 'advance' });
    expect(game.pursuits.length).toBe(1);

    for (let i = 0; i < ABANDON_APRES + 3 && !at(game, 'fin'); i++) {
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      game.submit({ t: 'advance' });
    }
    expect(game.pursuits.length).toBe(0);
  });

  it('on n\'en mène jamais plus de trois', () => {
    const game = fresh();
    grow(game, 30);
    for (let i = 0; i < 6 && at(game, 'annee'); i++) {
      const ouvrables = game.openablePursuits();
      if (ouvrables.length === 0) break;
      game.submit({ t: 'start', pursuitId: ouvrables[0]!.id });
      settle(game);
    }
    expect(game.pursuits.length).toBeLessThanOrEqual(3);
  });
});

describe('les occasions', () => {
  it('sortent de l\'état du monde et se referment', () => {
    const game = fresh();
    grow(game, 22);
    if (!at(game, 'annee')) return;
    const y = game.year();
    for (const o of y.occasions) {
      expect(o.label.length).toBeGreaterThan(5);
      expect(o.detail.length).toBeGreaterThan(5);
      expect(o.cost).toBeGreaterThanOrEqual(1);
    }
    // Jamais plus de trois : au-delà ce n'est plus un choix, c'est une liste.
    expect(y.occasions.length).toBeLessThanOrEqual(3);
  });

  it('ne proposent jamais un mort', () => {
    const game = fresh(31337);
    for (let i = 0; i < 90 && !at(game, 'fin'); i++) {
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      if (at(game, 'mort')) {
        const h = game.heirs();
        if (h[0]) game.submit({ t: 'continueAs', heirId: h[0].id });
        else break;
        continue;
      }
      if (at(game, 'annee')) {
        for (const o of game.occasions) {
          if (o.roleId !== null) expect(game.world.get(o.roleId)?.alive).toBe(true);
        }
      }
      game.submit({ t: 'advance' });
    }
  });

  it('une occasion prise ne revient pas l\'année suivante', () => {
    const game = fresh(99);
    grow(game, 24);
    for (let i = 0; i < 40 && !at(game, 'fin'); i++) {
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      if (at(game, 'resultat')) {
        game.submit({ t: 'advance' });
        continue;
      }
      if (!at(game, 'annee')) break;
      const prenable = game.occasions.find((o) => o.cost <= game.timeLeft);
      if (prenable) {
        const defId = prenable.defId;
        game.submit({ t: 'seize', occasionId: prenable.id });
        game.submit({ t: 'advance' });
        if (at(game, 'annee')) {
          expect(game.occasions.some((o) => o.defId === defId)).toBe(false);
        }
        return;
      }
      game.submit({ t: 'advance' });
    }
  });
});

describe('l\'année survit à la sauvegarde', () => {
  it('entreprises, occasions et temps dépensé reviennent intacts', () => {
    const game = fresh(777);
    grow(game, 24);
    if (at(game, 'annee')) {
      const ouvrables = game.openablePursuits();
      if (ouvrables[0]) {
        game.submit({ t: 'start', pursuitId: ouvrables[0].id });
        settle(game);
      }
    }
    const json = game.save();
    const reload = Game.load(ruleset, json);
    expect(reload.pursuits.length).toBe(game.pursuits.length);
    expect(reload.occasions.length).toBe(game.occasions.length);
    expect(reload.spent).toBe(game.spent);
    expect(reload.timeLeft).toBe(game.timeLeft);
  });

  it('une nouvelle vie n\'hérite pas des entreprises de l\'ancienne', () => {
    const game = fresh(1234);
    grow(game, 30);
    if (at(game, 'annee')) {
      const ouvrables = game.openablePursuits();
      if (ouvrables[0]) {
        game.submit({ t: 'start', pursuitId: ouvrables[0].id });
        settle(game);
      }
    }
    for (let i = 0; i < 300 && !at(game, 'mort') && !at(game, 'fin'); i++) {
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      game.submit({ t: 'advance' });
    }
    if (!at(game, 'mort')) return;
    const h = game.heirs();
    if (!h[0]) return;
    game.submit({ t: 'continueAs', heirId: h[0].id });
    expect(game.pursuits.length).toBe(0);
    expect(game.spent).toBe(0);
  });
});
