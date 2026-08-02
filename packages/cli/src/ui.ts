/**
 * Rendu terminal. Aucune logique de jeu ici (ADR-002) : ce fichier ne sait
 * que dessiner des cadres et lire des touches.
 *
 * Contraintes du doc 05 §6 : 78 colonnes, dégradation propre sans couleur.
 */

const NO_COLOR = process.env['NO_COLOR'] !== undefined || !process.stdout.isTTY;

export const WIDTH = 78;

const codes = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  italic: '\x1b[3m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
};

type Colour = keyof typeof codes;

export function c(text: string, ...styles: Colour[]): string {
  if (NO_COLOR) return text;
  return styles.map((s) => codes[s]).join('') + text + codes.reset;
}

/** Longueur visible (sans séquences ANSI). */
export function len(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

export function wrap(text: string, width = WIDTH - 4): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line === '') {
        line = word;
      } else if (len(line) + 1 + len(word) <= width) {
        line += ` ${word}`;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function pad(s: string, width: number): string {
  const diff = width - len(s);
  return diff > 0 ? s + ' '.repeat(diff) : s;
}

export function rule(char = '─'): string {
  return c(char.repeat(WIDTH), 'grey');
}

export function heading(title: string): string {
  const t = ` ${title.toUpperCase()} `;
  const left = 2;
  const right = Math.max(0, WIDTH - left - len(t));
  return c('─'.repeat(left), 'grey') + c(t, 'bold', 'cyan') + c('─'.repeat(right), 'grey');
}

export function say(line = ''): void {
  process.stdout.write(`${line}\n`);
}

export function block(text: string, style: Colour[] = []): void {
  for (const line of wrap(text)) say(style.length ? c(line, ...style) : line);
}

export function keyval(label: string, value: string, labelWidth = 14): string {
  return `${c(pad(label, labelWidth), 'grey')}${value}`;
}

/** Jauge textuelle — lisible même sans couleur. */
export function gauge(value: number, max = 100, width = 12): string {
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  const colour: Colour = value >= 70 ? 'green' : value >= 40 ? 'yellow' : 'red';
  return c('█'.repeat(filled), colour) + c('░'.repeat(width - filled), 'grey');
}

export function menu(items: { key: string; label: string; note?: string; locked?: boolean }[]): void {
  for (const item of items) {
    const key = item.locked ? c(` ${item.key} `, 'grey') : c(` ${item.key} `, 'bold', 'yellow');
    const label = item.locked ? c(item.label, 'grey') : item.label;
    const note = item.note ? c(`  ${item.note}`, 'grey', 'italic') : '';
    say(`${key} ${label}${note}`);
  }
}

export function clear(): void {
  if (!NO_COLOR) process.stdout.write('\x1b[2J\x1b[H');
}
