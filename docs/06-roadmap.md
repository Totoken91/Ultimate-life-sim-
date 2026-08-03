# 06 — Roadmap

**Principe directeur : tranches verticales.** À la fin de chaque phase, on peut *jouer*. Jamais six
mois de plomberie avant de voir un écran. Une phase qui ne produit pas de plaisir jouable est une
phase mal découpée.

Les durées sont indicatives (projet perso, rythme irrégulier).

---

## Phase 0 — Fondations ✅ *livrée*
*Objectif : le squelette tourne, à vide, mais proprement.*

- monorepo pnpm, TypeScript strict, vitest, règle anti-`Math.random` dans `engine`
  (portée aujourd'hui par un test exécutable plutôt que par ESLint — même effet, zéro
  configuration ; on la basculera en règle de lint quand le projet aura un `eslint.config`)
- PRNG seedé forkable + tests statistiques
- calendrier, boucle de ticks, pipeline de systèmes avec priorités
- `World` + `Store` + graphe de relations
- sauvegarde/chargement v1 + une migration bidon pour prouver la chaîne
- shell CLI : boucle de commandes, rendu d'écran, navigation
- CI : tests + hash de déterminisme + budgets de perf

**Fin de phase :** `pnpm play` affiche un écran, on avance le temps de 100 ans, on sauvegarde, on
recharge, l'état est identique au bit près.

---

## Phase 1 — Une vie ✅ *livrée* ⭐ *le MVP jouable*
*Objectif : naître, vivre, mourir, et que ce soit déjà intéressant.*

- 20 scénarios de naissance couvrant les 6 paliers, avec vérités cachées
- 6 attributs + potentiel/destinée/génétique cachés
- traits innés et acquis (~60)
- vieillissement, santé, maladie, mortalité infantile réelle
- ~15 compétences
- relations : famille, amitié, amour, rivalité (arêtes dirigées)
- système de mémoire (budgété, avec oubli)
- économie de survie : travail, vol, mendicité, dépenses
- **moteur d'événements complet** : rôles, cooldowns, saturation de tags
- **graines** (conséquences différées) — dès la Phase 1, c'est structurant
- 120 événements écrits
- mort → écran de fin + Chronique exportable

**Fin de phase :** on joue 3 vies d'affilée et elles sont clairement différentes. Le test :
raconter une des trois à quelqu'un sans s'ennuyer.

**Livré en plus, en avance sur la Phase 2** (parce que la boucle est nettement meilleure
avec) : mariage, enfants avec génétique héritée, fondation de maison, mort → reprise avec
un héritier qui reçoit les biens **et les inimitiés** du défunt. Le reste de la Phase 2
(éducation des enfants, lois de succession, arbre généalogique) reste à faire.

---

## Phase 2 — Héritage ✅ *livrée*
*Objectif : la mort n'arrête plus la partie.*

- mariage, fertilité, enfants avec génétique héritée
- **éducation des enfants** : quatre écoles (corps, esprit, gens, ombre), cinq ans dans la
  même laissent un trait définitif
- héritage : biens, titres, **et inimitiés du défunt**
- **succession** : cinq lois (primogéniture, ultimogéniture, mérite, désignation, combat),
  modifiables contre du prestige ; l'ordre remonte aux petits-enfants, à la fratrie et aux
  neveux avant de déclarer une lignée éteinte
- continuation : héritier, **n'importe qui d'autre dans le monde**, ou nouveau-né
- maison : fondation, prestige qui monte par les actes et **s'érode tout seul**, rangs
- **arbre généalogique** navigable
- **monde peuplé** + naissances PNJ + élagage des morts ([doc 10](10-chiffres.md))
- **statistiques, classements et livre des records** ([doc 10](10-chiffres.md))

**Fin de phase :** une partie de 4 générations, où les erreurs de la génération 1 pèsent sur la 4.

---

## Phase 3 — Monde vivant *(en cours)*
*Objectif : le monde tourne sans vous.*

- ✅ **IA utilitaire des PNJ** ([doc 13](13-agentivite.md)) : dix pulsions, 32 conduites,
  choix utilitaire, fil de nouvelles. 663 000 décisions de PNJ au banc, zéro conduite morte
- ✅ **inimitiés émergentes** : l'inégalité fabrique des rivaux, les querelles ne guérissent
  plus toutes seules, et le monde connaît ses premiers meurtres sans le joueur
- ✅ **profileur de tick** (`pnpm profile`) : où passent les millisecondes, système par système
- **économie par domaines** ([doc 11](11-economie-pouvoir.md)) : foyer → région, biens de
  base, prix locaux, routes, stocks — une seule structure récursive à toutes les échelles
