import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadRuleset } from '@ed/content';
import { Game, body as bodyView, domains, factions, relations, self, status, worldView } from '@ed/game';
import type { RelationView } from '@ed/game';
import {
  RECORD_LABELS,
  SUCCESSION_LABELS,
  countTree,
  formatSous,
  fullName,
  renderChronicle,
  renderEpitaph,
  renderTree,
  shortName,
  type EntityId,
} from '@ed/engine';

import { block, c, clear, gauge, heading, keyval, menu, pad, rule, say, wrap } from './ui.js';
import { EndOfInput, Input } from './input.js';

const SAVE_DIR = resolve(process.cwd(), 'saves');
const input = new Input();

/** Message affiché une fois sous le prochain écran (saisie invalide, refus). */
let notice: string | null = null;

function showNotice(): void {
  if (!notice) return;
  say(c(`  ${notice}`, 'red'));
  say();
  notice = null;
}

async function ask(prompt = '> '): Promise<string> {
  return input.question(c(prompt, 'yellow'));
}

const ruleset = loadRuleset();
let game: Game;

// ─── écrans ─────────────────────────────────────────────────────────────────

function renderStatus(): void {
  const s = status(game);
  say(heading(s.name));
  const line1 = `${s.age} ans · ${s.stage} · ${s.settlement}`;
  const line2 = [s.house, s.socialClass, s.job].filter(Boolean).join(' · ');
  say(`  ${c(line1, 'bold')}`);
  say(`  ${c(line2, 'grey')}`);
  if (s.titles.length > 0) say(`  ${c(s.titles.join(' · '), 'magenta')}`);
  say();
  say(
    `  ${keyval('Santé', `${gauge(s.healthValue)}  ${s.health}`, 10)}` +
      `    ${keyval('Bourse', s.wealth, 8)}`,
  );
  say(`  ${keyval('Humeur', `${gauge(s.moodValue)}  ${s.mood}`, 10)}`);
  say();
  say(`  ${s.stats.map((st) => `${c(st.short, 'grey')} ${pad(String(st.value), 3)}`).join(' ')}`);
}

function renderCircle(limit = 4): void {
  const rels = relations(game).slice(0, limit);
  if (rels.length === 0) return;
  say();
  say(c('  Proches', 'grey'));
  for (const r of rels) {
    const name = `${r.name}, ${r.age} ans`;
    say(`   ${pad(name, 26)} ${c(pad(r.label, 18), 'grey')} ${feelingColour(r)}`);
  }
}

function feelingColour(r: RelationView): string {
  if (r.affection >= 40) return c(r.feeling, 'green');
  if (r.affection <= -35) return c(r.feeling, 'red');
  return c(r.feeling, 'grey');
}

function renderLog(): void {
  if (game.yearLog.length === 0) return;
  say();
  for (const line of game.yearLog) block(`· ${line}`, ['grey']);
}

function mainScreen(): void {
  clear();
  renderStatus();
  renderCircle();
  renderLog();
  say();
  say(rule());
  showNotice();
  menu([
    { key: '1', label: 'Passer l\'année' },
    {
      key: '2',
      label: 'Votre année',
      note: `${game.timeLeft} temps sur ${game.budget.total}`,
      locked: game.timeLeft < 1,
    },
    { key: '3', label: 'Gens', note: 'relations, famille' },
    { key: '4', label: 'Vous', note: 'traits, compétences, souvenirs' },
    { key: '5', label: 'Dynastie', note: 'arbre, maison, succession' },
    { key: '6', label: 'Le monde', note: 'lieu, statistiques, chronique' },
    { key: '0', label: 'Menu (sauvegarder, quitter)' },
  ]);
  say();
}

function eventScreen(): void {
  const ev = game.pending[0];
  if (!ev) return;
  clear();
  const s = status(game);
  say(heading(`An ${s.year} · ${s.age} ans`));
  say();
  for (const line of wrap(ev.text)) say(`  ${line}`);
  say();
  say(rule());
  showNotice();
  for (const [i, opt] of ev.options.entries()) {
    const key = String(i + 1);
    const hint = opt.hint ? c(`  ${opt.hint}`, 'magenta', 'italic') : '';
    if (opt.locked) {
      say(
        `${c(` ${key} `, 'grey')} ${c(opt.label, 'grey')}` +
          c(`  — ${opt.lockedReason ?? 'impossible'}`, 'grey', 'italic'),
      );
    } else {
      say(`${c(` ${key} `, 'bold', 'yellow')} ${opt.label}${hint}`);
    }
  }
  say();
}

function outcomeScreen(): void {
  const o = game.outcome;
  if (!o) return;
  clear();
  say(heading(o.title));
  say();
  for (const line of wrap(o.text)) say(`  ${line}`);
  if (o.log.length > 0) {
    say();
    for (const line of o.log) block(`  · ${line}`, ['grey']);
  }
  say();
  say(rule());
  say(c('  [entrée] continuer', 'grey'));
}

function birthScreen(): void {
  clear();
  const s = status(game);
  say(heading('naissance'));
  say();
  say(`  ${c(s.name, 'bold')} — an ${s.year}, ${s.settlement}`);
  say();
  for (const line of wrap(game.opening)) say(`  ${line}`);
  say();
  const sv = self(game);
  if (sv.traits.length > 0) {
    say(c('  Ce que vous êtes déjà', 'grey'));
    for (const t of sv.traits) say(`   ${c('•', 'grey')} ${c(t.label, 'cyan')} — ${t.desc}`);
    say();
  }
  say(`  ${s.stats.map((st) => `${c(st.short, 'grey')} ${pad(String(st.value), 3)}`).join(' ')}`);
  say(`  ${keyval('Bourse', s.wealth, 10)}`);
  say();
  say(rule());
  say(c('  [entrée] commencer', 'grey'));
}

