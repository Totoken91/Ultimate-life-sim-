# 08 — Décisions (ADR)

Journal des choix tranchés. Une décision qui n'est pas écrite sera re-débattue tous les trois mois.

Format : **contexte → décision → alternatives rejetées → conséquences**.

---

## ADR-001 — TypeScript sur Node

**Contexte.** Simulation lourde, mais surtout beaucoup de contenu et beaucoup d'itération de design.

**Décision.** TypeScript strict, Node 22+, monorepo pnpm.

**Rejeté.**
- *Python* — itération excellente, mais perf insuffisante en mode Ère et typage du contenu trop faible
  pour 400 fichiers.
- *Rust* — perf idéale, mais le coût d'itération sur du design incertain est prohibitif. On ne connaît
  pas encore les structures finales ; se battre avec l'emprunteur pendant la phase d'exploration est
  le meilleur moyen d'abandonner.
- *C#/Godot* — orienté moteur graphique, dont on n'a pas besoin.

**Conséquences.** Perf inférieure à Rust — compensée par le LOD. Chemin vers une UI web ouvert.
Si un système devient un mur, il est isolable derrière une interface et remplaçable par du WASM.

---

## ADR-002 — Moteur pur, headless, sans I/O

**Décision.** `packages/engine` ne fait aucune I/O, n'affiche rien, ne connaît aucun client.

**Conséquences.** Le CLI, une future UI web, le banc d'émergence et un éventuel bot sont tous des
clients du même moteur. Testabilité maximale. Un peu de cérémonie en plus (façade + ViewModel).

---

## ADR-003 — Déterminisme strict

**Décision.** Une seule source d'aléa, seedée, avec des flux forkés et nommés. Aucune source
non déterministe autorisée dans `engine`, vérifié par lint.

**Rejeté.** *« On seedera plus tard »* — la rétro-adaptation du déterminisme dans une simulation
existante est un chantier de plusieurs semaines et on ne le fait jamais.

