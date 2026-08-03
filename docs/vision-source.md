# Vision — mots d'origine

**Ce document est la source, pas une synthèse.**

Tout le reste de `docs/` est mon interprétation : des systèmes, des arbitrages, des
compromis. Ici, rien n'est reformulé. C'est le texte de Kenny, tel qu'il l'a écrit, dans
l'ordre où il l'a écrit.

Quand un doc de conception et cette page se contredisent, **c'est cette page qui a
raison** — et le doc qui doit être corrigé.

---

## 1 — La demande initiale (2 août 2026)

> Tu es mon lead game designer, architecte logiciel senior et développeur principal.
>
> Ta mission est de concevoir un jeu de simulation de vie RPG sandbox extrêmement profond,
> jouable principalement via une interface menu-based.
>
> Le but n'est pas de créer un simple clone de BitLife. Je veux créer une simulation
> émergente capable de générer des histoires uniques sur des milliers d'années, avec une
> profondeur proche de : Crusader Kings 3 pour les dynasties, relations et politique ;
> RimWorld pour les histoires émergentes ; Dwarf Fortress pour la simulation systémique ;
> Civilization pour les empires ; RPG classiques pour la progression du personnage.
>
> Le joueur commence avec une naissance aléatoire pouvant aller du pire scénario imaginable
> au meilleur. Niveau catastrophe : enfant abandonné, orphelin, sans argent, malade,
> handicap lourd, mutilé, esclave, condamné à survivre dans un monde hostile. Niveau
> exceptionnel : héritier royal, descendant d'une ancienne dynastie, élu prophétique, génie
> naturel, être surnaturel.
>
> Le joueur doit pouvoir transformer n'importe quelle situation initiale en une légende.
>
> Une partie peut raconter : « Un enfant pauvre vivant dans une ruelle devient aventurier,
> fonde une famille noble, conquiert un continent, crée un empire galactique, devient
> immortel et dirige une civilisation pendant plusieurs millions d'années. »
>
> Chaque personnage doit être considéré comme une vraie entité simulée. Les personnages
> possèdent : personnalité, ambitions, peurs, relations, mémoire, talents, défauts,
> génétique, réputation, histoire personnelle.
>
> Les PNJ doivent pouvoir : réussir sans le joueur, mourir, créer leurs propres familles,
> déclencher des guerres, devenir puissants, trahir, créer des religions, fonder des
> empires.
>
> Je veux un monde vivant, pas une suite de menus statiques.
>
> \[…] La mort n'est pas forcément la fin. Possibilités : immortalité, clonage, transfert
> de conscience, transformation divine, existence cosmique.
>
> \[…] Objectif extrême : permettre une dynastie avec des millions voire milliards de
> descendants simulés intelligemment.
>
> \[…] Priorité absolue : architecture propre, systèmes modulaires, code maintenable,
> simulation émergente, possibilité d'ajouter des centaines de mécaniques plus tard.
>
> n'hésite pas à changer/rajouter des trucs, je suis nul en game design c chatgpt qui a
> fait ce prompt

*(Le prompt initial complet contenait aussi les listes d'attributs, les systèmes 1 à 6 et
la maquette d'interface « EMPEREUR KENNY VII ». Ils sont repris tels quels dans les docs
[03](03-systemes.md), [04](04-moteur-evenements.md) et [05](05-interface.md).)*

---

## 2 — L'échelle totale

> j'ajoute une petite note pour être sûr qu'on est sur la bonne direction : faut vraiment
> que genre on puisse partir de sous merde clochard démembré attardé autiste schizophrène a
> empereur stellaire bombardement orbitaux 1 trilliard de tués grosses batailles milliards
> de soldats tanks avions drones hélicoptères sous marins bateaux vaisseaux spatiaux bombes
> nucléaires araignées robots qu'on puisse passer de baston entre bandes a couteau invasion
> insecte de l'espace en mode starship trooper, affrontements modernes, anciens, de la
> magie, et touuuuuut et avoir une maison ultra luxueuse avec ultra hyper cars un vaisseau
> personnel de la taille d'une planète des millions de serviteurs qui travaillent dans la
> propriété privée
>
> et genre on peut se retrouver à être un simple soldat dans une tranchée a être un général
> dans un vaisseau spatial immense se battre au corps a corps, commander des armées
> entières, devenir une rockstar, présentateur tv, ministre, trucker, hitman, sex worker,
> braconnier, directeur de zoo, trader, imam, ou simple tueur en série etc faut que les
> métiers ont des propriétés émergentes pour que de nouveaux métiers se créént pour des
> possibilités infinies rien n'est rigide tout est malléable tout évolue
>
> on peut finir femme de ménage dans la 446 ème station spatiale du 285 ème système du 19
> ème secteur du 3 ème quart de la galaxie dans le secteur 02-18 de l'univers enfin tu
> captes ce que j'essaie de communiquer tout est procédural tout est possible
>
> aussi quand on meurt on joue soit son descendant soit on choisi un gars random

