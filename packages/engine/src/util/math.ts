export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Approche douce d'une cible — utilisé pour les dérives lentes (humeur, relations). */
export function drift(current: number, target: number, rate: number): number {
  return current + (target - current) * clamp(rate, 0, 1);
}

/** Progression logarithmique : sert aux compétences et au prestige. */
export function diminishing(current: number, gain: number, ceiling: number): number {
  if (gain <= 0) return current;
  const room = Math.max(0, ceiling - current);
  return current + gain * (room / Math.max(ceiling, 1));
}

const BANDS: readonly (readonly [number, string])[] = [
  [0, 'nul'],
  [10, 'infime'],
  [25, 'faible'],
  [40, 'modeste'],
  [55, 'correct'],
  [70, 'solide'],
  [85, 'remarquable'],
  [95, 'exceptionnel'],
  [100, 'légendaire'],
];

/** Bande nommée pour une valeur 0-100. Les mots avant les chiffres (doc 05 §1). */
export function band(value: number): string {
  let label = 'nul';
  for (const [threshold, name] of BANDS) {
    if (value >= threshold) label = name;
  }
  return label;
}
