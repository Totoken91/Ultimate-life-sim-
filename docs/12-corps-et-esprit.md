# 12 — Le corps et l'esprit

La demande : *toutes les maladies mentales qui existent, toutes les maladies physiques
connues, tous les traits mentaux, et une simulation complète du corps humain — tension
artérielle, infections, os, muscles.*

Je réponds oui à la simulation du corps. Je réponds **non à « toutes »**, et il faut que je
dise pourquoi, parce que c'est une décision de conception, pas une paresse.

---

## 0. Pourquoi « toutes » est un piège

La CIM-11 recense environ **55 000 codes**. Les seuls troubles mentaux du DSM-5 en font
près de **300**.

Trois raisons de ne pas les encoder :

1. **Personne ne peut lire ça.** Un joueur qui découvre son 41ᵉ diagnostic distinct
   n'éprouve rien. Au-delà d'une quarantaine de maux *qui changent une décision*, on
   n'ajoute plus de la profondeur, on ajoute du bruit.
2. **Une liste ne se transporte pas dans le temps.** Le jeu va du fer au post-matière. Une
   table figée de noms modernes n'a aucun sens dans un monde qui n'a ni microscope ni mot
   pour « bactérie ». Il faut un modèle qui **produise** les maux d'une époque.
3. **Sur les troubles psychiques, une liste d'étiquettes est un piège éthique.** Coller
   « schizophrénie » sur un malus de statistiques produit une caricature. La psychiatrie
   contemporaine elle-même s'oriente vers des modèles **dimensionnels** plutôt que vers des
   catégories étanches — et ce qui est plus juste se trouve être aussi meilleur en jeu.

Donc : **un modèle génératif, pas un catalogue.** Le même choix qu'aux métiers
([doc 09](09-echelle-totale.md) §1), pour les mêmes raisons.

---

## 1. Ce qui est livré

### `health` n'est plus une valeur, c'est un résumé

Avant, la santé était un nombre qu'on poussait vers le haut ou le bas. Maintenant :

```
organes (15) + constantes (6) + infection + inflammation + douleur + maux actifs
                              ↓
                        health (0-100)
```

`health` est **calculé** chaque année. Le contenu continue d'écrire
`{ k: 'health', d: -12 }` — c'est le corps qui décide de ce que ça veut dire : quel organe
encaisse, quelle douleur reste, quelle fièvre monte.

### Les quinze organes

Cœur · poumons · foie · reins · cerveau · digestion · os · muscles · peau · sang · nerfs ·
sens · défenses · humeurs du corps · fécondité.

Chacun a une intégrité de 0 à 100, une vitesse d'usure propre, et un **poids vital**. On ne
meurt pas « en moyenne » : le maillon le plus faible compte pour la moitié du résumé. Un
cœur à 20 tue, même avec tout le reste intact.

### Les six constantes

Tension · pouls · chaleur · souffle · sucre du sang · hydratation.

Normalisées autour de 50. Elles reviennent seules vers la normale, d'autant plus vite que
les défenses sont bonnes. La tension monte avec l'âge, comme dans la vraie vie.

**Le joueur ne voit jamais « 128/84 ».** Il lit ce que son personnage sent :

> des bourdonnements d'oreille · la vue se brouille quand vous vous levez · une soif que
> rien ne calme · le souffle manque au moindre effort · la bouche sèche, les urines rares

### Un mal est un processus, pas un nom

```ts
interface ConditionDef {
  label;                  // ce que le monde en dit — « la toux noire »
  clinical?;              // ce qu'on en dirait aujourd'hui — jamais affiché
  kind;                   // infection · chronique · dégénératif · génétique
                          // · carence · toxique · lésion · esprit
  course;                 // aigu · lent · cyclique · terminal
  organs;                 // dégâts annuels, par organe
  vitals;                 // décalage des constantes
  onset;                  // poids d'apparition, fonction du contexte
  drift;                  // aggravation annuelle
  remission;              // chance de disparaître seule
  lethal;                 // seuil et probabilité
  silentBelow;            // reste invisible tant qu'on n'a pas de signe
  marks;                  // traits laissés derrière
  signs;                  // ce que les autres voient, par gravité croissante
  care;                   // ce qu'un soin retire à la dérive
}
```

**46 maux** écrits pour le Rivage médiéval : 10 infections, 8 maux installés,
7 dégénératifs, 5 de naissance, 4 carences, 4 toxiques, **8 de l'esprit**.

Le `onset` lit le monde : la fièvre des marais ne prend que dans les marais, le mal du
plomb frappe les forgerons, le scorbut les marins, la goutte les riches de plus de
quarante ans, le rachitisme les enfants pauvres, la fièvre des couches celles qui viennent
d'accoucher. Rien n'est tiré au hasard dans le vide.

### Les signes, pas les diagnostics

Chaque mal a trois signes, du plus discret au plus avancé :

> une toux qui ne le quitte plus → il crache du sang dans un linge → il n'a plus que la peau

C'est ce que voit le village. C'est ce qui permettra, plus tard, qu'un personnage soit
évité, soigné, chassé ou vénéré selon ce qu'on croit voir.

