import type { World } from '../world/world.js';
import { Rng } from '../rng/rng.js';
import { hunger } from '../economy/domains.js';

/**
 * **La carte, de l'implantation à l'univers.**
 *
 * Le [doc 09](../../docs/09-echelle-totale.md) promet d'aller du clochard
 * mutilé à l'empereur stellaire. Le domaine récursif du
 * [doc 15](../../docs/15-domaines-et-pouvoir.md) sait déjà porter les huit
 * échelles — mais rien ne les *montrait*, et un monde qu'on ne voit pas n'est
 * pas un monde, c'est une variable.
 *
 * Le principe, et c'est ce qui rend la chose tenable : **le ciel n'est pas
 * simulé, il est calculé.** Une tuile de galaxie n'est pas un objet en
 * mémoire ; c'est une fonction pure de la graine du monde et de son chemin.
 * Regarder le 4ᵉ système du 12ᵉ secteur ne crée rien, ne sauvegarde rien, ne
 * coûte rien — et donne toujours la même chose, à la fin des temps comme à la
 * première année (ADR-003).
 *
 * Ce que la simulation touche vraiment — le Rivage, ses régions, ses villes —
 * se pose **par-dessus** sa tuile. C'est le seul point de contact, et c'est
 * par là que la colonisation passera le jour venu : une tuile qui reçoit un
 * domaine cesse d'être un décor.
 */

/** Les six paliers de zoom. Chacun dit ce qu'*une tuile* représente chez lui. */
export type MapLevel = 'univers' | 'galaxie' | 'secteur' | 'systeme' | 'monde' | 'region';

export const MAP_LEVELS: readonly MapLevel[] = [
  'univers',
  'galaxie',
  'secteur',
  'systeme',
  'monde',
  'region',
];

export const LEVEL_LABELS: Record<MapLevel, string> = {
  univers: 'l\'univers',
  galaxie: 'la galaxie',
  secteur: 'le secteur',
  systeme: 'le système',
  monde: 'le monde',
  region: 'la région',
};

/** Ce qu'on voit quand on est *à* ce palier : une tuile y est un… */
export const TILE_OF: Record<MapLevel, string> = {
  univers: 'galaxie',
  galaxie: 'secteur',
  secteur: 'système',
  systeme: 'astre',
  monde: 'région',
  region: 'lieu',
};

/** Taille de la grille à chaque palier. Ce qu'un œil embrasse d'un coup. */
const GRID: Record<MapLevel, { cols: number; rows: number }> = {
  univers: { cols: 9, rows: 5 },
  galaxie: { cols: 9, rows: 5 },
  secteur: { cols: 8, rows: 5 },
  systeme: { cols: 8, rows: 3 },
  monde: { cols: 9, rows: 5 },
  region: { cols: 7, rows: 4 },
};

export type TileKind =
  // univers
  | 'spirale' | 'elliptique' | 'irreguliere' | 'naine' | 'vide-intergalactique'
  // galaxie
  | 'bras' | 'noyau' | 'halo' | 'nebuleuse' | 'amas-globulaire' | 'vide'
  // secteur
  | 'etoile-jaune' | 'etoile-rouge' | 'etoile-bleue' | 'naine-blanche'
  | 'binaire' | 'trou-noir' | 'system-mort'
  // système
  | 'monde-tempere' | 'monde-gele' | 'monde-brule' | 'monde-ocean' | 'monde-mort'
  | 'geante' | 'ceinture' | 'lune' | 'orbite-vide'
  // monde & région
  | 'ocean' | 'cote' | 'plaine' | 'foret' | 'montagne' | 'marais' | 'desert'
  | 'glace' | 'steppe' | 'cite';

