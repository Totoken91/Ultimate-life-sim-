import { useState } from 'react';
import type { Game } from '@ed/game';
import { SUCCESSION_LABELS, formatSous, renderTree, type SuccessionLaw } from '@ed/engine';
import { Btn, Card, Row, Section } from '../ui.js';

export function Dynastie({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const [view, setView] = useState<'resume' | 'arbre' | 'loi'>('resume');
  const d = game.dynasty();
  const heirs = game.heirs();
  const house = game.house();

  if (view === 'arbre') {
    const node = game.tree({ ancestors: 2, maxDepth: 5, maxChildren: 8 });
    return (
      <>
        <Btn onClick={() => setView('resume')}>← Retour</Btn>
        <Section>Arbre généalogique</Section>
        <Card>
          <div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
            ◆ vous · ⚭ époux · † mort
          </div>
          <div className="tree">
            {node
              ? renderTree(node).map((line, i) => (
                  <div key={i} className={line.includes('◆') ? 'me' : undefined}>
                    {line}
                  </div>
                ))
              : 'Rien à afficher.'}
          </div>
        </Card>
      </>
    );
  }

  if (view === 'loi') {
    const laws = Object.keys(SUCCESSION_LABELS) as SuccessionLaw[];
    return (
      <>
        <Btn onClick={() => setView('resume')}>← Retour</Btn>
        <Section>Loi de succession</Section>
        <Card>
          <span className="muted">
            Changer la loi coûte 25 de prestige et froisse ceux que l’ancienne favorisait.
          </span>
        </Card>
        {laws.map((law) => (
          <Btn
            key={law}
            locked={law === house?.law}
            hint={SUCCESSION_LABELS[law]}
            onClick={() =>
              act(() => {
                game.submit({ t: 'setLaw', law });
                setView('resume');
              })
            }
          >
            {law}
            {law === house?.law ? ' — actuelle' : ''}
          </Btn>
        ))}
      </>
    );
  }

  return (
    <>
      <Section>{d.houseName ? `Maison ${d.houseName}` : 'Votre lignée'}</Section>
      <Card>
        {d.houseName ? (
          <>
            <Row k="Rang" v={d.rank} tone="gold" />
            <Row k="Prestige" v={d.prestige} />
            <Row k="Fondée en" v={d.founded} />
            <Row
              k="Succession"
              v={SUCCESSION_LABELS[(d.law ?? 'primogeniture') as SuccessionLaw]}
            />
            <Row k="Fortune de maison" v={`${formatSous(d.wealth)} sous`} />
          </>
        ) : (
          <span className="muted">
            Vous n’avez pas encore fondé de maison. Il faut de la fortune, des enfants, et
            le vouloir.
          </span>
        )}
      </Card>

      <Section>Descendance</Section>
      <Card>
        <Row k="Générations" v={d.generations} />
        <Row k="Vivants" v={d.livingDescendants} tone="good" />
        <Row k="En tout" v={d.totalDescendants} />
        <Row k="Disparus" v={d.deadDescendants} tone="muted" />
        {d.eldest && <Row k="Doyen de la lignée" v={d.eldest} />}
      </Card>

      <Section>Ordre successoral</Section>
      <Card>
        {heirs.length === 0 ? (
          <span className="danger">Personne ne vous succéderait aujourd’hui.</span>
        ) : (
          heirs
            .slice(0, 8)
            .map((h) => (
              <Row
                key={h.id}
                k={`${h.claim}. ${h.name}`}
                v={`${h.age} ans · ${h.note || h.relation}`}
              />
            ))
        )}
      </Card>

      {d.heads.length > 1 && (
        <>
          <Section>Chefs successifs</Section>
          <Card>
            {d.heads.map((h, i) => (
              <Row key={i} k={h.name} v={h.to ? `† ${h.to}` : 'en charge'} />
            ))}
          </Card>
        </>
      )}

      <Btn onClick={() => setView('arbre')}>Arbre généalogique</Btn>
      <Btn
        locked={!game.canSetLaw()}
        onClick={() => setView('loi')}
        hint={game.canSetLaw() ? undefined : 'il faut être chef de sa maison'}
      >
        Changer la loi de succession
      </Btn>
    </>
  );
}
