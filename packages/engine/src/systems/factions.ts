import type { System, TickContext } from './types.js';
import type { Character, Faction } from '../model/types.js';
import type { EventCtx } from '../events/types.js';
import { shortName } from '../model/character.js';
import { killCharacter } from '../events/effects.js';
import { clamp } from '../util/math.js';
import { clash, describeClash, ofName, sideOf, TIER_LABELS } from '../conflict/clash.js';
import {
  SEUIL_DISSOLUTION,
  SEUIL_FONDATION,
  SOLDE,
  chooseGoal,
  foundFaction,
  membershipIndex,
  livingMembers,
  recomputePower,
  replaceLeader,
  swornTo,
} from '../factions/factions.js';

/** Une faction ne revoit son but que tous les huit ans. */
const CYCLE_BUT = 8;

/** Contexte minimal pour `killCharacter`, qui écrit la Chronique et le deuil. */
function deathCtx(ctx: TickContext, subject: Character): EventCtx {
  const { world, ruleset } = ctx;
  const roles: Record<string, Character> = {};
  return {
    world,
    ruleset,
    subject,
    age: world.year - subject.birthYear,
    rng: ctx.rng,
    roles,
    role: () => {
      throw new Error('rôle absent');
    },
    maybe: () => undefined,
    rel: () => undefined,
  };
}

/** Le joueur entend-il parler de ce groupe ? */
function known(ctx: TickContext, f: Faction): boolean {
  const { world } = ctx;
  const player = world.player;
  if (!player.alive) return false;
  if (f.seat === player.settlement) return true;
  if (f.memberIds.includes(player.id)) return true;
  return !!world.relations.get(player.id, f.leaderId);
}

function report(ctx: TickContext, f: Faction, text: string, reach: 'local' | 'monde'): void {
  const { world } = ctx;
  if (reach !== 'monde' && !known(ctx, f)) return;
  world.report({
    year: world.year,
    text,
    reach,
    place: f.seat,
    actors: [f.leaderId],
  });
  if (reach === 'monde' || known(ctx, f)) world.say(text);
}

/**
 * POST — les factions se découvrent, se maintiennent, se dissolvent.
 *
 * Aucun groupe n'est créé de toutes pièces : on lit le réseau de serments que
 * l'agentivité des PNJ a tissé, et on nomme ce qui existe déjà (doc 14 §1).
 */
export const FactionFormation: System = {
  id: 'faction.formation',
  phase: 'POST',
  priority: 55,
  run(ctx) {
    const { world } = ctx;
    // Tous les trois ans : c'est un passage complet, et une bande ne se forme
    // pas dans l'année.
    if (world.year % 3 !== 0) return;

    // Parcours trié : l'ordre d'une Map est chronologique en partie et trié
    // après rechargement. Itérer brut ferait diverger une partie rechargée.
    // ── maintenance des groupes existants ─────────────────────────────────
    for (const f of world.activeFactions()) {
      // les morts quittent le groupe
      f.memberIds = f.memberIds.filter((id) => world.get(id)?.alive);
      // les jurés d'aujourd'hui entrent, ceux qui ont renié sortent
      for (const c of swornTo(world, f.leaderId)) {
        if (!f.memberIds.includes(c.id)) f.memberIds.push(c.id);
      }

      const leader = world.get(f.leaderId);
      if (!leader || !leader.alive) {
        const heir = replaceLeader(world, f);
        if (heir) {
          report(ctx, f, `${shortName(heir)} prend la tête de ${f.name}.`, 'local');
        }
      }

      const membres = livingMembers(world, f).length;
      if (membres < SEUIL_DISSOLUTION) {
        f.dissolvedYear = world.year;
        world.tally.factionsDissolved += 1;
        report(ctx, f, `On ne parle plus ${ofName(f.name)}.`, 'local');
        continue;
      }
      f.power = recomputePower(world, f);
    }

    // ── nouveaux groupes ──────────────────────────────────────────────────
    const affilies = membershipIndex(world);
    for (const c of ctx.living) {
      if (c.isPlayer || affilies.has(c.id)) continue;
      const sworn = swornTo(world, c.id).filter((m) => !affilies.has(m.id));
      if (sworn.length < SEUIL_FONDATION) continue;
      const f = foundFaction(world, ctx.rng.fork('faction.naissance', world.year, c.id), c, sworn);
      affilies.set(c.id, f);
      for (const m of sworn) affilies.set(m.id, f);
      // Tournure nominale : « les hommes de Sarrach s'est formée » est une
      // faute que le moteur ne peut pas éviter autrement — il ne connaît ni le
      // genre ni le nombre des noms qu'il fabrique.
      report(
        ctx,
        f,
        `Un groupe s'est formé à ${world.settlement(f.seat)?.name ?? f.seat} : ${f.name}.`,
        'local',
      );
    }
  },
};

/**
 * MAIN — ce que les factions font de leur année.
 *
 * Elles n'ont qu'un but à la fois (doc 14 §2) : une bande qui veut tout à la
 * fois ne veut rien, et le joueur ne peut pas la lire.
 */
