import { describe, expect, it } from 'vitest';
import { Game, standing, status } from '@ed/game';
import { loadRuleset } from '@ed/content';
import { ans, lifeStage, plural, pursePhrase } from '@ed/engine';

const ruleset = loadRuleset();

/** Amène la partie à l'écran d'année, en prenant la première porte ouverte. */
function toYear(game: Game, limit = 4000): void {
  for (let i = 0; i < limit; i++) {
    if (game.phase === 'annee') return;
    if (game.phase === 'evenement') {
      const open = game.pending[0]?.options.find((o) => !o.locked);
      if (open) {
        game.submit({ t: 'choose', optionId: open.id });
        continue;
      }
    }
    if (game.phase === 'mort' || game.phase === 'fin') return;
    game.submit({ t: 'advance' });
  }
}

/**
 * Les défauts de ce fichier ne cassent aucun système : ils cassent la lecture
 * (doc 18). Ils reviennent donc facilement, et un test vaut mieux qu'un
 * commentaire.
 */
describe('lisibilité', () => {
  it('accorde les nombres', () => {
    expect(ans(0)).toBe('0 an');
    expect(ans(1)).toBe('1 an');
    expect(ans(2)).toBe('2 ans');
    expect(plural(1, 'mort')).toBe('1 mort');
    expect(plural(3, 'mort')).toBe('3 morts');
  });

  it('ne traite pas un enfant de cinq ans en nourrisson', () => {
    expect(lifeStage(1)).toBe('nourrisson');
    expect(lifeStage(5)).toBe('enfant');
    expect(lifeStage(14)).toBe('adolescent');
  });

  it('dit la bourse en temps de vie, pas en bande abstraite', () => {
    expect(pursePhrase(-40, 320)).toContain('vous devez');
    expect(pursePhrase(50, 320)).toContain('finir l\'année');
    expect(pursePhrase(400, 320)).toContain('tenir un an');
    expect(pursePhrase(1200, 320)).toContain('tenir 3 ans');
  });

  it('donne au joueur un état et une suite, dès la première année', () => {
    const game = Game.create(ruleset, { seed: 4242, mode: 'chronique' });
    toYear(game);
    const place = standing(game);
    expect(place.total).toBe(10);
    expect(place.title.length).toBeGreaterThan(3);
    // Une marche non franchie porte toujours son mode d'emploi : c'est tout
    // l'intérêt de la vue.
    expect(place.next.length).toBeGreaterThan(0);
    for (const step of place.next) expect(step.how.length).toBeGreaterThan(10);
  });

  it('les marches se franchissent, jamais ne se décochent au hasard', () => {
    const game = Game.create(ruleset, { seed: 9, mode: 'chronique' });
    toYear(game);
    let plafond = standing(game).done;
    for (let i = 0; i < 60 && game.phase !== 'mort' && game.phase !== 'fin'; i++) {
      toYear(game);
      if (game.phase !== 'annee') break;
      const done = standing(game).done;
      // « Passer l'enfance » ne se reprend pas ; une maison peut se perdre,
      // mais jamais deux marches d'un coup dans la même année.
      expect(done).toBeGreaterThanOrEqual(plafond - 1);
      plafond = Math.max(plafond, done);
      game.submit({ t: 'advance' });
    }
  });

  it('un joueur ne s\'enfonce pas dans une dette qui ne se rembourse pas', () => {
    for (const seed of [3, 17, 55]) {
      const game = Game.create(ruleset, { seed, mode: 'chronique' });
      toYear(game);
      for (let i = 0; i < 80 && game.phase !== 'mort' && game.phase !== 'fin'; i++) {
        toYear(game);
        if (game.phase !== 'annee') break;
        // Le solde peut passer sous zéro dans l'année (un événement coûte),
        // mais l'économie le remet à plat au tour suivant : personne ne porte
        // un découvert d'une année sur l'autre.
        expect(Number(game.player.flags['manque'] ?? 0)).toBeGreaterThanOrEqual(0);
        game.submit({ t: 'advance' });
      }
    }
  });

  it('ne parle dans l\'année que de gens que le joueur connaît', () => {
    const game = Game.create(ruleset, { seed: 4242, mode: 'chronique' });
    toYear(game);
    const connus = new Set(
      game.world.relations.from(game.player.id).map((r) => game.world.get(r.to)?.given),
    );
    let lignes = 0;
    let etrangers = 0;
    for (let i = 0; i < 40 && game.phase !== 'mort' && game.phase !== 'fin'; i++) {
      toYear(game);
      if (game.phase !== 'annee') break;
      for (const c of game.world.relations.from(game.player.id)) {
        connus.add(game.world.get(c.to)?.given);
      }
      for (const ligne of game.yearLog) {
        // On ne compte que les lignes qui nomment quelqu'un à la troisième
        // personne : le reste parle du joueur ou du lieu.
        const nom = /^([A-ZÉÈÀÎÔÛ][a-zéèêàçîïôûù-]+) /.exec(ligne)?.[1];
        if (!nom || nom === 'Vous' || nom === 'On' || nom === 'Un' || nom === 'Des') continue;
        lignes += 1;
        if (!connus.has(nom)) etrangers += 1;
      }
      game.submit({ t: 'advance' });
    }
    if (lignes > 10) expect(etrangers / lignes).toBeLessThan(0.35);
  });
});