export const KIND_LABELS: Record<TileKind, string> = {
  spirale: 'galaxie spirale',
  elliptique: 'galaxie elliptique',
  irreguliere: 'galaxie irrégulière',
  naine: 'galaxie naine',
  'vide-intergalactique': 'le vide entre les galaxies',
  bras: 'un bras de la spirale',
  noyau: 'le noyau',
  halo: 'le halo',
  nebuleuse: 'nébuleuse',
  'amas-globulaire': 'amas globulaire',
  vide: 'vide',
  'etoile-jaune': 'étoile jaune',
  'etoile-rouge': 'naine rouge',
  'etoile-bleue': 'géante bleue',
  'naine-blanche': 'naine blanche',
  binaire: 'système double',
  'trou-noir': 'trou noir',
  'system-mort': 'système éteint',
  'monde-tempere': 'monde tempéré',
  'monde-gele': 'monde gelé',
  'monde-brule': 'monde brûlé',
  'monde-ocean': 'monde-océan',
  'monde-mort': 'caillou stérile',
  geante: 'géante gazeuse',
  ceinture: 'ceinture d\'astéroïdes',
  lune: 'lune',
  'orbite-vide': 'orbite vide',
  ocean: 'océan',
  cote: 'côte',
  plaine: 'plaine',
  foret: 'forêt',
  montagne: 'montagne',
  marais: 'marais',
  desert: 'désert',
  glace: 'glace',
  steppe: 'steppe',
  cite: 'cité',
};

/** Un caractère par nature, pour les clients qui dessinent en texte. */
export const KIND_GLYPH: Record<TileKind, string> = {
  spirale: '@', elliptique: 'O', irreguliere: '%', naine: 'o',
  'vide-intergalactique': ' ',
  bras: '~', noyau: '#', halo: ':', nebuleuse: '&', 'amas-globulaire': '*', vide: ' ',
  'etoile-jaune': '*', 'etoile-rouge': '·', 'etoile-bleue': '✦', 'naine-blanche': '˙',
  binaire: '8', 'trou-noir': '●', 'system-mort': ' ',
  'monde-tempere': 'O', 'monde-gele': 'o', 'monde-brule': 'o', 'monde-ocean': 'O',
  'monde-mort': '.', geante: '@', ceinture: '·', lune: 'ʘ', 'orbite-vide': ' ',
  ocean: '≈', cote: '=', plaine: '"', foret: '♣', montagne: '▲', marais: ',',
  desert: '.', glace: '*', steppe: '-', cite: '▣',
};

export interface Tile {
  /** Chemin complet, cliquable : `u/3/7/2`. */
  path: string;
  q: number;
  r: number;
  kind: TileKind;
  label: string;
  name: string;
  /** On peut descendre dedans. Le vide, non. */
  enterable: boolean;
  /** Le chemin d'ici mène au monde habité. */
  onHomePath: boolean;
  /** Un domaine simulé occupe cette tuile. C'est le seul point de contact. */
  domainId: string | null;
  /** Ce qu'on sait de la vie qui s'y trouve, quand il y en a. */
  note: string | null;
}

export interface TileMap {
  level: MapLevel;
  /** Le palier d'une tuile de cette carte. */
  childLevel: MapLevel | null;
  path: string;
  /** Ce qu'on regarde. */
  title: string;
  subtitle: string;
  cols: number;
  rows: number;
  tiles: Tile[];
  /** Le chemin d'un cran au-dessus, ou `null` si on est à l'univers. */
  up: string | null;
  /** Le chemin qui descend vers le monde habité, quand on n'y est pas déjà. */
  home: string | null;
}

// ─── noms ────────────────────────────────────────────────────────────────────

const SYLL_A = ['Ka', 'Vel', 'Thr', 'Ny', 'Ors', 'Mir', 'Zan', 'Eld', 'Hy', 'Sar', 'Ul', 'Dre', 'Ith', 'Oph', 'Ba', 'Cyn'];
const SYLL_B = ['dor', 'reth', 'ax', 'ion', 'mir', 'oth', 'ane', 'ys', 'ura', 'el', 'ath', 'irn', 'oud', 'esh', 'ar', 'ynne'];
const GREC = ['Alpha', 'Bêta', 'Gamma', 'Delta', 'Epsilon', 'Zêta', 'Êta', 'Thêta', 'Iota', 'Kappa', 'Lambda', 'Mu'];

