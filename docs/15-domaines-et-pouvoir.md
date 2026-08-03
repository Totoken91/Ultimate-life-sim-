# 15 — Domaines, prix et gouvernements

> « Faut qu'il y ait une économie aussi, tu peux être le chef d'un petit village
> africain de 2 habitants avec full économie simulée avec le reste du monde et
> le reste de l'univers jusqu'à l'empereur du multi monde et tout, et rien n'est
> rigide, un gouvernement peut être une dictature, electoral, féodal etc »
> — [Vision d'origine](vision-source.md)

Troisième morceau de la Phase 3, et la mise en œuvre du [doc 11](11-economie-pouvoir.md).
Les deux demandes — une économie à toutes les échelles, des gouvernements
malléables — avaient la même réponse : **une seule structure récursive**.

---

## 1. Un seul objet, à toutes les échelles

Un foyer est un domaine. Un village est un domaine. Un empire galactique est un
domaine. Ils diffèrent par leur échelle et leur contenu, jamais par leur nature.

Aujourd'hui l'arbre a trois étages — **monde → régions → implantations** — et
huit échelles sont déjà déclarées (`foyer` … `galaxie`). Les paliers supérieurs
n'attendent pas du code : ils attendent des mondes.

Le domaine qui englobe additionne ceux qu'il contient, **du bas vers le haut**.
Ce détail n'en est pas un : dans l'ordre alphabétique, `dom_monde` passe avant
`dom_reg_vardhen`, et le monde totalisait des régions pas encore recalculées —
la somme était celle de l'an dernier.

---

## 2. Onze biens, et pas un de plus

Un bien n'est pas un objet, c'est une **catégorie de besoin** : vivres · eau ·
matériaux · énergie · outils · armes · luxe · soins · savoir · nouvelles ·
l'étrange. Règle : on n'ajoute un bien que si son absence change une décision.
Un jeu avec quatre-vingts ressources n'est pas plus profond, il est plus long à
lire.

Chacun porte une **élasticité** — de combien son prix réagit à la rareté. Ce
qu'on ne peut pas remplacer flambe, ce qu'on peut différer bouge à peine :

```
le pain triple quand il manque · le luxe ne bouge presque pas
```

### Les prix sont locaux

```
prix = base × (demande / max(offre, ε))^élasticité × friction(routes)
```

Jamais de cours mondial. Le prix naît de la rareté **ici**. C'est ce qui rend le
commerce jouable — acheter là où c'est abondant, vendre là où ça manque — et ce
qui fait qu'une mauvaise récolte se lit immédiatement, sans qu'on ait écrit un
événement « il y a une famine ».

Mesuré sur le Rivage après deux siècles :

```
Orin-sur-Loë (bourg de moulins)   vivres 3,8 sous
Vardhèn (cité de comptoirs)       vivres 11,4 sous
```

Personne n'a écrit que la campagne nourrit moins cher que la ville. C'est sorti
tout seul de qui produit quoi et de ce que coûtent les routes.

### Les routes

Six routes de terre et de mer, chacune avec capacité, coût, risque et
**latence**. La latence est déjà là bien qu'elle vaille zéro partout : commander
du grain à huit ans de distance changera complètement la nature du problème, et
il valait mieux que le champ existe avant les vaisseaux.

Le commerce n'est décidé par personne : le grain part quand l'écart de prix
couvre le trajet, et pas avant.

---

## 3. L'économie d'une personne

C'est le branchement qui rend tout le reste réel. Avant, le revenu d'un métier
était un nombre fixe et le coût de la vie une constante par classe. Maintenant :

- **le revenu suit les prix de ce qu'on vend, ici.** Un forgeron gagne plus là
  où les outils manquent ;
- **le coût de la vie suit le prix du pain, ici.** Une disette vide les bourses
  avant d'entamer les corps.

Et un corps entamé produit moins — le [doc 12](12-corps-et-esprit.md) débouche
directement dans l'économie.

La faim, elle, ne s'affiche pas d'abord en chiffres. Elle abîme les corps de
ceux qui n'ont pas de quoi s'en protéger, et le joueur lit :

> *Les vivres manquent à Bas-Vardhèn. Les prix ont doublé.*
> *Il n'y a plus de vivres à Bas-Vardhèn. On enterre des enfants.*

C'est la règle du [doc 11](11-economie-pouvoir.md) §7 : des conséquences
humaines avant des chiffres.

---

## 4. Les gouvernements : sept axes, pas une liste

Un gouvernement n'est pas un type énuméré. C'est un jeu de règles qu'on modifie
une par une : **qui décide · comment on y accède · combien de temps · ce qu'on
peut imposer · à qui est la terre · ce qui légitime · qui paie quoi.**

Les régimes classiques ne sont que des points dans cet espace, et la table qui
les nomme ne contraint rien : un gouvernement qui n'y figure pas est
parfaitement valide et s'appelle *un arrangement sans nom*.

L'axe `access` n'est pas décoratif : **c'est lui qui choisit qui monte.** Sous
`sang`, le mieux né ; sous `fortune`, le plus riche ; sous `mérite`, le plus
capable ; sous `conquête`, celui qui a le plus d'hommes — ce qui relie
directement les factions du [doc 14](14-factions-et-conflits.md) au pouvoir.

Chaque axe a un prix, et c'est tout ce qui empêche le système de devenir une
bouillie :

| Choix | Ce qu'il donne | Ce qu'il coûte |
|---|---|---|
| `tenure: héréditaire` | stabilité | on ne se débarrasse pas d'un incapable |
| `access: conquête` | on prend vite | rien ne légitime, tout s'use |
| `property: commune` | cohésion, moins de mécontentement | production plus faible |
| `property: privée` | production plus forte | friction sociale |
| `taxation: progressive` | des recettes | les riches financent vos rivaux |
| `reach` élevé | on impose sa loi | mécontentement **et** coût administratif |

### Légitimité et mécontentement

Deux nombres portent tout. Quand le mécontentement dépasse la légitimité,
quelque chose casse — et *quoi* dépend du régime :

- une république remercie les siens et recommence ;
- une monarchie bascule, soit vers l'élection, soit vers un homme fort ;
- un hameau ne se renverse pas : des familles s'en vont ;
- et un groupe armé qui tient la ville prend le pouvoir, quel que soit le régime.

---

## 5. Ce que la mesure a corrigé

Quatre défauts, tous trouvés en lisant les sorties du jeu :

| Ce que le monde produisait | Ce qui n'allait pas |
|---|---|
| des trésors à **douze millions de sous** | l'impôt frappait la **fortune**, pas le revenu — un prélèvement annuel sur le stock est confiscatoire et sans fin |
| légitimité 100 **et** mécontentement 100, ensemble | les deux saturaient, donc `mécontentement > légitimité` n'était jamais vrai et plus rien ne tombait jamais |
| « au nom de **le** peuple », « quelques-uns **décide** » | la grammaire est ce que le joueur voit à la première partie |
| une région et une ville portant le **même identifiant** | `kaleth` est à la fois une culture et une cité : la région écrasait la ville dans la Map |

Et un cinquième, qui dit quelque chose sur le modèle. La conduite *aller voir
quelqu'un qui sait* n'avait **jamais** été jouée — cinq cent mille décisions,
zéro. Ce n'était pas l'argent :

> **aucun vivant du monde n'a une santé inférieure à 64.**

Le corps emporte les gens avant. La pulsion `survie` ne se déclenchait qu'en
dessous de 58, un état que personne n'atteint vivant. On s'inquiète en
déclinant, pas en agonisant : le seuil est passé à 85, avec un exposant qui
garde l'urgence concentrée dans le bas.

---

## 6. Mesuré

Sur 50 parties × 3 générations (5 381 années) :

```
639 renversements — 12,8 par partie
prix moyen du pain 8,4 sous (référence 12) · pire manque en fin de partie 19 %

république 74 · féodalité 61 · oligarchie 59 · ploutocratie 50
personne ne commande 49 · dictature 5 · chefferie 2

aucun signal d'alarme
```

Sept régimes coexistent dans un monde qui n'en connaissait que quatre au départ,
et aucun n'a été écrit comme un scénario : ils sont sortis des sept axes.

Le banc surveille désormais quatre symptômes propres à cette couche : aucun
régime ne change jamais, un seul régime partout, un monde affamé en permanence,
un prix du pain aberrant.

**Coût : 0,9 ms par année** pour les trois systèmes réunis (économie 0,70 ·
gouvernement 0,16 · faim 0,07).

---

## 7. Ce qui manque encore

- **Les foyers.** L'échelle existe, aucun domaine ne l'occupe. C'est le palier
  qui rendra littéral le « village de deux habitants avec économie complète ».
- **Les entreprises.** Un domaine minuscule avec un propriétaire, des employés,
  des salaires et une marge ([doc 11](11-economie-pouvoir.md) §3). C'est de là
  que tomberont « les revenus d'une société de transport ».
- **Le joueur qui gouverne.** Il voit les sept axes, il ne peut pas encore les
  toucher. `reform()` est écrit et testé ; il lui manque un écran et un coût
  payé par des gens nommés.
- **Les dettes portées par des personnes.** Certaines fortunes descendent à
  −400 000 sous sans que personne ne vienne réclamer. Un créancier devrait avoir
  un nom.
- **Les routes qui se coupent.** `severedUntil` existe ; aucune guerre ne s'en
  sert encore. C'est le croisement évident avec le [doc 14](14-factions-et-conflits.md).
- **Les paliers agrégés.** Tout est simulé finement. Le [doc 02](02-lod-echelle.md)
  prévoit cohortes puis flux puis courbes — c'est ce qui portera les planètes.
