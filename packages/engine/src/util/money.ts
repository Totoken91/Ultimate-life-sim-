/**
 * L'argent est en *sous*. Une bourse de journalier ≈ 200 sous.
 *
 * Doc 02 §5 : les mots avant les chiffres. Le joueur retient « à l'aise »,
 * pas « 4 812 ».
 */

const WEALTH_BANDS: readonly (readonly [number, string])[] = [
  [-Infinity, 'endetté'],
  [0, 'sans rien'],
  // Ces mots ne doivent surtout pas reprendre ceux des classes sociales
  // (« pauvre », « aisé ») : le joueur lisait « Bourse 199 sous (misère) » à
  // côté de « pauvre » et croyait à deux échelles contradictoires (doc 18 §3).
  [30, 'trois fois rien'],
  [200, 'de quoi manger'],
  [800, 'un petit bas de laine'],
  [3000, 'de quoi voir venir'],
  [12000, 'bien pourvu'],
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

/**
 * Ce que la bourse vaut **en temps**, la seule unité qui parle : un chiffre nu
 * ne dit rien, « de quoi tenir deux ans » dit tout. `annuel` est le coût de la
 * vie sur une année, tel que le système économique vient de le prélever.
 */
export function pursePhrase(sous: number, annuel: number): string {
  if (sous < 0) return `vous devez ${formatSous(-sous)} sous`;
  if (annuel <= 0) return `${formatSous(sous)} sous`;
  const annees = sous / annuel;
  const combien =
    annees < 0.25
      ? 'pas de quoi finir l\'année'
      : annees < 1
        ? 'de quoi tenir quelques mois'
        : annees < 2
          ? 'de quoi tenir un an'
          : annees < 6
            ? `de quoi tenir ${Math.floor(annees)} ans`
            : annees < 20
              ? 'de quoi ne plus compter'
              : 'de quoi ne plus jamais y penser';
  return `${formatSous(sous)} sous — ${combien}`;
}
