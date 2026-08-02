# 01 — Architecture technique

## 1. Choix de stack

**Recommandation : TypeScript strict, exécuté sur Node, en monorepo pnpm.**

| Critère | TypeScript | Python | Rust | C#/Godot |
|---|---|---|---|---|
| Vitesse d'itération design | ★★★★★ | ★★★★★ | ★★ | ★★★ |
| Perf simulation lourde | ★★★☆ | ★★ | ★★★★★ | ★★★★ |
| Contenu data-driven typé | ★★★★★ | ★★★ | ★★★★ | ★★★ |
| Chemin vers UI web plus tard | ★★★★★ | ★★ | ★★★ | ★★ |
| Coût de refactor sur 2 ans | ★★★★ | ★★ | ★★★★★ | ★★★★ |

TypeScript gagne parce que le goulot d'étranglement de ce projet n'est **pas** le CPU, c'est le
**design et l'itération sur le contenu**. Et le typage strict est ce qui permet d'avoir 400 fichiers
de contenu sans que tout parte en vrille.

Le point faible (perf) est traité par l'architecture LOD, pas par le langage. Si un jour un système
précis devient un mur, il est isolé derrière une interface et peut passer en WASM sans toucher au reste.

**Contraintes non négociables :**
- `strict: true`, `noUncheckedIndexedAccess: true`
- zéro dépendance runtime dans `engine` (hors polyfills). Le moteur doit tourner nu.
- Node 22+ (structuredClone, perf hooks natifs)

## 2. Découpage en paquets

```
eternal-dynasty/
├── packages/
│   ├── engine/          # LE COEUR. Pur, déterministe, sans I/O, sans affichage.
│   │   ├── rng/         # aléatoire seedé, flux forkables
│   │   ├── time/        # calendrier, échelles, ordonnanceur de ticks
│   │   ├── world/       # stockage d'entités, index, requêtes
│   │   ├── model/       # types de données (Character, House, Settlement…)
│   │   ├── systems/     # logique de simulation, une par domaine
│   │   ├── events/      # moteur d'événements + intrigues + graines
│   │   ├── lod/         # gestion des paliers, promotion/rétrogradation
│   │   ├── chronicle/   # journal structuré des faits marquants
│   │   └── save/        # sérialisation + migrations versionnées
│   │
│   ├── content/         # TOUT le contenu de jeu, en données typées
│   │   ├── traits/  events/  jobs/  cultures/  religions/
│   │   ├── titles/  items/   names/ birthscenarios/
│   │   └── schema.ts    # types + validation au chargement
│   │
│   ├── game/            # orchestration : boucle, commandes joueur, règles de session
│   ├── cli/             # rendu terminal menu-based (le client de référence)
│   └── tools/           # simulateur headless, banc de balance, générateur de rapports
│
└── docs/
```

### Règle de dépendance (à faire respecter par lint)

```
cli ──▶ game ──▶ engine ◀── content
tools ─▶ game
```

`engine` ne connaît **rien** au-dessus de lui. Il ne sait pas qu'un terminal existe.
Conséquence directe : on peut brancher une UI web, un bot Discord ou une IA joueuse plus tard sans
toucher une ligne de simulation.

## 3. Déterminisme

Le déterminisme n'est pas un luxe, c'est l'outil de debug principal d'une simulation émergente.
Sans lui, « mon empire a disparu et je ne sais pas pourquoi » est impossible à investiguer.

### Règles

1. **Une seule source d'aléa** : un PRNG seedé (PCG32 ou xoshiro128\*\*, implémenté à la main, ~40 lignes).
2. **Flux forkés et nommés**, jamais un générateur global partagé :
   ```ts
   const r = rng.fork('systems.fertility', tick, characterId);
   ```
   Ça garantit qu'ajouter un système ne décale pas l'aléa de tous les autres — sinon toute
   modification du code invalide toutes les sauvegardes et rend le debug impossible.
3. **Interdits dans `engine`** (règle ESLint custom, erreur au build) :
   `Math.random`, `Date.now`, `new Date()`, `performance.now`, `crypto.randomUUID`,
   itération sur `Set`/`Map` non ordonnés pour produire un effet de jeu.
4. **Ordre d'exécution explicite** : chaque système déclare une `priority: number`.
   Jamais l'ordre d'enregistrement.
5. **Tri stable partout** : tout tri qui influence le jeu se termine par un tie-break sur `id`.

### Test de non-régression
`tools/` lance N parties complètes depuis une graine fixe et hache l'état final.
Le hash change = quelqu'un a cassé le déterminisme. Ce test tourne en CI dès la Phase 0.

## 4. Le monde et ses entités

Pas d'ECS complet (surdimensionné et pénible pour du contenu narratif).
**Approche retenue : enregistrements typés + tables latérales.**

```ts
type EntityId = number & { readonly __brand: 'EntityId' };

interface World {
  tick: Tick;
  seed: bigint;

  characters: Store<Character>;   // paliers 0 et 1 uniquement
  houses:     Store<House>;
  settlements:Store<Settlement>;
  factions:   Store<Faction>;
  cultures:   Store<Culture>;
  religions:  Store<Religion>;

  cohorts:    CohortTable;        // palier 2 — agrégats
  branches:   BranchTable;        // palier 3 — paramètres génératifs

  relations:  RelationGraph;      // arêtes, indexées dans les deux sens
  memories:   MemoryStore;        // souvenirs datés, budgétés
  plots:      PlotStore;          // intrigues en cours
  seeds:      SeedQueue;          // conséquences différées programmées
  flags:      FlagStore;          // état narratif clairsemé
  chronicle:  Chronicle;
}
```

