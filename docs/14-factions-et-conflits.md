# 14 — Factions et conflits

> « Les PNJ doivent pouvoir : réussir sans le joueur, mourir, créer leurs propres
> familles, **déclencher des guerres**, devenir puissants, trahir… »
> — [Vision d'origine](vision-source.md)

Deuxième morceau de la Phase 3. Le [doc 13](13-agentivite.md) a donné une
volonté à chaque habitant ; il manquait ce qui arrive quand ces volontés se
groupent — et ce qui arrive quand deux groupes ne peuvent plus se souffrir.

---

## 1. Une faction ne se décrète pas, elle se découvre

Le moteur ne crée aucun groupe. Il **lit** le réseau de serments que
l'agentivité a tissé année après année.

```
s'allier · rassembler des hommes   (doc 13, conduites de PNJ)
              ↓ arêtes de type « serment »
    quelqu'un finit par en avoir trois
              ↓
        le monde lui donne un nom
```

C'est ce qui garantit qu'une faction a toujours une histoire : elle est faite
des gens qui ont juré à quelqu'un, pour des raisons qu'on peut remonter.

Le **genre** du groupe se lit lui aussi, jamais tiré au sort — on regarde ce que
ses gens *sont* :

| Ce qui domine chez ses membres | Ce que ça donne |
|---|---|
| corruption, voleurs | une **bande** |
| lame, hommes de guerre | une **compagnie** |
| négoce | une **guilde** |
| piété | un **ordre** |
| le sang du chef (noble ou royal) | un **clan** |

Une même bande de crocheteurs peut devenir compagnie en une génération si ses
fils apprennent l'épée. Personne n'a eu à le décider.

**Seuils** : trois jurés pour naître, moins de deux membres vivants pour se
dissoudre. Un chef mort est remplacé par **le plus fort de ses hommes**, pas par
le plus vieux — ce n'est pas une maison, c'est une bande.

---

## 2. Un seul but à la fois

Une bande qui veut tout à la fois ne veut rien, et le joueur ne peut pas la
lire. Chaque faction poursuit **un** but, revu tous les huit ans, choisi par
utilité — la même discipline qu'aux pulsions des PNJ ([doc 13](13-agentivite.md) §3),
tirage pondéré au carré compris.

| But | Ce qu'elle fait | Ce qui le rend attirant |
|---|---|---|
| `croitre` | recrute chez elle, parmi les gens sans serment | être petit, un chef ambitieux |
| `enrichir` | chacun verse 4 % de son bien | un trésor bas |
| `tenir` | serre les dépenses | être au bord de la dissolution |
| `dominer` | paie ses hommes pour tenir la ville | l'ambition du chef, une emprise faible |
| `abattre` | creuse l'hostilité envers un rival plus faible | la cruauté du chef, un rapport de force favorable |
| `venger` | creuse l'hostilité envers le plus haï | la profondeur de la rancune |

**La solde est ce qui borne tout.** Chaque année, une faction paie ses hommes.
Si la caisse est vide, quelqu'un déserte — et son serment devient une rivalité.
Une bande trop grosse pour ses moyens se défait toute seule, sans qu'aucune
règle ne dise « les factions ne doivent pas dépasser N membres ».

---

## 3. Un seul système de conflit, de la rixe à la guerre stellaire

Erreur à ne pas commettre : écrire un système de bagarre, *puis* un système de
bataille, *puis* un système de guerre spatiale. Trois systèmes, trois fois la
maintenance, zéro cohérence ([doc 09](09-echelle-totale.md) §2).

Le palier se déduit des **effectifs**, jamais de l'intention :

| Palier | Effectifs | Nom |
|---|---|---|
| 0 | 1–2 | duel |
| 1 | 3–19 | rixe |
| 2 | 20–199 | escarmouche |
| 3 | 200–10⁴ | bataille rangée |
| 4 | 10⁴–10⁵ | campagne |
| 5 | 10⁵–10⁶ | guerre planétaire |
| 6 | 10⁶–10⁸ | guerre stellaire |
| 7 | au-delà | guerre de civilisations |

Une seule formule, à tous les paliers :

```
puissance = effectifs^0,8 × qualité × palier_tech² × moral × commandement
            × terrain × ravitaillement
```

Trois propriétés voulues, et testées :

- **Le carré sur la technologie.** Mille lanciers du palier 1 ne battent
  *jamais* une escouade du palier 6 — vérifié sur soixante tirages. C'est ce qui
  rend la guerre asymétrique crédible et le saut d'ère désirable.
- **Le carré n'est pas magique.** Un écart d'une seule ère ne compense pas
  n'importe quel nombre : deux mille hommes du palier 1 l'emportent sur vingt du
  palier 2. Sinon le nombre ne servirait plus à rien.
- **Le vainqueur saigne aussi.** Une victoire nette coûte peu, une victoire
  arrachée coûte presque autant qu'une défaite. C'est ce qui rend une guerre
  gagnée capable de ruiner celui qui la gagne.

Le hasard existe — ±18 % sur chaque camp — mais ne renverse pas un rapport de
forces écrasant. On perd rarement à un contre dix, jamais à un contre mille.

Aux petits paliers, **les morts sont des personnes** : `killCharacter` est
appelé, la Chronique s'écrit, ceux qui les aimaient portent le deuil. Les
faibles tombent en premier — mais pas toujours, et c'est précisément l'imprévu
qui fait qu'un héros peut mourir bêtement.

Aux grands paliers, les effectifs seront des nombres. La formule ne changera
pas.

---

## 4. Ce que le joueur en voit

Un onglet **Groupes** : qui tient quoi, avec combien d'hommes, ce qu'il cherche,
ce qu'il a perdu, et son emprise sur votre ville. Marqué *les vôtres* si vous en
êtes, *ici* s'il est chez vous.

Les batailles remontent par le fil de rumeurs, avec la même règle de portée
qu'au [doc 13](13-agentivite.md) §4 — sauf qu'à partir de l'escarmouche, tout le
monde en entend parler.

**Un accrochage sans un seul mort n'entre pas dans l'Histoire.** Il compte dans
les chiffres, il ne s'écrit pas.

---

## 5. Ce que ça a cassé, et qu'il fallait réparer

Trois défauts trouvés en **lisant les sorties du jeu** :

| Ce que le monde produisait | Correction |
|---|---|
| une seule faction en deux siècles | les serments se dispersaient sur tout le village ; le rôle `patron` les fait aller **à ceux qui en ont déjà** |
| 291 batailles en 200 ans, souvent sans un mort | seuil d'hostilité relevé, délai de quatre ans entre deux chocs, apaisement des rancunes non entretenues, déroute qui met fin à la guerre |
| « la bande à Vandel » deux fois, « le comptoir de de Toven », « les hommes de Erisgar », « Victoire de les gens de Zaman » | unicité des noms, et contraction des articles — la grammaire est ce que le joueur voit à la première partie |

Et un défaut trouvé par un **test**, pas par la relecture :

> Une partie rechargée divergeait au bout de soixante-huit ans.

`world.houses` et `world.factions` sont des `Map`. Leur ordre d'itération est
chronologique dans une partie en cours et **trié** après un rechargement. Tout
système qui *écrit* en les parcourant — la Chronique, le journal, les rumeurs —
produit donc un monde différent des deux côtés. C'est invisible à la relecture
et c'est fatal.

D'où la règle, désormais tenue par `world.houseList()` et
`world.activeFactions()` : **toute boucle qui écrit passe par un accesseur
trié.** Le même piège qu'au [doc 13](13-agentivite.md) §7, sous un autre
déguisement.

---

## 6. Mesuré

Sur 60 parties × 3 générations (5 938 années) :

```
3 765 factions fondées · 2 386 dissoutes · 23 debout en fin de partie
768 affrontements — 0,13 par année · 1 020 tombés au combat
lignées éteintes 31 % (contre 25 % avant la guerre) · aucun signal d'alarme
```

Le banc surveille désormais trois symptômes propres à cette couche : aucune
faction ne se forme, plus d'un affrontement par année, ou des factions qui ne se
battent jamais.

**Coût : 0,9 ms par année** pour les trois systèmes réunis (formation 0,36 ·
décisions 0,44 · batailles 0,06), sur un tick total de 10 à 13 ms.

---

## 7. Ce qui manque encore

- **La diplomatie.** Les groupes se haïssent ou s'ignorent ; ils ne s'allient
  pas, ne signent rien, ne se trahissent pas. `standing` est prêt pour ça.
- **Le joueur dans la mêlée.** La couche B du [doc 09](09-echelle-totale.md) §2 —
  votre fil personnel *dans* la bataille, de la piétaille au commandement — n'est
  pas écrite. Aujourd'hui vous voyez la guerre, vous ne la vivez pas.
- **Rejoindre, fonder, quitter.** Le joueur ne peut pas encore entrer dans une
  faction par une action délibérée.
- **Le territoire.** L'emprise est un nombre par implantation. Il n'y a ni
  frontière, ni région, ni conquête — c'est le morceau suivant, avec l'économie
  par domaines du [doc 11](11-economie-pouvoir.md).
- **Les paliers hauts.** Le résolveur les accepte déjà ; rien dans le monde ne
  produit encore vingt mille combattants. Ça viendra avec les États.
