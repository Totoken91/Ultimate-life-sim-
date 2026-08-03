import { ans } from '../util/text.js';
import type { Character, EntityId } from '../model/types.js';
import { ageOf, shortName } from '../model/character.js';
import type { World } from '../world/world.js';

/**
 * Arbre généalogique (doc 03 §5).
 *
 * Bornée en profondeur et en largeur : c'est un écran, pas un export. Le jour
 * où la descendance dépassera le million, cette fonction lira les branches
 * génératives du palier T3 sans que l'appelant s'en aperçoive (doc 02 §2).
 */
export interface TreeNode {
  id: EntityId;
  name: string;
  birthYear: number;
  deathYear: number | null;
  age: number;
  alive: boolean;
  isPlayer: boolean;
  spouse: string | null;
  job: string | null;
  /** Enfants affichés. */
  children: TreeNode[];
  /** Enfants existants mais non affichés (limite de largeur atteinte). */
  hiddenChildren: number;
}

export interface TreeOptions {
  maxDepth?: number;
  maxChildren?: number;
  /** Remonter d'abord aux ancêtres : 0 = partir du personnage lui-même. */
  ancestors?: number;
}

function nodeOf(world: World, c: Character): TreeNode {
  const spouse = world.get(c.spouseId);
  return {
    id: c.id,
    name: shortName(c),
    birthYear: c.birthYear,
    deathYear: c.deathYear,
    age: ageOf(c, world.year),
    alive: c.alive,
    isPlayer: c.isPlayer,
    spouse: spouse ? shortName(spouse) : null,
    job: c.jobId,
    children: [],
    hiddenChildren: 0,
  };
}

/** Remonte jusqu'à `levels` générations et renvoie l'ancêtre le plus haut. */
export function rootAncestor(world: World, from: Character, levels: number): Character {
  let current = from;
  for (let i = 0; i < levels; i++) {
    const parent = world.get(current.fatherId) ?? world.get(current.motherId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function familyTree(
  world: World,
  rootId: EntityId,
  opts: TreeOptions = {},
): TreeNode | null {
  const maxDepth = opts.maxDepth ?? 4;
  const maxChildren = opts.maxChildren ?? 8;
  const start = world.get(rootId);
  if (!start) return null;

  const root = opts.ancestors ? rootAncestor(world, start, opts.ancestors) : start;
  const seen = new Set<EntityId>();

  const build = (c: Character, depth: number): TreeNode => {
    const node = nodeOf(world, c);
    seen.add(c.id);
    if (depth >= maxDepth) {
      node.hiddenChildren = c.childrenIds.length;
      return node;
    }
    const kids = c.childrenIds
      .map((id) => world.get(id))
      .filter((k): k is Character => !!k && !seen.has(k.id))
      .sort((a, b) => a.birthYear - b.birthYear || a.id - b.id);
    for (const kid of kids.slice(0, maxChildren)) node.children.push(build(kid, depth + 1));
    node.hiddenChildren = Math.max(0, kids.length - maxChildren);
    return node;
  };

  return build(root, 0);
}

/** Rendu texte de l'arbre, en lignes prêtes à afficher. */
export function renderTree(node: TreeNode, prefix = '', isLast = true, isRoot = true): string[] {
  const life = node.alive ? `${ans(node.age)}` : `†${node.deathYear ?? '?'}`;
  const marks = [node.isPlayer ? '◆' : null, node.spouse ? `⚭ ${node.spouse}` : null]
    .filter(Boolean)
    .join(' ');
  const label = `${node.name} (${node.birthYear}, ${life})${marks ? `  ${marks}` : ''}`;

  const lines: string[] = [];
  if (isRoot) {
    lines.push(label);
  } else {
    lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${label}`);
  }

  const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
  node.children.forEach((child, i) => {
    const last = i === node.children.length - 1 && node.hiddenChildren === 0;
    lines.push(...renderTree(child, childPrefix, last, false));
  });
  if (node.hiddenChildren > 0) {
    lines.push(`${childPrefix}└─ … ${node.hiddenChildren} autre(s)`);
  }
  return lines;
}

export function countTree(node: TreeNode): { nodes: number; living: number; hidden: number } {
  let nodes = 1;
  let living = node.alive ? 1 : 0;
  let hidden = node.hiddenChildren;
  for (const child of node.children) {
    const sub = countTree(child);
    nodes += sub.nodes;
    living += sub.living;
    hidden += sub.hidden;
  }
  return { nodes, living, hidden };
}
