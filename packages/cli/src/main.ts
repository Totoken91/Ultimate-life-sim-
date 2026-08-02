import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadRuleset } from '@ed/content';
import { Game, relations, self, status, worldView } from '@ed/game';
import type { RelationView } from '@ed/game';
import {
  fullName,
  renderChronicle,
  renderEpitaph,
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
      label: 'Agir',
      note: game.actionUsed ? 'déjà fait cette année' : 'une action par an',
      locked: game.actionUsed,
    },
    { key: '3', label: 'Gens', note: 'relations, famille' },
    { key: '4', label: 'Vous', note: 'traits, compétences, souvenirs' },
    { key: '5', label: 'Le monde' },
    { key: '6', label: 'Chronique' },
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

async function actionsMenu(): Promise<void> {
  const actions = game.availableActions();
  clear();
  say(heading('agir'));
  say(c('  Une seule action par an. Le reste de l\'année vous échappe.', 'grey', 'italic'));
  say();
  actions.forEach((a, i) => {
    say(`${c(` ${pad(String(i + 1), 2)} `, 'bold', 'yellow')} ${pad(a.label, 34)} ${c(a.desc, 'grey')}`);
  });
  say();
  say(c('  [0] retour', 'grey'));
  say();
  const answer = await ask();
  if (answer === '0' || answer === '') return;
  const index = Number(answer) - 1;
  const chosen = actions[index];
  if (chosen) game.submit({ t: 'action', actionId: chosen.id });
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
  menu([
    { key: '1', label: 'Passer du temps ensemble' },
    { key: '2', label: 'Offrir quelque chose' },
    { key: '3', label: 'Vous expliquer' },
    { key: '4', label: 'Courtiser', locked: !!game.player.spouseId || !!other.spouseId },
    { key: '5', label: 'Demander de l\'aide' },
    { key: '0', label: 'Retour' },
  ]);
  say();
  const answer = await ask();
  const kinds = {
    '1': 'parler',
    '2': 'offrir',
    '3': 'disputer',
    '4': 'courtiser',
    '5': 'demander',
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
  say(c('  [entrée] retour', 'grey'));
  await ask();
}

async function worldMenu(): Promise<void> {
  const w = worldView(game);
  clear();
  say(heading('le monde'));
  say();
  say(`  ${c(w.settlement.name, 'bold')} — ${w.settlement.size}, ${w.settlement.danger}`);
  say();
  for (const line of wrap(w.settlement.description)) say(`  ${c(line, 'grey')}`);
  say();
  say(`  ${keyval('Année', String(w.year))}`);
  say(`  ${keyval('Monde', w.mode)}`);
  say(`  ${keyval('Connaissances', String(w.knownPeople))}`);
  say(
    `  ${keyval('En suspens', c(`${w.activeSeeds} chose(s) qui n'ont pas fini`, 'magenta'))}`,
  );
  say();
  say(rule());
  say(c('  [entrée] retour', 'grey'));
  await ask();
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
        else if (answer === '5') await worldMenu();
        else if (answer === '6') await chronicleMenu();
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
