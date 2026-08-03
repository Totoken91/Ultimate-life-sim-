import type { System } from './types.js';
import type { Character, SocialClass } from '../model/types.js';
import type { GoodId } from '../model/domain.js';
import { GOOD_BASE_PRICE } from '../model/domain.js';
import { CLASS_LABELS, CLASS_ORDER } from '../model/types.js';
import { ageOf, effectiveStat } from '../model/character.js';

/** Rang numérique d'une classe, pour savoir si l'on monte ou si l'on tombe. */
const CLASS_RANK = Object.fromEntries(
  CLASS_ORDER.map((c, i) => [c, i]),
) as Record<SocialClass, number>;
import { clamp, diminishing } from '../util/math.js';

/** Coût de la vie annuel, par classe sociale. Le rang se paie. */
const UPKEEP: Record<SocialClass, number> = {
  esclave: 0,
  miserable: 25,
  pauvre: 90,
  commun: 320,
  aise: 1800,
  noble: 14000,
  royal: 180000,
};

/**
 * PRE — revenus, dépenses, progression professionnelle.
 *
 * Règle de conception (doc 03 §6) : le flux compte plus que le stock, et
 * l'argent achète du temps et des gens, jamais des attributs.
 */
export const Economy: System = {
  id: 'economy.income',
  phase: 'PRE',
  priority: 40,
  run(ctx) {
    const { world, ruleset } = ctx;
    for (const c of ctx.living) {
      const age = ageOf(c, world.year);
      if (age < 6) continue;
      const rng = ctx.rng.fork('economy', world.year, c.id);

      // Le revenu n'est plus un nombre fixe : c'est ce qu'on vend, **ici**, au
      // prix d'ici (doc 11 §3). Une pénurie de métal se voit désormais dans la
      // bourse d'un forgeron, et une disette enrichit celui qui a du grain.
      const dom = world.domainAt(c.settlement);
      let facteurVente = 1;
      let facteurVie = 1;
      if (dom) {
        const prixVivres = dom.prices['vivres'];
        if (prixVivres !== undefined) {
          facteurVie = clamp(prixVivres / GOOD_BASE_PRICE.vivres, 0.7, 2.4);
        }
      }

      let income = 0;
      const job = c.jobId ? ruleset.jobs[c.jobId] : undefined;
      if (job) {
        if (dom && job.produces) {
          let pondere = 0;
          let total = 0;
          for (const [good, qty] of Object.entries(job.produces)) {
            const g = good as GoodId;
            const prix = dom.prices[g];
            if (prix === undefined || !qty) continue;
            pondere += (prix / GOOD_BASE_PRICE[g]) * qty;
            total += qty;
          }
          if (total > 0) facteurVente = clamp(pondere / total, 0.45, 2.6);
        }
        // compétence + attribut lié font varier le revenu du simple au double
        const compétence = clamp(
          (c.skills[Object.keys(job.trains)[0] ?? ''] ?? 0) / 100,
          0,
          1,
        );
        const talent = clamp(effectiveStat(c, 'intelligence') / 200 + compétence * 0.6, 0, 1.1);
        const seniority = clamp(c.jobYears / 25, 0, 0.5);
        income = Math.round(
          job.income * (0.6 + talent + seniority) * (0.85 + rng.float() * 0.3) * facteurVente,
        );
        for (const [skillId, gain] of Object.entries(job.trains)) {
          c.skills[skillId] = diminishing(c.skills[skillId] ?? 0, gain ?? 0, 100);
        }
      } else if (age >= 14 && c.socialClass !== 'esclave' && !c.isPlayer) {
        // les PNJ sans métier grappillent de quoi survivre
        income = Math.round(UPKEEP[c.socialClass] * (0.7 + rng.float() * 0.5));
      }

      // Vivre coûte ce que coûte la vie sur place. C'est par là que la famine
      // atteint la bourse avant d'atteindre le corps.
      const upkeep = Math.round(UPKEEP[c.socialClass] * (age < 16 ? 0.4 : 1) * facteurVie);
      c.wealth = Math.round(c.wealth + income - upkeep);

      // **On n'emprunte pas, au Rivage.** Ce qu'on ne peut pas payer, on ne le
      // paie pas : on s'en passe, et le corps encaisse. Sans ce plancher, une
      // seule mauvaise année ouvrait une dette qui grossissait toute seule —
      // c'était l'unique cause de 96 % des vies « brisées », un puits sans
      // fond que rien dans le jeu ne permettait de remonter (doc 18 §5).
      let manque = 0;
      if (c.wealth < 0) {
        manque = -c.wealth;
        c.wealth = 0;
      }
      c.flags['manque'] = manque;
      // Le flux de l'année, lu ensuite par l'impôt : on taxe ce qui entre, pas
      // ce qu'on possède — sinon le prélèvement devient confiscatoire et les
      // trésors des domaines montent à des millions (doc 15 §5).
      c.flags['revenu'] = Math.max(0, income);

      // On ne dit plus les revenus chaque année : c'était la ligne la plus
      // fréquente du journal et la moins utile. Elle vit maintenant dans
      // l'écran de statut, où on peut la lire quand on la cherche.
      if (c.isPlayer) {
        c.flags['revenuAn'] = income;
        c.flags['depenseAn'] = upkeep;
        // En revanche, ne plus pouvoir tenir son train de vie se dit — et se
        // dit en donnant la sortie, sinon le joueur subit sans comprendre.
        if (manque > 0 && Number(c.flags['manqueAvant'] ?? 0) === 0) {
          world.say(
            `Il vous manque ${manque} sous pour tenir votre rang cette année. ` +
              'On rogne, on emprunte à personne, on se passe de choses. Gagner ' +
              'plus, ou vivre plus bas : il n\'y a pas de troisième porte.',
          );
        }
        c.flags['manqueAvant'] = manque;
      }
    }
  },
};

