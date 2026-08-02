import { describe, expect, it } from 'vitest';
import { BIRTHS, EVENTS, JOBS, SKILLS, TRAITS, loadRuleset, rulesetIssues } from '@ed/content';

describe('pack de contenu « Le Rivage »', () => {
  it('se charge sans erreur de validation', () => {
    expect(() => loadRuleset()).not.toThrow();
  });

  it('ne remonte aucune erreur bloquante', () => {
    const errors = rulesetIssues().filter((i) => i.level === 'erreur');
    expect(errors).toEqual([]);
  });

  it('a des identifiants d\'événement uniques', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toutes les graines pointent vers un événement existant', () => {
    const known = new Set(EVENTS.map((e) => e.id));
    const missing: string[] = [];
    for (const ev of EVENTS) {
      for (const opt of ev.options) {
        for (const outcome of opt.outcomes) {
          if (typeof outcome.effects === 'function') continue;
          for (const fx of outcome.effects) {
            if (fx.k === 'seed' && !known.has(fx.eventId)) missing.push(`${ev.id} → ${fx.eventId}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('les événements de graine ne sont jamais tirés au hasard', () => {
    for (const ev of EVENTS) {
      if (ev.id.startsWith('seed.')) {
        expect(ev.seedOnly, `${ev.id} devrait être seedOnly`).toBe(true);
      }
    }
  });

  it('chaque événement a au moins une option et chaque option une issue', () => {
    for (const ev of EVENTS) {
      expect(ev.options.length, ev.id).toBeGreaterThan(0);
      for (const opt of ev.options) {
        expect(opt.outcomes.length, `${ev.id}/${opt.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('chaque événement porte au moins un tag (saturation)', () => {
    for (const ev of EVENTS) {
      expect(ev.tags.length, ev.id).toBeGreaterThan(0);
    }
  });

  it('les scénarios de naissance couvrent tous les paliers', () => {
    const tiers = new Set(BIRTHS.map((b) => b.tier));
    expect([...tiers].sort()).toEqual(
      ['aise', 'catastrophe', 'commun', 'exceptionnel', 'misere', 'privilegie'].sort(),
    );
  });

  it('une naissance catastrophique n\'est jamais une impasse', () => {
    // Contrepartie systématique : destinée élevée ou traits de survie (doc 03 §2.4)
    for (const birth of BIRTHS.filter((b) => b.tier === 'catastrophe')) {
      expect(birth.weight, birth.id).toBeGreaterThan(0);
    }
  });

  it('les métiers n\'entraînent que des compétences connues', () => {
    for (const job of Object.values(JOBS)) {
      for (const skillId of Object.keys(job.trains)) {
        expect(SKILLS[skillId], `${job.id} → ${skillId}`).toBeDefined();
      }
    }
  });

  it('les exclusions de traits sont symétriquement déclarées', () => {
    const asymmetric: string[] = [];
    for (const trait of Object.values(TRAITS)) {
      for (const other of trait.excludes ?? []) {
        if (!TRAITS[other]?.excludes?.includes(trait.id)) {
          asymmetric.push(`${trait.id} exclut ${other} sans réciproque`);
        }
      }
    }
    expect(asymmetric).toEqual([]);
  });

  it('contient assez de contenu pour la Phase 1', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(100);
    expect(BIRTHS.length).toBeGreaterThanOrEqual(25);
    expect(Object.keys(TRAITS).length).toBeGreaterThanOrEqual(55);
    expect(Object.keys(JOBS).length).toBeGreaterThanOrEqual(20);
  });

  it('chaque condition de naissance difficile est jouable', () => {
    // Doc 09 §5bis : une condition sans événement dédié n'est qu'un malus.
    for (const traitId of ['esprit_a_part', 'voix', 'manchot', 'simple']) {
      expect(TRAITS[traitId], traitId).toBeDefined();
      const reachable = EVENTS.some((e) => e.requires && e.id.startsWith('diff.'));
      expect(reachable, `aucun événement pour ${traitId}`).toBe(true);
    }
    const born = BIRTHS.filter((b) =>
      ['esprit_ailleurs', 'enfant_qui_entend', 'mutile_enfance'].includes(b.id),
    );
    expect(born.length).toBe(3);
    for (const b of born) expect(b.weight).toBeGreaterThan(0);
  });

  it('aucune de ces conditions n\'est seulement une perte', () => {
    // Un trait qui ne fait que retirer n'est pas un personnage, c'est une punition.
    for (const id of ['esprit_a_part', 'voix', 'manchot']) {
      const stats = Object.values(TRAITS[id]?.stats ?? {});
      expect(stats.some((v) => v > 0), `${id} ne donne rien`).toBe(true);
    }
  });
});