### Les maux de l'esprit, traités comme les autres

Mélancolie noire · angoisse · fureur et abattement · les voix · l'âme épuisée · obsession ·
peur des lieux · la faim qui ment.

Trois règles d'écriture, non négociables :

1. **Ils évoluent et ils rémettent**, comme un mal du corps. Aucun n'est un état définitif.
2. **Le monde n'a pas le vocabulaire.** Le champ `clinical` existe pour nous, dans le code.
   À l'écran, on lit « la mélancolie noire », jamais « dépression majeure ».
3. **Jamais un ressort comique, jamais une leçon de morale.** Ce sont des vies, avec ce
   qu'elles coûtent et ce qu'elles ouvrent.

Leur `onset` lit l'histoire du personnage : le deuil et la solitude appellent la
mélancolie, la guerre appelle l'âme épuisée, la mélancolie appelle l'ivrognerie.

---

## 2. Le calibrage, mesuré

Un système physiologique mal réglé ne se voit pas dans le code, il se voit dans la
démographie. Première version : **la population est passée de 392 à 19 en trois siècles.**
Le corps tuait tout le monde.

Trois réglages, mesurés à chaque fois :

| Réglage | Pourquoi |
|---|---|
| poids d'apparition ÷ 450 | les poids du contenu expriment des *rapports* entre maux, pas des probabilités |
| dégâts d'organe × 0,4 | déclarés annuels, ils se cumulent sur des décennies |
| réparation à tout âge | sans elle, chaque égratignure est définitive et personne n'atteint soixante ans |

Résultat après trois siècles, monde entier :

```
population stable 560–650 · vie médiane 52 ans · mortalité avant 13 ans 31 %
25 % des adultes portent au moins un mal nommé
les plus fréquents : jambes torses · toux noire · rouille des articulations · goitre
```

Et surtout, la mort a retrouvé un nom :

```
de la toux noire 107 · de l'hydropisie 24 · de l'oubli 18 · de la suette 10
```

Mourir « de fièvre » quand on traîne la toux noire depuis quinze ans effacerait justement
l'histoire que la simulation vient d'écrire. Le mal le plus avancé — **et seulement s'il
peut tuer** — donne son nom à la mort. On ne meurt pas d'une cataracte.

---

## 3. Le coût, et ce qu'il a coûté

Un corps simulé pour six cents personnes, ce n'est pas gratuit.

| Étape | Coût d'un tick |
|---|---|
| avant le corps | 1,5–3 ms |
| corps naïf | 9,6 ms — **hors budget** |
| après mesure et réglage | **6,9 ms** |

Le profilage a été fait, pas deviné. Trois gains, dans l'ordre d'importance :

1. **Ne rien faire quand rien ne peut changer.** Un corps sain qui n'est pas à son tour
   d'examen ne coûte plus rien du tout. *(−2,5 ms)*
2. **Étalement par tiers.** Le joueur et ses proches sont examinés chaque année ; le reste
   du monde un an sur trois, avec des variations triplées. Même trajectoire, trois fois
   moins de travail — c'est le [doc 02](02-lod-echelle.md) appliqué à la chair.
3. **Tables d'effets aplaties une fois.** `Object.entries` dans une boucle exécutée six
   cents fois par an allouait plus que tout le reste du système réuni.

Deux fausses pistes, corrigées après mesure : la liste des vivants recalculée par chaque
système, et le tri des relations à chaque tick. Gains réels : quasi nuls. C'est pour ça
qu'on profile.

---

## 4. Ce qui manque encore

- **La médecine.** Le champ `care` existe, personne ne l'utilise : il faut un soignant,
  un coût, et une chance d'aggraver les choses — parce qu'à cette époque, souvent, on
  aggrave.
- **La contagion réelle.** `infectious` existe ; les maux ne se transmettent pas encore
  d'une personne à l'autre, ni d'une implantation à l'autre. C'est la condition pour une
  vraie épidémie.
- **Le regard des autres.** Les signes sont écrits mais personne ne les lit encore. C'est
  pourtant là que se joue tout l'intérêt : être évité, soigné, chassé ou vénéré selon ce
  qu'on croit voir.
- **Le générateur de maux.** Les 46 sont écrits à la main. Le modèle est déjà
  compositionnel (agent × organes × cours × gravité) : il reste à écrire le générateur qui
  produira les maux d'une époque donnée, et le lexique qui les nommera selon ce que le
  monde sait — « la fièvre des marais » à l'ère du fer, « le paludisme » à l'ère de
  l'information.
- **Les dimensions de l'esprit.** Les huit maux psychiques sont catégoriels. Le modèle
  visé est dimensionnel : perception, humeur, anxiété, impulsion, attention, cognition
  sociale, énergie. Un diagnostic devient alors une *région* de cet espace, et son nom
  dépend de l'époque et de la culture — exactement comme pour le corps.
- **La génétique.** Les maux de naissance dépendent d'un chiffre de génétique unique. Il
  faudra de vrais allèles transmis pour que « la danse » se voie remonter une lignée.
