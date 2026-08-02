import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Rng, Simulation, createLife, worldHash } from '@ed/engine';
import { loadRuleset } from '@ed/content';
import { autoplay } from '../../tools/src/autoplay.js';

const ruleset = loadRuleset();

function runYears(seed: number, years: number): string {
  const sim = new Simulation(ruleset, { seed, startYear: 400, mode: 'legende' });
  createLife(sim.world, ruleset, new Rng(seed).fork('newlife'));
  for (let i = 0; i < years; i++) {
    sim.openYear();
    sim.closeYear();
  }
  return worldHash(sim.world);
}

describe('déterminisme', () => {
  it('deux simulations de même graine sont identiques', () => {
    expect(runYears(1234, 40)).toBe(runYears(1234, 40));
  });

  it('deux graines différentes divergent', () => {
    expect(runYears(1234, 40)).not.toBe(runYears(1235, 40));
  });

  it('une partie jouée automatiquement est reproductible', () => {
    const a = autoplay(ruleset, { seed: 555, generations: 3 });
    const b = autoplay(ruleset, { seed: 555, generations: 3 });
    expect(b).toEqual(a);
  });

  it('le moteur ne contient aucune source d\'aléa non seedée', () => {
    // ADR-003 : cette règle sera portée par ESLint, mais un test la rend
    // exécutable dès aujourd'hui et casse le build si quelqu'un l'oublie.
    const forbidden = [
      /Math\s*\.\s*random/,
      /Date\s*\.\s*now/,
      /new\s+Date\s*\(/,
      /performance\s*\.\s*now/,
      /crypto\s*\.\s*randomUUID/,
    ];
    const root = resolve(import.meta.dirname, '../src');
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        // on ne scanne que le code : les commentaires *citent* la règle
        const source = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        for (const pattern of forbidden) {
          if (pattern.test(source)) offenders.push(`${entry.name} → ${pattern}`);
        }
      }
    };
    walk(root);

    expect(offenders).toEqual([]);
  });
});
