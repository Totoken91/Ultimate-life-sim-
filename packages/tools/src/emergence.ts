import { loadRuleset, EVENTS } from '@ed/content';
import { autoplay, type LifeRecord } from './autoplay.js';

/**
 * Banc d'émergence (doc 01 §9).
 *
 * C'est le vrai QA d'une simulation : on lance N parties sans joueur et on
 * regarde si le monde produit des vies plausibles et variées. Un contenu jamais
 * déclenché est un contenu mal conditionné ; un contenu qui sature est un
 * contenu qui rendra le jeu répétitif au bout de deux heures.
 *
 *   pnpm sim            # 200 parties
 *   pnpm sim 1000 3     # 1000 parties, 3 générations chacune
 */

const runs = Number(process.argv[2] ?? 200);
const generations = Number(process.argv[3] ?? 1);

const ruleset = loadRuleset();
const started = Date.now();

const lives: LifeRecord[] = [];
const eventCounts = new Map<string, number>();
let totalYears = 0;
let totalSeeds = 0;

for (let i = 0; i < runs; i++) {
  const result = autoplay(ruleset, { seed: 1000 + i, generations, maxSteps: 60000 });
  lives.push(...result.lives);
  totalYears += result.years;
  totalSeeds += result.seedsPlanted;
  for (const life of result.lives) {
    for (const id of life.eventsSeen) {
      eventCounts.set(id, (eventCounts.get(id) ?? 0) + 1);
    }
  }
}

const elapsed = Date.now() - started;

// ─── métriques ──────────────────────────────────────────────────────────────

const ages = lives.map((l) => l.ageAtDeath).sort((a, b) => a - b);
const median = (xs: number[]): number =>
  xs.length === 0 ? 0 : (xs[Math.floor(xs.length / 2)] as number);
const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const infantDeaths = lives.filter((l) => l.ageAtDeath <= 5).length;
const childDeaths = lives.filter((l) => l.ageAtDeath > 5 && l.ageAtDeath <= 17).length;
const reachedOld = lives.filter((l) => l.ageAtDeath >= 65).length;
const withChildren = lives.filter((l) => l.children > 0).length;
const extinctions = lives.filter((l) => l.children === 0).length;
const houses = lives.filter((l) => l.foundedHouse).length;

const classCounts = new Map<string, number>();
for (const l of lives) classCounts.set(l.peakClass, (classCounts.get(l.peakClass) ?? 0) + 1);

const pct = (n: number): string => `${((n / Math.max(1, lives.length)) * 100).toFixed(1)} %`;

console.log('');
console.log('═'.repeat(64));
console.log(`  BANC D'ÉMERGENCE — ${runs} parties × ${generations} génération(s)`);
console.log(`  ${lives.length} vies simulées, ${totalYears} années, ${elapsed} ms`);
console.log(`  ${(elapsed / Math.max(1, totalYears)).toFixed(2)} ms par année simulée`);
console.log('═'.repeat(64));
console.log('');
console.log('  DURÉE DE VIE');
console.log(`    médiane ................. ${median(ages)} ans`);
console.log(`    moyenne ................. ${mean(ages).toFixed(1)} ans`);
console.log(`    maximum ................. ${ages[ages.length - 1] ?? 0} ans`);
console.log(`    morts avant 5 ans ....... ${infantDeaths} (${pct(infantDeaths)})`);
console.log(`    morts entre 6 et 17 ..... ${childDeaths} (${pct(childDeaths)})`);
console.log(`    ont atteint 65 ans ...... ${reachedOld} (${pct(reachedOld)})`);
console.log('');
console.log('  DYNASTIE');
console.log(`    ont eu des enfants ...... ${withChildren} (${pct(withChildren)})`);
console.log(`    lignées éteintes ........ ${extinctions} (${pct(extinctions)})`);
console.log(`    maisons fondées ......... ${houses} (${pct(houses)})`);
console.log(`    graines actives (pic) ... ${(totalSeeds / runs).toFixed(1)} en moyenne`);
console.log('');
console.log('  MOBILITÉ SOCIALE (classe la plus haute atteinte)');
for (const cls of ['esclave', 'miserable', 'pauvre', 'commun', 'aise', 'noble', 'royal']) {
  const n = classCounts.get(cls) ?? 0;
  if (n === 0) continue;
  console.log(`    ${cls.padEnd(22, '.')} ${n} (${pct(n)})`);
}
console.log('');

// ─── couverture du contenu ──────────────────────────────────────────────────

const never: string[] = [];
for (const def of EVENTS) {
  if (!eventCounts.has(def.id)) never.push(def.id);
}
const ranked = [...eventCounts.entries()].sort((a, b) => b[1] - a[1]);

console.log('  CONTENU');
console.log(`    événements définis ...... ${EVENTS.length}`);
console.log(`    événements vus .......... ${eventCounts.size}`);
console.log(`    jamais déclenchés ....... ${never.length}`);
console.log('');
console.log('    les 8 plus fréquents :');
for (const [id, n] of ranked.slice(0, 8)) {
  console.log(`      ${id.padEnd(34, '.')} ${n}`);
}
if (never.length > 0) {
  console.log('');
  console.log('    jamais vus (conditions trop strictes ?) :');
  for (const id of never.slice(0, 20)) console.log(`      ${id}`);
  if (never.length > 20) console.log(`      … et ${never.length - 20} autres`);
}
console.log('');

// ─── verdict ────────────────────────────────────────────────────────────────

const warnings: string[] = [];
if (median(ages) < 25) warnings.push('durée de vie médiane très basse — mortalité trop dure');
if (median(ages) > 75) warnings.push('durée de vie médiane trop haute — le monde est trop doux');
if (infantDeaths / Math.max(1, lives.length) > 0.4) {
  warnings.push('mortalité infantile écrasante');
}
if (extinctions / Math.max(1, lives.length) > 0.85) {
  warnings.push('presque aucune lignée ne survit — la reproduction est trop rare');
}
if (never.length > EVENTS.length * 0.25) {
  warnings.push(`${never.length} événements jamais vus — trop de contenu inaccessible`);
}
const topShare = (ranked[0]?.[1] ?? 0) / Math.max(1, [...eventCounts.values()].reduce((a, b) => a + b, 0));
if (topShare > 0.15) warnings.push('un événement occupe plus de 15 % des tirages — saturation');

if (warnings.length === 0) {
  console.log('  ✓ Aucun signal d\'alarme.');
} else {
  console.log('  ⚠ Signaux :');
  for (const w of warnings) console.log(`    · ${w}`);
}
console.log('');
