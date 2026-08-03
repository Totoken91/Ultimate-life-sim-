import { ans } from '../util/text.js';
import type { ChronicleEntry } from '../model/types.js';

/**
 * Rendu de la Chronique. Séparé du stockage (doc 04 §5) : on peut réécrire
 * la prose sans toucher à la simulation, et traduire sans y toucher non plus.
 */

const nameOf = (e: ChronicleEntry, index = 0): string =>
  e.actors[index]?.name ?? 'quelqu\'un';

const str = (e: ChronicleEntry, k: string, fallback = ''): string => {
  const v = e.data[k];
  return v === undefined ? fallback : String(v);
};

const num = (e: ChronicleEntry, k: string, fallback = 0): number => {
  const v = e.data[k];
  return typeof v === 'number' ? v : fallback;
};

export function renderEntry(e: ChronicleEntry): string {
  const who = nameOf(e);
  const other = e.actors.length > 1 ? nameOf(e, 1) : null;

  switch (e.kind) {
    case 'naissance': {
      const place = str(e, 'lieu');
      const cond = str(e, 'condition');
      return `${who} vint au monde${place ? ` à ${place}` : ''}${cond ? `, ${cond}` : ''}.`;
    }
    case 'mort': {
      const age = num(e, 'age');
      const cause = str(e, 'cause', 'de sa belle mort');
      return `${who} mourut à ${ans(age)}, ${cause}.`;
    }
    case 'mariage':
      return `${who} épousa ${other ?? 'un inconnu'}.`;
    case 'enfant':
      return `${other ?? 'Un enfant'} naquit de ${who}.`;
    case 'metier':
      return `${who} devint ${str(e, 'metier', 'autre chose')}.`;
    case 'ascension':
      return `${who} s'éleva : ${str(e, 'quoi')}.`;
    case 'chute':
      return `${who} tomba : ${str(e, 'quoi')}.`;
    case 'trahison': {
      const how = str(e, 'quoi');
      return `${other ?? 'Quelqu\'un'} trahit ${who}${how ? `, ${how}` : ''}.`;
    }
    case 'crime':
      return `${who} ${str(e, 'quoi', 'commit un crime')}.`;
    case 'violence':
      return `${who} ${str(e, 'quoi', 'versa le sang')}.`;
    case 'fondation': {
      // Une maison et une bande se fondent toutes les deux, mais on ne dit pas
      // « la Maison les gens de Vaur ».
      const groupe = str(e, 'groupe');
      if (groupe) return `${who} rassembla ${groupe}.`;
      return `${who} fonda la Maison ${str(e, 'maison')}.`;
    }
    case 'guerre':
      return str(e, 'quoi', 'On se battit.');
    case 'rencontre': {
      const what = str(e, 'quoi');
      return `${who} rencontra ${other ?? 'quelqu\'un'}${what ? ` — ${what}` : ''}.`;
    }
    case 'blessure':
      return `${who} y laissa quelque chose : ${str(e, 'quoi')}.`;
    case 'fortune':
      return `${who} s'enrichit : ${str(e, 'quoi')}.`;
    case 'ruine':
      return `${who} perdit tout : ${str(e, 'quoi')}.`;
    case 'revelation':
      return `${who} apprit la vérité : ${str(e, 'quoi')}.`;
    case 'note':
    default:
      return str(e, 'texte', '—');
  }
}

export interface ChronicleOptions {
  /** N'affiche que les entrées d'importance >= ce seuil. */
  minImportance?: 1 | 2 | 3 | 4 | 5;
  title?: string;
}

/** Rendu Markdown, groupé par décennie. C'est ce que le joueur exporte. */
export function renderChronicle(
  entries: readonly ChronicleEntry[],
  opts: ChronicleOptions = {},
): string {
  const min = opts.minImportance ?? 1;
  const kept = entries.filter((e) => e.importance >= min);
  const lines: string[] = [];
  lines.push(`# ${opts.title ?? 'Chronique'}`, '');

  if (kept.length === 0) {
    lines.push('*Rien ne fut consigné.*');
    return lines.join('\n');
  }

  let currentDecade: number | null = null;
  for (const e of kept) {
    const decade = Math.floor(e.year / 10) * 10;
    if (decade !== currentDecade) {
      currentDecade = decade;
      lines.push('', `## Années ${decade}`, '');
    }
    lines.push(`**${e.year}** — ${renderEntry(e)}`);
  }
  return lines.join('\n');
}

/** Résumé d'une vie en quelques lignes — l'écran de fin. */
export function renderEpitaph(entries: readonly ChronicleEntry[], limit = 12): string[] {
  return entries
    .slice()
    .sort((a, b) => b.importance - a.importance || a.year - b.year)
    .slice(0, limit)
    .sort((a, b) => a.year - b.year)
    .map((e) => `${e.year} — ${renderEntry(e)}`);
}
