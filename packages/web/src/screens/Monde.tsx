import { useState } from 'react';
import type { Game } from '@ed/game';
import { factions, worldView } from '@ed/game';
import { RECORD_LABELS, formatSous, renderEntry, type RecordId } from '@ed/engine';
import { Bar, Btn, Card, Chips, Row, Section, pct } from '../ui.js';

type Onglet =
  | 'lieu'
  | 'rumeurs'
  | 'groupes'
  | 'chiffres'
  | 'classements'
  | 'records'
  | 'chronique';

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'lieu', label: 'Lieu' },
  { id: 'rumeurs', label: 'Rumeurs' },
  { id: 'groupes', label: 'Groupes' },
  { id: 'chiffres', label: 'Chiffres' },
  { id: 'classements', label: 'Classements' },
  { id: 'records', label: 'Records' },
  { id: 'chronique', label: 'Chronique' },
];

export function Monde({ game }: { game: Game }) {
  const [tab, setTab] = useState<Onglet>('chiffres');
  const st = game.stats(6);

  return (
    <>
      <Chips options={ONGLETS} value={tab} onChange={setTab} />

      {tab === 'lieu' && <Lieu game={game} />}

      {tab === 'rumeurs' && <Rumeurs game={game} />}

      {tab === 'groupes' && <Groupes game={game} />}

      {tab === 'chiffres' && (
        <>
          <Section>Population — an {st.year}</Section>
          <Card>
            <Row k="Vivants" v={st.population} />
            <Row k="Ont vécu en tout" v={st.everLived} />
            <Row k="Âge médian" v={`${st.medianAge} ans`} />
            <Row k="Vie médiane" v={`${st.medianLifespan} ans`} />
            <Row k="Morts avant 13 ans" v={pct(st.childMortality)} tone="danger" />
          </Card>

          <Section>Depuis le début</Section>
          <Card>
            <Row k="Naissances" v={st.births} tone="good" />
            <Row k="Morts" v={st.deaths} />
            <Row k="Mariages" v={st.marriages} />
            <Row k="Morts de main d’homme" v={st.murders} tone="danger" />
          </Card>

          {st.causes.length > 0 && (
            <>
              <Section>Ce qui tue</Section>
              <Card>
                {st.causes.map((c) => (
                  <div key={c.cause} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>{c.cause}</span>
                      <span className="muted">{c.count}</span>
                    </div>
                    <Bar share={c.share} />
                  </div>
                ))}
              </Card>
            </>
          )}

          <Section>Richesse</Section>
          <Card>
            <Row k="Total en circulation" v={`${formatSous(st.totalWealth)} sous`} />
            <Row k="Détenu par le centile" v={pct(st.topOneShare)} tone="gold" />
          </Card>

          <Section>Conditions</Section>
          <Card>
            {st.classes.map((row) => (
              <div key={row.cls} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{row.cls}</span>
                  <span className="muted">
                    {row.count} · {pct(row.share)}
                  </span>
                </div>
                <Bar share={row.share} />
              </div>
            ))}
          </Card>

          <Section>Implantations</Section>
          <Card>
            {st.settlements.map((s) => (
              <Row key={s.id} k={s.name} v={`${s.population} âmes · âge ${s.medianAge}`} />
            ))}
          </Card>

          {st.jobs.length > 0 && (
            <>
              <Section>Métiers exercés</Section>
              <Card>
                {st.jobs.map((j) => (
                  <Row key={j.label} k={j.label} v={j.count} />
                ))}
              </Card>
            </>
          )}

          {st.houses.length > 0 && (
            <>
              <Section>Maisons du monde</Section>
              <Card>
                {st.houses.map((h) => (
                  <Row
                    key={h.id}
                    k={`Maison ${h.name}`}
                    v={`${h.rank} · ${h.prestige} · ${h.living} vivants`}
                  />
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {tab === 'classements' && (
        <>
          <Classement titre="Les plus riches" rows={st.richest} unite="sous" />
          <Classement titre="Les plus vieux" rows={st.oldest} unite="ans" />
          <Classement titre="La plus nombreuse descendance" rows={st.mostChildren} unite="enfants" />
          <Classement titre="Le plus de sang versé" rows={st.bloodiest} unite="morts" />
        </>
      )}

      {tab === 'records' && <Records game={game} />}

      {tab === 'chronique' && <Chronique game={game} />}
    </>
  );
}

function Classement({
  titre,
  rows,
  unite,
}: {
  titre: string;
  rows: { id: number; name: string; value: number; detail: string }[];
  unite: string;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <Section>{titre}</Section>
      <Card>
        {rows.map((r, i) => (
          <Row
            key={r.id}
            k={`${i + 1}. ${r.name}`}
            v={`${formatSous(r.value)} ${unite}`}
            tone={i === 0 ? 'gold' : undefined}
          />
        ))}
      </Card>
    </>
  );
}

function Records({ game }: { game: Game }) {
  const book = game.records();
  const ids = Object.keys(RECORD_LABELS) as RecordId[];
  const kept = ids.filter((id) => book[id]);
  return (
    <>
      <Section>Le livre des records</Section>
      <Card>
        <span className="muted">
          Ce que le Rivage a connu de plus extrême, depuis toujours. Un record survit à son
          détenteur.
        </span>
      </Card>
      {kept.length === 0 && (
        <Card>
          <span className="muted">Rien de notable n’a encore eu lieu.</span>
        </Card>
      )}
      {kept.map((id) => {
        const e = book[id]!;
        return (
          <Card key={id}>
            <div className="cool" style={{ fontSize: 13 }}>
              {RECORD_LABELS[id]}
            </div>
            <div style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
              {formatSous(e.value)}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {e.holder} — an {e.year}
              {e.detail ? `, ${e.detail}` : ''}
              {e.holderId !== null && (
                <span className={e.alive ? 'good' : 'faint'}> · {e.alive ? 'vivant' : 'mort'}</span>
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}

function Chronique({ game }: { game: Game }) {
  const entries = game.world.chronicle.filter((e) => e.importance >= 3).slice(-120);
  return (
    <>
      <Section>Chronique</Section>
      {entries.length === 0 && (
        <Card>
          <span className="muted">Rien n’a encore été consigné.</span>
        </Card>
      )}
      <Card>
        {entries.map((e, i) => (
          <div className="log" key={i}>
            <span className="faint">{e.year} — </span>
            {renderEntry(e)}
          </div>
        ))}
      </Card>
    </>
  );
}

/**
 * Ce que le monde a fait sans vous. Ce n'est pas la Chronique : la Chronique
 * est votre histoire, les rumeurs sont celles des autres (doc 13 §4).
 */
function Rumeurs({ game }: { game: Game }) {
  const w = worldView(game);
  if (w.news.length === 0) {
    return (
      <Card>
        <div className="prose" style={{ fontSize: 15, opacity: 0.65 }}>
          Rien ne vous est revenu aux oreilles ces dernières années.
        </div>
      </Card>
    );
  }
  return (
    <>
      <Section>Ce qu'on raconte</Section>
      <Card>
        {w.news.map((n, i) => (
          <div
            key={`${n.year}-${i}`}
            className="prose"
            style={{
              fontSize: 15,
              padding: '7px 0',
              opacity: n.ici ? 1 : 0.62,
              borderTop: i === 0 ? undefined : `1px solid var(--line)`,
            }}
          >
            <span style={{ opacity: 0.5, marginRight: 8 }}>{n.year}</span>
            {n.text}
          </div>
        ))}
      </Card>
    </>
  );
}

/**
 * Les bandes, compagnies et guildes qui tiennent le pays. Aucune n'a été
 * décrétée : elles sont nées de serments entre gens (doc 14 §1).
 */
function Groupes({ game }: { game: Game }) {
  const list = factions(game);
  if (list.length === 0) {
    return (
      <Card>
        <div className="prose" style={{ fontSize: 15, opacity: 0.65 }}>
          Personne n'a encore assez d'hommes derrière lui pour qu'on lui donne un nom.
        </div>
      </Card>
    );
  }
  return (
    <>
      <Section>{list.length} groupe(s) debout</Section>
      {list.slice(0, 20).map((f) => (
        <Card key={f.id}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            <strong style={{ fontSize: 16 }}>{f.name}</strong>
            <span style={{ opacity: 0.55, fontSize: 13, whiteSpace: 'nowrap' }}>
              {f.mien ? 'les vôtres' : f.ici ? 'ici' : f.seat}
            </span>
          </div>
          <div className="prose" style={{ fontSize: 14, opacity: 0.7, margin: '2px 0 8px' }}>
            {f.kind} · fondé{f.kind === 'bande' || f.kind === 'compagnie' || f.kind === 'guilde' ? 'e' : ''} en {f.since}
            {f.connu && !f.mien ? ' · vous en connaissez le chef' : ''}
          </div>
          <Row k="Hommes" v={f.members} />
          <Row k="Force" v={f.power} />
          <Row k="Cherche à" v={f.goal} />
          {f.losses > 0 && <Row k="Tombés" v={f.losses} tone="danger" />}
          {f.grip > 0 && <Row k="Emprise ici" v={`${f.grip} %`} tone={f.grip >= 60 ? 'danger' : undefined} />}
        </Card>
      ))}
    </>
  );
}

function Lieu({ game }: { game: Game }) {
  const w = worldView(game);
  return (
    <>
      <Section>{w.settlement.name}</Section>
      <Card>
        <div className="prose" style={{ fontSize: 15 }}>
          {w.settlement.description}
        </div>
      </Card>
      <Card>
        <Row k="Taille" v={w.settlement.size} />
        <Row k="Sûreté" v={w.settlement.danger} tone="danger" />
        <Row k="Année" v={w.year} />
        <Row k="Monde" v={w.mode} />
        <Row k="Connaissances" v={w.knownPeople} />
      </Card>
    </>
  );
}

export { Btn };
