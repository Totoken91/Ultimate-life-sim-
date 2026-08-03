# 18 — Lisibilité

> « Je comprends rien à ce qu'il se passe et comment évoluer et qui est qui, et
> ce que font les stats. J'ai presque l'impression de jouer dans le vide. Fais
> des sim, améliore/fix, réitère, plein de fois, fais un truc addictif
> compréhensible et jouissif. »
> — Kenny

C'est le rapport de bug le plus important reçu jusqu'ici, parce qu'il ne porte
sur aucun système en particulier : il porte sur **ce que le joueur reçoit**. Un
monde profond dont on ne lit rien n'est pas profond, il est opaque.

Ce document est la liste de ce qui a été trouvé **en jouant** — pas en relisant
le code — et de ce qui a été corrigé. Chaque ligne vient d'une partie réelle.

---

## 0. La méthode

Un banc de lecture (`scratchpad/play.ts`) qui n'appelle que les vues publiques :
`status`, `relations`, `urges`, `standing`, `game.year()`. Il affiche exactement
ce qu'un joueur voit, année par année, et rien d'autre. On joue, on note ce
qu'on ne comprend pas, on corrige, on rejoue.

Deux instruments de mesure sont venus s'y ajouter quand une intuition était
insuffisante : un compteur de distribution d'humeur sur 40 vies, et une sonde
qui, à chaque année « brisé », note l'état du personnage. Le second a trouvé en
une exécution ce que trois hypothèses avaient manqué (§5).

---

## 1. Ce que le joueur lisait, et qui était faux

| Ce qui s'affichait | Ce qui n'allait pas |
|---|---|
| `1 ans` | pas d'accord du singulier. Corrigé partout par `ans(n)` — trente points d'affichage |
| `5 ans · nourrisson` | les âges de la vie commençaient à six ans. Un nourrisson ne vole pas sur un étal |
| `père Derwen Cerneth · mère Tegwen Dolwyn · aîné Cadoc Rhoswen` | quatre patronymes pour un seul foyer, sur le premier écran du jeu |
| `Derwen Cerneth fait la cour à Tegwen Cerneth` | **aucun scénario de naissance ne mariait les parents.** Pour le moteur, c'étaient deux adultes qui partagent un enfant |
| `Tegwen Cerneth (mère) parle de fonder un foyer` | la condition testait la présence d'un époux au lieu de son absence |
| `Vous ne tenez plus votre rang` — à **un an** | un enfant n'a pas de rang à lui : il a celui de sa maison |
| `For 48.228321947818166` | la croissance annuelle est fractionnaire ; l'affichage ne doit jamais l'être |
| `Bourse 199 sous (misère)` à côté de `pauvre` | deux échelles qui partagent leur vocabulaire se lisent comme une contradiction |
| `Cendre Draum est morte — usé par les années` | accord du participe sur la cause |
| `Ysera Draum · celui qui m'a appris à lire` | une étiquette dit *qui est cette personne* : elle ne peut pas se tromper sur elle |
| `Nerys Maenol · époux` | l'étiquette décrit la personne visée, pas celle qui regarde |
| `Jamila s'est engagée auprès de Emran` | élision manquante, encore |
| `des la bande à Sorel` | un nom de groupe porte déjà son article : il faut la contraction |

L'accord des étiquettes est fait **une seule fois, à l'endroit où l'on connaît
la personne** (`agreeLabel`, appelé par l'effet `rel`, par `pick.generate`, et
par les quatre endroits qui nouent un mariage). Le contenu écrit au masculin et
marque d'un `{e}` ce qui varie : `celui qui est parti{e} avec ma mise`. Le reste
est une table courte — le français ne se dérive pas (« le maître » → « la
maîtresse », « le desservant » → « la desservante », « le complice » → « la
complice »).

Aucune de ces lignes n'est un bug de simulation. Toutes rendent le jeu illisible.

---

## 2. Le journal était du bruit

Une année ordinaire donnait ceci :

```
· Wenna Ysgwyd s'est engagée auprès de Heulwen Cerneth.
· Nerys Llanfor s'est engagée auprès de Madoc Erisgar.
· Rhys Ysgwyd a fait parler de sa fortune à Orin-sur-Loë.
· Nerys Gwaered s'est engagée auprès de Heulwen Cerneth.
· Ffion Fenhal a fait parler de sa fortune à Orin-sur-Loë.
· Hala de Hammar a fondé une maison à Kaleth-la-Blanche.
```

Six lignes, six noms inconnus, dont un à l'autre bout du Rivage. Le joueur
apprend en deux années à ne plus lire son journal — et rate donc les trois
lignes par siècle qui le concernent.

