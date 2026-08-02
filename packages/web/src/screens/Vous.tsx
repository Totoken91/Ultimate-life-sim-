import { useState } from 'react';
import type { BodyView, Game, SelfView, StatusView } from '@ed/game';
import { Bar, Card, Chips, Row, Section } from '../ui.js';
import { Corps } from './Corps.js';

export function Vous({
  game,
  me,
  status,
  body,
}: {
  game: Game;
  me: SelfView;
  status: StatusView;
  body: BodyView;
}) {
  const [tab, setTab] = useState<'esprit' | 'corps'>('esprit');
  return (
    <>
      <Chips
        options={[
          { id: 'esprit' as const, label: 'Vous' },
          { id: 'corps' as const, label: 'Le corps' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'corps' && <Corps body={body} />}
      {tab === 'esprit' && (
    <>
      <Section>Attributs</Section>
      <Card>
        {status.stats.map((s) => (
          <Row key={s.id} k={s.short} v={s.value} />
        ))}
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
                v={k.alive ? `${k.age} ans` : 'mort'}
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
