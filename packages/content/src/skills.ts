import type { SkillDef } from '@ed/engine';

function s(
  id: string,
  label: string,
  family: SkillDef['family'],
  stat: SkillDef['stat'],
): SkillDef {
  return { id, label, family, stat };
}

/** 16 compétences en Phase 1. On en ajoutera par voie de pouvoir en Phase 4. */
export const SKILLS: Record<string, SkillDef> = Object.fromEntries(
  [
    s('lame', 'Lame', 'combat', 'force'),
    s('arc', 'Arc', 'combat', 'agilite'),
    s('lutte', 'Lutte', 'combat', 'force'),
    s('survie', 'Survie', 'corps', 'endurance'),
    s('navigation', 'Navigation', 'artisanat', 'intelligence'),
    s('forge', 'Forge', 'artisanat', 'force'),
    s('artisanat', 'Artisanat', 'artisanat', 'agilite'),
    s('soin', 'Soin', 'savoir', 'intelligence'),
    s('lettres', 'Lettres', 'savoir', 'intelligence'),
    s('calcul', 'Calcul', 'savoir', 'intelligence'),
    s('negoce', 'Négoce', 'social', 'charisme'),
    s('rhetorique', 'Rhétorique', 'social', 'charisme'),
    s('intrigue', 'Intrigue', 'social', 'intelligence'),
    s('vol', 'Vol', 'crime', 'agilite'),
    s('crochetage', 'Crochetage', 'crime', 'agilite'),
    s('commandement', 'Commandement', 'commandement', 'charisme'),
  ].map((def) => [def.id, def]),
);