function deathScreen(): void {
  clear();
  const p = game.player;
  const age = (p.deathYear ?? game.world.year) - p.birthYear;
  say(heading('mort'));
  say();
  say(`  ${c(fullName(p), 'bold')}`);
  say(`  ${p.birthYear} – ${p.deathYear ?? game.world.year}  ·  ${age} ans`);
  say(`  ${c(p.causeOfDeath ?? 'de sa belle mort', 'grey', 'italic')}`);
  say();
  say(c('  Ce qui restera', 'grey'));
  for (const line of renderEpitaph(game.world.chronicle, 10)) {
    for (const w of wrap(line, 70)) say(`   ${w}`);
  }
  say();
  say(rule());

  // Le monde continue sans vous. La question n'est pas « rejouer ? » mais
  // « le fil de qui suit-on maintenant ? » (doc 09 §5).
  const heirs = game.heirs();
  const strangers = game.strangers(3);
  deathChoices = [];

  if (heirs.length > 0) {
    say(c('  Votre sang', 'grey'));
    for (const h of heirs) {
      const note = h.note ? c(`  (${h.note})`, 'grey', 'italic') : '';
      deathChoices.push({ kind: 'heir', id: h.id });
      say(
        `${c(` ${pad(String(deathChoices.length), 2)} `, 'bold', 'yellow')} ` +
          `${pad(h.name, 24)} ${h.age} ans — ${h.relation}${note}`,
      );
    }
    say();
  } else {
    say(c('  Personne de votre sang ne reprend le nom.', 'red'));
    say();
  }

  if (strangers.length > 0) {
    say(c('  Suivre quelqu\'un d\'autre', 'grey'));
    for (const st of strangers) {
      deathChoices.push({ kind: 'stranger', id: st.id });
      say(
        `${c(` ${pad(String(deathChoices.length), 2)} `, 'bold', 'cyan')} ` +
          `${pad(st.name, 24)} ${pad(`${st.age} ans`, 8)} ${c(`${st.hook} · ${st.place}`, 'grey')}`,
      );
    }
    say();
  }

  deathChoices.push({ kind: 'newborn' });
  say(
    `${c(` ${pad(String(deathChoices.length), 2)} `, 'bold', 'magenta')} ` +
      `${pad('Un nouveau-né, ailleurs', 24)} ${c('le monde garde ses années', 'grey')}`,
  );
  say();
  menu([
    { key: 'c', label: 'Voir la chronique complète' },
    { key: 'r', label: 'Recommencer un monde neuf' },
    { key: '0', label: 'Quitter' },
  ]);
  say();
  showNotice();
}

type DeathChoice =
  | { kind: 'heir'; id: EntityId }
  | { kind: 'stranger'; id: EntityId }
  | { kind: 'newborn' };

let deathChoices: DeathChoice[] = [];

// ─── sous-menus ─────────────────────────────────────────────────────────────

/**
 * L'année du joueur (doc 16). Trois choses différentes se disputent le même
 * temps : ce qui passe et ne repassera pas, ce qu'on mène depuis des années,
 * et ce qu'on peut faire vite.
 */
async function actionsMenu(): Promise<void> {
  for (;;) {
    const y = game.year();
    clear();
    say(heading('votre année'));
    say();
    const jauge = c('◆'.repeat(y.left), 'yellow') + c('◇'.repeat(Math.max(0, y.budget.total - y.left)), 'grey');
    say(`  ${jauge}  ${c(`${y.left} temps sur ${y.budget.total}`, 'grey')}`);
    if (y.budget.charges.length > 0) {
      say(c(`  ${y.budget.charges.map((ch) => `${ch.label} (−${ch.cost})`).join(' · ')}`, 'grey', 'italic'));
    }
    say();

    const entrees: { key: string; run: () => void | Promise<void> }[] = [];
    let n = 1;

    if (y.occasions.length > 0) {
      say(c('  CE QUI PASSE', 'bold'));
      for (const o of y.occasions) {
        const key = String(n++);
        const cout = c(`${o.cost} temps`, o.cost > y.left ? 'red' : 'grey');
        const fin = o.closing ? c(' · dernière année', 'magenta', 'italic') : '';
        say(`${c(` ${pad(key, 2)} `, 'bold', 'yellow')} ${pad(o.label, 44)} ${cout}${fin}`);
        for (const line of wrap(o.detail, 66)) say(c(`      ${line}`, 'grey'));
        if (o.cost <= y.left) {
          entrees.push({ key, run: () => game.submit({ t: 'seize', occasionId: o.id }) });
        }
      }
      say();
    }

    if (y.pursuits.length > 0) {
      say(c('  CE QUE VOUS MENEZ', 'bold'));
      for (const p of y.pursuits) {
        const key = String(n++);
        const barre = bar(p.progress, 12);
        const cible = p.target ? c(` · ${p.target}`, 'grey') : '';
        say(`${c(` ${pad(key, 2)} `, 'bold', 'cyan')} ${pad(p.label, 30)} ${barre}${cible}`);
        say(c(`      ${p.where}${p.idle > 0 ? ` · délaissée depuis ${p.idle} an(s)` : ''}`, 'grey'));
        if (y.left > 0) {
          entrees.push({
            key,
            run: async () => {
              const mise = await askTemps(y.left);
              if (mise > 0) game.submit({ t: 'invest', pursuitId: p.id, temps: mise });
            },
          });
        }
      }
      say();
    }

    if (y.openable.length > 0 && y.left > 0) {
      say(c('  COMMENCER QUELQUE CHOSE', 'bold'));
      for (const d of y.openable) {
        const key = String(n++);
        say(
          `${c(` ${pad(key, 2)} `, 'bold', 'green')} ${pad(d.label, 30)} ` +
            c(`${d.kind} · environ ${d.cost} temps`, 'grey'),
        );
        entrees.push({ key, run: () => game.submit({ t: 'start', pursuitId: d.id }) });
      }
      say();
    }

    if (y.coups.length > 0 && y.left > 0) {
      say(c('  COUPS', 'bold') + c('  — un temps, sans lendemain', 'grey', 'italic'));
      for (const a of y.coups) {
        const key = String(n++);
        say(`${c(` ${pad(key, 2)} `, 'yellow')} ${pad(a.label, 30)} ${c(a.desc, 'grey')}`);
        entrees.push({ key, run: () => game.submit({ t: 'action', actionId: a.id }) });
      }
      say();
    }

    say(rule());
    if (y.left > 0) say(c('  [r] souffler — laisser filer ce qui reste', 'grey'));
    say(c('  [0] retour', 'grey'));
    say();

    const answer = (await ask()).trim().toLowerCase();
    if (answer === '0' || answer === '') return;
    if (answer === 'r' && y.left > 0) {
      game.submit({ t: 'rest' });
      return;
    }
    const entree = entrees.find((e) => e.key === answer);
    if (!entree) {
      notice = 'Ce n\'est pas une des lignes.';
      continue;
    }
    await entree.run();
    if (game.phase !== 'annee') return;
  }
}

