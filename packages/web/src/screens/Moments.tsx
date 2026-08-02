import type { Game } from '@ed/game';
import { self, status } from '@ed/game';
import { fullName, renderEpitaph } from '@ed/engine';
import { Btn, Card, Prose, Section } from '../ui.js';

/** Les écrans qui prennent tout l'espace : naissance, événement, issue, mort. */

export function Naissance({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const s = status(game);
  const me = self(game);
  return (
    <div className="scroll">
      <Section>Naissance</Section>
      <h1 style={{ fontFamily: 'var(--prose)', fontSize: 24, margin: '0 0 4px' }}>{s.name}</h1>
      <div className="muted" style={{ marginBottom: 16 }}>
        An {s.year} · {s.settlement}
      </div>

      <Prose text={game.opening} />

      {me.traits.length > 0 && (
        <>
          <Section>Ce que vous êtes déjà</Section>
          <Card>
            {me.traits.map((t) => (
              <div key={t.label} style={{ marginBottom: 10 }}>
                <div className="cool">{t.label}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {t.desc}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {s.stats.map((st) => (
            <div key={st.id}>
              <span className="faint" style={{ fontSize: 11 }}>
                {st.short}{' '}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{st.value}</span>
            </div>
          ))}
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          {s.wealth}
        </div>
      </Card>

      <Btn primary onClick={() => act(() => game.submit({ t: 'advance' }))}>
        Commencer
      </Btn>
    </div>
  );
}

export function Evenement({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const ev = game.pending[0];
  if (!ev) return null;
  const s = status(game);
  return (
    <div className="scroll">
      <Section>
        An {s.year} · {s.age} ans
      </Section>
      <Prose text={ev.text} />
      <hr className="rule" />
      {ev.options.map((o) => (
        <Btn
          key={o.id}
          locked={o.locked}
          warn={!!o.hint}
          hint={o.locked ? o.lockedReason ?? 'cette option vous est fermée' : o.hint}
          onClick={() => act(() => game.submit({ t: 'choose', optionId: o.id }))}
        >
          {o.label}
        </Btn>
      ))}
    </div>
  );
}

export function Issue({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const o = game.outcome;
  if (!o) return null;
  return (
    <div className="scroll">
      <Section>{o.title}</Section>
      <Prose text={o.text} />
      {o.log.length > 0 && (
        <Card>
          {o.log.map((line, i) => (
            <div className="log" key={i}>
              {line}
            </div>
          ))}
        </Card>
      )}
      <Btn primary onClick={() => act(() => game.submit({ t: 'advance' }))}>
        Continuer
      </Btn>
    </div>
  );
}

export function Mort({
  game,
  act,
  onNewWorld,
}: {
  game: Game;
  act: (fn: () => void) => void;
  onNewWorld: () => void;
}) {
  const p = game.player;
  const age = (p.deathYear ?? game.world.year) - p.birthYear;
  const heirs = game.heirs();
  const strangers = game.strangers(3);

  return (
    <div className="scroll">
      <Section>Mort</Section>
      <h1 style={{ fontFamily: 'var(--prose)', fontSize: 24, margin: '0 0 4px' }}>
        {fullName(p)}
      </h1>
      <div className="muted">
        {p.birthYear} – {p.deathYear ?? game.world.year} · {age} ans
      </div>
      <div className="faint" style={{ fontStyle: 'italic', marginBottom: 16 }}>
        {p.causeOfDeath ?? 'de sa belle mort'}
      </div>

      <Section>Ce qui restera</Section>
      <Card>
        {renderEpitaph(game.world.chronicle, 10).map((line, i) => (
          <div className="log" key={i}>
            {line}
          </div>
        ))}
      </Card>

      {heirs.length > 0 ? (
        <>
          <Section>Votre sang</Section>
          {heirs.map((h) => (
            <Btn
              key={h.id}
              primary
              hint={`${h.age} ans · ${h.relation}${h.note ? ` · ${h.note}` : ''}`}
              onClick={() => act(() => game.submit({ t: 'continueAs', heirId: h.id }))}
            >
              {h.name}
            </Btn>
          ))}
        </>
      ) : (
        <Card>
          <span className="danger">Personne de votre sang ne reprend le nom.</span>
        </Card>
      )}

      {strangers.length > 0 && (
        <>
          <Section>Suivre quelqu’un d’autre</Section>
          {strangers.map((s) => (
            <Btn
              key={s.id}
              hint={`${s.age} ans · ${s.hook} · ${s.place}`}
              onClick={() => act(() => game.submit({ t: 'follow', id: s.id }))}
            >
              {s.name}
            </Btn>
          ))}
        </>
      )}

      <Section>Ou recommencer</Section>
      <Btn
        hint="le monde garde ses années et son histoire"
        onClick={() => act(() => game.submit({ t: 'newborn' }))}
      >
        Un nouveau-né, ailleurs
      </Btn>
      <Btn hint="tout repart de zéro" onClick={onNewWorld}>
        Un monde neuf
      </Btn>
    </div>
  );
}
