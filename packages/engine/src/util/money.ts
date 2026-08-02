/**
 * L'argent est en *sous*. Une bourse de journalier ≈ 200 sous.
 *
 * Doc 02 §5 : les mots avant les chiffres. Le joueur retient « à l'aise »,
 * pas « 4 812 ».
 */

const WEALTH_BANDS: readonly (readonly [number, string])[] = [
  [-Infinity, 'endetté'],
  [0, 'sans rien'],
  [30, 'misère'],
  [200, 'pauvre'],
  [800, 'modeste'],
  [3000, 'à l\'aise'],
  [12000, 'aisé'],
  [50000, 'riche'],
  [250000, 'fortuné'],
  [1_500_000, 'opulent'],
  [20_000_000, 'souverain'],
  [500_000_000, 'démesuré'],
];

export function wealthBand(sous: number): string {
  let label = 'endetté';
  for (const [threshold, name] of WEALTH_BANDS) {
    if (sous >= threshold) label = name;
  }
  return label;
}

/** Groupe les milliers avec une espace fine insécable. */
export function formatSous(sous: number): string {
  const sign = sous < 0 ? '-' : '';
  const n = Math.abs(Math.round(sous));
  if (n < 1_000_000) return sign + n.toLocaleString('fr-FR').replace(/ | /g, ' ');
  if (n < 1_000_000_000) return `${sign}${(n / 1_000_000).toFixed(1)} M`;
  if (n < 1_000_000_000_000) return `${sign}${(n / 1_000_000_000).toFixed(1)} Md`;
  const exp = Math.floor(Math.log10(n));
  return `${sign}${(n / 10 ** exp).toFixed(1)}×10^${exp}`;
}

export function describeWealth(sous: number): string {
  return `${formatSous(sous)} sous (${wealthBand(sous)})`;
}