/** Combien de temps on y met. Une entreprise se nourrit par tranches. */
async function askTemps(max: number): Promise<number> {
  if (max <= 1) return 1;
  say();
  say(c(`  Combien de temps y mettre ? (1 à ${max}, [0] annuler)`, 'grey'));
  say();
  const answer = Number((await ask()).trim());
  if (!Number.isFinite(answer) || answer < 1) return 0;
  return Math.min(max, Math.floor(answer));
}

async function peopleMenu(): Promise<void> {
  for (;;) {
    const rels = relations(game);
    clear();
    say(heading('gens'));
    say();
    if (rels.length === 0) {
      say(c('  Vous ne connaissez personne.', 'grey'));
    }
    rels.forEach((r, i) => {
      const tag = r.isSpouse ? c(' ♦', 'magenta') : r.isChild ? c(' ·', 'cyan') : '  ';
      say(
        `${c(` ${pad(String(i + 1), 2)} `, 'yellow')}${tag} ${pad(`${r.name}, ${r.age} ans`, 26)} ` +
          `${c(pad(r.label, 20), 'grey')} ${feelingColour(r)}`,
      );
    });
    say();
    say(c('  [0] retour', 'grey'));
    say();
    const answer = await ask();
    if (answer === '0' || answer === '') return;
    const target = rels[Number(answer) - 1];
    if (!target) continue;
    const done = await personMenu(target);
    if (done) return;
  }
}

async function personMenu(target: RelationView): Promise<boolean> {
  const world = game.world;
  const other = world.get(target.id as EntityId);
  if (!other) return false;
  clear();
  say(heading(shortName(other)));
  say();
  say(`  ${keyval('Lien', target.label)}`);
  say(`  ${keyval('Âge', `${target.age} ans`)}`);
  say(`  ${keyval('Envers vous', feelingColour(target))}`);
  const mems = world.memories.about(game.player.id, other.id, world.year).slice(0, 4);
  if (mems.length > 0) {
    say();
    say(c('  Ce que vous gardez', 'grey'));
    for (const m of mems) for (const w of wrap(`${m.year} — ${m.text}`, 70)) say(`   ${c(w, 'grey')}`);
  }
  say();
  say(rule());

  const canTrain = target.isChild && target.age >= 4 && target.age <= 17;
  menu([
    { key: '1', label: 'Passer du temps ensemble' },
    { key: '2', label: 'Offrir quelque chose' },
    { key: '3', label: 'Vous expliquer' },
    { key: '4', label: 'Courtiser', locked: !!game.player.spouseId || !!other.spouseId },
    { key: '5', label: 'Demander de l\'aide' },
    ...(canTrain
      ? [
          { key: '6', label: 'Former : le corps', note: 'force, endurance' },
          { key: '7', label: 'Former : l\'esprit', note: 'intelligence, volonté' },
          { key: '8', label: 'Former : les gens', note: 'charisme, rhétorique' },
          { key: '9', label: 'Former : l\'ombre', note: 'agilité, intrigue' },
        ]
      : []),
    {
      key: 'h',
      label: 'Le désigner héritier',
      locked: !game.canDesignate() || !target.isChild,
      note: game.canDesignate() ? undefined : 'il faut une maison',
    },
    { key: '0', label: 'Retour' },
  ]);
  if (canTrain) {
    say();
    say(c('  Cinq années dans la même école laissent une marque définitive.', 'grey', 'italic'));
  }
  say();
  const answer = await ask();
  const kinds = {
    '1': 'parler',
    '2': 'offrir',
    '3': 'disputer',
    '4': 'courtiser',
    '5': 'demander',
    '6': 'former_corps',
    '7': 'former_esprit',
    '8': 'former_social',
    '9': 'former_ombre',
    h: 'designer',
  } as const;
  const kind = kinds[answer as keyof typeof kinds];
  if (!kind) return false;
  game.submit({ t: 'interact', targetId: target.id as EntityId, kind });
  return true;
}

async function selfMenu(): Promise<void> {
  const sv = self(game);
  const s = status(game);
  clear();
  say(heading('vous'));
  say();
  say(`  ${s.stats.map((st) => `${c(st.short, 'grey')} ${pad(String(st.value), 3)}`).join(' ')}`);
  say();
  if (sv.traits.length > 0) {
    say(c('  Traits', 'grey'));
    for (const t of sv.traits) say(`   ${c('•', 'grey')} ${c(pad(t.label, 20), 'cyan')} ${c(t.desc, 'grey')}`);
    say();
  }
  if (sv.skills.length > 0) {
    say(c('  Compétences', 'grey'));
    for (const sk of sv.skills.slice(0, 12)) {
      say(`   ${pad(sk.label, 16)} ${gauge(sk.value, 100, 10)} ${c(sk.band, 'grey')}`);
    }
    say();
  }
  if (sv.injuries.length > 0) {
    say(c('  Le corps', 'grey'));
    for (const i of sv.injuries) say(`   ${c('✕', 'red')} ${i}`);
    say();
  }
  if (sv.children.length > 0) {
    say(c('  Descendance', 'grey'));
    for (const k of sv.children) {
      say(`   ${pad(k.name, 20)} ${k.alive ? `${k.age} ans` : c('mort', 'red')}`);
    }
    say();
  }
  if (sv.memories.length > 0) {
    say(c('  Souvenirs', 'grey'));
    for (const m of sv.memories) {
      for (const w of wrap(`${m.year} — ${m.text}`, 70)) say(`   ${c(w, 'grey')}`);
    }
    say();
  }
  if (sv.paths.length > 0) {
    say(c('  Voies ouvertes', 'grey'));
    say(`   ${sv.paths.join(' · ')}`);
    say();
  }
  say(rule());
  menu([
    { key: '1', label: 'Le corps', note: 'organes, constantes, maux' },
    { key: '2', label: 'Chez vous', note: 'ce qu\'on possède, ceux qui servent' },
    { key: '0', label: 'Retour' },
  ]);
  say();
  const rep = await ask();
  if (rep === '1') await bodyScreen();
  else if (rep === '2') await chezVousScreen();
}

