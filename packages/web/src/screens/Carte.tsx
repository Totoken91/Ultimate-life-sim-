import { useState } from 'react';
import { KIND_GLYPH, homePath, tileMap, type Tile, type World } from '@ed/engine';
import { Card, Section } from '../ui.js';

/** Une couleur par famille de tuile. Le ciel est froid, la terre est chaude. */
const TEINTE: Record<string, string> = {
  spirale: '#8ab4f8', elliptique: '#c9a227', irreguliere: '#b98ad0', naine: '#6f7f9f',
  'vide-intergalactique': 'transparent',
  bras: '#8ab4f8', noyau: '#f0c674', halo: '#5a6b86', nebuleuse: '#d07ab0',
  'amas-globulaire': '#e8e0c0', vide: 'transparent',
  'etoile-jaune': '#f5d76e', 'etoile-rouge': '#d97c6a', 'etoile-bleue': '#7fb8f0',
  'naine-blanche': '#e8eef5', binaire: '#f0b060', 'trou-noir': '#2a2a33',
  'system-mort': 'transparent',
  'monde-tempere': '#5fb37a', 'monde-gele': '#a8d0e6', 'monde-brule': '#c96a4a',
  'monde-ocean': '#4a8fd0', 'monde-mort': '#7a7268', geante: '#c9a06a',
  ceinture: '#8b8578', lune: '#b8b2a6', 'orbite-vide': 'transparent',
  ocean: '#3f7fb5', cote: '#c2b280', plaine: '#8fae63', foret: '#3f7a4a',
  montagne: '#8a8378', marais: '#6f7a52', desert: '#d6c08a', glace: '#cfe4ef',
  steppe: '#a8a463', cite: '#c9a227',
};

/**
 * La carte, de la région à l'univers (doc 19).
 *
 * On descend d'un clic, on remonte d'un clic. Les tuiles vides ne sont pas
 * cliquables : le vide est du vide, et prétendre le contraire serait mentir
 * sur la profondeur du jeu.
 */
export function Carte({ world }: { world: World }) {
  const [path, setPath] = useState<string>(() => homePath(world.seed));
  const [sel, setSel] = useState<Tile | null>(null);
  const m = tileMap(world, path);

  const descendre = (t: Tile) => {
    if (!t.enterable) return;
    setSel(null);
    setPath(t.path);
  };

  return (
    <>
      <Section>{m.title}</Section>
      <Card>
        <div className="prose" style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          {m.subtitle}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${m.cols}, 1fr)`,
            gap: 3,
          }}
        >
          {m.tiles.map((t) => {
            const couleur = TEINTE[t.kind] ?? '#666';
            const vide = couleur === 'transparent';
            return (
              <button
                key={t.path}
                onClick={() => (t.enterable ? descendre(t) : setSel(t))}
                title={`${t.name} — ${t.label}`}
                style={{
                  aspectRatio: '1',
                  border: t.onHomePath ? '1px solid var(--gold, #c9a227)' : '1px solid transparent',
                  borderRadius: 3,
                  background: vide ? 'rgba(255,255,255,0.03)' : couleur,
                  color: vide ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.6)',
                  cursor: t.enterable ? 'pointer' : 'default',
                  fontSize: 11,
                  lineHeight: 1,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {KIND_GLYPH[t.kind].trim() || ''}
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {m.up && (
          <button className="chip" onClick={() => { setSel(null); setPath(m.up as string); }}>
            remonter
          </button>
        )}
        {m.home && (
          <button
            className="chip"
            onClick={() => {
              const suite = (m.home as string).slice(path.length + 1).split('/')[0];
              setPath(`${path}/${suite}`);
              setSel(null);
            }}
          >
            vers le monde habité
          </button>
        )}
        <button className="chip" onClick={() => { setSel(null); setPath('u'); }}>
          l’univers
        </button>
      </div>

      {sel && (
        <Card>
          <strong>{sel.name}</strong>
          <div className="prose" style={{ fontSize: 14, opacity: 0.7 }}>
            {sel.label}. {sel.enterable ? 'On peut y descendre.' : 'Rien à y voir.'}
          </div>
        </Card>
      )}

      {m.tiles.some((t) => t.note) && (
        <>
          <Section>Ce qu’on y trouve</Section>
          <Card>
            {m.tiles
              .filter((t) => t.note)
              .map((t) => (
                <div key={t.path} style={{ padding: '3px 0' }}>
                  <strong style={{ fontSize: 15 }}>{t.name}</strong>
                  <div className="prose" style={{ fontSize: 13, opacity: 0.7 }}>
                    {t.note}
                  </div>
                </div>
              ))}
          </Card>
        </>
      )}
    </>
  );
}