**La règle posée :** l'année du joueur ne parle que de gens qu'il connaît. Le
filtre est une seule condition — le sujet est une de ses relations, ou lui est
la cible. Les actes des inconnus ne disparaissent pas : ils vont aux **rumeurs**
(`worldView.news`), où on va les chercher quand on veut savoir ce que le monde
fabrique. Le filtre « même lieu » avait été essayé d'abord ; soixante habitants
font six lignes par an, il ne suffisait pas.

Deux autres sources de répétition supprimées :

- le revenu annuel, ligne la plus fréquente du journal et la moins utile,
  déplacée dans l'écran de statut ;
- une occasion **laissée passer** se met au repos trois ans avant de revenir
  (`REPOS_REFUS`). « Untel cherche quelqu'un à former » revenait six années de
  suite avec un nom différent à chaque fois.

---

## 3. Les attributs ne disaient rien et ne bougeaient pas

Deux défauts distincts, tous deux mortels pour l'envie de continuer.

**Ils ne disaient rien.** `For 48` est un nombre. Chaque attribut porte
désormais une bande (`statBand`) et une phrase qui dit *ce qu'il décide* :

> **Volonté 74 — remarquable.** Ne pas céder. Tenir une entreprise, résister à
> la peur et à soi-même.

**Ils ne bougeaient pas.** Les attributs étaient fixés à la naissance. On
pouvait vivre quinze ans en lisant les mêmes six nombres : aucune progression,
donc aucune raison de jouer. `growOrFade()` fait croître de 4 à 24 ans vers un
plafond personnel, décliner après 52 sur le corps et après 68 sur la tête, et
l'annonce **seulement au passage d'une dizaine** :

> · Vous portez sans y penser ce qui vous coûtait l'an dernier.
> · Vous comprenez plus vite qu'avant. Ça se remarque.

Le plancher de tirage est monté à 16 : un « Cha 6 » que rien ne raconte est une
infirmité dont on ne se relève jamais et qui n'a pas d'histoire.

Enfin, la bourse ne se lit plus en bandes mais **en temps** :
`483 sous — de quoi tenir 5 ans`. Un chiffre nu ne dit rien ; une durée dit
tout. La référence est le train de vie d'un **adulte** de ce rang, pas celui
d'un enfant — sinon 155 sous devenaient « de quoi ne plus compter ».

---

## 4. Il n'y avait aucune réponse à « comment évoluer »

Le jeu simulait une ascension sans jamais la nommer. Le joueur avait des
pulsions (ce qui le tire), du temps, des occasions — et aucune idée de ce vers
quoi tout ça allait.

`standing(game)` ne simule rien : c'est une **lecture** de l'état du monde,
rendue en dix marches.

```
Apprenti forgeron à Orin-sur-Loë        1/10
 ○ Un toit à vous          Amassez de quoi acheter, puis achetez chez vous.
                           Un bien se paie encore chaque année après.
 ○ Quelqu'un à côté de vous  Faites la cour. Ça prend des années, et ça se refuse.
 ○ Du sang après vous      Un foyer, du temps, et un peu de chance.
```

| Marche | Ce qui la franchit |
|---|---|
| Passer l'enfance | seize ans |
| Avoir un métier | `jobId` |
| Un toit à vous | un bien possédé ([doc 17](17-patrimoine-et-domesticite.md)) |
| Quelqu'un à côté de vous | un époux vivant |
| Du sang après vous | un enfant vivant |
| Un nom qu'on connaît | influence ≥ 35 |
| Des hommes à vous | membre ou chef d'une faction ([doc 14](14-factions-et-conflits.md)) |
| Fonder une maison | une Maison au nom du joueur |
| Gouverner | dirigeant d'un domaine ([doc 15](15-domaines-et-pouvoir.md)) |
| Durer plus qu'une vie | trois chefs de maison successifs |

Franchir une marche **s'entend** : l'année où elle bascule, le journal dit ce
que ça change — *« Avoir un métier. De quoi entre chaque année sans que vous
ayez à le voler. »* Une seule fois par vie, même si l'influence retombe sous 35
ou qu'un veuvage est suivi d'un remariage : sinon la phrase cesse d'être un
moment pour devenir un tic.

Trois propriétés en font autre chose qu'une liste de quêtes :

- **Rien ne s'impose.** On peut mourir sans en avoir pris une seule, et la
  partie a quand même eu lieu.
- **Aucune ne se coche à la main.** Elles se franchissent en jouant ; il n'y a
  pas de bouton « fonder une maison ».
- **Chaque marche non franchie porte son mode d'emploi.** C'est la phrase qui
  manquait : pas « il vous faut du prestige », mais *où* le prendre.

Le titre en tête d'écran (`un gosse d'Orin-sur-Loë` → `Apprenti forgeron` →
`des hommes d'Erisgar` → `qui gouverne Vardhèn`) dit ce que **les autres**
verraient. Il prend la marche la plus haute, jamais la somme.

---