→ traité dans [09 — Échelle totale](09-echelle-totale.md).

---

## 3 — Les chiffres

> aussi j'aime bien les stats faut bourrer le jeu de stats (qui est l'homme le plus riche
> du monde, combien de gens sont morts dans cette guerre, arbre généalogique de ta
> dynastie, revenus d'une société de transport etc ...)

→ traité dans [10 — Chiffres & records](10-chiffres.md).

---

## 4 — L'économie et le pouvoir

> faut qu'il y ait une économie aussi, tu peux être le chef d'un petit village africain de
> 2 habitants avec full économie simulée avec le reste du monde et le reste de l'univers
> jusqu'a l'empereur du multi monde et tout, et rien n'est rigide, un gouvernement peut
> être une dictature, electoral, féodal etc

→ traité dans [11 — Économie & pouvoir](11-economie-pouvoir.md).

---

## Suivi de couverture

Une demande n'est « livrée » que lorsqu'elle est **jouable**, pas lorsqu'elle est écrite.

| Demande | État | Où |
|---|---|---|
| Naissance du pire au meilleur | ✅ livré | 22 scénarios, 6 paliers |
| Handicap lourd, mutilation | ✅ livré | traits innés, blessures permanentes |
| Neuroatypie, maladie mentale | ✅ livré | [09](09-echelle-totale.md) §8, traits + 2 naissances |
| Esclavage | ✅ livré | naissance `esclave` + affranchissement |
| PNJ qui vivent sans le joueur | ✅ livré | [13](13-agentivite.md) — 10 pulsions, 32 conduites, fil de rumeurs |
| PNJ qui trahissent et deviennent puissants | ✅ livré | serments, bandes et guildes qui tiennent des villes — [14](14-factions-et-conflits.md) |
| PNJ qui déclenchent des guerres | 🟡 partiel | les groupes se font la guerre et on en meurt ; le joueur la regarde sans la vivre |
| Conflits rixe → guerre stellaire | 🟡 partiel | un seul résolveur pour les 8 paliers ([14](14-factions-et-conflits.md) §3) ; le monde n'en produit encore que les trois premiers |
| PNJ qui créent des religions | 📐 conçu | cultures et religions — Phase 3 |
| Mort → descendant **ou un gars random** | ✅ livré | héritier · suivre quelqu'un · nouveau-né |
| Statistiques partout | ✅ livré | [10](10-chiffres.md) |
| Arbre généalogique | ✅ livré | écran Dynastie |
| Métiers émergents et infinis | 📐 conçu | [09](09-echelle-totale.md) §1 — Phase 4 |
| Armements de toutes les ères | 📐 conçu | [09](09-echelle-totale.md) §3 — Phase 5 |
| Magie | 📐 conçu | mode de monde *Mythe* — Phase 6 |
| Patrimoine jusqu'au vaisseau-planète | 🟡 partiel | [17](17-patrimoine-et-domesticite.md) — six paliers du logis au manoir, avec domesticité et entretien ; l'échelle monte jusqu'à 20 et n'attend que du contenu |
| Économie simulée à toutes les échelles | 🟡 partiel | [15](15-domaines-et-pouvoir.md) — domaines récursifs, prix locaux, routes ; les paliers planétaires attendent des mondes |
| Gouvernements malléables | ✅ livré | [15](15-domaines-et-pouvoir.md) §4 — sept axes, sept régimes émergés, renversements |
| Immortalité, clonage, transfert, divinité | 📐 conçu | [03](03-systemes.md) §3 — Phase 6 |
| Milliards de descendants | 📐 conçu | [02](02-lod-echelle.md) §2 — Phase 5 |
| Millions d'années | 📐 conçu | [02](02-lod-echelle.md) §3 — Phase 5 |

✅ jouable · 🟡 partiel · 📐 conçu, pas codé
