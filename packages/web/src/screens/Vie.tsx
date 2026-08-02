import type { Game } from '@ed/game';
import { Btn, Card, Section } from '../ui.js';

export function Vie({ game, act }: { game: Game; act: (fn: () => void) => void }) {
  const actions = game.availableActions();

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

      <Btn primary onClick={() => act(() => game.submit({ t: 'advance' }))}>
        Passer l’année
        <span className="hint">L’an {game.world.year} s’achève. Vous avez {game.age} ans.</span>
      </Btn>

      <Section>
        {game.actionUsed ? 'Vous avez déjà agi cette année' : 'Agir — une seule fois par an'}
      </Section>

      {actions.map((a) => (
        <Btn
          key={a.id}
          locked={game.actionUsed}
          hint={a.desc}
          onClick={() => act(() => game.submit({ t: 'action', actionId: a.id }))}
        >
          {a.label}
        </Btn>
      ))}
    </>
  );
}
