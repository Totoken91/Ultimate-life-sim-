# 13 — L'agentivité des PNJ

> « Je veux un monde vivant, pas une suite de menus statiques. »
> « Les PNJ doivent réussir sans le joueur, mourir, fonder des familles,
> déclencher des guerres, devenir puissants, trahir, créer des religions,
> fonder des empires. »
> — [Vision d'origine](vision-source.md)

C'est le premier morceau de la Phase 3. Tant que les habitants du monde
attendaient qu'on leur parle, tout le reste — factions, guerres, rumeurs,
chantage — n'avait rien sur quoi s'appuyer. On commence donc par là.

---

## 0. Le principe

Un PNJ n'a **pas de plan**. Il a des manques.

Chaque année, il lit dix nombres entre 0 et 1 — ce qui lui manque le plus —
regarde ce que sa vie met à portée de main, et fait quelque chose. Aucune
machine à états, aucun arbre de comportement, aucun script. La différence entre
deux vies n'est pas dans le code : elle est dans le classement de ces dix
nombres.

C'est le même pari qu'aux métiers ([doc 09](09-echelle-totale.md) §1) et aux
maladies ([doc 12](12-corps-et-esprit.md) §0) : **un modèle génératif, pas un
catalogue de situations.**

---

## 1. Les dix pulsions

| Pulsion | Ce qu'elle dit | Ce qui la fait monter |
|---|---|---|
| `survie` | tenir jusqu'à l'année prochaine | santé qui lâche, bourse sous le coût de la vie |
| `securite` | ne pas être en danger | ennemis, lieu rude, une rancune qui plane |
| `lien` | ne pas être seul | peu d'attaches, célibat, cafard |
| `descendance` | faire souche | âge fertile, un conjoint, peu d'enfants |
| `statut` | compter aux yeux des autres | ambition × marches restant à monter |
| `richesse` | avoir de quoi | ambition, corruption, manque réel |
| `pouvoir` | décider du sort des autres | ambition et influence, **une fois le ventre plein** |
| `vengeance` | faire payer | la profondeur d'une haine, amplifiée par la folie |
| `savoir` | comprendre | l'intelligence **au-dessus de la moyenne** |
| `sens` | laisser quelque chose | l'âge, une maison, un destin |

Deux règles de construction comptent plus que les formules :

1. **Les pulsions hautes éteignent les basses.** `pouvoir` et `savoir` sont
   multipliés par `(1 − survie × k)`. On ne complote pas quand on a faim. C'est
   l'échelle de sens ([doc 00](00-vision.md) §1) appliquée à l'individu : chaque
   palier n'existe qu'une fois le précédent réglé.
2. **Le caractère penche la balance, et il vit dans la donnée.** Un trait peut
   porter un champ `drives`. « Ambitieux » vaut `statut +0,20`, « solitaire »
   `lien −0,25`, « rancunier » `vengeance +0,22`. **Le moteur ne connaît pas un
   seul identifiant de trait** — il lit une table fournie par le contenu.

---

## 2. Les conduites

Une conduite ne décrit pas une intention. Elle décrit **ce qu'elle apaise**.

```ts
A({
  id: 'prendre_ombrage',
  serves: { statut: 0.4, securite: 0.2, vengeance: 0.2 },
  target: 'voisin',
  cooldown: 7,
  requires: (c) => plusRicheOuMieuxNé(c.target, c.self),
  weight:  (c) => 0.5 + c.self.hidden.ambition / 110 + rancunier(c) * 0.7,
  effects: () => [ /* vocabulaire d'effets fermé — ADR-009 */ ],
  news:    (c) => `${me(c)} ne peut plus voir ${them(c)} en peinture.`,
  reach:   'intime',
});
```

**32 conduites** aujourd'hui, réparties sur les dix pulsions : mendier, se
placer, viser plus haut, se faire soigner, plier bagage · faire la cour, se
faire un ami, faire le premier pas, veiller sur les siens, rendre ce qu'on doit
· se montrer, prendre quelqu'un en grippe, fonder une maison, se faire un nom ·
tenter une affaire, voler, rançonner, prêter · s'engager auprès d'un plus grand,
rassembler des hommes, travailler quelqu'un dans le dos, prendre la tête de la
maison · menacer, lever la main, en finir, dénoncer · apprendre, transmettre son
métier · transmettre, se retirer, faire l'aumône, partir en pèlerinage.

Trois choses en découlent :

- **Les effets passent par le vocabulaire fermé** ([ADR-009](08-decisions.md)) —
  le même que les événements. Une conduite ne peut donc pas créer de couplage
  sauvage avec le moteur, et un moddeur n'a jamais besoin d'y toucher.
- **Ajouter une conduite au monde, c'est ajouter une entrée dans un tableau.**
  Jamais toucher au sélecteur. C'est toute la raison d'être du format.
- **La cible sort d'une distribution déjà résolue** (`rival`, `ami`, `époux`,
  `enfant`, `parent`, `voisin`, `prétendant`, `cadet`), calculée une seule fois
  par personne et par année.

