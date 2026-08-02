import type { ReactNode } from 'react';

/** Briques d'affichage. Aucune connaissance du jeu ici. */

export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export function Section({ children }: { children: ReactNode }) {
  return <div className="sec">{children}</div>;
}

export function Row({
  k,
  v,
  tone,
}: {
  k: ReactNode;
  v: ReactNode;
  tone?: 'gold' | 'danger' | 'good' | 'cool' | 'violet' | 'muted';
}) {
  return (
    <div className="row">
      <span className="k">{k}</span>
      <span className={`v ${tone ?? ''}`}>{v}</span>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  hint,
  warn,
  primary,
  locked,
}: {
  children: ReactNode;
  onClick?: () => void;
  hint?: string | undefined;
  warn?: boolean;
  primary?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      className={`btn${primary ? ' primary' : ''}${locked ? ' locked' : ''}`}
      onClick={locked ? undefined : onClick}
      disabled={locked}
    >
      {children}
      {hint ? <span className={`hint${warn ? ' warn' : ''}`}>{hint}</span> : null}
    </button>
  );
}

export function Meter({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colour = pct >= 70 ? 'var(--good)' : pct >= 40 ? 'var(--gold)' : 'var(--danger)';
  return (
    <div className="meter">
      <i style={{ width: `${pct}%`, background: colour }} />
    </div>
  );
}

export function Bar({ share }: { share: number }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(0, Math.min(100, share * 100))}%` }} />
    </div>
  );
}

export function Prose({ text }: { text: string }) {
  return (
    <div className="prose">
      {text.split('\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip${o.id === value ? ' on' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const pct = (x: number): string => `${(x * 100).toFixed(1)} %`;
