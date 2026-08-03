import { useCallback, useRef, useState } from 'react';
import { loadRuleset } from '@ed/content';
import { Observer, type Chapter } from '@ed/game';
import { ans, regimeName } from '@ed/engine';
import { Btn, Card, Chips, Section } from '../ui.js';
import { Carte } from './Carte.js';

const ruleset = loadRuleset();

type Onglet = 'chapitres' | 'carte' | 'pays';

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'chapitres', label: 'Ce qui arrive' },
  { id: 'carte', label: 'La carte' },
  { id: 'pays', label: 'Le pays' },
];

/**
 * **Observer un monde sans y jouer** (doc 19 §4).
 *
 * Aucune décision n'est demandée. Un fil de vie se débrouille seul, la
 * succession est automatique, et le monde défile par chapitres de vingt-cinq
 * ans. C'est le mode le plus honnête du jeu : il montre ce que la simulation
 * produit quand personne ne l'aide.
 */
export function Observatoire({ onQuit }: { onQuit: () => void }) {
  const ref = useRef<Observer | null>(null);
  const [, force] = useState(0);
  const [tab, setTab] = useState<Onglet>('chapitres');
  const [seedText, setSeedText] = useState('');

  const redraw = useCallback(() => force((n) => n + 1), []);

  const demarrer = useCallback(() => {
    const seed = Number.parseInt(seedText, 10);
    ref.current = Observer.create(
      ruleset,
      Number.isFinite(seed) ? { seed, chapter: 25 } : { chapter: 25 },
    );
    ref.current.next();
    redraw();
  }, [seedText, redraw]);

  const obs = ref.current;

  if (!obs) {
    return (
      <>
        <Section>Observer un monde</Section>
        <Card>
          <div className="prose" style={{ fontSize: 15 }}>
            <p>
              Vous ne jouez pas. Vous regardez. Un fil de vie prend ses décisions tout seul,
              la succession se fait sans vous, et le monde avance par tranches de vingt-cinq
              ans.
            </p>
            <p style={{ opacity: 0.7 }}>
              C’est aussi une mise à l’épreuve : si le monde n’est intéressant que parce
              qu’on y joue, il n’est pas intéressant.
            </p>
          </div>
        </Card>
        <Card>
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="Graine (vide = au hasard)"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
            }}
          />
        </Card>
        <Btn primary onClick={demarrer}>
          Commencer à regarder
        </Btn>
        <Btn onClick={onQuit}>Retour</Btn>
      </>
    );
  }

  const chapitres = obs.chapters;
  const dernier = chapitres[chapitres.length - 1] as Chapter;

  return (
    <>
      <Section>
        An {dernier.from} – {dernier.to}
      </Section>
      <Card>
        <div style={{ fontSize: 17, marginBottom: 6 }}>{dernier.headline}</div>
        <div className="prose" style={{ fontSize: 13, opacity: 0.65 }}>
          {dernier.population} vivants · {dernier.births} naissances · {dernier.deaths} morts ·{' '}
          {dernier.factions} groupes · pain {dernier.breadPrice.toFixed(1)} sous
        </div>
        <div className="prose" style={{ fontSize: 13, opacity: 0.65 }}>
          on suit {dernier.following}, {ans(dernier.followingAge)}
          {dernier.generations > 0 ? ` — ${dernier.generations} succession(s)` : ''}
        </div>
      </Card>

      {obs.over ? (
        <Card>
          <div className="prose">Le fil s’est éteint : plus personne à suivre.</div>
        </Card>
      ) : (
        <>
          <Btn primary onClick={() => { obs.next(); redraw(); }}>
            Encore vingt-cinq ans
          </Btn>
          <Btn
            onClick={() => {
              for (let i = 0; i < 4 && !obs.over; i++) obs.next();
              redraw();
            }}
            hint="quatre chapitres d’un coup"
          >
            Un siècle
          </Btn>
        </>
      )}

      <Chips options={ONGLETS} value={tab} onChange={setTab} />

      {tab === 'chapitres' &&
        chapitres
          .slice()
          .reverse()
          .map((ch) => (
            <Card key={ch.from}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ fontSize: 15 }}>
                  {ch.from} – {ch.to}
                </strong>
                <span style={{ opacity: 0.55, fontSize: 13 }}>{ch.headline}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                {ch.lines.map((l, i) => (
                  <div key={i} className="log" style={{ opacity: l.kind === 'rumeur' ? 0.65 : 1 }}>
                    <span style={{ opacity: 0.5 }}>{l.year}</span> {l.text}
                  </div>
                ))}
                {ch.omitted > 0 && (
                  <div className="log" style={{ opacity: 0.4 }}>
                    … et {ch.omitted} lignes de moindre portée
                  </div>
                )}
              </div>
            </Card>
          ))}

      {tab === 'carte' && <Carte world={obs.world} />}

      {tab === 'pays' && (
        <Card>
          {obs.world
            .domainList()
            .filter((d) => d.settlement !== null)
            .map((d) => (
              <div key={d.id} style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 15 }}>{d.name}</strong>
                  <span style={{ opacity: 0.6, fontSize: 13 }}>{regimeName(d.government)}</span>
                </div>
                <div className="prose" style={{ fontSize: 13, opacity: 0.6 }}>
                  légitimité {Math.round(d.legitimacy)} · mécontentement {Math.round(d.unrest)} ·{' '}
                  {Math.round(d.population)} âmes
                </div>
              </div>
            ))}
        </Card>
      )}

      <Btn onClick={onQuit}>Assez vu</Btn>
    </>
  );
}
