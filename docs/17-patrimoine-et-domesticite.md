# 17 — Ce que l'argent achète

Le [doc 16](16-annee-du-joueur.md) se terminait sur une dette :

> **Le temps ne s'achète pas.** Un intendant, une nourrice, un homme de main
> devraient rendre du temps. C'est le vrai luxe, et c'est ce que l'argent
> devrait acheter en premier.

Voilà. Et avec, la première marche de l'échelle du
[doc 09](09-echelle-totale.md) §4 — celle qui monte jusqu'au vaisseau de la
taille d'une planète.

---

## 0. Le problème que ça règle

Jusqu'ici l'argent ne servait presque à rien. On en gagnait, il montait, il
changeait votre classe sociale, et c'était tout. Une fortune n'avait aucune
**conséquence visible**, et le doc 09 §4bis avait pourtant déjà dit pourquoi
c'était grave :

> C'est le seul endroit du jeu où la richesse devient *visible*.

Il manquait aussi une contrepartie au budget de temps. Une année donne quatre
temps, moins tout ce qui pèse — et rien ne permettait d'en regagner. Le jeu
n'offrait donc qu'une pente descendante : plus vous réussissiez, moins vous
étiez libre.

---

## 1. Le patrimoine

Un `Holding`, du même schéma à toutes les échelles :

| Palier | Ce que c'est | Prix | Entretien | Places |
|---|---|---|---|---|
| 1 | une chambre à soi | 400 | 60 | — |
| 3 | une maison de ville | 3 200 | 320 | 1 |
| 4 | un atelier avec logement | 5 200 | 480 | 2 |
| 5 | une ferme et ses terres | 9 000 | 700 | 2 |
| 7 | une demeure | 34 000 | 3 200 | 4 |
| 10 | un manoir muré | 140 000 | 14 000 | 8 |

L'échelle va jusqu'à 20. Les paliers manquants ne demanderont pas une ligne de
code — seulement du contenu. C'est tout l'intérêt d'avoir mis `tier` dans la
donnée.

**L'entretien est la mécanique centrale, pas la décoration.** C'est vérifié au
chargement : un patrimoine de palier supérieur à zéro dont l'entretien est nul
fait échouer le démarrage. Et quand les revenus passent dessous, rien ne
disparaît d'un coup :

```
année 1   Le manoir muré commence à se voir : vous ne suivez plus l'entretien.
année 2   Ostrand — l'intendant — s'en va : parti faute de gages.
année 5   Le manoir muré n'est plus tenable. Vous partez avant qu'on vous en chasse.
```

Ça s'éteint par étages, et **les gens partent les premiers**. Le doc 09 appelait
ça « une des plus belles scènes que le jeu puisse produire, et elle est
gratuite : elle tombe d'une soustraction ». C'était vrai.

---

## 2. Ce que l'argent rachète : du temps

Six domestiques, et le seul qui compte vraiment est celui qui vous rend vos
journées.

| | Rend | Gages | Palier |
|---|---|---|---|
| une servante | confort, entretien | 180 | 3 |
| une nourrice | **1 temps**, confort | 320 | 3 |
| un intendant | **1 temps**, entretien | 900 | 5 |
| un homme d'armes | protection | 700 | 5 |
| un précepteur | lettres, chaque année | 1 100 | 7 |
| un médecin à gages | confort | 2 400 | 7 |

```
◆◆◆◆◆   5 temps sur 5
        votre métier (−1) · deux enfants en bas âge (−1)
        + une nourrice · + un intendant
```

**Deux temps rendus au maximum.** On ne délègue pas sa vie entière — au-delà,
il n'y aurait plus personne à jouer.

---

## 3. Personne ne vous appartient

Un domestique n'est pas une ligne de dépense : c'est **quelqu'un du lieu**, une
vraie fiche, avec un âge, un corps, une famille et des relations. L'embauche
crée un `serment` dans les deux sens.

Ce qui en découle sans qu'on l'ait écrit :

- il peut mourir, et il faut réembaucher ;
- si on ne le paie pas, il perd confiance année après année, puis il part ;
- s'il finit par vous détester, il part de lui-même ;
- il gagne des gages, donc il **s'enrichit**, donc il peut monter de classe,
  fonder une maison, prendre une bande — tout ce que le
  [doc 13](13-agentivite.md) autorise déjà ;
- et à votre mort, **les murs passent à l'héritier, les gens non**. Une maison
  s'hérite, un intendant se réembauche. C'est aussi ce qui fait qu'une
  succession coûte cher.

---

## 4. Gouverner, enfin

`reform()` existait depuis le [doc 15](15-domaines-et-pouvoir.md), écrit et
testé, sans aucun moyen de l'appeler. Le joueur qui dirige un domaine voit
maintenant les sept axes et peut en changer un — contre du temps et de la
légitimité :

> *Vardhèn n'est plus une féodalité : c'est une république. Ça vous coûte 14 de
> légitimité, et quelques amitiés.*

Toucher au fondement — qui décide, comment on y accède, ce qui légitime — coûte
le double de toucher à l'intendance. Et la légitimité perdue, c'est exactement
ce qui ouvre la porte au renversement du doc 15 §4. Réformer trop vite, c'est
se faire renverser par ceux qu'on a froissés.

---

## 5. La boucle que ça ferme

```
gagner  →  acheter des murs  →  loger des gens  →  regagner du temps
   ↑                                                      ↓
   └──────── mener plus d'entreprises, saisir plus ────────┘
```

C'est la première boucle du jeu où l'argent a une **destination**, et elle
rejoint directement le doc 16 : le temps était la seule ressource qu'on ne
pouvait que perdre.

Avec, toujours, la contrepartie : chaque marche ajoute une facture annuelle qui
ne s'arrête jamais. Un manoir et huit domestiques coûtent près de vingt mille
sous par an, pour toujours. Le jour où vous ne pouvez plus, vous le regardez
s'éteindre.

---

## 6. Ce qui manque encore

- **Les entreprises économiques** ([doc 11](11-economie-pouvoir.md) §3) : un
  atelier devrait *produire* et employer, pas seulement coûter. C'est de là que
  tomberont « les revenus d'une société de transport ».
- **Les transports.** Le doc 09 §4bis met une mule au palier 3 et une flotte
  personnelle au 19. Rien n'existe encore.
- **La protection ne protège de rien.** `guard` est calculé et n'est lu par
  aucun système : un homme d'armes devrait faire échouer une agression.
- **Les domestiques ne trahissent pas encore.** Ils ont un serment, une
  affection, un accès à votre maison et à vos secrets. Tout est en place pour
  que ça tourne mal ; rien ne le fait tourner mal.
- **On ne peut pas leur en vouloir.** Renvoyer quelqu'un abîme la relation, mais
  le monde n'en sait rien. Ça devrait remonter dans les rumeurs
  ([doc 13](13-agentivite.md) §4).
