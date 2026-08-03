import { useState } from 'react';
import type { Game } from '@ed/game';
import { standing, urges } from '@ed/game';
import { ans } from '@ed/engine';
import { Btn, Card, Chips, Section } from '../ui.js';

type Onglet = 'occasions' | 'entreprises' | 'coups';

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'occasions', label: 'Ce qui passe' },
  { id: 'entreprises', label: 'Ce que vous menez' },
  { id: 'coups', label: 'Coups' },
];

/**
 * L'année du joueur (doc 16). Plus « une action par an » : un budget de temps,
 * des entreprises qui durent, et des occasions que le monde vient d'ouvrir.
 */
export function Vie({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const y = game.year();
  const tire = urges(game);
  const place = standing(game);
  const creuse = game.idleYear;
  const [tab, setTab] = useState<Onglet>('occasions');
  const [temps, setTemps] = useState<Record<number, number>>({});

  const jauge = '◆'.repeat(y.left) + '◇'.repeat(Math.max(0, y.budget.total - y.left));

  return (
    <>
      {game.yearLog.length > 0 && (
        <>
          <Section>Cette année</Section>
          <Card>
            {game.yearLog.map((line, i) => (
              <div className="log" key={i}>
                {line}
              </div>
            ))}
          </Card>
        </>
      )}

      {tire.length > 0 && (
        <>
          <Section>Ce qui vous tire</Section>
          <Card>
            {tire.slice(0, 3).map((u) => (
              <div key={u.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '3px 0' }}>
                <div
                  style={{
                    width: 52,
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--line)',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${u.force}%`, height: '100%', background: 'var(--accent, #b98a3a)' }} />
                </div>
                <div className="prose" style={{ fontSize: 14 }}>
                  {u.phrase}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <Section>
        Votre place <span style={{ opacity: 0.5, fontWeight: 400 }}>{place.done}/{place.total}</span>
      </Section>
      <Card>
        {place.steps.map((st) => (
          <div key={st.id} style={{ display: 'flex', gap: 8, padding: '3px 0', opacity: st.done ? 0.45 : 1 }}>
            <span style={{ width: 14, flexShrink: 0 }}>{st.done ? '●' : '○'}</span>
            <div>
              <div style={{ fontSize: 14, textDecoration: st.done ? 'line-through' : 'none' }}>
                {st.label}
              </div>
              {!st.done && (
                <div className="prose" style={{ fontSize: 13, opacity: 0.6 }}>
                  {st.how}
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Section>Votre temps</Section>
      <Card>
        <div style={{ fontSize: 22, letterSpacing: 3 }}>{jauge}</div>
        <div className="prose" style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
          {y.left > 0
            ? `Il vous reste ${y.left} temps sur ${y.budget.total} cette année.`
            : 'Votre année est prise. Il ne reste qu’à la laisser passer.'}
        </div>
        {y.budget.charges.length > 0 && (
          <div className="prose" style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
            {y.budget.charges.map((ch) => `${ch.label} (−${ch.cost})`).join(' · ')}
          </div>
        )}
      </Card>

      {creuse ? (
        <Btn primary onClick={() => act(() => game.submit({ t: 'skip' }))}>
          Laisser filer les années
          <span className="hint">
            Rien ne vous est demandé. Vous avez {ans(game.age)}.
          </span>
        </Btn>
      ) : (
        <Btn primary onClick={() => act(() => game.submit({ t: 'advance' }))}>
          Passer l’année
          <span className="hint">L’an {game.world.year} s’achève. Vous avez {ans(game.age)}.</span>
        </Btn>
      )}

      {y.left > 0 && (
        <Btn onClick={() => act(() => game.submit({ t: 'rest' }))} hint="Ce qui reste, à ne rien faire. On en a besoin.">
          Souffler
        </Btn>
      )}

      <Chips options={ONGLETS} value={tab} onChange={setTab} />

      {tab === 'occasions' &&
        (y.occasions.length === 0 ? (
          <Card>
            <div className="prose" style={{ fontSize: 15, opacity: 0.65 }}>
              Rien ne s’ouvre cette année. Ça arrive, et souvent.
            </div>
          </Card>
        ) : (
          y.occasions.map((o) => (
            <Btn
              key={o.id}
              locked={o.cost > y.left}
              hint={`${o.detail} — ${o.cost} temps${o.closing ? ' · dernière année' : ''}`}
              onClick={() => act(() => game.submit({ t: 'seize', occasionId: o.id }))}
            >
              {o.label}
            </Btn>
          ))
        ))}

      {tab === 'entreprises' && (
        <>
          {y.pursuits.map((p) => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ fontSize: 16 }}>{p.label}</strong>
                {p.target && <span style={{ opacity: 0.55, fontSize: 13 }}>{p.target}</span>}
              </div>
              <div className="prose" style={{ fontSize: 14, opacity: 0.72, margin: '3px 0 8px' }}>
                {p.where}
                {p.idle > 0 ? ` · délaissée depuis ${p.idle} an(s)` : ''}
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--line)',
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: `${Math.round(p.progress * 100)}%`,
                    height: '100%',
                    background: 'var(--accent, #b98a3a)',
                  }}
                />
              </div>
              {y.left > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Array.from({ length: Math.min(3, y.left) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      className="chip"
                      onClick={() => {
                        setTemps({ ...temps, [p.id]: n });
                        act(() => game.submit({ t: 'invest', pursuitId: p.id, temps: n }));
                      }}
                    >
                      y mettre {n}
                    </button>
                  ))}
                  <button
                    className="chip"
                    onClick={() => act(() => game.submit({ t: 'abandon', pursuitId: p.id }))}
                  >
                    laisser tomber
                  </button>
                </div>
              )}
            </Card>
          ))}

          {y.openable.length > 0 && <Section>Commencer quelque chose</Section>}
          {y.openable.map((d) => (
            <Btn
              key={d.id}
              locked={y.left < 1}
              hint={`${d.kind} · environ ${d.cost} temps, sur plusieurs années`}
              onClick={() => act(() => game.submit({ t: 'start', pursuitId: d.id }))}
            >
              {d.label}
            </Btn>
          ))}
        </>
      )}

      {tab === 'coups' &&
        y.coups.map((a) => (
          <Btn
            key={a.id}
            locked={y.left < 1}
            hint={`${a.desc} — 1 temps`}
            onClick={() => act(() => game.submit({ t: 'action', actionId: a.id }))}
          >
            {a.label}
          </Btn>
        ))}
    </>
  );
}