---

## 3. Le choix

```
pulsions ──▶ les 4 plus fortes ──▶ conduites qui les servent (~10 sur 32)
                                        │
                             utilité = Σ serves[p] × pulsion[p] × occasion
                                        │
                             tirage pondéré par utilité²
```

Trois décisions non évidentes :

- **On ne prend pas le maximum.** Le tirage est pondéré par le *carré* de
  l'utilité. Toujours choisir le meilleur produisait des villages entiers qui
  faisaient la même chose la même année.
- **Quatre pulsions, pas trois.** À trois, une rancune vive restait toujours
  derrière « comprendre » et « ne pas être seul » : les conduites qui ne servent
  que la vengeance — frapper, tuer — ne sortaient jamais. Mesuré, corrigé.
- **En dessous de 0,06 d'utilité, on ne fait rien.** Une année ordinaire est une
  année où il ne se passe rien, et c'est très bien.

---

## 4. Ce que le joueur en voit

Le monde produit environ **660 000 décisions de PNJ** pour 60 parties de trois
générations. Il est hors de question de les lui montrer.

Chaque conduite déclare une **portée** :

| Portée | Remonte si… | Exemples |
|---|---|---|
| `intime` | vous connaissez la personne | faire la cour, se faire soigner, prendre en grippe |
| `local` | …ou c'est chez vous | voler, menacer, s'engager, quitter la ville |
| `monde` | toujours | fonder une maison, prendre la tête d'une maison, un meurtre |

Ce qui remonte va dans le **fil de nouvelles** (`world.news`, borné à 240
entrées) — onglet *Rumeurs* dans le jeu. Ce n'est **pas** la Chronique : la
Chronique est *votre* histoire, les rumeurs sont celles des autres. Une rixe
entre deux inconnus n'a rien à y faire, et une maison fondée à l'autre bout du
monde y entre avec une importance de 1, pas de 4.

---

## 5. Ce que ça change ailleurs

**Les mariages sortent d'une cour.** `NpcLife` gardait un tirage aléatoire à
11 % par an. Il regarde maintenant d'abord si quelqu'un a été courtisé, et
n'apparie au hasard qu'en dernier recours, à 5 %. Une union qui sort d'une cour
est une histoire ; un appariement au hasard n'est qu'une ligne de démographie.

**Une inimitié déclarée ne guérit plus toute seule.** La dérive des relations
ramenait toute haine vers zéro à 2,5 % par an — plus vite qu'elle ne se creusait.
Les liens de type `haine` et `rivalité` en sont désormais exemptés : une querelle
tient jusqu'à ce que quelqu'un fasse le premier pas.

**Les PNJ naissent avec une part d'ombre.** `corruption`, `folie` et `influence`
restaient à zéro pour tout personnage non joué. Personne n'était donc assez
corrompu pour rançonner, assez fêlé pour basculer, ni assez en vue pour fonder
quoi que ce soit. On naît maintenant avec le crédit de son rang — et le reste se
gagne.

---

## 6. Le calibrage, mesuré

Comme pour le corps ([doc 12](12-corps-et-esprit.md) §2), rien ici n'a été
deviné. Le compteur `tally.npcActions` est écrit au point d'action et le banc
d'émergence en sort le classement à chaque exécution.

Première version : **treize conduites sur trente-deux ne sortaient jamais.**
Toute la famille « faire payer » et toute la famille « pouvoir » étaient du
contenu mort. Cinq causes, toutes trouvées en lisant le compteur :

