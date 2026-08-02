# 10 — Chiffres, records et mémoire du monde

*Livré en Phase 2.*

Un monde qui ne compte rien n'a pas d'Histoire. Ce document décrit les trois
couches de mesure du jeu et, surtout, pourquoi elles ne sont pas la même chose.

---

## 1. Trois couches, trois durées de vie

| Couche | Ce que c'est | Coût | Où c'est |
|---|---|---|---|
| **Compteurs** | ce qui s'est passé, cumulé depuis le début | écrit au point d'action, jamais recalculé | `World.tally` |
| **Statistiques** | l'état du monde maintenant | recalculé à l'ouverture de l'écran | `worldStats()` |
| **Records** | les extrêmes *jamais atteints* | mis à jour une fois par tick | `World.records` |

La distinction est structurante :

- un **compteur** ne peut pas être reconstitué après coup (on ne sait pas de quoi
  sont morts les gens qu'on a oubliés), donc il est incrémenté à l'écriture ;
- une **statistique** est toujours recalculable, donc jamais stockée : pas de
  cache à invalider, pas de chiffre qui ment ;
- un **record** survit à son détenteur. « L'homme le plus riche que le Rivage ait
  connu » reste vrai après sa mort — c'est tout l'intérêt, et la raison pour
  laquelle un record n'est pas un classement.

---

## 2. Ce qui est mesuré aujourd'hui

**Compteurs** — naissances, morts, mariages, morts de main d'homme, morts par
cause, morts par année, naissances par année.

**Statistiques du monde** — population, fiches ayant existé, âge médian, durée
de vie médiane, mortalité infantile, richesse totale en circulation, part
détenue par le centile le plus riche, répartition par condition sociale, causes
de mort classées, population et âge médian par implantation, métiers exercés,
maisons avec rang / prestige / chef / loi de succession.

**Classements** — les plus riches, les plus vieux, la plus nombreuse
descendance, le plus de sang versé.

**Records** — fortune, longévité, descendance, sang versé, influence, maison la
plus prestigieuse, maison la plus nombreuse, année la plus meurtrière. Chacun
avec son détenteur, l'année, un détail, et si le détenteur est encore en vie.

**Dynastie** — rang, prestige, loi de succession, année de fondation, nombre de
générations, descendants vivants / morts / total, fortune de maison, doyen de la
lignée, ordre successoral complet, liste des chefs successifs.

**Arbre généalogique** — navigable, avec époux, dates, morts marquées, branches
repliées quand elles dépassent la largeur d'écran.

Un relevé réel après 72 ans de simulation :

```
An 472 — 567 vivants, 1504 fiches, 1099 naissances, 937 morts, 468 mariages
Âge médian 33 · vie médiane 20 · mortalité <13 ans 46,2 %
Richesse totale 5,7 M · le centile détient 9,3 %
Vardhèn 213 · Kaleth-la-Blanche 172 · Bas-Vardhèn 63 · Orin 63 · Le Roc 42 · Marches 14
Soldat 45 · Herboriste 40 · Apprenti forgeron 33 · Scribe 33 · Coursier 32
```

---

## 3. Un monde peuplé, et pourquoi il le fallait

Jusqu'à la Phase 2, le monde ne contenait que les gens croisés par le joueur :
une douzaine de personnes. Toutes les statistiques étaient donc du bruit, et
« l'homme le plus riche du monde » désignait le voisin.

Le monde démarre maintenant avec **une population de fond** : des foyers, une
pyramide des âges pré-industrielle, des conjoints, des enfants, des métiers
cohérents avec le lieu. Environ 500 personnes réparties sur six implantations
selon leur taille.

Et elle **se reproduit** : les couples de PNJ ont des enfants, avec une
fécondité en cloche autour de 26 ans, bornée par une capacité d'accueil par
implantation — la version miniature du `K` du [doc 02](02-lod-echelle.md) §4.

Mesure sur trois siècles : la population part de ~500, se stabilise autour de
220–260 vivants. Ni effondrement, ni explosion. C'est un test automatisé.

---

## 4. L'élagage — le problème que ça a créé

Peupler le monde a révélé un défaut qui existait depuis le début : **les morts
n'étaient jamais retirés**. Quelques centaines de morts par siècle, et une
dynastie de trois mille ans traîne des centaines de milliers de fiches que plus
personne ne consultera.

Tous les dix ans, un passage retire les morts sans importance. Sont **protégés** :

- tous les vivants, et le joueur ;
- la parenté immédiate d'un vivant (père, mère, époux, enfants) ;
- les morts récents (80 ans) — le joueur vient d'en croiser certains ;
- les détenteurs de records ;
- les fondateurs et chefs successifs de maisons ;
- les acteurs des moments de Chronique d'importance ≥ 4 ;
- les acteurs de toute graine encore en terre.

Ce qui part n'est pas effacé de l'Histoire : **la Chronique est conservée
intégralement**. On perd la fiche, jamais le souvenir. C'est exactement la
rétrogradation LOD du [doc 02](02-lod-echelle.md) §6, en version pauvre — et
c'est la place réservée pour le palier T2.

Résultat mesuré : le nombre de fiches se stabilise autour de 600–900 au lieu de
croître sans fin. Quatre tests garantissent qu'aucune référence pendante n'est
laissée derrière.

---

## 5. Le coût, mesuré

| Monde | Entités | Coût d'un tick |
|---|---|---|
| vide (tests) | 20 | 0,21 ms |
| peuplé, an 600 | 889 | 3,06 ms |
| peuplé, an 1200 | 569 | 1,46 ms |

Le budget du [doc 01](01-architecture.md) §8 est de 8 ms par tick en mode Vie.
On est dedans, et le coût **décroît** à mesure que l'élagage fait son travail.

---

## 6. Ce qui manque encore

- **Séries temporelles** : population par siècle, richesse médiane par
  génération, courbes. Les données existent (`deathsByYear`, `birthsByYear`),
  l'affichage non.
- **Statistiques d'entreprise** : revenus d'une société de transport, marge,
  employés. Ça attend le système économique du [doc 11](11-economie-pouvoir.md).
- **Statistiques militaires** : morts d'une guerre, effectifs engagés, pertes par
  camp. Ça attend le système de conflit du [doc 09](09-echelle-totale.md) §2.
- **Comparaison entre lignées** : votre maison contre les autres, sur la durée.
- **Export** : les chiffres devraient partir en CSV avec la Chronique.