function coinName(rng: Rng): string {
  return `${rng.pick(SYLL_A)}${rng.pick(SYLL_B)}`;
}

function catalogue(rng: Rng, prefix: string): string {
  return `${prefix}-${rng.int(100, 9999)}`;
}

// ─── le chemin habité ────────────────────────────────────────────────────────

/**
 * Où se trouve le Rivage dans l'univers. Déterminé par la graine, comme tout
 * le reste : deux parties n'ont pas le même ciel, et la même graine donne
 * toujours le même.
 */
export function homePath(seed: number): string {
  const r = new Rng(seed).fork('cosmos.home');
  const g = r.int(0, GRID.univers.cols * GRID.univers.rows - 1);
  const s = r.int(0, GRID.galaxie.cols * GRID.galaxie.rows - 1);
  const y = r.int(0, GRID.secteur.cols * GRID.secteur.rows - 1);
  const p = r.int(0, GRID.systeme.cols * GRID.systeme.rows - 1);
  return `u/${g}/${s}/${y}/${p}`;
}

/** Le palier auquel correspond un chemin. */
export function levelOf(path: string): MapLevel {
  const depth = path.split('/').length - 1;
  return MAP_LEVELS[Math.min(depth, MAP_LEVELS.length - 1)] as MapLevel;
}

export function parentOf(path: string): string | null {
  const i = path.lastIndexOf('/');
  return i < 0 ? null : path.slice(0, i);
}

// ─── ce que chaque palier contient ───────────────────────────────────────────

type Weighted = readonly (readonly [TileKind, number])[];

const GALAXIES: Weighted = [
  ['vide-intergalactique', 46], ['naine', 22], ['spirale', 14],
  ['elliptique', 12], ['irreguliere', 6],
];
const SECTEURS: Weighted = [
  ['vide', 30], ['bras', 26], ['halo', 18], ['amas-globulaire', 12],
  ['nebuleuse', 9], ['noyau', 5],
];
const SYSTEMES: Weighted = [
  ['system-mort', 24], ['etoile-rouge', 26], ['etoile-jaune', 16],
  ['naine-blanche', 12], ['binaire', 11], ['etoile-bleue', 8], ['trou-noir', 3],
];
const ASTRES: Weighted = [
  ['orbite-vide', 20], ['monde-mort', 22], ['geante', 16], ['ceinture', 10],
  ['lune', 10], ['monde-gele', 8], ['monde-brule', 7], ['monde-ocean', 4],
  ['monde-tempere', 3],
];
const TERRAINS: Weighted = [
  ['ocean', 26], ['plaine', 16], ['foret', 14], ['montagne', 12],
  ['steppe', 10], ['cote', 8], ['desert', 6], ['marais', 4], ['glace', 4],
];

function drawKind(rng: Rng, table: Weighted): TileKind {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let k = rng.float() * total;
  for (const [kind, w] of table) {
    k -= w;
    if (k <= 0) return kind;
  }
  return table[table.length - 1]![0];
}

const VIDES = new Set<TileKind>([
  'vide-intergalactique', 'vide', 'system-mort', 'orbite-vide',
]);

// ─── la carte ────────────────────────────────────────────────────────────────

/**
 * La grille visible depuis `path`. Pure, sauf pour ce que le monde simulé
 * vient poser dessus : `world` sert uniquement à retrouver les domaines qui
 * occupent des tuiles, jamais à en fabriquer.
 */