| Ce qui bloquait | Correction |
|---|---|
| aucune source d'inimitié dans le monde | la conduite `prendre_ombrage` : l'inégalité fabrique les rivaux |
| une rancune fraîche repassait sous le seuil avant que son porteur puisse agir | inimitié à −45, seuil de rancune à −30, et plus de guérison spontanée |
| « comprendre » était la première pulsion de tout le monde | `savoir` mesuré à l'écart **au-dessus** de la moyenne, pas à l'intelligence brute |
| `corruption` et `influence` étaient nulles chez tous les PNJ | distribution à la naissance, `influence` indexée sur le rang |
| le seuil du meurtre était à −80, la haine la plus profonde du monde à −59 | seuil calé sur ce que le monde fabrique réellement, à −55 |

Deux autres réglages sont venus de la lecture des **sorties du jeu**, pas du
code :

- **210 maisons fondées en 45 ans.** Le titre ne voulait plus rien dire. Après
  correction : environ 45 pour deux siècles.
- **« Farah Hammar est parti en pèlerinage. »** L'accord du participe est une
  faute que le joueur voit à la première partie.

Résultat, sur 60 parties × 3 générations :

```
32 conduites définies · 663 449 décisions · 0 jamais jouée
la plus fréquente (se faire un ami) : 25,4 % — sous le seuil d'alerte de 45 %
vie médiane 64 ans · lignées éteintes 25 % · aucun signal d'alarme
```

---

## 7. Le coût

| Étape | Coût d'un tick |
|---|---|
| avant l'agentivité | 9,1 ms |
| agentivité naïve, une décision par an | 4,9 ms rien que pour elle |
| après mesure et réglage | **2,8 ms** (12,2 ms au total) |

Le profileur est désormais un outil du dépôt (`pnpm profile`) : il chronomètre
chaque système, **avec une horloge injectée** parce que `engine` n'a pas le
droit d'appeler `performance.now` ([ADR-003](08-decisions.md)).

Quatre gains, dans l'ordre :

1. **Une décision une année sur quatre** hors du cercle du joueur. Quinze actes
   délibérés dans une vie d'adulte suffisent largement — c'est le
   [doc 02](02-lod-echelle.md) appliqué à la volonté. *(−35 %)*
2. **Ne plus trier le graphe de relations** pour lire ses propres liens. Le tri
   coûtait plus cher que la décision ; l'appelant départage lui-même les ex æquo.
3. **Un seul contexte d'effets, réemployé.** Le format en réclame trois
   fermetures ; en construire trois cents par année allouait plus que tout le
   travail de décision réuni.
4. **Tables aplaties une fois pour toutes.** `Object.values(jobs)` dans une
   décision jouée deux cents fois par an — la même leçon qu'au corps.

Un piège évité de justesse, et qui mérite d'être noté : parcourir le graphe sans
trier est correct **tant que le résultat ne dépend pas de l'ordre**. Prendre
« les six premiers » d'un parcours non trié rend la partie différente après un
rechargement, parce que la sauvegarde réinsère les arêtes dans l'ordre trié.
C'est le test de reprise après sauvegarde qui l'a attrapé, pas la relecture.

---

## 8. Ce qui manque encore

- **Les factions.** Les serments existent (`s'allier`, `recruter` créent de
  vraies allégeances), mais rien ne les agrège encore en groupes ayant leurs
  propres objectifs.
- **La guerre.** Le meurtre entre voisins est en place ; le conflit collectif du
  [doc 09](09-echelle-totale.md) §2 attend les factions.
- **La rumeur qui se déforme.** Les nouvelles remontent telles quelles. Une
  vraie propagation les ferait voyager de bouche en bouche, s'altérer, et
  parfois mentir.
- **Le secret et le chantage.** Le drapeau `vu_voler` est posé mais personne ne
  s'en sert encore.
- **Le regard des autres sur les corps.** Les signes de maladie sont écrits
  ([doc 12](12-corps-et-esprit.md) §4) ; les conduites ne les lisent pas encore.
  C'est le prochain croisement naturel entre les deux systèmes.
- **La mémoire des conduites.** Un PNJ ne se souvient pas de ce qu'il a fait :
  seuls les cooldowns l'empêchent de se répéter. Les vraies obsessions
  demanderont un état narratif par personnage.
