# Eternal Dynasty Simulator

Simulation de vie RPG sandbox à échelle dynastique, puis civilisationnelle, puis cosmique.
Interface menu-based. Objectif : générer des **histoires uniques** par émergence, pas dérouler des menus.

> Une partie doit pouvoir raconter : *un gamin abandonné dans une ruelle devient aventurier,
> fonde une maison noble, conquiert un continent, bâtit un empire galactique, devient immortel,
> et regarde sa lignée s'éteindre 400 000 ans plus tard.*

## État du projet

**Phase 1 livrée — jouable.** Naître, vivre, choisir, mourir, transmettre.

```bash
pnpm install
pnpm play          # jouer une vie
pnpm test          # 59 tests
pnpm sim 300 3     # banc d'émergence : 300 parties sans joueur, 3 générations
pnpm typecheck
```

Contenu actuel : **98 événements**, 22 scénarios de naissance, 56 traits, 22 métiers,
16 compétences, 16 actions, 3 cultures, 6 implantations.

Ce qui marche déjà : naissance conditionnée avec vérité cachée · 6 attributs + 8 attributs
cachés · traits innés et acquis · santé, mortalité infantile réelle, vieillissement ·
relations **dirigées** (A peut aimer B qui le méprise) · mémoire budgétée avec oubli ·
**graines** (conséquences différées jusqu'à 30 ans) · économie de survie · métiers et
compétences · mariage, enfants, génétique héritée · maisons · mort, héritage et reprise
avec un héritier (dettes et rancunes comprises) · Chronique exportable en Markdown ·
sauvegarde versionnée avec migrations · déterminisme strict vérifié en CI.

Ce qui n'existe pas encore : agentivité PNJ complète, intrigues multi-années, voies de
pouvoir, titres et vassalité, paliers LOD 2 et 3, temps élastique, transcendance.
Voir la [roadmap](docs/06-roadmap.md).

## Lire dans cet ordre

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

## Code

```
packages/
  engine/    coeur pur, déterministe, sans I/O ni affichage
  content/   tout le contenu de jeu, en données typées (« Le Rivage »)
  game/      orchestration de session : boucle, commandes, vues
  cli/       rendu terminal — un client jetable parmi d'autres
  tools/     autoplay + banc d'émergence
```

Règle de dépendance : `cli → game → engine ← content`, `tools → game`.
`engine` ne connaît rien au-dessus de lui, ce qui permettra de brancher une UI web
plus tard sans toucher une ligne de simulation.

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
