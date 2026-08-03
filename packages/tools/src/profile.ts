/**
 * Profileur de tick — où passent les millisecondes, système par système.
 *
 * « Deux fausses pistes, corrigées après mesure » (doc 12 §3). Cet outil existe
 * pour que la prochaine optimisation commence par un chiffre, pas par une idée.
 *
 *   pnpm profile [années] [habitants par implantation]
 */
import { performance } from 'node:perf_hooks';
import { Rng, Simulation, ageOf, createLife } from '@ed/engine';
import { loadRuleset } from '@ed/content';

const years = Number(process.argv[2] ?? 200);
const perSettlement = Number(process.argv[3] ?? 90);

const ruleset = loadRuleset();
const sim = new Simulation(ruleset, {
  seed: 20260803,
  startYear: 1000,
  mode: 'chronique',
  population: perSettlement,
});
createLife(sim.world, ruleset, new Rng(7));

const timings = sim.registry.instrument(() => performance.now());

let ticks = 0;
const t0 = performance.now();
for (let i = 0; i < years; i++) {
  const opening = sim.openYear();
  // Le joueur choisit toujours la première option : on mesure la simulation,
  // pas la prise de décision.
  for (const pending of opening.events) {
    const first = pending.options.find((o) => !o.locked);
    if (first) sim.resolveEvent(pending, first.id);
  }
  sim.closeYear();
  ticks += 1;
}
const total = performance.now() - t0;

const living = sim.world.living().length;
const rows = [...timings.entries()].sort((a, b) => b[1] - a[1]);
const sum = rows.reduce((n, [, ms]) => n + ms, 0);

const bar = (ms: number): string => '█'.repeat(Math.max(0, Math.round((ms / sum) * 40)));

console.log('');
console.log('═'.repeat(64));
console.log(`  PROFIL DE TICK — ${ticks} années, ${living} vivants à la fin`);
console.log(`  ${(total / ticks).toFixed(2)} ms par année · ${sum.toFixed(0)} ms dans les systèmes`);
console.log('═'.repeat(64));
console.log('');
for (const [id, ms] of rows) {
  const per = ms / ticks;
  if (per < 0.005) continue;
  console.log(
    `  ${id.padEnd(22)} ${per.toFixed(3).padStart(7)} ms  ${((ms / sum) * 100).toFixed(1).padStart(5)} %  ${bar(ms)}`,
  );
}
console.log('');
console.log(`  âge du joueur à la fin : ${ageOf(sim.world.player, sim.world.year)} ans`);
console.log(`  fiches : ${sim.world.characters.size} · chronique : ${sim.world.chronicle.length} · nouvelles : ${sim.world.news.length}`);
console.log('');