export function tileMap(world: World, path: string): TileMap {
  const level = levelOf(path);
  const home = homePath(world.seed);
  const surLaRoute = home.startsWith(path) || path.startsWith(home);
  const grid = GRID[level];

  // Aux deux derniers paliers, la carte n'est plus procédurale : c'est
  // l'arbre des domaines qui la dessine.
  if (level === 'monde' && surLaRoute) return worldMap(world, path, home);
  if (level === 'region') return regionMap(world, path, home);

  const tiles: Tile[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let q = 0; q < grid.cols; q++) {
      const index = r * grid.cols + q;
      const child = `${path}/${index}`;
      const ici = home === child || home.startsWith(`${child}/`);
      const rng = new Rng(world.seed).fork('cosmos', path, index);
      tiles.push(makeTile(rng, level, child, q, r, ici, world));
    }
  }

  return {
    level,
    childLevel: MAP_LEVELS[MAP_LEVELS.indexOf(level) + 1] ?? null,
    path,
    title: titleOf(world, path, level),
    subtitle: subtitleOf(level, tiles),
    cols: grid.cols,
    rows: grid.rows,
    tiles,
    up: parentOf(path),
    home: home.startsWith(path) && home !== path ? home : null,
  };
}

function makeTile(
  rng: Rng,
  level: MapLevel,
  path: string,
  q: number,
  r: number,
  onHomePath: boolean,
  world: World,
): Tile {
  let kind: TileKind;
  let name: string;

  switch (level) {
    case 'univers':
      kind = onHomePath ? 'spirale' : drawKind(rng, GALAXIES);
      name = kind === 'vide-intergalactique' ? '—' : catalogue(rng, 'NGX');
      break;
    case 'galaxie':
      kind = onHomePath ? 'bras' : drawKind(rng, SECTEURS);
      name = kind === 'vide' ? '—' : `${rng.pick(GREC)} ${rng.int(1, 60)}`;
      break;
    case 'secteur':
      kind = onHomePath ? 'etoile-jaune' : drawKind(rng, SYSTEMES);
      name = kind === 'system-mort' ? '—' : coinName(rng);
      break;
    case 'systeme':
      kind = onHomePath ? 'monde-tempere' : drawKind(rng, ASTRES);
      name = kind === 'orbite-vide' ? '—' : `${coinName(rng)} ${rng.int(1, 9)}`;
      break;
    default:
      kind = drawKind(rng, TERRAINS);
      name = KIND_LABELS[kind];
  }

  // Le monde habité porte son vrai nom, et pas un matricule.
  if (onHomePath && level === 'systeme') {
    name = world.domains.get('dom_monde')?.name ?? 'Le Rivage';
  }

  return {
    path,
    q,
    r,
    kind,
    label: KIND_LABELS[kind],
    name,
    enterable: !VIDES.has(kind),
    onHomePath,
    domainId: onHomePath && level === 'systeme' ? 'dom_monde' : null,
    note: onHomePath && level === 'systeme' ? 'On y vit.' : null,
  };
}

function titleOf(world: World, path: string, level: MapLevel): string {
  if (level === 'univers') return 'L\'univers';
  const parent = parentOf(path);
  if (!parent) return LEVEL_LABELS[level];
  const index = Number(path.slice(path.lastIndexOf('/') + 1));
  const rng = new Rng(world.seed).fork('cosmos', parent, index);
  const parentLevel = levelOf(parent);
  const home = homePath(world.seed);
  const ici = home === path || home.startsWith(`${path}/`);
  const t = makeTile(rng, parentLevel, path, 0, 0, ici, world);
  return `${t.name} — ${t.label}`;
}

function subtitleOf(level: MapLevel, tiles: readonly Tile[]): string {
  const pleines = tiles.filter((t) => t.enterable).length;
  const quoi = TILE_OF[level];
  const pluriel = quoi.endsWith('s') ? quoi : `${quoi}s`;
  return pleines === 0
    ? `Rien que du vide. ${tiles.length} tuiles, pas un ${quoi}.`
    : `${pleines} ${pluriel} sur ${tiles.length} tuiles. Le reste est vide.`;
}

// ─── là où la simulation prend le relais ─────────────────────────────────────