Points importants :

- **`Store<T>`** est une interface. Implémentation naïve (Map) en Phase 1, structure de tableaux
  (SoA) plus tard si le profilage l'exige. L'appelant ne voit pas la différence.
- **Le graphe de relations est séparé** des personnages. C'est un graphe, pas un champ. Il faut
  pouvoir demander « qui déteste X » aussi vite que « qui X déteste-t-il ».
- **La mémoire est budgétée** : ~40 souvenirs max par personnage focus, avec oubli par pertinence
  décroissante (émotion × récence × rareté). Un personnage qui se souvient de tout n'est ni
  réaliste ni tenable en mémoire.
- **Les flags sont clairsemés** : `Map<string, number|boolean>` par entité, pas des champs fixes.
  C'est ce qui permet au contenu d'inventer des états que le moteur n'a jamais prévus.

## 5. Les systèmes

```ts
interface System {
  readonly id: string;
  readonly priority: number;          // ordre déterministe
  readonly phases: TickPhase[];       // PRE | MAIN | RESOLVE | POST
  readonly lodMask: LodTier[];        // sur quels paliers il tourne
  readonly timeModes: TimeMode[];     // Vie | Dynastie | Ère | Cosmique
  run(ctx: TickContext): void;
}
```

Un tick est un pipeline de phases fixes :

| Phase | Rôle | Exemples de systèmes |
|---|---|---|
| `PRE` | vieillissement, horloges, décroissances | Aging, Cooldowns, SeedMaturation |
| `MAIN` | intentions des agents | Drives, NpcDecision, FactionAI, Economy |
| `RESOLVE` | résolution des conflits d'intentions | War, Court, Market, Succession |
| `POST` | conséquences, journal, LOD | Chronicle, Reputation, LodRebalance |

Aucun système n'appelle un autre système directement. Ils communiquent par **l'état du monde** et par
une **file d'intentions**. Sinon on obtient un plat de spaghettis en 6 mois.

## 6. Contenu data-driven

Tout ce qui est « du jeu » (et pas « du moteur ») vit dans `packages/content` en TypeScript typé
(pas en JSON : on veut l'autocomplétion, la vérification de types et des prédicats en code).

```ts
export const OLD_MANS_MAP: EventDef = {
  id: 'mystery.dying_stranger_map',
  tags: ['mystery', 'exploration', 'windfall'],
  scope: 'character',
  requires: { minAge: 10, notFlags: ['found_lost_city'] },
  weight: (c) => c.subject.stats.luck * 0.5 + (c.subject.wealth < 100 ? 20 : 0),
  cooldown: { years: 40, scope: 'dynasty' },
  roles: {
    stranger: pick.knownCharacter({ minAge: 60, health: 'dying', fallback: 'generate' }),
  },
  // ...
};
```

Le contenu est **validé au chargement** (ids uniques, rôles référencés, effets connus, pas de
cooldown absurde). Un pack de contenu invalide fait échouer le démarrage, pas la partie à 3h de jeu.

## 7. Sauvegardes

**Décision : instantané complet versionné + migrations. Pas de rejeu de log d'événements.**

Le rejeu est séduisant (fichier minuscule) mais devient un cauchemar : dès que le code change,
toutes les vieilles sauvegardes produisent des mondes différents. Sur un projet qui va évoluer
pendant des années, c'est disqualifiant.

- format : JSON structuré → gzip. Cible < 20 Mo pour une dynastie de 5 000 ans.
- `saveVersion` incrémenté à chaque changement de forme ; chaîne de migrations `v1→v2→v3…`
  testée sur des sauvegardes de référence stockées dans le dépôt.
- ce qu'on ne sauvegarde pas : tout ce qui est reconstructible (index, caches, paliers 2 et 3 —
  ces derniers sont **regénérés** depuis leurs paramètres, c'est tout l'intérêt).

## 8. Performance : les budgets, dès le jour 1

Un budget qu'on ne mesure pas est un budget qu'on dépasse. La CI mesure et fait échouer si on sort
des clous :

| Métrique | Cible | Plafond dur |
|---|---|---|
| Tick en mode Vie (~600 vivants, corps simulé) | < 8 ms | 16 ms |
| Tick en mode Ère (100 ans agrégés) | < 150 ms | 400 ms |
| Personnages palier 0+1 en mémoire | ~5 000 | 20 000 |
| Empreinte mémoire | < 400 Mo | 1 Go |
| Chargement d'une sauvegarde de 5 000 ans | < 2 s | 5 s |

**Relevé au 2 août 2026** : 6,9 ms par tick pour ~600 personnes entièrement simulées,
corps compris. Le chemin pour y arriver est raconté dans le [doc 12](12-corps-et-esprit.md)
§3 — et il commence par un profilage, pas par une intuition.

## 9. Tests

Trois niveaux, et le troisième est le plus important :

1. **Unitaires** — maths de génétique, calculs d'héritage, PRNG, migrations de save.
2. **Golden** — graine fixe → état attendu. Détecte les dérives de déterminisme.
3. **Émergence (le vrai QA)** — `tools/` lance 1 000 parties de 500 ans sans joueur et sort un
   rapport :
   - durée de vie moyenne, mortalité infantile
   - taux d'extinction des dynasties (cible : ni 5 %, ni 95 %)
   - fréquence des guerres, durée des empires
   - diversité des événements déclenchés (détecte le contenu jamais vu et le contenu qui spamme)
   - concentration de la richesse

   Ce rapport est la seule façon de savoir si le monde est vivant ou cassé. Il tourne à chaque PR
   significative dès la Phase 3.