async function placeScreen(): Promise<void> {
  const w = worldView(game);
  clear();
  say(heading('le lieu'));
  say();
  say(`  ${c(w.settlement.name, 'bold')} — ${w.settlement.size}, ${w.settlement.danger}`);
  say();
  for (const line of wrap(w.settlement.description)) say(`  ${c(line, 'grey')}`);
  say();
  say(`  ${keyval('Année', String(w.year))}`);
  say(`  ${keyval('Monde', w.mode)}`);
  say(`  ${keyval('Connaissances', String(w.knownPeople))}`);
  say(`  ${keyval('En suspens', c(`${w.activeSeeds} chose(s) qui n'ont pas fini`, 'magenta'))}`);
  say();
  if (w.news.length > 0) {
    say(rule());
    say(`  ${c('Ce qu\'on raconte', 'bold')}`);
    say();
    for (const item of w.news.slice(0, 12)) {
      const an = c(String(item.year), 'grey');
      say(`  ${an}  ${item.ici ? item.text : c(item.text, 'grey')}`);
    }
    say();
  }
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function factionsScreen(): Promise<void> {
  const list = factions(game);
  clear();
  say(heading('les groupes'));
  say();
  if (list.length === 0) {
    say(c('  Personne n\'a encore assez d\'hommes derrière lui pour qu\'on lui', 'grey'));
    say(c('  donne un nom.', 'grey'));
  }
  for (const f of list.slice(0, 16)) {
    const marque = f.mien ? c(' ◆', 'yellow') : f.ici ? c(' ·', 'cyan') : '  ';
    const titre = f.mien || f.ici ? c(f.name, 'bold') : f.name;
    say(`${marque} ${titre}`);
    const bits = [
      `${f.members} h`,
      `force ${f.power}`,
      f.kind,
      f.ici ? 'ici' : f.seat,
      f.goal,
    ];
    if (f.losses > 0) bits.push(`${f.losses} tombé(s)`);
    if (f.grip > 0) bits.push(`emprise ${f.grip} %`);
    say(c(`     ${bits.join(' · ')}`, 'grey'));
  }
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function paysScreen(): Promise<void> {
  const list = domains(game);
  clear();
  say(heading('le pays'));
  say();
  for (const d of [...list.filter((x) => x.ici), ...list.filter((x) => !x.ici)]) {
    const titre = d.ici ? c(d.name, 'bold') : d.name;
    say(`  ${titre} ${c(d.ici ? '· chez vous' : `· ${d.scale}`, 'grey')}`);
    for (const line of wrap(d.loi)) say(c(`     ${line}`, 'grey'));
    if (d.population > 0) {
      const bits = [
        `${d.population} âmes`,
        `légitimité ${d.legitimacy} %`,
        `mécontentement ${d.unrest} %`,
      ];
      if (d.ruler !== 'personne') bits.splice(1, 0, d.ruler);
      if (d.faim > 0) bits.push(c(`il manque ${d.faim} %`, 'red'));
      say(`     ${bits.join(' · ')}`);
      const prix = d.prices
        .slice(0, 4)
        .map((p) => {
          const txt = `${p.good} ${p.price.toFixed(1)}`;
          return p.ratio > 1.6 ? c(txt, 'red') : p.ratio < 0.7 ? c(txt, 'green') : txt;
        })
        .join(' · ');
      if (prix) say(c('     ', 'grey') + prix);
    }
    say();
  }
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

/**
 * Chez soi (doc 17) : ce qu'on possède, ceux qui le tiennent, ce que ça coûte
 * chaque année — et, si l'on gouverne, ce qu'on peut changer.
 */
async function chezVousScreen(): Promise<void> {
  for (;;) {
    const h = game.household();
    const gouv = game.ruledDomain();
    const budget = game.budget;
    clear();
    say(heading('chez vous'));
    say();
    say(`  ${keyval('Entretien et gages', c(`${h.yearly} sous par an`, h.yearly > 0 ? 'red' : 'grey'))}`);
    say(`  ${keyval('Bourse', `${game.player.wealth} sous`)}`);
    if (budget.credits.length > 0) {
      const rendu = budget.credits.reduce((n, x) => n + x.cost, 0);
      say(`  ${keyval('Temps rendu', c(`+${rendu} (${budget.credits.map((x) => x.label.toLowerCase()).join(', ')})`, 'green'))}`);
    }
    say();

    const entrees: { key: string; run: () => void }[] = [];
    let n = 1;

    if (h.holdings.length > 0) {
      say(c('  CE QUE VOUS POSSEDEZ', 'bold'));
      for (const x of h.holdings) {
        const key = String(n++);
        say(`${c(` ${pad(key, 2)} `, 'yellow')} ${pad(x.label, 30)} ${c(x.condition, 'grey')} ${c(`${x.upkeep}/an`, 'grey')}`);
        entrees.push({ key, run: () => game.submit({ t: 'sell', holdingId: x.id }) });
      }
      say(c('       (choisir pour vendre)', 'grey', 'italic'));
      say();
    }

    if (h.staff.length > 0) {
      say(c('  CEUX QUI VOUS SERVENT', 'bold'));
      for (const s2 of h.staff) {
        const key = String(n++);
        const gages = s2.unpaid > 0 ? c(`${s2.wage}/an · impayé depuis ${s2.unpaid} an(s)`, 'red') : c(`${s2.wage}/an`, 'grey');
        say(`${c(` ${pad(key, 2)} `, 'yellow')} ${pad(s2.name, 26)} ${pad(c(s2.label, 'cyan'), 30)} ${gages}`);
        entrees.push({ key, run: () => game.submit({ t: 'dismiss', personId: s2.personId }) });
      }
      say(c('       (choisir pour renvoyer)', 'grey', 'italic'));
      say();
    }

    if (h.buyable.length > 0) {
      say(c('  ACHETER', 'bold'));
      for (const d of h.buyable) {
        const key = String(n++);
        const abordable = game.player.wealth >= d.price && game.timeLeft >= 1;
        const ligne = `${pad(d.label, 30)} ${d.price} sous, puis ${d.upkeep}/an`;
        say(`${c(` ${pad(key, 2)} `, abordable ? 'green' : 'grey')} ${abordable ? ligne : c(ligne, 'grey')}`);
        if (abordable) entrees.push({ key, run: () => game.submit({ t: 'acquire', holdingId: d.id }) });
      }
      say();
    }

    if (h.hirable.length > 0) {
      say(c('  PRENDRE A SON SERVICE', 'bold') + c(`  — ${h.slots} place(s) libre(s)`, 'grey'));
      for (const d of h.hirable) {
        const key = String(n++);
        const abordable = game.player.wealth >= d.wage && game.timeLeft >= 1;
        const rendu = d.temps > 0 ? c(` · rend ${d.temps} temps`, 'green') : '';
        const ligne = `${pad(d.label, 30)} ${d.wage} sous/an`;
        say(`${c(` ${pad(key, 2)} `, abordable ? 'green' : 'grey')} ${abordable ? ligne : c(ligne, 'grey')}${rendu}`);
        if (abordable) entrees.push({ key, run: () => game.submit({ t: 'hire', retainerId: d.id }) });
      }
      say();
    }

    if (gouv) {
      say(c(`  VOUS GOUVERNEZ ${gouv.name.toUpperCase()}`, 'bold'));
      say(c('       Changer une règle coûte de la légitimité, et froisse des gens.', 'grey', 'italic'));
      for (const o of game.reformOptions()) {
        for (const v of o.choices) {
          const key = String(n++);
          say(`${c(` ${pad(key, 2)} `, 'magenta')} ${pad(o.label, 26)} ${c(String(o.current), 'grey')} → ${String(v)}`);
          entrees.push({ key, run: () => game.submit({ t: 'reform', axis: o.axis, value: v }) });
        }
      }
      say();
    }

    if (h.holdings.length === 0 && h.buyable.length === 0) {
      say(c('  Vous ne possédez rien, et rien n\'est à votre portée.', 'grey'));
      say();
    }

    say(rule());
    say(c('  [0] retour', 'grey'));
    say();
    const answer = (await ask()).trim();
    if (answer === '0' || answer === '') return;
    const entree = entrees.find((e) => e.key === answer);
    if (!entree) {
      notice = 'Ce n\'est pas une des lignes.';
      continue;
    }
    entree.run();
    if (game.phase !== 'annee') return;
  }
}

function bar(share: number, width = 16): string {
  const filled = Math.max(0, Math.min(width, Math.round(share * width)));
  return c('▓'.repeat(filled), 'cyan') + c('░'.repeat(width - filled), 'grey');
}

const pc = (x: number): string => `${(x * 100).toFixed(1)} %`;

async function statsScreen(): Promise<void> {
  const st = game.stats(5);
  clear();
  say(heading(`le rivage en l'an ${st.year}`));
  say();
  say(c('  POPULATION', 'grey'));
  say(`   ${keyval('Vivants', String(st.population), 20)}`);
  say(`   ${keyval('Ont vécu en tout', String(st.everLived), 20)}`);
  say(`   ${keyval('Âge médian', `${st.medianAge} ans`, 20)}`);
  say(`   ${keyval('Vie médiane', `${st.medianLifespan} ans`, 20)}`);
  say(`   ${keyval('Morts avant 13 ans', pc(st.childMortality), 20)}`);
  say();
  say(c('  DEPUIS LE DÉBUT', 'grey'));
  say(`   ${keyval('Naissances', String(st.births), 24)}`);
  say(`   ${keyval('Morts', String(st.deaths), 24)}`);
  say(`   ${keyval('Mariages', String(st.marriages), 24)}`);
  say(`   ${keyval('Morts de main d\'homme', c(String(st.murders), 'red'), 24)}`);
  say();
  if (st.causes.length > 0) {
    say(c('  CE QUI TUE', 'grey'));
    for (const cause of st.causes) {
      say(`   ${pad(cause.cause, 34)} ${bar(cause.share, 12)} ${pad(String(cause.count), 5)}`);
    }
    say();
  }
  say(c('  RICHESSE', 'grey'));
  say(`   ${keyval('Total en circulation', `${formatSous(st.totalWealth)} sous`, 24)}`);
  say(`   ${keyval('Détenu par le centile', pc(st.topOneShare), 24)}`);
  for (const r of st.richest) {
    say(`   ${pad(r.name, 26)} ${pad(`${formatSous(r.value)} sous`, 16)} ${c(r.detail, 'grey')}`);
  }
  say();
  say(c('  CONDITIONS', 'grey'));
  for (const row of st.classes) {
    say(`   ${pad(row.cls, 14)} ${bar(row.share, 14)} ${pad(String(row.count), 5)} ${c(pc(row.share), 'grey')}`);
  }
  say();
  say(rule());
  menu([
    { key: '1', label: 'Classements' },
    { key: '2', label: 'Lieux et métiers' },
    { key: '3', label: 'Maisons du monde' },
    { key: '0', label: 'Retour' },
  ]);
  say();
  const answer = await ask();
  if (answer === '1') await rankingsScreen();
  else if (answer === '2') await placesScreen();
  else if (answer === '3') await housesScreen();
}

async function rankingsScreen(): Promise<void> {
  const st = game.stats(8);
  clear();
  say(heading('classements'));
  const table = (title: string, rows: typeof st.richest, unit: string): void => {
    if (rows.length === 0) return;
    say();
    say(c(`  ${title}`, 'grey'));
    rows.forEach((r, i) => {
      say(
        `   ${c(pad(`${i + 1}.`, 4), 'yellow')} ${pad(r.name, 26)} ` +
          `${pad(`${formatSous(r.value)} ${unit}`, 18)} ${c(r.detail, 'grey')}`,
      );
    });
  };
  table('Les plus riches', st.richest, 'sous');
  table('Les plus vieux', st.oldest, 'ans');
  table('La plus nombreuse descendance', st.mostChildren, 'enfants');
  table('Le plus de sang versé', st.bloodiest, 'morts');
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function placesScreen(): Promise<void> {
  const st = game.stats();
  clear();
  say(heading('lieux et métiers'));
  say();
  say(c('  IMPLANTATIONS', 'grey'));
  for (const s2 of st.settlements) {
    say(
      `   ${pad(s2.name, 22)} ${pad(`${s2.population} âmes`, 12)} ` +
        `${pad(`âge médian ${s2.medianAge}`, 18)} ${c(`${formatSous(s2.wealth)} sous`, 'grey')}`,
    );
  }
  say();
  if (st.jobs.length > 0) {
    say(c('  MÉTIERS EXERCÉS', 'grey'));
    const max = st.jobs[0]?.count ?? 1;
    for (const j of st.jobs) say(`   ${pad(j.label, 22)} ${bar(j.count / max, 14)} ${j.count}`);
    say();
  }
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function housesScreen(): Promise<void> {
  const st = game.stats();
  clear();
  say(heading('maisons du monde'));
  say();
  if (st.houses.length === 0) {
    say(c('  Aucune maison n\'a encore été fondée.', 'grey'));
  }
  for (const h of st.houses) {
    say(
      `   ${pad(`Maison ${h.name}`, 24)} ${pad(h.rank, 16)} ` +
        `${pad(`prestige ${h.prestige}`, 16)} ${c(`${h.living} vivants · fondée en ${h.founded}`, 'grey')}`,
    );
    say(`   ${c(`chef : ${h.head} · succession ${h.law}`, 'grey')}`);
  }
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function recordsScreen(): Promise<void> {
  const book = game.records();
  clear();
  say(heading('le livre des records'));
  say(c('  Ce que le Rivage a connu de plus extrême, depuis toujours.', 'grey', 'italic'));
  say();
  const ids = Object.keys(RECORD_LABELS) as (keyof typeof RECORD_LABELS)[];
  let any = false;
  for (const id of ids) {
    const entry = book[id];
    if (!entry) continue;
    any = true;
    const alive = entry.holderId === null ? '' : entry.alive ? c(' ·  vivant', 'green') : c(' ·  mort', 'grey');
    say(`   ${c(pad(RECORD_LABELS[id], 32), 'cyan')} ${formatSous(entry.value)}`);
    say(`   ${c(`${entry.holder} — an ${entry.year}${entry.detail ? `, ${entry.detail}` : ''}`, 'grey')}${alive}`);
    say();
  }
  if (!any) say(c('  Rien de notable n\'a encore eu lieu.', 'grey'));
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function bodyScreen(): Promise<void> {
  const b = bodyView(game);
  clear();
  say(heading('le corps'));
  say();
  say(`  ${keyval('État général', `${gauge(b.health)}  ${b.healthLabel}`, 16)}`);
  say();

  const felt = b.vitals.filter((v) => v.feeling);
  if (b.pain || felt.length > 0 || b.infection > 20) {
    say(c('  CE QUE VOUS RESSENTEZ', 'grey'));
    if (b.pain) for (const w of wrap(b.pain, 70)) say(`   ${c(w, 'red')}`);
    for (const v of felt) for (const w of wrap(v.feeling ?? '', 70)) say(`   ${c(w, 'yellow')}`);
    if (b.infection > 20) say(`   ${c('quelque chose vous ronge', 'red')}`);
    say();
  } else {
    say(c('  Rien de particulier. Le corps se tait.', 'grey', 'italic'));
    say();
  }

  if (b.conditions.length > 0) {
    say(c('  CE QUE VOUS PORTEZ', 'grey'));
    for (const cond of b.conditions) {
      const since = cond.years === 0 ? 'cette année' : `depuis ${cond.years} ans`;
      say(
        `   ${c(pad(cond.label, 28), cond.severity >= 60 ? 'red' : 'yellow')} ` +
          `${gauge(cond.severity, 100, 10)} ${c(since, 'grey')}`,
      );
      if (cond.sign) for (const w of wrap(cond.sign, 66)) say(`     ${c(w, 'grey', 'italic')}`);
    }
    say();
  }

  say(c('  CONSTANTES', 'grey'));
  for (const v of b.vitals) {
    const state = v.value < 36 ? 'basse' : v.value > 64 ? 'haute' : 'normale';
    say(`   ${pad(v.label, 18)} ${c(state, state === 'normale' ? 'grey' : 'red')}`);
  }
  say();

  say(c('  LE DÉTAIL', 'grey'));
  for (const o of b.organs) {
    say(`   ${pad(o.label, 18)} ${gauge(o.value, 100, 10)} ${c(o.state, 'grey')}`);
  }
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function worldMenu(): Promise<void> {
  for (;;) {
    clear();
    say(heading('le monde'));
    say();
    menu([
      { key: '1', label: 'Le lieu où vous êtes', note: 'et ce qu\'on y raconte' },
      { key: '2', label: 'Les groupes', note: 'bandes, compagnies, guildes' },
      { key: '3', label: 'Le pays', note: 'prix, vivres, qui gouverne' },
      { key: '4', label: 'Statistiques du monde' },
      { key: '5', label: 'Le livre des records' },
      { key: '6', label: 'Chronique' },
      { key: '0', label: 'Retour' },
    ]);
    say();
    const answer = await ask();
    if (answer === '1') await placeScreen();
    else if (answer === '2') await factionsScreen();
    else if (answer === '3') await paysScreen();
    else if (answer === '4') await statsScreen();
    else if (answer === '5') await recordsScreen();
    else if (answer === '6') await chronicleMenu();
    else return;
  }
}

async function treeScreen(): Promise<void> {
  clear();
  say(heading('arbre généalogique'));
  const node = game.tree({ ancestors: 2, maxDepth: 5, maxChildren: 10 });
  say();
  if (!node) {
    say(c('  Rien à afficher.', 'grey'));
  } else {
    const counts = countTree(node);
    say(
      c(
        `  ${counts.nodes} personne(s) affichée(s), ${counts.living} en vie` +
          (counts.hidden > 0 ? `, ${counts.hidden} branche(s) repliée(s)` : ''),
        'grey',
      ),
    );
    say(c('  ◆ vous   ⚭ époux   † mort', 'grey', 'italic'));
    say();
    for (const line of renderTree(node)) {
      const styled = line.includes('◆') ? c(line, 'bold', 'yellow') : line;
      say(`  ${styled}`);
    }
  }
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function lawMenu(): Promise<boolean> {
  const house = game.house();
  if (!house) return false;
  clear();
  say(heading('loi de succession'));
  say();
  say(`  Maison ${c(house.name, 'bold')} — actuellement : ${c(SUCCESSION_LABELS[house.law], 'cyan')}`);
  say();
  say(c('  Changer la loi coûte 25 de prestige et froisse les déshérités.', 'grey', 'italic'));
  say();
  const laws = Object.keys(SUCCESSION_LABELS) as (keyof typeof SUCCESSION_LABELS)[];
  laws.forEach((law, i) => {
    const current = law === house.law ? c('  (actuelle)', 'grey') : '';
    say(`${c(` ${i + 1} `, 'bold', 'yellow')} ${pad(law, 18)} ${c(SUCCESSION_LABELS[law], 'grey')}${current}`);
  });
  say();
  say(c('  [0] retour', 'grey'));
  say();
  const answer = await ask();
  const chosen = laws[Number(answer) - 1];
  if (!chosen || chosen === house.law) return false;
  game.submit({ t: 'setLaw', law: chosen });
  return true;
}

async function dynastyMenu(): Promise<void> {
  for (;;) {
    const d = game.dynasty();
    const heirs = game.heirs();
    clear();
    say(heading(d.houseName ? `maison ${d.houseName}` : 'votre lignée'));
    say();
    if (d.houseName) {
      say(`  ${keyval('Rang', `${d.rank}  ·  prestige ${d.prestige}`, 20)}`);
      say(`  ${keyval('Fondée en', String(d.founded), 20)}`);
      say(`  ${keyval('Succession', SUCCESSION_LABELS[(d.law ?? 'primogeniture') as keyof typeof SUCCESSION_LABELS], 20)}`);
      say(`  ${keyval('Fortune de maison', `${formatSous(d.wealth)} sous`, 20)}`);
    } else {
      say(c('  Vous n\'avez pas encore fondé de maison.', 'grey'));
      say(c('  Il faut de la fortune, des enfants, et le vouloir.', 'grey', 'italic'));
    }
    say();
    say(c('  DESCENDANCE', 'grey'));
    say(`   ${keyval('Générations', String(d.generations), 20)}`);
    say(`   ${keyval('Vivants', String(d.livingDescendants), 20)}`);
    say(`   ${keyval('En tout', String(d.totalDescendants), 20)}`);
    say(`   ${keyval('Disparus', String(d.deadDescendants), 20)}`);
    if (d.eldest) say(`   ${keyval('Doyen de la lignée', d.eldest, 20)}`);
    say();
    if (heirs.length > 0) {
      say(c('  ORDRE SUCCESSORAL', 'grey'));
      for (const h of heirs.slice(0, 6)) {
        const note = h.note ? c(`  (${h.note})`, 'grey') : '';
        say(`   ${c(pad(`${h.claim}.`, 4), 'yellow')} ${pad(h.name, 24)} ${pad(`${h.age} ans`, 9)} ${c(h.relation, 'grey')}${note}`);
      }
      say();
    } else {
      say(c('  Personne ne vous succéderait aujourd\'hui.', 'red'));
      say();
    }
    if (d.heads.length > 1) {
      say(c('  CHEFS SUCCESSIFS', 'grey'));
      for (const h of d.heads) say(`   ${pad(h.name, 26)} ${c(h.to ? `† ${h.to}` : 'en charge', 'grey')}`);
      say();
    }
    say(rule());
    menu([
      { key: '1', label: 'Arbre généalogique' },
      {
        key: '2',
        label: 'Changer la loi de succession',
        locked: !game.canSetLaw(),
        note: game.canSetLaw() ? undefined : 'il faut être chef de sa maison',
      },
      { key: '0', label: 'Retour' },
    ]);
    say();
    const answer = await ask();
    if (answer === '1') await treeScreen();
    else if (answer === '2') {
      if (await lawMenu()) return;
    } else return;
  }
}

async function chronicleMenu(): Promise<void> {
  clear();
  say(heading('chronique'));
  say();
  const entries = game.world.chronicle;
  if (entries.length === 0) {
    say(c('  Rien n\'a encore été consigné.', 'grey'));
  } else {
    const text = renderChronicle(entries, {
      title: fullName(game.player),
      minImportance: 2,
    });
    for (const line of text.split('\n').slice(2)) {
      if (line.startsWith('## ')) say(c(`  ${line.slice(3)}`, 'bold', 'cyan'));
      else if (line.trim() === '') say();
      else for (const w of wrap(line.replace(/\*\*/g, ''), 72)) say(`  ${w}`);
    }
  }
  say();
  say(rule());
  menu([
    { key: '1', label: 'Exporter en Markdown' },
    { key: '0', label: 'Retour' },
  ]);
  say();
  const answer = await ask();
  if (answer === '1') exportChronicle();
}

function exportChronicle(): void {
  mkdirSync(SAVE_DIR, { recursive: true });
  const file = resolve(SAVE_DIR, `chronique-${fullName(game.player).replace(/\W+/g, '-')}.md`);
  writeFileSync(
    file,
    renderChronicle(game.world.chronicle, { title: `Chronique de ${fullName(game.player)}` }),
    'utf8',
  );
  say(c(`  Chronique écrite dans ${file}`, 'green'));
}

async function systemMenu(): Promise<'quit' | void> {
  clear();
  say(heading('menu'));
  say();
  menu([
    { key: '1', label: 'Sauvegarder' },
    { key: '2', label: 'Charger' },
    { key: '3', label: 'Exporter la chronique' },
    { key: '4', label: 'Abandonner cette vie et recommencer' },
    { key: '9', label: 'Quitter' },
    { key: '0', label: 'Retour' },
  ]);
  say();
  const answer = await ask();
  if (answer === '1') {
    mkdirSync(SAVE_DIR, { recursive: true });
    const file = resolve(SAVE_DIR, `partie-${game.world.seed}.json`);
    writeFileSync(file, game.save(), 'utf8');
    say(c(`  Sauvegardé : ${file}`, 'green'));
    await ask('[entrée] ');
    return;
  }
  if (answer === '2') {
    await loadMenu();
    return;
  }
  if (answer === '3') {
    exportChronicle();
    await ask('[entrée] ');
    return;
  }
  if (answer === '4') {
    game = Game.create(ruleset, {});
    return;
  }
  if (answer === '9') return 'quit';
}

async function loadMenu(): Promise<void> {
  if (!existsSync(SAVE_DIR)) {
    say(c('  Aucune sauvegarde.', 'grey'));
    await ask('[entrée] ');
    return;
  }
  const files = readdirSync(SAVE_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    say(c('  Aucune sauvegarde.', 'grey'));
    await ask('[entrée] ');
    return;
  }
  files.forEach((f, i) => say(`${c(` ${i + 1} `, 'yellow')} ${f}`));
  say(c('  [0] retour', 'grey'));
  const answer = await ask();
  const chosen = files[Number(answer) - 1];
  if (!chosen) return;
  try {
    game = Game.load(ruleset, readFileSync(resolve(SAVE_DIR, chosen), 'utf8'));
    say(c('  Partie chargée.', 'green'));
  } catch (err) {
    say(c(`  Échec du chargement : ${(err as Error).message}`, 'red'));
  }
  await ask('[entrée] ');
}

// ─── titre ──────────────────────────────────────────────────────────────────

async function titleScreen(): Promise<'quit' | void> {
  clear();
  say();
  say(c('   ETERNAL DYNASTY', 'bold', 'cyan'));
  say(c('   Le Rivage — Phase 1', 'grey'));
  say();
  say(rule());
  say();
  block(
    'Vous naissez quelque part, sans l\'avoir choisi. Ce qui suit dépend un peu de vous ' +
      'et beaucoup du monde. Rien n\'est écrit d\'avance.',
    ['grey'],
  );
  say();
  menu([
    { key: '1', label: 'Nouvelle vie' },
    { key: '2', label: 'Nouvelle vie avec une graine précise', note: 'parties reproductibles' },
    { key: '3', label: 'Charger une partie' },
    { key: '0', label: 'Quitter' },
  ]);
  say();
  const answer = await ask();
  if (answer === '0') return 'quit';
  if (answer === '3') {
    await loadMenu();
    if (!game) return titleScreen();
    return;
  }
  if (answer === '2') {
    const raw = await ask('Graine (nombre) : ');
    const seed = Number.parseInt(raw, 10);
    game = Game.create(ruleset, Number.isFinite(seed) ? { seed } : {});
    return;
  }
  game = Game.create(ruleset, {});
}

// ─── boucle principale ──────────────────────────────────────────────────────

async function loop(): Promise<void> {
  for (;;) {
    switch (game.phase) {
      case 'naissance': {
        birthScreen();
        await ask('');
        game.submit({ t: 'advance' });
        break;
      }
      case 'annee': {
        mainScreen();
        const answer = await ask();
        if (answer === '1' || answer === '') game.submit({ t: 'advance' });
        else if (answer === '2') await actionsMenu();
        else if (answer === '3') await peopleMenu();
        else if (answer === '4') await selfMenu();
        else if (answer === '5') await dynastyMenu();
        else if (answer === '6') await worldMenu();
        else if (answer === '0') {
          if ((await systemMenu()) === 'quit') return;
        } else {
          notice = 'Choix inconnu. Tapez un chiffre du menu.';
        }
        break;
      }
      case 'evenement': {
        eventScreen();
        const answer = await ask();
        const ev = game.pending[0];
        if (!ev) break;
        const opt = ev.options[Number(answer) - 1];
        if (!opt) {
          notice = `Tapez un nombre entre 1 et ${ev.options.length}.`;
          break;
        }
        if (opt.locked) {
          // Sans ce retour, choisir une option verrouillée ne fait rien et le
          // joueur reste coincé sur le même écran sans comprendre pourquoi.
          notice = `Cette option vous est fermée : ${opt.lockedReason ?? 'vous n\'avez pas ce qu\'il faut'}.`;
          break;
        }
        game.submit({ t: 'choose', optionId: opt.id });
        break;
      }
      case 'resultat': {
        outcomeScreen();
        await ask('');
        game.submit({ t: 'advance' });
        break;
      }
      case 'mort': {
        deathScreen();
        const answer = await ask();
        if (answer === '0') return;
        if (answer === 'c') {
          await chronicleMenu();
          break;
        }
        if (answer === 'r') {
          game = Game.create(ruleset, {});
          break;
        }
        const choice = deathChoices[Number(answer) - 1];
        if (!choice) {
          notice = `Tapez un nombre entre 1 et ${deathChoices.length}, ou c / r / 0.`;
          break;
        }
        if (choice.kind === 'heir') game.submit({ t: 'continueAs', heirId: choice.id });
        else if (choice.kind === 'stranger') game.submit({ t: 'follow', id: choice.id });
        else game.submit({ t: 'newborn' });
        break;
      }
      case 'fin':
        return;
    }
  }
}

async function main(): Promise<void> {
  const result = await titleScreen();
  if (result === 'quit') {
    input.close();
    return;
  }
  await loop();
  say();
  say(c('  Au revoir.', 'grey'));
  input.close();
}

main().catch((err: unknown) => {
  if (err instanceof EndOfInput) {
    say();
    say(c('  (fin de l\'entrée)', 'grey'));
    input.close();
    return;
  }
  say(c(`\nErreur : ${(err as Error).message}`, 'red'));
  say(c(String((err as Error).stack ?? ''), 'grey'));
  input.close();
  process.exitCode = 1;
});