- **gouvernements malléables** ([doc 11](11-economie-pouvoir.md) §4) : sept axes dont les
  combinaisons produisent chefferie, féodalité, république, dictature, théocratie…
- régions, implantations, démographie
- cultures et religions (dérive, coutumes)
- factions avec objectifs
- propagation de l'information et rumeurs *(le fil existe ; la déformation, non)*
- secrets et chantage
- réputation contextuelle par groupe
- guerres et conflits entre PNJ
- **banc d'émergence** : 1 000 parties headless + rapport de métriques

**Fin de phase :** on lance 500 ans sans jouer, et le rapport montre un monde plausible — des
dynasties naissent et meurent, les guerres ne sont ni continues ni absentes.

---

## Phase 4 — Voies de pouvoir
*Objectif : deux parties ne se ressemblent plus du tout.*

- **occupations compositionnelles** ([doc 09](09-echelle-totale.md) §1) : le métier n'est plus
  une entrée de table mais `Verbe × Domaine × Institution × Échelle × Ère × Légitimité`
- **conflits paliers 0–3** (duel → bataille rangée), système unique à deux couches
- les 5 voies, ~15 rangs chacune, avec actions exclusives
- 5 attributs restants (Chance, Créativité, Leadership, Aura, Spiritualité) + leurs consommateurs
- corruption, folie, karma pleinement branchés
- **intrigues** (machines à états multi-années) + visibilité partielle
- économie intermédiaire : entreprises, dettes, créanciers, commerce
- 150 événements supplémentaires spécifiques aux voies

**Fin de phase :** une partie de mage et une partie de marchand offrent des menus, des événements et
des fins différents.

---

## Phase 5 — Empire & ères
*Objectif : le temps change d'échelle.*

- **ères technologiques** (fer → post-matière), qui débloquent domaines, échelles et `K`
- **conflits paliers 4–6** : campagne, guerre planétaire, bombardement orbital
- **patrimoine** ([doc 09](09-echelle-totale.md) §4) : du taudis au vaisseau-planète, même
  schéma, l'entretien annuel comme seule vraie friction
- institutions fondables (culte, corporation, syndicat) — chacune ouvre ses métiers
- titres, vassalité, gouvernance, lois
- guerres à l'échelle des royaumes
- **mode Dynastie et mode Ère** (temps élastique, résolution agrégée)
- **paliers LOD T2 (cohortes) et T3 (branches génératives)**
- **matérialisation générative** + navigation dans l'arbre profond
- entropie impériale : corruption, sécession, décadence — les empires doivent pourrir
- arbre technologique civilisationnel
- catastrophes majeures

**Fin de phase :** on joue une dynastie de 3 000 ans, on descend sur un descendant de la 60ᵉ
génération, il existe, il a un nom, il est stable après rechargement.

---

## Phase 6 — Transcendance
*Objectif : le late game a du sens.*

- toutes les continuations (réincarnation, clonage, transfert, ascension)
- immortalité + **érosion de la mémoire** (la rareté du palier)
- fondation de religions, culte du joueur
- expansion stellaire, capacité d'accueil interstellaire
- mode Cosmique, rivaux non-humains, manipulation des lois physiques
- entropie de l'univers comme horizon final
- fins multiples (effacement, héritage, transcendance, boucle)

**Fin de phase :** une partie de 100 000 ans reste tendue. Si elle est ennuyeuse, la phase n'est pas
finie — on ajoute de la rareté, pas des chiffres.

---

## Phase 7 — Longue traîne
*Objectif : le jeu vit après moi.*

- chargement de packs de contenu externes (mods)
- les 3 modes de monde (Chronique / Légende / Mythe) complets
- UI web sur la même `GameFacade`
- outils d'édition de contenu, documentation moddeur
- localisation
- export de Chronique enrichi (prose via LLM en option)

---

## Ce qui est explicitement reporté

| Reporté à | Pourquoi maintenant serait une erreur |
|---|---|
| UI web (P7) | doublerait le coût de chaque itération de design |
| Optimisation SoA | on optimise après avoir mesuré, jamais avant |
| Mods (P7) | on ne fige pas une API de contenu avant qu'elle soit stable |
| Localisation (P7) | verrouiller les textes trop tôt gèle le design |
| Multijoueur | jamais |

## Jalon de vérité

**Fin de Phase 1**, une question honnête : *est-ce que j'ai envie de rejouer une vie ?*

Si non, on ne passe pas à la Phase 2. On répare la Phase 1. Toute la profondeur du monde ne sauvera
jamais une boucle de base qui n'est pas plaisante — c'est comme ça que meurent 90 % des projets de
simulation ambitieux.
