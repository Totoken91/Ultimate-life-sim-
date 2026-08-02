# Eternal Dynasty Simulator

Simulation de vie RPG sandbox à échelle dynastique, puis civilisationnelle, puis cosmique.
Interface menu-based. Objectif : générer des **histoires uniques** par émergence, pas dérouler des menus.

> Une partie doit pouvoir raconter : *un gamin abandonné dans une ruelle devient aventurier,
> fonde une maison noble, conquiert un continent, bâtit un empire galactique, devient immortel,
> et regarde sa lignée s'éteindre 400 000 ans plus tard.*

## État du projet

**Phases 0 à 2 livrées — jouable.** Naître, vivre, choisir, mourir, transmettre, compter.

```bash
pnpm install
pnpm play          # jouer dans le terminal
pnpm web           # jouer dans le navigateur (http://localhost:5173)
pnpm test          # 95 tests
pnpm sim 300 3     # banc d'émergence : 300 parties sans joueur, 3 générations
pnpm smoke:web     # build + vrai navigateur : joue 40 ans et échoue à la moindre erreur
pnpm typecheck
```

## Jouer sur téléphone

Le moteur n'a aucune I/O, donc l'application web est **entièrement statique** : pas de
serveur, pas de base, pas de compte. Elle tourne dans l'onglet et sauvegarde dans le
navigateur à chaque choix.

Déploiement Vercel — `vercel.json` est à la racine, rien d'autre à configurer :

| Réglage | Valeur |
|---|---|
| Framework Preset | *Other* |
| Build Command | `pnpm --filter @ed/web build` |
| Output Directory | `packages/web/dist` |
| Install Command | `pnpm install --frozen-lockfile` |
| Root Directory | *(laisser la racine du dépôt)* |

Vercel lit `vercel.json` automatiquement : en principe, il suffit d'importer le dépôt et
de déployer la branche. Une fois en ligne, « Ajouter à l'écran d'accueil » depuis le
navigateur du téléphone donne une icône et un affichage plein écran.

Contenu actuel : **104 événements**, 25 scénarios de naissance, 59 traits, **46 maux du
corps et de l'esprit**, 22 métiers, 16 compétences, 16 actions, 3 cultures, 6 implantations.

