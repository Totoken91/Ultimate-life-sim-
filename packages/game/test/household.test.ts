import { describe, it, expect } from 'vitest';
import { loadRuleset } from '@ed/content';
import { Game } from '@ed/game';

const ruleset = loadRuleset();
const at = (g: Game, phase: string): boolean => (g.phase as string) === phase;

function fresh(seed = 4242) {
  const game = Game.create(ruleset, { seed, mode: 'chronique' });
  game.submit({ t: 'advance' });
  return game;
}

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

/** Met le joueur en état d'acheter : de l'argent, un rang, une année ouverte. */
function riche(game: Game, sous = 300000): void {
  game.player.wealth = sous;
  game.player.socialClass = 'noble';
}

describe('le patrimoine', () => {
  it('s\'achète, et l\'entretien est immédiatement lisible', () => {
    const game = fresh();
    grow(game, 25);
    if (!at(game, 'annee')) return;
    riche(game);
    const achetables = game.buyableHoldings();
    expect(achetables.length).toBeGreaterThan(0);
    const avant = game.player.wealth;
    const def = achetables[0]!;
    game.submit({ t: 'acquire', holdingId: def.id });
    expect(game.player.wealth).toBe(avant - def.price);
    expect(game.outcome?.text).toContain('par an');
    expect(game.world.holdingsOf(game.player.id).length).toBe(1);
  });

  it('se dégrade quand on ne peut plus payer, et finit par se perdre', () => {
    const game = fresh(7);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    riche(game);
    const cher = game.buyableHoldings().sort((a, b) => b.upkeep - a.upkeep)[0];
    if (!cher) return;
    game.submit({ t: 'acquire', holdingId: cher.id });
    game.submit({ t: 'advance' });

    // On coupe les vivres : l'entretien ne peut plus suivre.
    const bien = game.world.holdingsOf(game.player.id)[0];
    expect(bien).toBeDefined();
    const etat = bien!.condition;
    for (let i = 0; i < 6 && !at(game, 'fin'); i++) {
      game.player.wealth = 0;
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      game.submit({ t: 'advance' });
    }
    const reste = game.world.holdings.find((h) => h.id === bien!.id);
    // Ou bien il s'est dégradé, ou bien il est perdu — jamais intact.
    expect(reste === undefined || reste.condition < etat).toBe(true);
  });

  it('passe à l\'héritier, mais pas les gens qui servaient', () => {
    const game = fresh(31337);
    grow(game, 32);
    if (!at(game, 'annee')) return;
    riche(game);
    const def = game.buyableHoldings()[0];
    if (!def) return;
    game.submit({ t: 'acquire', holdingId: def.id });
    game.submit({ t: 'advance' });

    for (let i = 0; i < 400 && !at(game, 'mort') && !at(game, 'fin'); i++) {
      game.player.wealth = 300000;
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
    const heirs = game.heirs();
    if (!heirs[0]) return;
    const mort = game.player.id;
    game.submit({ t: 'continueAs', heirId: heirs[0].id });
    expect(game.player.id).not.toBe(mort);
    expect(game.world.holdingsOf(game.player.id).length).toBeGreaterThan(0);
    expect(game.world.retainersOf(mort).length).toBe(0);
  });
});

describe('la domesticité', () => {
  it('ne s\'ouvre qu\'avec de quoi la loger', () => {
    const game = fresh(11);
    grow(game, 28);
    if (!at(game, 'annee')) return;
    riche(game);
    // Sans patrimoine, personne à prendre à son service.
    expect(game.hirableRetainers().length).toBe(0);
    const avecPlaces = game.buyableHoldings().find((d) => d.staffSlots > 0);
    if (!avecPlaces) return;
    game.submit({ t: 'acquire', holdingId: avecPlaces.id });
    game.submit({ t: 'advance' });
    expect(game.hirableRetainers().length).toBeGreaterThan(0);
  });

  it('rend du temps — c\'est ce que l\'argent achète en premier', () => {
    const game = fresh(23);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    riche(game);
    const avant = game.budget.total;

    // On monte jusqu'à pouvoir loger quelqu'un qui rend du temps.
    for (let i = 0; i < 4; i++) {
      const d = game.buyableHoldings().sort((a, b) => b.staffSlots - a.staffSlots)[0];
      if (!d || d.staffSlots === 0) break;
      game.submit({ t: 'acquire', holdingId: d.id });
      if (at(game, 'resultat')) game.submit({ t: 'advance' });
      if (!at(game, 'annee')) break;
      game.player.wealth = 300000;
      game.spent = 0;
    }
    if (!at(game, 'annee')) return;
    const rendeur = game.hirableRetainers().find((d) => (d.gives.temps ?? 0) > 0);
    if (!rendeur) return;
    game.player.wealth = 300000;
    game.spent = 0;
    game.submit({ t: 'hire', retainerId: rendeur.id });
    if (at(game, 'resultat')) game.submit({ t: 'advance' });
    expect(game.budget.total).toBeGreaterThan(avant);
    expect(game.budget.credits.length).toBeGreaterThan(0);
  });

  it('quelqu\'un qu\'on ne paie plus finit par partir', () => {
    const game = fresh(41);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    riche(game);
    const logis = game.buyableHoldings().find((d) => d.staffSlots > 0);
    if (!logis) return;
    game.submit({ t: 'acquire', holdingId: logis.id });
    if (at(game, 'resultat')) game.submit({ t: 'advance' });
    if (!at(game, 'annee')) return;
    game.player.wealth = 300000;
    game.spent = 0;
    const gens = game.hirableRetainers()[0];
    if (!gens) return;
    game.submit({ t: 'hire', retainerId: gens.id });
    if (at(game, 'resultat')) game.submit({ t: 'advance' });
    expect(game.world.retainersOf(game.player.id).length).toBe(1);

    for (let i = 0; i < 8 && !at(game, 'fin'); i++) {
      game.player.wealth = 0;
      if (at(game, 'evenement') && game.pending.length > 0) {
        const o = game.pending[0]!.options.find((x) => !x.locked);
        if (o) {
          game.submit({ t: 'choose', optionId: o.id });
          continue;
        }
      }
      game.submit({ t: 'advance' });
    }
    expect(game.world.retainersOf(game.player.id).length).toBe(0);
  });

  it('est une vraie personne, pas une ligne de dépense', () => {
    const game = fresh(55);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    riche(game);
    const logis = game.buyableHoldings().find((d) => d.staffSlots > 0);
    if (!logis) return;
    game.submit({ t: 'acquire', holdingId: logis.id });
    if (at(game, 'resultat')) game.submit({ t: 'advance' });
    if (!at(game, 'annee')) return;
    game.player.wealth = 300000;
    game.spent = 0;
    const gens = game.hirableRetainers()[0];
    if (!gens) return;
    game.submit({ t: 'hire', retainerId: gens.id });
    const r = game.world.retainersOf(game.player.id)[0];
    expect(r).toBeDefined();
    const person = game.world.get(r!.personId);
    expect(person?.alive).toBe(true);
    // Un serment relie les deux : on peut le trahir, il peut partir.
    expect(game.world.relations.get(person!.id, game.player.id)?.type).toBe('serment');
  });
});

describe('gouverner', () => {
  it('ne propose des réformes que si l\'on gouverne', () => {
    const game = fresh(77);
    grow(game, 25);
    if (!game.ruledDomain()) expect(game.reformOptions().length).toBe(0);
  });

  it('changer une règle coûte de la légitimité', () => {
    const game = fresh(88);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    const dom = game.world.domainAt(game.player.settlement);
    if (!dom) return;
    dom.rulerId = game.player.id;
    const options = game.reformOptions();
    expect(options.length).toBeGreaterThan(0);
    const cible = options.find((o) => o.choices.length > 0);
    if (!cible) return;
    const leg = dom.legitimacy;
    game.spent = 0;
    game.submit({ t: 'reform', axis: cible.axis, value: cible.choices[0]! });
    expect(dom.legitimacy).toBeLessThan(leg);
    expect(game.outcome?.text).toContain('légitimité');
  });
});

describe('tout ça survit à la sauvegarde', () => {
  it('biens et gens reviennent intacts', () => {
    const game = fresh(999);
    grow(game, 30);
    if (!at(game, 'annee')) return;
    riche(game);
    const def = game.buyableHoldings()[0];
    if (!def) return;
    game.submit({ t: 'acquire', holdingId: def.id });
    const json = game.save();
    const reload = Game.load(ruleset, json);
    expect(reload.world.holdingsOf(reload.player.id).length).toBe(
      game.world.holdingsOf(game.player.id).length,
    );
    expect(reload.world.holdings[0]?.label).toBe(game.world.holdings[0]?.label);
  });
});
