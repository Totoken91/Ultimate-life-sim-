import { chromium, type ConsoleMessage } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/**
 * Fumigation de l'application web.
 *
 * Compiler n'est pas tourner : ce script sert le bundle statique, ouvre un
 * vrai navigateur, joue quelques années et échoue si la console crache quoi
 * que ce soit. C'est le seul moyen d'attraper les erreurs d'exécution avant
 * de déployer.
 *
 *   pnpm build:web && npx tsx packages/tools/src/websmoke.ts
 */

const DIST = new URL('../../web/dist/', import.meta.url).pathname;
const PORT = 4319;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0] ?? '/';
  const rel = url === '/' ? 'index.html' : normalize(url).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(DIST, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

const problems: string[] = [];

async function main(): Promise<void> {
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  // L'environnement fournit déjà un Chromium ; la version épinglée par
  // Playwright ne correspond pas forcément, on pointe donc le binaire présent.
  const preinstalled = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {},
  );
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      problems.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });

  const step = async (label: string, fn: () => Promise<void>): Promise<void> => {
    await fn();
    await page.waitForTimeout(60);
    console.log(`  ✓ ${label}`);
  };

  await step('écran-titre', async () => {
    await page.getByText('Eternal Dynasty').waitFor({ timeout: 5000 });
  });

  await step('nouvelle vie', async () => {
    await page.getByRole('button', { name: 'Nouvelle vie' }).click();
    await page.getByRole('button', { name: /Commencer/ }).click();
  });

  // On joue une trentaine d'années en cliquant toujours la première option.
  let years = 0;
  for (let i = 0; i < 140; i++) {
    const passer = page.getByRole('button', { name: /Passer l’année/ });
    if (await passer.isVisible().catch(() => false)) {
      await passer.click();
      years++;
      continue;
    }
    const continuer = page.getByRole('button', { name: /^Continuer/ });
    if (await continuer.isVisible().catch(() => false)) {
      await continuer.click();
      continue;
    }
    const options = page.locator('.scroll .btn:not(.locked)');
    const n = await options.count();
    if (n > 0) {
      await options.first().click();
      continue;
    }
    break;
  }
  console.log(`  ✓ ${years} année(s) jouée(s)`);

  // On sort des écrans pleine page (événement, issue, mort) pour retrouver
  // la barre d'onglets : c'est elle qu'on veut éprouver.
  for (let i = 0; i < 40; i++) {
    if (await page.locator('nav.tabs').isVisible().catch(() => false)) break;
    const next = page.locator('.scroll .btn:not(.locked)').first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(40);
  }
  if (!(await page.locator('nav.tabs').isVisible().catch(() => false))) {
    problems.push('impossible de revenir à un écran avec onglets');
  }

  // Les onglets doivent tous s'ouvrir sans exploser.
  for (const tab of ['Gens', 'Vous', 'Dynastie', 'Monde']) {
    const btn = page.getByRole('button', { name: tab, exact: true });
    if (await btn.isVisible().catch(() => false)) {
      await step(`onglet ${tab}`, async () => {
        await btn.click();
      });
    }
  }

  // L'année du joueur : ses trois faces (doc 16). Il faut d'abord y revenir.
  const vie = page.getByRole('button', { name: 'Vie', exact: true });
  if (await vie.isVisible().catch(() => false)) await vie.click();
  for (const chip of ['Ce qui passe', 'Ce que vous menez', 'Coups']) {
    const c = page.getByRole('button', { name: chip, exact: true });
    if (await c.isVisible().catch(() => false)) {
      await step(`année → ${chip}`, async () => {
        await c.click();
      });
    }
  }

  // Chez soi : patrimoine, domesticité, réformes (doc 17).
  const vous = page.getByRole('button', { name: 'Vous', exact: true });
  if (await vous.isVisible().catch(() => false)) {
    await vous.click();
    const chez = page.getByRole('button', { name: 'Chez vous', exact: true });
    if (await chez.isVisible().catch(() => false)) {
      await step('vous → Chez vous', async () => {
        await chez.click();
      });
    }
  }

  // Et chaque onglet de statistiques.
  for (const chip of ['Lieu', 'Rumeurs', 'Groupes', 'Pays', 'Chiffres', 'Classements', 'Records', 'Chronique']) {
    const c = page.getByRole('button', { name: chip, exact: true });
    if (await c.isVisible().catch(() => false)) {
      await step(`chiffres → ${chip}`, async () => {
        await c.click();
      });
    }
  }

  await page.screenshot({ path: 'packages/web/dist/_smoke.png', fullPage: false });

  // La sauvegarde doit survivre à un rechargement.
  await page.reload({ waitUntil: 'networkidle' });
  const stillPlaying = await page
    .locator('.hdr h1, .scroll')
    .first()
    .isVisible()
    .catch(() => false);
  if (!stillPlaying) problems.push('la partie ne survit pas au rechargement');
  else console.log('  ✓ la partie survit au rechargement');

  await browser.close();
  server.close();

  if (problems.length > 0) {
    console.error('\n✗ Problèmes détectés :');
    for (const p of [...new Set(problems)]) console.error(`  ${p}`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ Aucune erreur de console, aucune exception.');
  }
}

main().catch((err: unknown) => {
  console.error(err);
  server.close();
  process.exitCode = 1;
});