Ce qui marche déjà : naissance conditionnée avec vérité cachée · 6 attributs + 8 attributs
cachés · traits innés et acquis · santé, mortalité infantile réelle, vieillissement ·
relations **dirigées** (A peut aimer B qui le méprise) · mémoire budgétée avec oubli ·
**graines** (conséquences différées jusqu'à 30 ans) · économie de survie · métiers et
compétences · mariage, enfants, génétique héritée · **éducation des enfants** en quatre
écoles · maisons avec prestige, rang et **lois de succession modifiables** · mort et
**trois façons de continuer** — un héritier (avec les biens et les inimitiés), suivre
quelqu'un d'autre dans le monde, ou repartir d'un nouveau-né sans effacer l'histoire.

**Un monde peuplé** : ~500 habitants répartis sur six implantations, avec foyers,
pyramide des âges, métiers et descendance. Les couples de PNJ ont des enfants ; la
population se stabilise sur trois siècles sans exploser ni s'effondrer. Les morts sans
importance sont élagués tous les dix ans pour que le monde reste borné sur des millénaires.

**Des chiffres partout** : statistiques du monde (population, causes de mort, richesse et
sa concentration, conditions sociales, lieux, métiers), classements, **livre des records**
qui survit à ses détenteurs, écran de dynastie avec ordre successoral, et **arbre
généalogique** navigable. Voir le [doc 10](docs/10-chiffres.md).

**Un corps simulé** : quinze organes, six constantes vitales, 46 maux qui sont des
*processus* et non des noms — ils apparaissent selon le lieu, le métier et l'âge,
s'aggravent, rémettent, laissent des traces et finissent parfois par donner leur nom à la
mort. `health` n'est plus une valeur qu'on pousse : c'est le résumé calculé de tout ça.
Voir le [doc 12](docs/12-corps-et-esprit.md).

Ce qui n'existe pas encore : économie de production et de prix, gouvernements, agentivité
PNJ complète, intrigues multi-années, voies de pouvoir, conflits, paliers LOD 2 et 3,
temps élastique, transcendance. Voir la [roadmap](docs/06-roadmap.md).

## Lire dans cet ordre

**[Vision — mots d'origine](docs/vision-source.md)** : le texte de Kenny, non reformulé,
avec le suivi de couverture demande par demande. En cas de contradiction avec un doc de
conception, c'est cette page qui a raison.

| Doc | Contenu |
|---|---|
| [00 — Vision & piliers](docs/00-vision.md) | Ce qu'on fait, ce qu'on refuse de faire, la boucle de jeu |
| [01 — Architecture technique](docs/01-architecture.md) | Stack, découpage, contrats, déterminisme, sauvegardes |
| [02 — LOD & échelles](docs/02-lod-echelle.md) | **Le doc clé.** Comment simuler des milliards de descendants |
| [03 — Systèmes de jeu](docs/03-systemes.md) | Personnage, vie, dynastie, économie, pouvoir, monde |
| [04 — Moteur d'événements](docs/04-moteur-evenements.md) | Événements, intrigues longues, agentivité PNJ, chronique |
| [05 — Interface](docs/05-interface.md) | Grammaire des écrans menu-based, lisibilité des grands nombres |
| [06 — Roadmap](docs/06-roadmap.md) | 8 phases, chacune jouable, avec critères de sortie |
| [07 — Risques](docs/07-risques.md) | Ce qui va casser le projet et comment l'éviter |
| [08 — Décisions (ADR)](docs/08-decisions.md) | Choix techniques tranchés + alternatives rejetées |
| [09 — Échelle totale](docs/09-echelle-totale.md) | Métiers compositionnels, conflits de la rixe à la guerre stellaire, ères, patrimoine |
| [10 — Chiffres & records](docs/10-chiffres.md) | Compteurs, statistiques, livre des records, arbre généalogique, élagage |
| [11 — Économie & pouvoir](docs/11-economie-pouvoir.md) | Domaines récursifs à toutes les échelles, biens, prix locaux, gouvernements malléables |
| [12 — Corps & esprit](docs/12-corps-et-esprit.md) | Organes, constantes vitales, 46 maux qui sont des processus, maux de l'esprit |

## Code

```
packages/
  engine/    coeur pur, déterministe, sans I/O ni affichage
  content/   tout le contenu de jeu, en données typées (« Le Rivage »)
  game/      orchestration de session : boucle, commandes, vues
  cli/       rendu terminal
  web/       application React statique, pensée pour le téléphone
  tools/     autoplay, banc d'émergence, fumigation navigateur
```

Règle de dépendance : `cli → game → engine ← content`, `web → game`, `tools → game`.
`engine` ne connaît rien au-dessus de lui — c'est exactement ce qui a permis d'ajouter
l'interface web sans toucher une seule ligne de simulation.

## Résumé exécutif en 10 lignes

1. **Moteur headless, pur, déterministe** (`packages/engine`) — zéro I/O, zéro affichage. L'UI est un client jetable.
2. **Tout le contenu est de la donnée** (`packages/content`) — événements, traits, métiers, cultures. Ajouter 300 mécaniques = ajouter des fichiers, pas refactorer.
3. **Simulation à niveaux de détail (LOD)** — 4 paliers, du personnage complet jusqu'à la cohorte statistique.
4. **Matérialisation générative paresseuse** — les milliards de descendants ne sont pas stockés ; n'importe lequel est *fabriqué à la demande*, de façon déterministe, à partir d'une graine et d'un chemin généalogique.
5. **Temps élastique** — 1 an/tick en mode Vie, jusqu'à 1 million d'années/tick en mode Cosmique.
6. **Les PNJ ont des pulsions et agissent** — IA utilitaire légère. Ils réussissent, trahissent et fondent des empires sans le joueur.
7. **Les conséquences se plantent dans le futur** — système de *graines* et d'*intrigues* : une décision à 12 ans explose à 60 ans.
8. **Échelle de sens** — chaque palier de puissance introduit une nouvelle rareté (survie → statut → loyauté → entropie → mémoire → sens). C'est l'anti-ennui du late game.
9. **La chronique est le vrai produit** — chaque partie produit un récit exportable.
10. **Livraison en tranches verticales** — jouable dès la Phase 1, jamais un an de plomberie avant de voir un écran.

## Licence / statut

Projet personnel, pré-alpha, rien n'est stable.
