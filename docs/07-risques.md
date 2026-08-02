# 07 — Risques

Classés par ce qui tue réellement les projets de ce type, du plus mortel au moins mortel.

---

## R1 — Explosion de la portée 🔴 *le tueur numéro un*

**Symptôme :** deux ans de développement, une architecture magnifique, aucun jeu jouable.
C'est la fin la plus courante des projets de simulation ambitieux.

**Parades :**
- tranches verticales obligatoires : chaque phase se termine par quelque chose de jouable
- le **jalon de vérité** en fin de Phase 1 : si ce n'est pas amusant, on ne continue pas, on répare
- une règle simple : *aucun système nouveau tant qu'un système existant est encore superficiel*
- garder une liste « plus tard » écrite, pour évacuer les idées sans les coder

---

## R2 — Le late game est vide 🔴

**Symptôme :** à 10 000 ans, il ne reste que des nombres qui montent. Plus aucune tension.

**Parades :**
- l'**échelle de sens** ([00](00-vision.md) §1) : chaque palier retire l'ancienne rareté et en
  introduit une nouvelle
- l'entropie impériale : les empires pourrissent tout seuls
- l'érosion de la mémoire pour les immortels : on perd ce qu'on aime, encore et encore
- des rivaux qui montent en même temps que vous
- la possibilité réelle de **tout perdre**, à n'importe quel palier

**Test :** en Phase 6, jouer 50 000 ans. Si on s'ennuie, la solution n'est jamais « plus de chiffres ».

---

## R3 — Famine de contenu 🟠

**Symptôme :** au bout de 3 parties, on a tout vu.

**Parades :**
- événements paramétrés par rôles puisés dans le monde réel du joueur
- saturation de tags et cooldowns
- graines et intrigues : la même situation ne se joue jamais pareil selon l'historique
- le banc d'émergence mesure la **diversité des événements déclenchés** — il détecte à la fois le
  contenu jamais vu (mal conditionné) et le contenu qui spamme

---

## R4 — Spaghettis de systèmes 🟠

**Symptôme :** modifier la fertilité casse l'économie. Plus personne n'ose toucher à rien.

**Parades :**
- les systèmes ne s'appellent jamais entre eux — ils communiquent par l'état du monde et une file
  d'intentions
- phases de tick fixes et priorités explicites
- graphe de dépendances des paquets vérifié par lint
- vocabulaire d'effets fermé (~30 verbes) : le contenu ne peut pas créer de couplage sauvage

---

## R5 — Perte du déterminisme 🟠

**Symptôme :** un bug ne se reproduit pas. Les sauvegardes divergent. Le debug devient impossible et
le projet devient ingérable en silence.

**Parades :**
- règle ESLint bloquante sur les sources d'aléa non seedées
- flux de PRNG forkés et nommés (ajouter un système ne décale pas les autres)
- test de hash en CI dès le jour 1
- tri stable avec tie-break sur `id` partout

**C'est le risque le plus insidieux** : il ne fait pas mal tout de suite, il rend le projet
impossible à maintenir six mois plus tard.

---

## R6 — Cauchemar d'équilibrage 🟠

**Symptôme :** six ordres de grandeur de puissance, plus rien n'est équilibré nulle part.

**Parades :**
- bandes logarithmiques plutôt que valeurs brutes
- chaque palier a ses propres unités et ses propres contraintes — on ne compare jamais un sou et une
  économie stellaire
- le banc d'émergence sort des courbes (richesse médiane, durée des empires, taux d'extinction)
- constantes d'équilibrage **centralisées et nommées**, jamais des nombres magiques éparpillés

---

## R7 — Performance 🟡

**Symptôme :** à 3 000 ans de jeu, un tick prend 4 secondes.

**Parades :**
- budgets mesurés en CI dès la Phase 0 (échec du build si dépassement)
- LOD à 4 paliers avec plafonds durs
- résolution agrégée en mode Ère
- profilage avant optimisation ; `Store` derrière une interface pour pouvoir passer en SoA sans
  toucher aux appelants

**Note :** ce risque est surestimé par la plupart des gens sur ce type de projet, et R1/R2 sont
sous-estimés. Ne pas optimiser avant d'avoir mesuré.

---

## R8 — Compatibilité des sauvegardes 🟡

**Parades :** `saveVersion` dès la v1, chaîne de migrations testée, sauvegardes de référence
versionnées dans le dépôt, et jamais de rejeu d'event log (voir [01](01-architecture.md) §7).

---

## R9 — Les grands nombres deviennent absurdes 🟡

**Symptôme :** 10⁹ descendants au bout de 300 ans. Le joueur décroche parce que plus rien n'est
crédible.

**Parades :** croissance logistique bornée par une capacité d'accueil qui ne monte que par paliers
technologiques. Le milliard de descendants exige d'avoir colonisé des étoiles — donc il *veut dire
quelque chose*.

---

## R10 — Complexité de l'interface 🟡

**Symptôme :** un menu principal avec 30 entrées, plus personne ne trouve rien.

**Parades :** 6 entrées maximum à la racine, un écran = une question, actions contextuelles
(seules celles qui ont un sens ici et maintenant sont proposées), aide `?` partout.

---

## R11 — Démotivation du développeur 🟠 *rarement écrit, souvent fatal*

Projet perso, portée énorme, horizon de plusieurs années.

**Parades :**
- livrer du jouable souvent : jouer son propre jeu est le meilleur carburant
- garder les phases courtes et fermables
- écrire du contenu (événements) quand on n'a pas l'énergie d'écrire des systèmes — c'est du travail
  utile, agréable et à faible charge mentale
- ne jamais réécrire l'architecture « au propre » pendant plus de deux jours d'affilée

---

## Tableau de bord

| # | Risque | Gravité | Traité par |
|---|---|---|---|
| R1 | Portée | 🔴 | tranches verticales + jalon de vérité P1 |
| R2 | Late game vide | 🔴 | échelle de sens |
| R3 | Famine de contenu | 🟠 | rôles + graines + banc d'émergence |
| R4 | Couplage | 🟠 | phases, priorités, effets fermés |
| R5 | Déterminisme | 🟠 | lint + hash CI + flux forkés |
| R6 | Équilibrage | 🟠 | bandes log + métriques |
| R7 | Performance | 🟡 | LOD + budgets CI |
| R8 | Sauvegardes | 🟡 | migrations versionnées |
| R9 | Nombres absurdes | 🟡 | croissance logistique bornée |
| R10 | UI surchargée | 🟡 | 6 entrées max, contextuel |
| R11 | Démotivation | 🟠 | jouable souvent, phases courtes |