export const FactionAI: System = {
  id: 'faction.ai',
  phase: 'MAIN',
  priority: 58,
  run(ctx) {
    const { world } = ctx;
    const actives = world.activeFactions();
    if (actives.length === 0) return;
    const affilies = membershipIndex(world);

    for (const f of actives) {
      const rng = ctx.rng.fork('faction.ai', world.year, f.id);
      const membres = livingMembers(world, f);
      if (membres.length === 0) continue;

      // La solde d'abord. Une faction qui ne paie pas ses hommes les perd :
      // c'est ce qui borne les trésors et ce qui fait qu'une bande trop grosse
      // pour ses moyens se défait toute seule.
      f.treasury -= membres.length * SOLDE;
      if (f.treasury < 0) {
        f.treasury = 0;
        const deserteur = rng.pickOrNull(membres.filter((m) => m.id !== f.leaderId));
        if (deserteur) {
          world.relations.modify(deserteur.id, f.leaderId, { respect: -25, trust: -20 });
          const lien = world.relations.get(deserteur.id, f.leaderId);
          if (lien && lien.type === 'serment') lien.type = 'rivalite';
          f.memberIds = f.memberIds.filter((id) => id !== deserteur.id);
        }
      }

      // Les rancunes entre groupes se calment quand on ne les entretient pas.
      for (const other of actives) {
        if (other.id === f.id || other.id === f.goalTarget) continue;
        const feeling = f.standing[other.id];
        if (feeling === undefined || feeling === 0) continue;
        f.standing[other.id] = feeling > 0 ? Math.max(0, feeling - 2) : Math.min(0, feeling + 3);
      }

      // révision du but
      if ((world.year - f.foundedYear) % CYCLE_BUT === 0) {
        const next = chooseGoal(world, f, actives.filter((o) => o.id !== f.id), rng.fork('but'));
        if (next.goal !== f.goal) {
          f.goal = next.goal;
          f.goalTarget = next.target;
        }
      }

      switch (f.goal) {
        case 'croitre': {
          // On recrute chez soi, parmi ceux qui n'ont juré à personne.
          const leader = world.get(f.leaderId);
          if (!leader || !leader.alive) break;
          const locaux = ctx.living.filter(
            (c) =>
              c.settlement === f.seat &&
              !c.isPlayer &&
              c.id !== leader.id &&
              world.year - c.birthYear >= 15 &&
              !affilies.has(c.id),
          );
          const recrue = rng.pickOrNull(locaux);
          if (recrue && rng.chance(0.35 + f.power / 400)) {
            world.relations.ensure(recrue.id, leader.id, 'serment', 'mon chef', world.year);
            world.relations.modify(recrue.id, leader.id, { respect: 18, trust: 10 });
            world.relations.ensure(leader.id, recrue.id, 'serment', 'mon homme', world.year);
            world.relations.modify(leader.id, recrue.id, { trust: 8 });
            f.memberIds.push(recrue.id);
            affilies.set(recrue.id, f);
          }
          break;
        }

        case 'enrichir': {
          // Chacun verse sa part. Une faction pauvre ne tient pas ses hommes.
          let verse = 0;
          for (const m of membres) {
            const part = Math.round(Math.max(0, m.wealth) * 0.04);
            m.wealth -= part;
            verse += part;
          }
          f.treasury += verse;
          break;
        }

        case 'tenir': {
          f.treasury = Math.max(0, f.treasury - membres.length * 8);
          break;
        }

        case 'dominer': {
          // L'emprise monte lentement et se paie : on tient une ville avec des
          // hommes qu'on nourrit, pas avec une intention.
          const cout = membres.length * 25;
          if (f.treasury >= cout) {
            f.treasury -= cout;
            const avant = f.grip[f.seat] ?? 0;
            const apres = clamp(avant + 2 + f.power / 60, 0, 100);
            f.grip[f.seat] = apres;
            if (avant < 60 && apres >= 60) {
              report(
                ctx,
                f,
                `${f.name} fait la loi à ${world.settlement(f.seat)?.name ?? f.seat}.`,
                'monde',
              );
            }
          } else {
            f.grip[f.seat] = clamp((f.grip[f.seat] ?? 0) - 3, 0, 100);
          }
          break;
        }

        case 'abattre':
        case 'venger': {
          const cible = f.goalTarget ? world.factions.get(f.goalTarget) : undefined;
          if (!cible || cible.dissolvedYear !== null) {
            f.goal = 'tenir';
            f.goalTarget = null;
            break;
          }
          // L'hostilité se creuse d'abord. On ne se jette pas sur un rival
          // l'année où on décide de le haïr.
          const feeling = (f.standing[cible.id] ?? 0) - 12;
          f.standing[cible.id] = clamp(feeling, -100, 100);
          cible.standing[f.id] = clamp((cible.standing[f.id] ?? 0) - 8, -100, 100);
          break;
        }
      }
    }
  },
};

/**
 * RESOLVE — les affrontements.
 *
 * C'est ici que l'inimitié entre groupes devient des morts. Le même résolveur
 * servira à la guerre stellaire : seules les effectifs et le palier technique
 * changeront (doc 09 §2).
 */