**Conséquences.** Bugs reproductibles, sauvegardes fiables, tests golden possibles. Contrainte
permanente sur le style de code (attention aux itérations d'ensembles non ordonnés).

---

## ADR-004 — Enregistrements typés + tables latérales, pas d'ECS

**Décision.** Des structures typées (`Character`, `House`) dans des `Store<T>`, avec le graphe de
relations, les mémoires, les flags et les intrigues en tables séparées.

**Rejeté.**
- *ECS complet* — pensé pour des milliers d'entités homogènes mises à jour uniformément. Nos entités
  sont peu nombreuses (paliers 0/1), très hétérogènes et fortement narratives. L'ECS ajouterait de la
  cérémonie sans bénéfice.
- *Base de données embarquée (SQLite)* — tentant pour les requêtes, mais impose des I/O et de
  l'asynchrone dans le noyau, ce qui casse ADR-002 et complique le déterminisme.

**Conséquences.** `Store<T>` est une interface : on peut passer en tableaux de structures plus tard
sans toucher aux appelants.

---

## ADR-005 — Simulation à 4 paliers de détail (LOD)

**Décision.** T0 Focus / T1 Actif / T2 Cohorte / T3 Génératif, avec promotion et rétrogradation par
score d'importance et plafonds durs.

**Rejeté.** *Tout simuler* — impossible au-delà de ~10⁴ entités en JS, et sans valeur pour le joueur.

**Conséquences.** C'est ce qui rend la vision réalisable. En contrepartie, tout système doit déclarer
sur quels paliers il tourne, et les transitions entre paliers doivent être soignées (ne jamais perdre
un personnage qui comptait).

---

## ADR-006 — Matérialisation générative paresseuse des descendants

**Décision.** Les descendants lointains ne sont pas stockés. Une branche stocke des paramètres ; un
individu est fabriqué à la demande depuis `hash(founderSeed, cheminGénéalogique)`.

**Conséquences.** Descendance illimitée, coût mémoire nul, individus stables entre deux sessions.
Contrainte : la fonction de matérialisation ne doit **jamais** changer sans versionnement, sinon tous
les ancêtres du passé changent de nom. Elle est versionnée comme un format de sauvegarde.

---

## ADR-007 — Temps élastique à 4 modes

**Décision.** Vie (1 an) / Dynastie / Ère (10–100 ans) / Cosmique (10³–10⁶ ans), avec résolution
agrégée dans les modes longs et retour possible au mode Vie à tout moment.

**Rejeté.** *Tick fixe partout* — 1 million d'années à 1 an/tick est injouable ; un tick toujours
énorme rend la vie individuelle impossible à jouer.

**Conséquences.** Chaque système déclare les modes temporels où il s'applique. Le contenu doit exister
en deux registres : personnel et civilisationnel.

---

## ADR-008 — Instantané versionné, pas de rejeu d'event log

**Décision.** Sauvegarde = état complet sérialisé + `saveVersion` + chaîne de migrations.

**Rejeté.** *Rejeu depuis la graine et le log de choix* — fichier minuscule et élégant, mais toute
évolution du code fait diverger les anciennes parties. Rédhibitoire sur un projet destiné à évoluer
pendant des années.

**Conséquences.** Fichiers plus gros (cible < 20 Mo compressés). Migrations à écrire et à tester.
Les paliers T2/T3 ne sont pas sauvegardés mais regénérés.

---

## ADR-009 — Contenu en données typées, effets à vocabulaire fermé

**Décision.** Tout le contenu de jeu vit dans `packages/content`, en TypeScript typé, avec un
vocabulaire d'effets fermé (~30 verbes) et une validation au chargement.

**Rejeté.**
- *JSON pur* — pas de prédicats, pas d'autocomplétion, validation faible.
- *Effets en code arbitraire* — puissance illimitée, couplage illimité, moddabilité nulle.

**Conséquences.** Écrire du contenu ne demande pas de toucher au moteur. Un effet manquant se
constate vite ; on l'ajoute au vocabulaire de façon délibérée, ce qui garde le noyau petit.

---

## ADR-010 — Pas de LLM dans la boucle de simulation

**Décision.** Aucun appel à un modèle de langage dans le noyau. Option cosmétique autorisée
uniquement pour reformuler la Chronique à l'export.

**Rejeté.** *Génération de texte d'événement à la volée* — casse le déterminisme, ajoute latence,
coût et dépendance réseau, et rend le jeu injouable hors-ligne.

**Conséquences.** Il faut de bons modèles de texte paramétrés. C'est du travail d'écriture, et c'est
le bon endroit où le mettre.

---

## ADR-011 — Les PNJ ont une vraie agentivité

**Décision.** IA utilitaire (pulsions × catalogue d'actions) pour les paliers 0 et 1. Un PNJ peut
prospérer, conquérir et l'emporter sans le joueur.

**Rejeté.** *PNJ réactifs uniquement* — moins cher, mais produit un monde décoratif. C'est
exactement ce que la vision refuse.

**Conséquences.** Coût CPU sur ~10 000 entités par tick — d'où les plafonds LOD. Et une conséquence
de design assumée : **le joueur peut perdre la partie en regardant ailleurs**.

---

## ADR-012 — Le surnaturel est un interrupteur

**Décision.** Trois modes de monde (Chronique / Légende / Mythe), même moteur, packs de contenu
différents. Légende par défaut.

**Conséquences.** Le contenu doit être étiqueté par mode dès le premier événement écrit — le
rétro-étiquetage de 400 événements est un travail pénible qu'on ne veut pas faire.

---

## ADR-013 — Le mode Vie 0–17 ans est joué finement

**Décision.** L'enfance et l'adolescence ne sont pas expédiées. C'est là que se fabriquent les traits,
les rancunes et les vérités cachées.

**Rejeté.** *Enfance en 4 clics façon BitLife* — gaspille la meilleure source de matière narrative
du jeu.

**Conséquences.** Il faut du contenu spécifique à l'enfance (~30 % des événements de la Phase 1).
