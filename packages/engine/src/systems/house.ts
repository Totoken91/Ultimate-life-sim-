import type { System } from './types.js';
import { HOUSE_RANK_ORDER, HOUSE_RANK_THRESHOLDS, type HouseRank } from '../model/types.js';
import { ageOf, fullName } from '../model/character.js';
import { updateRecords } from '../stats/records.js';
import { pruneDead } from '../world/prune.js';
import { clamp } from '../util/math.js';

/**
 * POST — prestige et rang de maison (doc 03 §5).
 *
 * Le prestige monte par les actes et la durée, et **s'érode tout seul**. Une
 * maison qui ne fait plus rien redescend : c'est l'entropie dynastique en
 * miniature, la même mécanique qui fera pourrir les empires en Phase 5.
 */
export const HousePrestige: System = {
  id: 'house.prestige',
  phase: 'POST',
  priority: 50,
  run(ctx) {
    const { world } = ctx;
    // Parcours trié : ce système écrit dans la Chronique (voir houseList).
    for (const house of world.houseList()) {
      const members = house.memberIds
        .map((id) => world.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c);
      const living = members.filter((c) => c.alive);

      // gains : titres portés, richesse cumulée, ancienneté, nombre de vivants
      const titles = living.reduce((n, c) => n + c.titles.length, 0);
      const wealth = living.reduce((n, c) => n + Math.max(0, c.wealth), 0);
      const age = world.year - house.foundedYear;

      const gain =
        titles * 1.6 +
        Math.log10(1 + wealth) * 0.9 +
        Math.min(3, living.length * 0.25) +
        Math.min(1.5, age / 200);

      // érosion : 1,5 % par an, plus fort si la maison n'a plus de vivants
      const decay = house.prestige * (living.length === 0 ? 0.06 : 0.015);

      house.prestige = clamp(house.prestige + gain - decay, 0, 100000);

      // le rang suit le prestige, jamais l'inverse
      // Hystérésis : il faut dépasser le seuil de 6 % pour monter, et
      // retomber 6 % sous lui pour redescendre. Sans marge, une maison assise
      // *sur* un seuil montait et retombait chaque année, et la Chronique
      // annonçait deux fois la même élévation.
      let rank: HouseRank = 'maison';
      for (const candidate of HOUSE_RANK_ORDER) {
        const seuil = HOUSE_RANK_THRESHOLDS[candidate];
        const plusHaut = HOUSE_RANK_ORDER.indexOf(candidate) > HOUSE_RANK_ORDER.indexOf(house.rank);
        if (house.prestige >= seuil * (plusHaut ? 1.06 : 0.94)) rank = candidate;
      }
      if (rank !== house.rank) {
        const rising = HOUSE_RANK_ORDER.indexOf(rank) > HOUSE_RANK_ORDER.indexOf(house.rank);
        house.rank = rank;
        if (living.some((c) => c.isPlayer)) {
          world.say(
            rising
              ? `La Maison ${house.name} s'élève au rang de ${rank}.`
              : `La Maison ${house.name} retombe au rang de ${rank}.`,
          );
        }
        world.record({
          year: world.year,
          kind: rising ? 'ascension' : 'chute',
          // Toutes les maisons du monde franchissent « notable » un jour ou
          // l'autre : au poids 4, elles inondaient la Chronique et couvraient
          // les guerres. Seul le sommet mérite qu'on s'en souvienne.
          importance: HOUSE_RANK_ORDER.indexOf(rank) >= 3 ? 4 : 2,
          actors: [{ id: house.headId, name: `Maison ${house.name}` }],
          data: {
            texte: `La Maison ${house.name} ${rising ? 's\'éleva' : 'retomba'} au rang de ${rank}.`,
          },
        });
      }

      // le chef mort est remplacé par le vivant le plus âgé de la maison
      const head = world.get(house.headId);
      if (!head || !head.alive) {
        const successor = living.sort(
          (a, b) => ageOf(b, world.year) - ageOf(a, world.year) || a.id - b.id,
        )[0];
        if (successor) {
          house.headId = successor.id;
          if (!house.headHistory.includes(successor.id)) house.headHistory.push(successor.id);
          if (successor.isPlayer) {
            world.say(`Vous êtes désormais à la tête de la Maison ${house.name}.`);
            world.record({
              year: world.year,
              kind: 'ascension',
              importance: 4,
              actors: [{ id: successor.id, name: fullName(successor) }],
              data: { quoi: `prit la tête de la Maison ${house.name}` },
            });
          }
        }
      }
    }
  },
};

/**
 * POST — élagage périodique des morts sans importance (doc 02 §6).
 *
 * Tous les dix ans seulement : c'est un passage complet sur les entités, et
 * il n'y a aucune urgence à le faire chaque année.
 */
export const Pruning: System = {
  id: 'world.pruning',
  phase: 'POST',
  priority: 95,
  run(ctx) {
    if (ctx.world.year % 10 !== 0) return;
    pruneDead(ctx.world, { keepRecentYears: 80 });
  },
};

/** POST — tient à jour le livre des records. Toujours en dernier. */
export const Records: System = {
  id: 'stats.records',
  phase: 'POST',
  priority: 99,
  run(ctx) {
    updateRecords(ctx.world);
  },
};
