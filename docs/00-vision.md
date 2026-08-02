# 00 — Vision & piliers

## 1. Le problème avec la vision initiale

La vision est bonne mais elle contient trois pièges classiques. Je les nomme tout de suite parce que
toute l'architecture est construite pour les désamorcer.

### Piège 1 — « des milliards de descendants simulés »

Littéralement impossible et, surtout, **inutile**. Un joueur ne lira jamais 8 milliards de fiches.
Ce que le joueur veut vraiment, c'est :

- voir un **nombre crédible et vivant** qui grossit,
- pouvoir **plonger sur n'importe quelle branche** et y trouver une vraie personne avec un nom,
  des parents, un métier, un drame,
- que cette personne soit **la même** s'il y revient dans 3 heures de jeu.

Ça, c'est réalisable — et c'est très différent de « tout simuler ». Voir [02 — LOD & échelles](02-lod-echelle.md).

### Piège 2 — l'inflation des nombres tue le jeu

« Puissance : 999999 », « Richesse : 847 quadrillions ». Passé un certain seuil, les nombres ne
veulent plus rien dire et le jeu devient un idle game sans tension. Tous les jeux qui montent à cette
échelle (Civ en fin de partie, CK3 quand on a tout conquis) s'effondrent au même endroit.

**Solution : l'échelle de sens.** Chaque palier de puissance retire l'ancienne rareté et en introduit
une nouvelle. On ne joue jamais « le même jeu en plus gros ».

| Palier | Ce qui est rare | Ce qui vous menace |
|---|---|---|
| Survie | nourriture, sécurité, abri | la faim, la maladie, la violence |
| Ascension | statut, réputation, accès | le mépris, l'exclusion, la dette |
| Pouvoir | loyauté | la trahison des vôtres |
| Empire | cohésion administrative | l'entropie, la corruption, la sécession |
| Immortalité | sens, attachement | l'ennui, l'oubli, la perte répétée de ceux qu'on aime |
| Cosmique | matière et temps utilisables | l'entropie de l'univers, les rivaux divins |

C'est le pilier de conception le plus important du projet. Sans lui, le late game est vide.

### Piège 3 — « des milliers d'événements »

Écrire 5 000 événements à la main est un travail de studio. Écrire **200 modèles paramétrés** qui
puisent leurs acteurs, lieux et enjeux dans l'état réel du monde en produit des centaines de milliers,
et ils sont *pertinents* parce qu'ils parlent de personnages que le joueur connaît.

« Un vieil homme mourant vous confie une carte » → générique.
« Perrin, le forgeron que vous avez volé à 9 ans, mourant, vous confie une carte » → mémorable.

C'est le même moteur. C'est juste une question de remplissage des rôles.

---

## 2. Les 6 piliers

### P1 — Émergence avant scénario
Aucune histoire n'est écrite d'avance. Les histoires sont produites par la collision de systèmes
simples (ambitions, ressources, relations, mortalité). Si une histoire est bonne, c'est parce que
la simulation l'a fabriquée, pas parce qu'un designer l'a scriptée.

### P2 — Chaque personnage est une personne
Pas une ligne de stats. Une personne a une enfance, des rancunes datées, des peurs, des gens qu'elle
aime, une réputation qui diffère selon qui la regarde. Le joueur n'est **pas** spécial mécaniquement :
il est juste le personnage qu'on regarde.

### P3 — La conséquence est différée
Le système central n'est pas « choix → effet ». C'est « choix → effet immédiat **+ graine plantée** ».
Une décision doit pouvoir revenir vous chercher trois générations plus tard. C'est ce qui transforme
une suite de menus en destin.

### P4 — Le monde n'attend pas
Pendant que vous vivez votre vie de meunier, des guerres éclatent, des religions naissent, des maisons
s'éteignent. Si vous ne faites rien pendant 40 ans, le monde a changé sans vous. Un PNJ doit pouvoir
gagner la partie à votre place.

### P5 — La mort est une transition
Fin de vie ≠ fin de partie. Les continuations possibles :
héritier · bâtard reconnu · réincarnation · fantôme/conseiller · clone · transfert de conscience ·
ascension divine · entité cosmique. Chacune a un coût et change les règles.

### P6 — La partie produit un texte
À tout moment, le joueur peut exporter la **Chronique** : le récit lisible de sa lignée. C'est le
souvenir qu'il gardera et ce qu'il montrera aux autres. On conçoit la simulation pour qu'elle produise
de bons paragraphes, pas seulement de bons chiffres.

---

## 3. Ce qu'on refuse explicitement

| Refusé | Pourquoi |
|---|---|
| Combat tactique tour par tour détaillé | Autre jeu. Le combat est résolu par la simulation + narration. |
| Graphismes, cartes 3D, tuiles | L'interface est textuelle et structurée. La carte est une carte *de relations*, pas de pixels. |
| Multijoueur | Multiplie la complexité par 10 sans servir la vision. |
| Grinding volontaire | On n'ajoute jamais une mécanique dont le seul but est de faire passer du temps. |
| Nombres nus en fin de partie | Voir piège 2. Bandes, titres et rangs, pas des entiers à 15 chiffres. |
| Événements aléatoires sans état | Un événement qui ne lit pas le monde et n'y écrit rien est du bruit. |

---

## 4. La boucle de jeu

### Boucle courte (mode Vie — 1 an)
```
Vieillir → le monde bouge → 0..3 événements pertinents → choix →
effets immédiats + graines plantées → actions libres (travailler, courtiser,
s'entraîner, comploter) → fin d'année → bilan
```

### Boucle moyenne (une vie — 60-90 ans)
```
Naissance conditionnée → enfance (traits fondateurs) → formation (voies ouvertes) →
carrière & ascension → alliance & descendance → apogée → déclin → mort → succession
```

### Boucle longue (une dynastie — 200 à 10 000 ans)
```
Maison fondée → prestige accumulé → titres → branches secondaires →
crise de succession → guerre civile ou expansion → apogée → décadence →
extinction OU transcendance
```

### Boucle terminale (au-delà — 10 000 ans à ∞)
```
Civilisation → expansion stellaire → rivaux non-humains → manipulation des lois physiques →
lutte contre l'entropie → héritage ou effacement
```

Le jeu doit rester lisible à chaque niveau. C'est le rôle du mode temporel élastique
(voir [02](02-lod-echelle.md)).

---

## 5. Le test de réussite

Le projet est réussi si, après une partie, un joueur peut raconter son histoire à quelqu'un d'autre
**et que l'autre veuille jouer**. Pas « j'ai atteint 999999 de puissance », mais :

> « Mon fils aîné m'a trahi pour ma sœur. Je l'ai fait exiler. Quarante ans plus tard, son petit-fils
> est revenu avec une armée mercenaire et a brûlé la capitale que j'avais mis ma vie à construire.
> J'étais trop vieux pour me battre. Je l'ai regardé faire depuis la tour. »

Toute mécanique qui ne contribue pas à produire ce genre de phrase est une mécanique à couper.
