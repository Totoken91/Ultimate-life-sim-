import { stdin, stdout } from 'node:process';

/**
 * Lecture de lignes au clavier.
 *
 * On n'utilise pas `readline/promises` : sur une entrée redirigée (script,
 * test, `yes 1 | pnpm play`), il ne résout que la première question. Or une
 * partie doit pouvoir être rejouée depuis un fichier d'entrées — c'est le
 * moyen le plus simple de reproduire un bug signalé par un joueur.
 */
export class EndOfInput extends Error {
  constructor() {
    super('entrée terminée');
    this.name = 'EndOfInput';
  }
}

export class Input {
  private queue: string[] = [];
  private waiters: ((line: string | null) => void)[] = [];
  private buffer = '';
  private ended = false;

  constructor() {
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk: string) => this.feed(chunk));
    stdin.on('end', () => this.finish());
    stdin.on('close', () => this.finish());
    stdin.resume();
  }

  private feed(chunk: string): void {
    this.buffer += chunk;
    for (;;) {
      const index = this.buffer.indexOf('\n');
      if (index < 0) break;
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      this.deliver(line);
    }
  }

  private finish(): void {
    if (this.ended) return;
    if (this.buffer.length > 0) {
      this.deliver(this.buffer.replace(/\r$/, ''));
      this.buffer = '';
    }
    this.ended = true;
    for (const waiter of this.waiters.splice(0)) waiter(null);
  }

  private deliver(line: string): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter(line);
    else this.queue.push(line);
  }

  /** Lève `EndOfInput` quand il n'y a plus rien à lire. */
  async question(prompt: string): Promise<string> {
    stdout.write(prompt);
    const queued = this.queue.shift();
    if (queued !== undefined) return queued.trim();
    if (this.ended) throw new EndOfInput();
    const line = await new Promise<string | null>((resolve) => this.waiters.push(resolve));
    if (line === null) throw new EndOfInput();
    return line.trim();
  }

  close(): void {
    stdin.pause();
  }
}