/** Le monde habité : ses régions posées sur du terrain. */
function worldMap(world: World, path: string, home: string): TileMap {
  const grid = GRID.monde;
  const root = world.domains.get('dom_monde');
  const regions = (root?.children ?? [])
    .map((id) => world.domains.get(id))
    .filter((d): d is NonNullable<typeof d> => !!d);

  const tiles: Tile[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let q = 0; q < grid.cols; q++) {
      const index = r * grid.cols + q;
      const rng = new Rng(world.seed).fork('cosmos.monde', index);
      // Les régions habitées prennent les tuiles du centre : une côte, pas un
      // pôle. Le reste du globe est du décor — pour l'instant.
      const place = regionSlot(index, regions.length, grid);
      const dom = place !== null ? regions[place] : undefined;
      const kind: TileKind = dom ? 'cite' : drawKind(rng, TERRAINS);
      tiles.push({
        path: dom ? `${path}/${dom.id}` : `${path}/x${index}`,
        q,
        r,
        kind,
        label: dom ? 'région habitée' : KIND_LABELS[kind],
        name: dom ? dom.name : KIND_LABELS[kind],
        enterable: !!dom,
        onHomePath: !!dom,
        domainId: dom?.id ?? null,
        note: dom ? peopleNote(world, dom.id) : null,
      });
    }
  }

  return {
    level: 'monde',
    childLevel: 'region',
    path,
    title: `${root?.name ?? 'Le monde'} — le seul monde qu'on connaisse`,
    subtitle: `${regions.length} régions habitées. Tout le reste attend.`,
    cols: grid.cols,
    rows: grid.rows,
    tiles,
    up: parentOf(path),
    home: home.startsWith(path) ? null : null,
  };
}

/** Où l'on place les régions habitées sur le globe : au milieu, groupées. */
function regionSlot(index: number, count: number, grid: { cols: number; rows: number }): number | null {
  if (count === 0) return null;
  const ligne = Math.floor(grid.rows / 2);
  const debut = Math.max(0, Math.floor((grid.cols - count) / 2));
  const q = index % grid.cols;
  const r = Math.floor(index / grid.cols);
  if (r !== ligne) return null;
  const k = q - debut;
  return k >= 0 && k < count ? k : null;
}

/** Une région : ses implantations, et le terrain entre elles. */
function regionMap(world: World, path: string, home: string): TileMap {
  const grid = GRID.region;
  const id = path.slice(path.lastIndexOf('/') + 1);
  const region = world.domains.get(id);
  const villes = (region?.children ?? [])
    .map((cid) => world.domains.get(cid))
    .filter((d): d is NonNullable<typeof d> => !!d);

  const tiles: Tile[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let q = 0; q < grid.cols; q++) {
      const index = r * grid.cols + q;
      const rng = new Rng(world.seed).fork('cosmos.region', id, index);
      const place = regionSlot(index, villes.length, grid);
      const dom = place !== null ? villes[place] : undefined;
      const kind: TileKind = dom ? 'cite' : drawKind(rng, TERRAINS);
      tiles.push({
        path: `${path}/${dom ? dom.id : `x${index}`}`,
        q,
        r,
        kind,
        label: dom ? 'implantation' : KIND_LABELS[kind],
        name: dom ? dom.name : KIND_LABELS[kind],
        enterable: false,
        onHomePath: !!dom,
        domainId: dom?.id ?? null,
        note: dom ? peopleNote(world, dom.id) : null,
      });
    }
  }

  return {
    level: 'region',
    childLevel: null,
    path,
    title: `${region?.name ?? 'Région'} — ${villes.length} implantations`,
    subtitle: 'Le dernier palier où l\'on compte les gens un par un.',
    cols: grid.cols,
    rows: grid.rows,
    tiles,
    up: parentOf(path),
    home: home.startsWith(path) ? null : null,
  };
}

/** Ce qu'il y a à dire d'un domaine habité, en une ligne. */
function peopleNote(world: World, domainId: string): string {
  const dom = world.domains.get(domainId);
  if (!dom) return '';
  const faim = hunger(dom);
  const gens = Math.round(dom.population);
  const etat =
    faim > 0.25 ? 'on y meurt de faim' : faim > 0.08 ? 'on y mange mal' : 'on y mange';
  const trouble =
    dom.unrest > dom.legitimacy ? ', et ça gronde' : dom.unrest > 55 ? ', et ça grogne' : '';
  return `${gens} âmes — ${etat}${trouble}.`;
}
