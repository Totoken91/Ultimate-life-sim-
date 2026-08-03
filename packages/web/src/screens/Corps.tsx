import type { BodyView } from '@ed/game';
import { ans } from '@ed/engine';
import { Bar, Card, Row, Section } from '../ui.js';

const tone = (v: number): 'good' | 'gold' | 'danger' =>
  v >= 72 ? 'good' : v >= 45 ? 'gold' : 'danger';

export function Corps({ body }: { body: BodyView }) {
  const felt = body.vitals.filter((v) => v.feeling);
  return (
    <>
      <Section>Ce que vous ressentez</Section>
      <Card>
        {body.pain && <div className="log danger">{body.pain}</div>}
        {felt.map((v) => (
          <div className="log" key={v.id}>
            {v.feeling}
          </div>
        ))}
        {body.infection > 20 && <div className="log danger">quelque chose vous ronge</div>}
        {!body.pain && felt.length === 0 && body.infection <= 20 && (
          <span className="muted">Rien de particulier. Le corps se tait.</span>
        )}
      </Card>

      {body.conditions.length > 0 && (
        <>
          <Section>Ce que vous portez</Section>
          {body.conditions.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={c.severity >= 60 ? 'danger' : 'gold'}>{c.label}</span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {c.years === 0 ? 'cette année' : `depuis ${ans(c.years)}`}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 13, margin: '4px 0 6px' }}>
                {c.sign ?? c.kind}
              </div>
              <Bar share={c.severity / 100} />
            </Card>
          ))}
        </>
      )}

      <Section>Constantes</Section>
      <Card>
        {body.vitals.map((v) => (
          <Row
            key={v.id}
            k={v.label}
            v={v.value < 36 ? 'basse' : v.value > 64 ? 'haute' : 'normale'}
            tone={v.value < 36 || v.value > 64 ? 'danger' : 'muted'}
          />
        ))}
      </Card>

      <Section>Le détail du corps</Section>
      <Card>
        {body.organs.map((o) => (
          <div key={o.id} style={{ marginBottom: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{o.label}</span>
              <span className={tone(o.value)}>{o.state}</span>
            </div>
            <Bar share={o.value / 100} />
          </div>
        ))}
      </Card>
    </>
  );
}
