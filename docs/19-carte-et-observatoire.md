# 19 — La carte et l'observatoire

> « Mets des tuiles qui représentent le monde. Des planètes à l'univers entier.
> Et ajoute un système qui permet au joueur de simuler une game sans jouer,
> juste observer ce qu'il se passe. »
> — Kenny

Deux demandes, deux réponses qui ont en commun de ne **rien ajouter à la
simulation**. La première la *montre*, la seconde la *laisse tourner*. Aucune
des deux n'invente un système parallèle — et c'est la condition pour qu'elles
tiennent quand le jeu doublera de taille.

---

## 1. Le principe : le ciel n'est pas simulé, il est calculé

Le [doc 09](09-echelle-totale.md) promet d'aller du clochard mutilé à
l'empereur stellaire, et le domaine récursif du
[doc 15](15-domaines-et-pouvoir.md) sait déjà porter les huit échelles. Ce qui
manquait, c'est qu'on ne les voyait pas — et un monde qu'on ne voit pas n'est
pas un monde, c'est une variable.

La tentation évidente est de créer les objets : un `Domain` par galaxie, par
système, par astre. C'est un piège à trois têtes — mémoire, sauvegarde, et
temps de tick — pour une matière que personne n'habite.

**La solution : une tuile n'existe pas, elle se calcule.**

```ts
tileMap(world, 'u/16/8/28')   // le 28ᵉ système du 8ᵉ secteur de la 16ᵉ galaxie
```

est une **fonction pure** de la graine du monde et du chemin. Regarder ce
système ne crée rien, n'écrit rien dans la sauvegarde, ne coûte rien au tick —
et donne toujours la même chose, à la première année comme à la dix-millième
(ADR-003). Le ciel est infini parce qu'il n'est nulle part.

Ce que la simulation touche vraiment — Le Rivage, ses régions, ses villes — se
**pose par-dessus** sa tuile. C'est le seul point de contact, et c'est par là
que la colonisation passera : une tuile qui reçoit un domaine cesse d'être un
décor.

---

## 2. Les six paliers

| On est à… | Une tuile est… | Grille |
|---|---|---|
| l'univers | une galaxie | 9 × 5 |
| une galaxie | un secteur | 9 × 5 |
| un secteur | un système | 8 × 5 |
| un système | un astre | 8 × 3 |
| un monde | une région | 9 × 5 |
| une région | un lieu | 7 × 4 |

Cinq clics séparent le vide absolu du sol où l'on vit :

```
L'univers                          Le Rivage — le seul monde qu'on connaisse
16 galaxies sur 45 tuiles          3 régions habitées. Tout le reste attend.

  o  O           @  O                ≈  ▲  ≈  "  -  "  ≈  ,  "
                 o [@]               ▲  .  =  -  ,  ≈  -  ≈  *
     O  o  @  %  @     O             ♣  -  " [▣][▣][▣] =  *  ▲
                       O             ▲  "  "  "  ♣  ≈  "  ≈  ,
  @  o           O                   ≈  "  =  =  "  ≈  -  *  "
```

Trois règles de conception, toutes trois négatives :

- **Le vide est du vide.** Une tuile vide n'est pas cliquable, ne porte pas de
  nom, et n'ouvre sur rien. Prétendre le contraire mentirait sur la profondeur
  du jeu, et le joueur s'en apercevrait au troisième clic. Sur quarante-cinq
  tuiles d'univers, une trentaine ne mènent nulle part — c'est le bon ratio.
- **Rien ne se génère « à la volée » au sens habituel.** Il n'y a pas de cache,
  pas d'état, pas de « déjà visité ». `Rng.fork('cosmos', chemin, index)` suffit.
- **Le chemin habité dépend de la graine.** Deux parties n'ont pas le même
  ciel, et la même graine donne toujours le même. Le Rivage n'est pas au
  centre : il est quelque part, comme tout le monde.

---

## 3. Ce que ça a coûté

Rien au moteur. Un fichier pur (`cosmos/cosmos.ts`), une vue par client, zéro
octet de sauvegarde, zéro milliseconde de tick. C'est le genre de rapport
qu'on n'obtient qu'en refusant de simuler ce que personne ne regarde.

---

## 4. L'observatoire

> Simuler une partie sans y jouer, juste regarder.

C'est une demande de fonctionnalité, et c'est surtout **une mise à l'épreuve**.
Si le monde n'est intéressant que parce qu'on y joue, alors il n'est pas
intéressant, et tous les documents 13 à 15 sont du décor. L'observatoire expose
ça sans filet.

