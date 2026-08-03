import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRuleset } from '@ed/content';
import { Game, body as bodyView, relations, self, status } from '@ed/game';
import { Meter } from './ui.js';
import { Vie } from './screens/Vie.js';
import { Gens } from './screens/Gens.js';
import { Vous } from './screens/Vous.js';
import { Dynastie } from './screens/Dynastie.js';
import { Monde } from './screens/Monde.js';
import { Evenement, Issue, Mort, Naissance } from './screens/Moments.js';

const ruleset = loadRuleset();
const SAVE_KEY = 'eternal-dynasty:save:v1';

type Tab = 'vie' | 'gens' | 'vous' | 'dynastie' | 'monde';

const TABS: { id: Tab; label: string }[] = [
  { id: 'vie', label: 'Vie' },
  { id: 'gens', label: 'Gens' },
  { id: 'vous', label: 'Vous' },
  { id: 'dynastie', label: 'Dynastie' },
  { id: 'monde', label: 'Monde' },
];

function load(): Game | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? Game.load(ruleset, raw) : null;
  } catch {
    // Une sauvegarde d'une version antérieure et sans migration ne doit jamais
    // empêcher de jouer : on la met de côté plutôt que de bloquer l'écran.
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function App() {
  const gameRef = useRef<Game | null>(null);
  const [, force] = useState(0);
  const [tab, setTab] = useState<Tab>('vie');
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    gameRef.current = load();
    setBooted(true);
  }, []);

  const redraw = useCallback(() => force((n) => n + 1), []);

  const act = useCallback(
    (fn: () => void) => {
      fn();
      const game = gameRef.current;
      if (game) {
        try {
          localStorage.setItem(SAVE_KEY, game.save());
        } catch {
          // quota plein ou navigation privée : on joue quand même
        }
      }
      redraw();
    },
    [redraw],
  );

  const start = useCallback(
    (seed?: number) => {
      gameRef.current = Game.create(ruleset, seed === undefined ? {} : { seed });
      setTab('vie');
      act(() => {});
    },
    [act],
  );

  if (!booted) return null;
  const game = gameRef.current;

  if (!game) return <Titre onStart={start} />;

  // Les moments prennent tout l'écran : on ne joue pas avec des onglets
  // pendant qu'on est en train de choisir sa vie.
  if (game.phase === 'naissance') {
    return (
      <div className="app">
        <Naissance game={game} act={act} />
      </div>
    );
  }
  if (game.phase === 'evenement') {
    return (
      <div className="app">
        <Evenement game={game} act={act} />
      </div>
    );
  }
  if (game.phase === 'resultat') {
    return (
      <div className="app">
        <Issue game={game} act={act} />
      </div>
    );
  }
  if (game.phase === 'mort') {
    return (
      <div className="app">
        <Mort game={game} act={act} onNewWorld={() => start()} />
      </div>
    );
  }

  const s = status(game);
  const people = relations(game);
  const me = self(game);
  const myBody = bodyView(game);

  return (
    <div className="app">
      <header className="hdr">
        <h1>{s.name}</h1>
        <div className="sub">
          {s.age} ans · {s.stage} · {s.settlement}
        </div>
        <div className="sub">
          {[s.house, s.socialClass, s.job].filter(Boolean).join(' · ')}
        </div>
        {s.titles.length > 0 && <div className="titles">{s.titles.join(' · ')}</div>}
        <div className="vitals">
          <div className="vital">
            <div className="lbl">Santé</div>
            <div className="val">{s.health}</div>
            <Meter value={s.healthValue} />
          </div>
          <div className="vital">
            <div className="lbl">Humeur</div>
            <div className="val">{s.mood}</div>
            <Meter value={s.moodValue} />
          </div>
          <div className="vital">
            <div className="lbl">Bourse</div>
            <div className="val">{s.wealth}</div>
          </div>
          <div className="vital">
            <div className="lbl">Année</div>
            <div className="val">{s.year}</div>
          </div>
        </div>
      </header>

      <div className="scroll">
        {tab === 'vie' && <Vie game={game} act={act} />}
        {tab === 'gens' && <Gens game={game} people={people} act={act} />}
        {tab === 'vous' && <Vous game={game} me={me} status={s} body={myBody} act={act} />}
        {tab === 'dynastie' && <Dynastie game={game} act={act} />}
        {tab === 'monde' && <Monde game={game} />}
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Titre({ onStart }: { onStart: (seed?: number) => void }) {
  const [seed, setSeed] = useState('');
  return (
    <div className="app">
      <div className="title-screen">
        <h1>Eternal Dynasty</h1>
        <div className="muted" style={{ marginBottom: 20 }}>
          Le Rivage
        </div>
        <div className="prose muted" style={{ fontSize: 16, marginBottom: 24 }}>
          Vous naissez quelque part, sans l’avoir choisi. Ce qui suit dépend un peu de vous
          et beaucoup du monde. Rien n’est écrit d’avance.
        </div>
        <button className="btn primary" onClick={() => onStart()}>
          Nouvelle vie
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="btn"
            style={{ flex: 1, marginBottom: 8 }}
            inputMode="numeric"
            placeholder="Graine (pour rejouer la même partie)"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <button
            className="btn"
            style={{ width: 'auto', paddingInline: 18 }}
            onClick={() => {
              const n = Number.parseInt(seed, 10);
              onStart(Number.isFinite(n) ? n : undefined);
            }}
          >
            Jouer
          </button>
        </div>
        <div className="faint" style={{ fontSize: 12, marginTop: 16 }}>
          La partie est sauvegardée dans ce navigateur, à chaque choix.
        </div>
      </div>
    </div>
  );
}
