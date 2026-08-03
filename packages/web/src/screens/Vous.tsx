import { useState } from 'react';
import type { BodyView, Game, SelfView, StatusView } from '@ed/game';
import { ans } from '@ed/engine';
import { Bar, Btn, Card, Chips, Row, Section } from '../ui.js';
import { Corps } from './Corps.js';

export function Vous({
  game,
  me,
  status,
  body,
  act,
}: {
  game: Game;
  me: SelfView;
  status: StatusView;
  body: BodyView;
  act: (fn: () => void) => void;
}) {
  const [tab, setTab] = useState<'esprit' | 'corps' | 'chez'>('esprit');
  return (
    <>
      <Chips
        options={[
          { id: 'esprit' as const, label: 'Vous' },
          { id: 'corps' as const, label: 'Le corps' },
          { id: 'chez' as const, label: 'Chez vous' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'corps' && <Corps body={body} />}
      {tab === 'chez' && <ChezVous game={game} act={act} />}
      {tab === 'esprit' && (
    <>
      <Section>Attributs</Section>
      <Card>
        {status.stats.map((s) => (
          <div key={s.id} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 15 }}>{s.label}</strong>
              <span style={{ fontSize: 14 }}>
                {s.value} <span style={{ opacity: 0.55 }}>· {s.band}</span>
              </span>
            </div>
            <div className="prose" style={{ fontSize: 13, opacity: 0.62, marginTop: 2 }}>
              {s.desc}
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <Row k="Revenus de l'année" v={`${status.income} sous`} tone={status.income > 0 ? 'good' : undefined} />
        <Row k="Coût de la vie" v={`${status.upkeep} sous`} tone="danger" />
      </Card>

      {me.traits.length > 0 && (
        <>
          <Section>Ce que vous êtes</Section>
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

      {me.skills.length > 0 && (
        <>
          <Section>Compétences</Section>
          <Card>
            {me.skills.slice(0, 14).map((s) => (
              <div key={s.label} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>{s.label}</span>
                  <span className="muted">{s.band}</span>
                </div>
                <Bar share={s.value / 100} />
              </div>
            ))}
          </Card>
        </>
      )}

      {me.injuries.length > 0 && (
        <>
          <Section>Ce que le corps garde</Section>
          <Card>
            {me.injuries.map((i) => (
              <div className="log danger" key={i}>
                {i}
              </div>
            ))}
          </Card>
        </>
      )}

      {me.children.length > 0 && (
        <>
          <Section>Descendance</Section>
          <Card>
            {me.children.map((k) => (
              <Row
                key={k.name}
                k={k.name}
                v={k.alive ? `${ans(k.age)}` : 'mort'}
                tone={k.alive ? undefined : 'danger'}
              />
            ))}
          </Card>
        </>
      )}

      {me.memories.length > 0 && (
        <>
          <Section>Souvenirs</Section>
          <Card>
            {me.memories.map((m, i) => (
              <div className="log" key={i}>
                <span className="faint">{m.year} — </span>
                {m.text}
              </div>
            ))}
          </Card>
        </>
      )}

      {me.paths.length > 0 && (
        <>
          <Section>Voies ouvertes</Section>
          <Card>
            <span className="violet">{me.paths.join(' · ')}</span>
          </Card>
        </>
      )}

      <Section>Le fil en suspens</Section>
      <Card>
        <Row
          k="Choses qui n’ont pas fini"
          v={game.world.seeds.length}
          tone="violet"
        />
      </Card>
    </>
      )}
    </>
  );
}

/**
 * Ce qu'on possède, et ceux qui le tiennent (doc 17). L'entretien est la
 * mécanique centrale : ce que le joueur doit lire ici, c'est le coût annuel.
 */
function ChezVous({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const h = game.household();
  const gouv = game.ruledDomain();
  const temps = game.budget;
  return (
    <>
      <Section>Ce que ça coûte</Section>
      <Card>
        <Row k="Par an" v={`${h.yearly} sous`} tone={h.yearly > 0 ? 'danger' : undefined} />
        <Row k="Bourse" v={`${game.player.wealth} sous`} />
        <Row k="Places libres" v={h.slots} />
        {temps.credits.length > 0 && (
          <Row k="Temps rendu" v={`+${temps.credits.reduce((n, c) => n + c.cost, 0)}`} tone="good" />
        )}
      </Card>

      {h.holdings.length > 0 && (
        <>
          <Section>Ce que vous possédez</Section>
          {h.holdings.map((x) => (
            <Card key={x.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{x.label}</strong>
                <span style={{ opacity: 0.6, fontSize: 13 }}>{x.condition}</span>
              </div>
              <Row k="Entretien" v={`${x.upkeep} sous/an`} />
              <button className="chip" onClick={() => act(() => game.submit({ t: 'sell', holdingId: x.id }))}>
                vendre
              </button>
            </Card>
          ))}
        </>
      )}

      {h.staff.length > 0 && (
        <>
          <Section>Ceux qui vous servent</Section>
          {h.staff.map((s) => (
            <Card key={s.personId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{s.name}</strong>
                <span style={{ opacity: 0.6, fontSize: 13 }}>{s.label}</span>
              </div>
              <Row k="Gages" v={`${s.wage} sous/an`} tone={s.unpaid > 0 ? 'danger' : undefined} />
              {s.unpaid > 0 && <Row k="Impayé depuis" v={`${s.unpaid} an(s)`} tone="danger" />}
              <button
                className="chip"
                onClick={() => act(() => game.submit({ t: 'dismiss', personId: s.personId }))}
              >
                renvoyer
              </button>
            </Card>
          ))}
        </>
      )}

      {h.buyable.length > 0 && <Section>Acheter</Section>}
      {h.buyable.map((d) => (
        <Btn
          key={d.id}
          locked={game.player.wealth < d.price || game.timeLeft < 1}
          hint={`${d.desc} — ${d.price} sous, puis ${d.upkeep}/an`}
          onClick={() => act(() => game.submit({ t: 'acquire', holdingId: d.id }))}
        >
          {d.label}
        </Btn>
      ))}

      {h.hirable.length > 0 && <Section>Prendre à son service</Section>}
      {h.hirable.map((d) => (
        <Btn
          key={d.id}
          locked={game.player.wealth < d.wage || game.timeLeft < 1}
          hint={`${d.desc} — ${d.wage} sous/an${d.temps > 0 ? ` · rend ${d.temps} temps` : ''}`}
          onClick={() => act(() => game.submit({ t: 'hire', retainerId: d.id }))}
        >
          {d.label}
        </Btn>
      ))}

      {gouv && (
        <>
          <Section>Vous gouvernez {gouv.name}</Section>
          <Card>
            <div className="prose" style={{ fontSize: 14, opacity: 0.75 }}>
              Changer une règle coûte de la légitimité, et froisse des gens qui ont un nom.
            </div>
          </Card>
          {game.reformOptions().map((o) => (
            <Card key={o.axis}>
              <div style={{ marginBottom: 6 }}>
                <strong>{o.label}</strong>{' '}
                <span style={{ opacity: 0.55, fontSize: 13 }}>— {o.current}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {o.choices.map((v) => (
                  <button
                    key={String(v)}
                    className="chip"
                    onClick={() =>
                      act(() => game.submit({ t: 'reform', axis: o.axis, value: v }))
                    }
                  >
                    {String(v)}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