Techniquement, ce n'est **pas** un moteur parallèle : c'est la partie normale,
avec un fil de vie qui décide seul (la même logique que le banc d'émergence :
rien d'optimal, quelqu'un qui vit sa vie) et une succession automatique — le
sang d'abord, puis n'importe qui, puis un nouveau-né. Le fil ne s'arrête jamais
à un cadavre, ce qui permet de regarder cinq siècles d'affilée.

Ce qui change, c'est **ce qu'on en lit**. Pas une année à vivre : un
**chapitre**.

```
An 425 – 450   On s'est beaucoup battu.
667 vivants · 330 naissances · 256 morts · 28 groupes · pain 7,9 sous
on suit Idris Cerneth, 50 ans

  425  Vardhèn passa de dictature à oligarchie.
  429  Aeron Cerneth naquit d'Idris Cerneth.
  429  Aeron Cerneth mourut à 0 an, noyée.
  431  Idris Cerneth fonda la Maison Cerneth.
  435  Idris Cerneth tomba : deux ans au cachot.
  435  Nerys Gwaered rassembla les gens de Gwaered.
  438  Idris Cerneth s'éleva : brisa son rival.
  … et 2 lignes de moindre portée
```

Un chapitre est un **résumé**, jamais un journal : on garde les quatorze lignes
qui pèsent le plus, puis on les remet dans l'ordre du temps. Sans ce tri,
vingt-cinq années d'élévations de maisons couvraient les deux guerres.

Le titre du chapitre ne triche pas non plus : *Des années de faim*, *On s'est
beaucoup battu*, *On a plus enterré que baptisé* — et *Rien qui mérite un
titre*, parce que les siècles calmes existent et qu'une chronique qui prétend
le contraire ment.

---

## 5. Ce que l'observatoire a immédiatement dénoncé

Il a suffi de le brancher pour que la Chronique montre ce qu'on ne lisait
jamais — le joueur n'en voyait que sa propre vie, jamais mille ans d'affilée.

| Ce qui s'affichait | Ce qui n'allait pas |
|---|---|
| `Bas-Vardhèn apprit la vérité : Bas-Vardhèn passe de féodalité à république` | un domaine rendu par le gabarit d'une **personne**. Ajout d'une sortie de secours : `data.texte` court-circuite tous les gabarits, avec `{sujet}` pour nommer quand même quelqu'un |
| `Idris Cerneth apprit la vérité : à lire` | la formule mangeait la phrase. C'est `X apprit à lire` |
| `Idris Cerneth apprit reconnut publiquement un enfant caché` | cinq entrées de contenu racontaient un **acte** sous un type qui attend un **complément** |
| `la maison retombe à le rang de notable` | contraction |
| `La Maison Cerneth s'éleva au rang de noble` — deux fois, deux maisons | les noms de maison n'étaient pas uniques. On tire jusqu'à trouver libre, puis `le Jeune` |
| `Maison du Ysgwyd`, `Maison de Ibn-Sael` | la particule ne s'élidait pas |
| `La Maison X s'éleva au rang de notable` × 20 par chapitre | toutes les maisons franchissent « notable » un jour : au poids 4, elles noyaient les guerres. Seul le sommet compte |
| la même maison élevée deux ans de suite | prestige assis *sur* un seuil. Hystérésis à 6 % |
| `Idris Cerneth épousa un inconnu` | l'occasion du mariage arrangé n'inscrivait aucun acteur |
| `hérite de Idris`, `passa de oligarchie`, `naquit de Idris` | élisions |
| `rixe indécise entre…` | minuscule en tête d'une ligne de Chronique |

Aucun de ces défauts n'était visible en jouant une vie. C'est exactement ce
qu'on attend d'un mode qui regarde mille ans.

---

## 6. Ce qui manque encore

- **Rien ne colonise.** Une tuile ne peut recevoir un domaine que si on l'y met
  à la main ; il n'existe aucun chemin de jeu pour aller ailleurs. C'est la
  Phase 5 ([doc 06](06-roadmap.md)), et l'architecture est prête à la recevoir.
- **La carte du monde est schématique.** Les régions habitées occupent une
  ligne au centre du globe ; il n'y a pas de géographie réelle, donc pas de
  distances qui coûtent. Les routes du [doc 15](15-domaines-et-pouvoir.md) §3
  s'y brancheront.
- **L'observatoire suit un fil.** Il regarde le monde par-dessus l'épaule de
  quelqu'un. Un vrai mode « personne » demanderait que plus aucun système ne
  suppose l'existence d'un joueur — c'est faisable, ce n'est pas fait.
- **On ne peut pas observer *puis* jouer.** Reprendre la main sur un monde
  qu'on vient de regarder pendant trois siècles serait la meilleure entrée en
  matière que ce jeu puisse offrir.
