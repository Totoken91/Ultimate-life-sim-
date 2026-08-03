import { describe, expect, it } from 'vitest';
import { Game, relations, self, status } from '@ed/game';
import { loadRuleset } from '@ed/content';
import { ageOf, worldHash } from '@ed/engine';
import { autoplay } from '../../tools/src/autoplay.js';

const ruleset = loadRuleset();

const isDead = (game: Game): boolean => game.phase === 'mort';

/** Fait tourner la partie jusqu'à ce qu'elle atteigne l'une des phases visées. */
function runUntil(game: Game, phases: string[], limit = 6000): void {
  for (let i = 0; i < limit; i++) {
    if (phases.includes(game.phase)) return;
    if (game.phase === 'evenement') {
      const ev = game.pending[0];
      const open = ev?.options.find((o) => !o.locked);
      if (open) {
        game.submit({ t: 'choose', optionId: open.id });
        continue;
      }
    }
    game.submit({ t: 'advance' });
  }
  throw new Error(`phases ${phases.join('/')} jamais atteintes (bloqué en ${game.phase})`);
}

describe('Game', () => {
  it('démarre sur une naissance dotée d\'un texte et d\'un entourage', () => {
    const game = Game.create(ruleset, { seed: 100 });
    expect(game.phase).toBe('naissance');
    expect(game.opening.length).toBeGreaterThan(40);
    expect(game.age).toBe(0);
    expect(relations(game).length).toBeGreaterThan(0);
  });

  it('avance dans le temps et fait vieillir le joueur', () => {
    const game = Game.create(ruleset, { seed: 101 });
    game.submit({ t: 'advance' });
    const startAge = game.age;
    for (let i = 0; i < 5; i++) {
      runUntil(game, ['annee', 'mort']);
      if (isDead(game)) break;
      game.submit({ t: 'advance' });
    }
    expect(game.age).toBeGreaterThan(startAge);
  });

  it('n\'accepte qu\'une action par année', () => {
    const game = Game.create(ruleset, { seed: 102 });
    game.submit({ t: 'advance' });
    runUntil(game, ['annee']);
    // avance jusqu'à un âge où des actions existent
    while (game.age < 15 && !isDead(game)) {
      runUntil(game, ['annee', 'mort']);
      if (isDead(game)) return;
      game.submit({ t: 'advance' });
    }
    runUntil(game, ['annee', 'mort']);
    if (isDead(game)) return;

    const actions = game.availableActions();
    expect(actions.length).toBeGreaterThan(0);
    game.submit({ t: 'action', actionId: actions[0]!.id });
    expect(game.spent).toBeGreaterThan(0);
    game.submit({ t: 'advance' }); // sort de l'écran de résultat
    const wealthBefore = game.player.wealth;
    game.submit({ t: 'action', actionId: actions[0]!.id });
    expect(game.player.wealth).toBe(wealthBefore);
  });

  it('un choix verrouillé ne peut pas être joué', () => {
    const game = Game.create(ruleset, { seed: 103 });
    game.submit({ t: 'advance' });
    for (let i = 0; i < 400 && !isDead(game); i++) {
      if (game.phase === 'evenement') {
        const ev = game.pending[0]!;
        const locked = ev.options.find((o) => o.locked);
        if (locked) {
          const before = game.phase;
          game.submit({ t: 'choose', optionId: locked.id });
          expect(game.phase).toBe(before);
          return;
        }
        game.submit({ t: 'choose', optionId: ev.options.find((o) => !o.locked)!.id });
        continue;
      }
      game.submit({ t: 'advance' });
    }
  });

  it('finit toujours par mourir', () => {
    const game = Game.create(ruleset, { seed: 104 });
    game.submit({ t: 'advance' });
    runUntil(game, ['mort']);
    expect(game.player.alive).toBe(false);
    expect(game.player.causeOfDeath).toBeTruthy();
    expect(ageOf(game.player, game.world.year)).toBeGreaterThan(0);
  });

  it('produit une chronique lisible à la mort', () => {
    const game = Game.create(ruleset, { seed: 105 });
    game.submit({ t: 'advance' });
    runUntil(game, ['mort']);
    const kinds = game.world.chronicle.map((e) => e.kind);
    expect(kinds).toContain('naissance');
    expect(kinds).toContain('mort');
  });

  it('permet de reprendre avec un héritier quand il y en a un', () => {
    // on cherche une graine où le joueur laisse une descendance
    for (let seed = 200; seed < 260; seed++) {
      const game = Game.create(ruleset, { seed });
      game.submit({ t: 'advance' });
      runUntil(game, ['mort']);
      const heirs = game.heirs();
      if (heirs.length === 0) continue;

      const deadId = game.player.id;
      const inheritedFrom = game.player.wealth;
      game.submit({ t: 'continueAs', heirId: heirs[0]!.id });

      expect(game.phase).toBe('annee');
      expect(game.player.id).not.toBe(deadId);
      expect(game.player.isPlayer).toBe(true);
      expect(game.player.alive).toBe(true);
      if (inheritedFrom > 0) expect(game.player.wealth).toBeGreaterThan(0);
      return;
    }
    throw new Error('aucune graine testée ne laisse d\'héritier');
  });

  it('propose de suivre quelqu\'un d\'autre quand on meurt', () => {
    const game = Game.create(ruleset, { seed: 410 });
    game.submit({ t: 'advance' });
    runUntil(game, ['mort']);

    const strangers = game.strangers(3);
    expect(strangers.length).toBeGreaterThan(0);
    for (const st of strangers) {
      expect(st.hook.length).toBeGreaterThan(0);
      expect(st.age).toBeGreaterThanOrEqual(6);
    }

    const deadId = game.player.id;
    game.submit({ t: 'follow', id: strangers[0]!.id });
    expect(game.phase).toBe('annee');
    expect(game.player.id).toBe(strangers[0]!.id);
    expect(game.player.id).not.toBe(deadId);
    expect(game.player.isPlayer).toBe(true);
    expect(game.world.get(deadId)?.isPlayer).toBe(false);

    // On n'atterrit jamais dans une vie vide : le cercle est matérialisé.
    const circle = relations(game);
    expect(circle.length).toBeGreaterThanOrEqual(3);
    for (const r of circle) expect(r.label.length).toBeGreaterThan(0);
  });

  it('la liste des vies à reprendre est stable tant que l\'année ne bouge pas', () => {
    const game = Game.create(ruleset, { seed: 411 });
    game.submit({ t: 'advance' });
    runUntil(game, ['mort']);
    expect(game.strangers(3)).toEqual(game.strangers(3));
  });

  it('permet de repartir d\'un nouveau-né sans remettre le monde à zéro', () => {
    const game = Game.create(ruleset, { seed: 412 });
    game.submit({ t: 'advance' });
    runUntil(game, ['mort']);

    const yearAtDeath = game.world.year;
    const chronicleBefore = game.world.chronicle.length;
    game.submit({ t: 'newborn' });

    expect(game.phase).toBe('naissance');
    expect(game.age).toBe(0);
    expect(game.world.year).toBe(yearAtDeath);
    expect(game.world.chronicle.length).toBeGreaterThan(chronicleBefore);
    expect(game.opening.length).toBeGreaterThan(40);
  });

  it('sauvegarde et recharge sans perdre l\'état', () => {
    const game = Game.create(ruleset, { seed: 300 });
    game.submit({ t: 'advance' });
    for (let i = 0; i < 30; i++) runUntil(game, ['annee', 'mort']), game.submit({ t: 'advance' });

    const json = game.save();
    const before = worldHash(game.world);
    const loaded = Game.load(ruleset, json);
    expect(worldHash(loaded.world)).toBe(before);
    expect(loaded.phase).toBe(game.phase);
    expect(status(loaded).name).toBe(status(game).name);
  });

  it('les vues n\'exposent jamais les attributs cachés', () => {
    const game = Game.create(ruleset, { seed: 301 });
    const view = JSON.stringify({ status: status(game), self: self(game) });
    for (const hidden of ['potentiel', 'destinee', 'karma', 'folie', 'corruption']) {
      expect(view).not.toContain(hidden);
    }
  });
});

describe('banc d\'autoplay', () => {
  it('joue 40 vies sans jamais planter', () => {
    for (let seed = 0; seed < 40; seed++) {
      const result = autoplay(ruleset, { seed: 5000 + seed, generations: 2 });
      expect(result.lives.length).toBeGreaterThan(0);
      for (const life of result.lives) {
        expect(life.ageAtDeath).toBeGreaterThanOrEqual(0);
        expect(life.cause).not.toBe('?');
      }
    }
  });

  it('produit des vies de durées variées', () => {
    const ages = new Set<number>();
    for (let seed = 0; seed < 40; seed++) {
      for (const life of autoplay(ruleset, { seed: 9000 + seed }).lives) ages.add(life.ageAtDeath);
    }
    expect(ages.size).toBeGreaterThan(15);
  });
});
