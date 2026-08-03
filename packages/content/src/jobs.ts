import type { JobDef } from '@ed/engine';
import { classRank } from '@ed/engine';

function job(d: JobDef): JobDef {
  return d;
}

/**
 * Le revenu est annuel, en sous. Le coût de la vie d'un « commun » est de
 * 320 sous/an : un journalier survit, un maître artisan s'élève, un marchand
 * change de monde.
 */
export const JOBS: Record<string, JobDef> = Object.fromEntries(
  [
    job({
      id: 'mendiant', label: 'Mendiant', income: 60, minAge: 5, classFloor: 'miserable',
      trains: { rhetorique: 0.6 }, danger: 30, prestige: 0,
      desc: 'Tendre la main, tous les jours, au même endroit.',
    }),
    job({
      id: 'coursier', label: 'Coursier des quais', income: 190, minAge: 8, classFloor: 'miserable',
      trains: { survie: 1.2, negoce: 0.5 }, produces: { information: 0.5 }, danger: 25, prestige: 3,
      desc: 'Porter des messages plus vite que la marée.',
    }),
    job({
      id: 'journalier', label: 'Journalier', income: 300, minAge: 12, classFloor: 'pauvre',
      trains: { survie: 1 }, produces: { vivres: 2.4, materiaux: 0.2 }, danger: 20, prestige: 4,
      desc: 'Ce qu\'il y a à faire, contre ce qu\'on veut bien donner.',
    }),
    job({
      id: 'apprenti_forge', label: 'Apprenti forgeron', income: 260, minAge: 10, classFloor: 'pauvre',
      trains: { forge: 2.2, artisanat: 0.8 }, produces: { outils: 0.3, armes: 0.1 }, danger: 18, prestige: 8,
      desc: 'Souffler, frapper, recommencer. Pendant sept ans.',
    }),
    job({
      id: 'forgeron', label: 'Forgeron', income: 1400, minAge: 18, classFloor: 'commun',
      requires: (c) => (c.subject.skills['forge'] ?? 0) >= 30,
      trains: { forge: 1.6 }, produces: { outils: 1.4, armes: 0.6 }, danger: 15, prestige: 22,
      desc: 'Une enclume à soi, et le respect qui va avec.',
    }),
    job({
      id: 'pecheur', label: 'Pêcheur', income: 420, minAge: 12, classFloor: 'pauvre',
      trains: { navigation: 1.5, survie: 0.8 }, produces: { vivres: 3.1 }, danger: 35, prestige: 6,
      desc: 'Sortir avant l\'aube et espérer rentrer.',
    }),
    job({
      id: 'matelot', label: 'Matelot', income: 620, minAge: 14, classFloor: 'pauvre',
      trains: { navigation: 2, lutte: 0.7 }, produces: { materiaux: 0.5, information: 0.3 }, danger: 45, prestige: 10,
      desc: 'Six mois de mer, deux semaines de terre, tout dépenser.',
    }),
    job({
      id: 'second', label: 'Second de bord', income: 2200, minAge: 24, classFloor: 'commun',
      requires: (c) => (c.subject.skills['navigation'] ?? 0) >= 45,
      trains: { navigation: 1.4, commandement: 1.5 }, produces: { materiaux: 1.2, information: 0.6 }, danger: 40, prestige: 30,
      desc: 'Vous répondez du navire quand le capitaine dort.',
    }),
    job({
      id: 'colporteur', label: 'Colporteur', income: 480, minAge: 13, classFloor: 'pauvre',
      trains: { negoce: 1.8, calcul: 0.6 }, produces: { information: 0.6, luxe: 0.05 }, danger: 30, prestige: 7,
      desc: 'Un sac, des routes, et le talent de faire parler les gens.',
    }),
    job({
      id: 'marchand', label: 'Marchand', income: 3200, minAge: 20, classFloor: 'commun',
      requires: (c) => (c.subject.skills['negoce'] ?? 0) >= 35,
      trains: { negoce: 1.5, calcul: 1.2 }, produces: { luxe: 0.4, information: 0.8 }, danger: 18, prestige: 35,
      desc: 'Acheter là où c\'est bas, vendre là où c\'est haut, survivre entre les deux.',
    }),
    job({
      id: 'armateur', label: 'Armateur', income: 14000, minAge: 30, classFloor: 'aise',
      requires: (c) => (c.subject.skills['negoce'] ?? 0) >= 60 && c.subject.wealth > 20000,
      trains: { negoce: 1, commandement: 1 }, produces: { luxe: 1.5, materiaux: 2, information: 1 }, danger: 12, prestige: 55,
      desc: 'Vous ne prenez plus la mer. Vos navires la prennent pour vous.',
    }),
    job({
      id: 'soldat', label: 'Soldat', income: 540, minAge: 16, classFloor: 'pauvre',
      trains: { lame: 2, lutte: 1 }, danger: 60, prestige: 15,
      desc: 'Une lance, une paie, et l\'obéissance.',
    }),
    job({
      id: 'sergent', label: 'Sergent', income: 1600, minAge: 24, classFloor: 'commun',
      requires: (c) => (c.subject.skills['lame'] ?? 0) >= 45,
      trains: { lame: 1.2, commandement: 2 }, danger: 55, prestige: 32,
      desc: 'Vingt hommes vous regardent avant de bouger.',
    }),
    job({
      id: 'garde', label: 'Garde de ville', income: 700, minAge: 18, classFloor: 'commun',
      trains: { lame: 1, intrigue: 0.8 }, danger: 35, prestige: 20,
      desc: 'Faire régner un ordre auquel vous ne croyez qu\'à moitié.',
    }),
    job({
      id: 'scribe', label: 'Scribe', income: 900, minAge: 14, classFloor: 'commun',
      requires: (c) => (c.subject.skills['lettres'] ?? 0) >= 25,
      trains: { lettres: 2, calcul: 1 }, produces: { savoir: 0.7, information: 0.5 }, danger: 5, prestige: 28,
      desc: 'Écrire ce que d\'autres pensent, et lire ce qu\'ils cachent.',
    }),
    job({
      id: 'medecin', label: 'Médecin', income: 2600, minAge: 22, classFloor: 'aise',
      requires: (c) => (c.subject.skills['soin'] ?? 0) >= 45,
      trains: { soin: 1.6, lettres: 0.6 }, produces: { soins: 1.2 }, danger: 25, prestige: 48,
      desc: 'On vous appelle quand il est déjà tard.',
    }),
    job({
      id: 'herboriste', label: 'Herboriste', income: 620, minAge: 14, classFloor: 'pauvre',
      trains: { soin: 1.8, survie: 0.6 }, produces: { soins: 0.8 }, danger: 12, prestige: 14,
      desc: 'Les racines qui soignent et celles qui ne soignent pas.',
    }),
    job({
      id: 'voleur_pro', label: 'Voleur', income: 800, minAge: 10, classFloor: 'miserable',
      trains: { vol: 2.2, crochetage: 1.5 }, danger: 65, prestige: 2,
      desc: 'Un métier dont on ne parle pas et qu\'on n\'abandonne jamais vraiment.',
    }),
    job({
      id: 'receleur', label: 'Receleur', income: 2400, minAge: 20, classFloor: 'pauvre',
      requires: (c) => (c.subject.skills['vol'] ?? 0) >= 40,
      trains: { negoce: 1.4, intrigue: 1.6 }, produces: { information: 0.4 }, danger: 50, prestige: 5,
      desc: 'Vous ne volez plus. Vous achetez ce que d\'autres ont volé.',
    }),
    job({
      id: 'prete', label: 'Desservant', income: 800, minAge: 18, classFloor: 'commun',
      trains: { rhetorique: 1.6, lettres: 1 }, produces: { savoir: 0.4, information: 0.4 }, danger: 10, prestige: 36,
      desc: 'Vous tenez les registres des naissances et des morts. Cela donne du pouvoir.',
    }),
    job({
      id: 'intendant', label: 'Intendant', income: 4200, minAge: 26, classFloor: 'aise',
      requires: (c) => (c.subject.skills['calcul'] ?? 0) >= 50 && classRank(c.subject.socialClass) >= 3,
      trains: { calcul: 1.4, intrigue: 1.4 }, produces: { information: 0.9, savoir: 0.2 }, danger: 15, prestige: 52,
      desc: 'Vous gérez la fortune d\'un autre, et vous savez tout de lui.',
    }),
    job({
      id: 'chevalier', label: 'Homme d\'armes lige', income: 6500, minAge: 20, classFloor: 'noble',
      trains: { lame: 1.4, commandement: 1.6 }, danger: 55, prestige: 65,
      desc: 'Une terre, un serment, et l\'obligation de mourir pour les deux.',
    }),
  ].map((j) => [j.id, j]),
);

export const JOB_IDS = Object.keys(JOBS);