export const Conflicts: System = {
  id: 'faction.conflicts',
  phase: 'RESOLVE',
  priority: 30,
  run(ctx) {
    const { world } = ctx;
    const actives = world.activeFactions();
    if (actives.length < 2) return;

    const dejaEngagees = new Set<string>();

    for (const f of actives) {
      if (dejaEngagees.has(f.id)) continue;
      const cible = f.goalTarget ? world.factions.get(f.goalTarget) : undefined;
      if (!cible || cible.dissolvedYear !== null || dejaEngagees.has(cible.id)) continue;
      if (f.goal !== 'abattre' && f.goal !== 'venger') continue;

      const hostilite = -(f.standing[cible.id] ?? 0);
      if (hostilite < 60) continue;

      // Une guerre a un rythme. Sans ce délai, deux bandes se rentraient dedans
      // chaque année pendant deux siècles : 291 batailles pour 200 ans, dont
      // beaucoup sans un seul mort.
      const derniere = Number(world.flags[`clash:${f.id}:${cible.id}`] ?? -99);
      if (world.year - derniere < 4) continue;

      const rng = ctx.rng.fork('faction.clash', world.year, f.id, cible.id);
      if (!rng.chance(0.12 + hostilite / 900)) continue;

      const nous = livingMembers(world, f);
      const eux = livingMembers(world, cible);
      if (nous.length === 0 || eux.length === 0) continue;

      const a = sideOf(f.id, f.name, nous, world.get(f.leaderId) ?? null, {
        morale: clamp(45 + f.power / 8, 20, 95),
        ground: f.seat === cible.seat ? 1 : 0.9,
      });
      const b = sideOf(cible.id, cible.name, eux, world.get(cible.leaderId) ?? null, {
        // On se défend mieux chez soi.
        morale: clamp(45 + cible.power / 8, 20, 95),
        ground: cible.seat === f.seat ? 1.15 : 1,
      });

      const result = clash(a, b, rng);
      world.tally.clashes += 1;
      world.flags[`clash:${f.id}:${cible.id}`] = world.year;
      world.flags[`clash:${cible.id}:${f.id}`] = world.year;
      dejaEngagees.add(f.id);
      dejaEngagees.add(cible.id);

      for (const [camp, morts] of [
        [f, result.deadA],
        [cible, result.deadB],
      ] as const) {
        for (const mort of morts) {
          if (!mort.alive) continue;
          killCharacter(deathCtx(ctx, mort), mort, `${TIER_LABELS[result.tier]}`, null);
          camp.losses += 1;
          world.tally.fallen += 1;
        }
      }

      // Le sang creuse la haine : une bataille ne règle rien, elle enracine.
      f.standing[cible.id] = clamp((f.standing[cible.id] ?? 0) - 15, -100, 100);
      cible.standing[f.id] = clamp((cible.standing[f.id] ?? 0) - 25, -100, 100);

      const vainqueur = result.winner === 'a' ? f : result.winner === 'b' ? cible : null;
      const vaincu = result.winner === 'a' ? cible : result.winner === 'b' ? f : null;
      if (vainqueur && vaincu) {
        const butin = Math.round(vaincu.treasury * 0.4);
        vaincu.treasury -= butin;
        vainqueur.treasury += butin;
        vainqueur.grip[vaincu.seat] = clamp((vainqueur.grip[vaincu.seat] ?? 0) + 8, 0, 100);
        vaincu.grip[vaincu.seat] = clamp((vaincu.grip[vaincu.seat] ?? 0) - 12, 0, 100);
        // Une déroute nette met fin à la guerre : on n'attaque plus, on encaisse.
        const saignee = vaincu.id === f.id ? result.lossA : result.lossB;
        if (saignee > 0.3 && vaincu.goalTarget === vainqueur.id) {
          vaincu.goal = 'tenir';
          vaincu.goalTarget = null;
        }
      }

      f.power = recomputePower(world, f);
      cible.power = recomputePower(world, cible);

      const texte = describeClash(result, a, b);
      const vu = known(ctx, f) || known(ctx, cible);
      const morts = result.fallenA + result.fallenB;
      // Un accrochage sans un seul mort n'entre pas dans l'Histoire. Il compte
      // dans les chiffres, il ne s'écrit pas.
      if (morts === 0 && result.tier < 2) {
        f.power = recomputePower(world, f);
        cible.power = recomputePower(world, cible);
        continue;
      }
      const importance: 1 | 2 | 3 | 4 | 5 =
        result.tier >= 3 ? 4 : vu ? 3 : 2;
      world.record({
        year: world.year,
        kind: 'guerre',
        importance,
        actors: [
          { id: f.leaderId, name: f.name },
          { id: cible.leaderId, name: cible.name },
        ],
        data: {
          quoi: texte,
          morts: result.fallenA + result.fallenB,
          palier: TIER_LABELS[result.tier],
        },
      });
      world.report({
        year: world.year,
        text: texte,
        reach: result.tier >= 2 ? 'monde' : 'local',
        place: f.seat,
        actors: [f.leaderId, cible.leaderId],
      });
      if (vu || result.tier >= 2) world.say(texte);
    }
  },
};
