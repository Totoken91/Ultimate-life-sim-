# Eternal Dynasty Simulator

Simulation de vie RPG sandbox à échelle dynastique, puis civilisationnelle, puis cosmique.
Interface menu-based. Objectif : générer des **histoires uniques** par émergence, pas dérouler des menus.

> Une partie doit pouvoir raconter : *un gamin abandonné dans une ruelle devient aventurier,
> fonde une maison noble, conquiert un continent, bâtit un empire galactique, devient immortel,
> et regarde sa lignée s'éteindre 400 000 ans plus tard.*

## État du projet

**Phase de conception.** Aucun code écrit. Ce dépôt contient pour l'instant le plan complet.

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
