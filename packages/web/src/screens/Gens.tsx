import { useState } from 'react';
import type { Game, RelationView } from '@ed/game';
import { TRAININGS } from '@ed/game';
import type { EntityId } from '@ed/engine';
import { ans } from '@ed/engine';
import { Btn, Card, Row, Section } from '../ui.js';

const tone = (r: RelationView): 'good' | 'danger' | 'muted' =>
  r.affection >= 40 ? 'good' : r.affection <= -35 ? 'danger' : 'muted';

export function Gens({
  game,
  people,
  act,
}: {
  game: Game;
  people: RelationView[];
  act: (fn: () => void) => void;
}) {
  const [openId, setOpenId] = useState<EntityId | null>(null);
  const target = people.find((p) => p.id === openId) ?? null;

  if (target) {
    const other = game.world.get(target.id);
    const memories = game.world.memories
      .about(game.player.id, target.id, game.world.year)
      .slice(0, 4);
    const canTrain = target.isChild && target.age >= 4 && target.age <= 17;
    const canCourt = !game.player.spouseId && !other?.spouseId;

    const interact = (kind: Parameters<typeof game.submit>[0] extends never ? never : string) =>
      act(() => {
        game.submit({ t: 'interact', targetId: target.id, kind: kind as never });
        setOpenId(null);
      });

    return (
      <>
        <Btn onClick={() => setOpenId(null)}>← Retour</Btn>
        <Section>{target.name}</Section>
        <Card>
          <Row k="Lien" v={target.label} />
          <Row k="Âge" v={`${ans(target.age)}`} />
          <Row k="Envers vous" v={target.feeling} tone={tone(target)} />
        </Card>

        {memories.length > 0 && (
          <>
            <Section>Ce que vous gardez</Section>
            <Card>
              {memories.map((m) => (
                <div className="log" key={m.id}>
                  <span className="faint">{m.year} — </span>
                  {m.text}
                </div>
              ))}
            </Card>
          </>
        )}

        <Section>Faire quelque chose</Section>
        <Btn onClick={() => interact('parler')} hint="entretenir le lien, sans rien attendre">
          Passer du temps ensemble
        </Btn>
        <Btn onClick={() => interact('offrir')} hint="un présent coûte, et on s’en souvient">
          Offrir quelque chose
        </Btn>
        <Btn onClick={() => interact('disputer')} hint="ça monte, rien n’est réglé">
          Vous expliquer
        </Btn>
        <Btn
          locked={!canCourt}
          onClick={() => interact('courtiser')}
          hint={canCourt ? 'il faut du temps et de l’affection' : 'l’un de vous est déjà marié'}
        >
          Courtiser
        </Btn>
        <Btn onClick={() => interact('demander')} hint="on n’oublie pas d’avoir prêté">
          Demander de l’aide
        </Btn>

        {canTrain && (
          <>
            <Section>Former l’enfant</Section>
            {(Object.keys(TRAININGS) as (keyof typeof TRAININGS)[]).map((k) => (
              <Btn key={k} onClick={() => interact(k)} hint="cinq ans dans la même école laissent une marque">
                {TRAININGS[k].label}
              </Btn>
            ))}
          </>
        )}

        {target.isChild && (
          <Btn
            locked={!game.canDesignate()}
            onClick={() => interact('designer')}
            warn
            hint={
              game.canDesignate()
                ? 'les autres l’apprendront, et ne l’oublieront pas'
                : 'il faut une maison à léguer'
            }
          >
            Le désigner héritier
          </Btn>
        )}
      </>
    );
  }

  return (
    <>
      <Section>{people.length} personne(s) dans votre vie</Section>
      {people.length === 0 && (
        <Card>
          <span className="muted">Vous ne connaissez personne.</span>
        </Card>
      )}
      {people.map((p) => (
        <Btn
          key={p.id}
          onClick={() => setOpenId(p.id)}
          hint={`${p.label} · ${ans(p.age)}`}
        >
          {p.isSpouse ? '♦ ' : p.isChild ? '· ' : ''}
          {p.name}
          <span className={`hint ${tone(p)}`}>{p.feeling}</span>
        </Btn>
      ))}
    </>
  );
}