/** POST — la classe sociale suit la fortune, avec inertie. On ne monte pas vite. */
export const SocialMobility: System = {
  id: 'economy.mobility',
  phase: 'POST',
  priority: 40,
  run(ctx) {
    for (const c of ctx.living) {
      // La noblesse et la royauté sont des statuts, pas des soldes bancaires :
      // on n'y entre ni n'en sort par l'argent seul.
      if (c.socialClass === 'noble' || c.socialClass === 'royal') continue;
      if (c.socialClass === 'esclave') continue;

      // **Un enfant n'a pas de rang à lui.** Il a celui de sa maison. Sans
      // cette règle, le joueur lisait « Vous ne tenez plus votre rang » à un an
      // — une phrase qui ne veut rien dire et qu'on ne peut pas contredire.
      const age = ageOf(c, ctx.world.year);
      if (age < 16) {
        const foyer = ctx.world.get(c.fatherId) ?? ctx.world.get(c.motherId);
        if (foyer && foyer.socialClass !== c.socialClass) c.socialClass = foyer.socialClass;
        continue;
      }

      const target: SocialClass =
        c.wealth >= 60000 ? 'aise' : c.wealth >= 2500 ? 'commun' : c.wealth >= 150 ? 'pauvre' : 'miserable';
      if (target === c.socialClass) continue;
      const montee = CLASS_RANK[target] > CLASS_RANK[c.socialClass];
      // On monte lentement et on tombe vite. C'est vrai, et c'est surtout la
      // soupape : un rang qu'on ne peut plus tenir doit pouvoir être lâché
      // avant que la faim ne s'installe pour dix ans.
      const lastMove = Number(c.flags['classMoveYear'] ?? -99);
      if (ctx.world.year - lastMove < (montee ? 10 : 3)) continue;
      c.socialClass = target;
      c.flags['classMoveYear'] = ctx.world.year;
      // Dire *pourquoi*, sinon le joueur voit son rang changer sans comprendre.
      if (c.isPlayer) {
        ctx.world.say(
          montee
            ? `On vous traite autrement : ce que vous avez amassé se voit. Vous êtes ${CLASS_LABELS[target]}.`
            : `Vous ne tenez plus votre rang. On le remarque avant vous. Vous êtes ${CLASS_LABELS[target]}.`,
        );
      }
    }
  },
};

/** PRE — les compétences non entretenues s'émoussent. */
export const SkillDecay: System = {
  id: 'economy.skillDecay',
  phase: 'PRE',
  priority: 45,
  run(ctx) {
    for (const c of ctx.living) {
      const job = c.jobId ? ctx.ruleset.jobs[c.jobId] : undefined;
      for (const [id, value] of Object.entries(c.skills)) {
        if (job && id in job.trains) continue;
        if (value <= 0) continue;
        c.skills[id] = clamp(value - 0.45, 0, 100);
      }
    }
  },
};

export function totalIncomeOf(c: Character, jobs: Record<string, { income: number }>): number {
  return c.jobId ? (jobs[c.jobId]?.income ?? 0) : 0;
}

export { UPKEEP };