## 5. L'humeur était un interrupteur, et la dette un puits

Mesure avant correction, 40 vies, années à partir de 18 ans :

```
exalté  56.4 %   brisé  16.0 %   le reste  27.6 %
```

Deux extrêmes, presque rien entre les deux. Deux causes indépendantes, aucune
des deux devinable :

**Souffler exaltait.** `+4 + 3 × temps` d'humeur, chaque année, sans plafond. Un
joueur qui soufflait passait sa vie au maximum et son humeur ne racontait plus
rien de ce qui lui arrivait. Le repos **répare** désormais : le gain est
proportionnel à ce qui manque sous 78. Un homme brisé remonte beaucoup, un homme
serein gagne trois points.

**La dette ne se remboursait jamais.** La sonde a été formelle : **96 % des
années « brisé » sont des années de solde négatif.** Une seule mauvaise année
ouvrait un découvert, le découvert coûtait de la santé et de l'humeur chaque
année, la perte de santé coûtait du revenu, et rien dans le jeu ne permettait de
remonter. Trois choses ont changé :

- **On n'emprunte pas au Rivage.** Le solde ne descend plus sous zéro. Ce qu'on
  ne peut pas payer, on ne le paie pas — on s'en passe, et le corps encaisse
  cette année-là seulement.
- **On tombe plus vite qu'on ne monte.** Descendre d'un rang demandait dix ans,
  comme monter : c'est ce qui enfermait. Trois ans pour descendre, dix pour
  monter. Lâcher un rang qu'on ne tient plus est la soupape.
- **On le dit, avec la sortie.** *« Il vous manque 240 sous pour tenir votre
  rang cette année. Gagner plus, ou vivre plus bas : il n'y a pas de troisième
  porte. »*

Et l'humeur remonte plus vite qu'elle ne descend, à une vitesse que décide la
volonté. Un deuil laissait quelqu'un brisé huit ans : ce n'est pas une
simulation du chagrin, c'est un cul-de-sac.

Après :

```
serein  50.0 %   exalté  31.5 %   brisé  6.2 %   le reste  12.3 %
```

---

## 5 bis. L'écran « Pays » était mort

Deux chiffres y trônaient, et aucun des deux ne bougeait.

| Ce qu'on lisait | Ce qui se passait |
|---|---|
| `légitimité 100` sur 22 % des domaines | elle s'*empilait* : une somme de petits gains positifs sans plafond réel. Un pouvoir à 100 est indéboulonnable, et la comparaison légitimité/mécontentement — qui déclenche tout ce qui tombe — ne se jouait plus jamais chez lui |
| `Le Rivage · légitimité 55 · mécontentement 0`, du premier au dernier siècle | `Governance` ne s'occupe que des implantations. Les quatre régions et le monde n'avaient personne pour les faire vivre : deux tiers de l'écran étaient des chiffres gelés à leur valeur de départ |

La légitimité **tend** désormais vers ce que la situation autorise (stabilité du
régime, ancienneté, charisme de qui gouverne, faim, contestation), plafonnée à
96 — personne n'est légitime au point que rien ne puisse arriver. Et un nouveau
système, `Realms`, donne aux domaines englobants la moyenne de leurs enfants
pondérée par la population : une région va mal quand ses villes vont mal.

Effet mesuré au banc : les renversements passent de 8,0 à **11,4 par partie**,
et plus aucun domaine ne vit collé au plafond.

---

## 6. Le couloir de l'enfance

Une partie commençait par une douzaine d'années identiques : un temps, aucune
occasion, aucune entreprise ouvrable, et un clic pour passer. `game.idleYear`
détecte une année où **rien** n'est offert, et `{ t: 'skip' }` laisse filer
jusqu'à ce que quelque chose arrive, en résumant :

> Onze années passent. Vous avez douze ans.

Ce n'est pas un raccourci de confort : c'est l'aveu que ces années-là n'avaient
rien à offrir, et l'engagement de ne jamais sauter une année qui en a.

---

## 7. Ce qui manque encore

- **Aucune leçon des choses.** Rien n'explique au premier tour ce qu'est le
  temps, une entreprise, une occasion. Les marches (§4) portent une partie du
  travail, pas tout.
- **Les occasions ne plantent pas de graines** — une porte refusée devrait
  revenir autrement ([doc 16](16-annee-du-joueur.md) §7).
- **Le monde ne voit pas ce que le joueur mène.** Les PNJ ignorent qu'il
  apprend à lire ou qu'il rassemble des gens.
- **`exalté` reste à 31 %.** Le mot est encore trop facile à atteindre.
- **Les régions ne se gouvernent pas.** Leur humeur est une moyenne ; personne
  n'y règne, aucun régime n'y tombe. C'est le prochain palier d'échelle
  ([doc 09](09-echelle-totale.md)).
