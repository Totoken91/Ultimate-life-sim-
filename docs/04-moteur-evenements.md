# 04 — Moteur d'événements, intrigues et agentivité

C'est le système qui transforme une simulation en histoires. Quatre couches :

```
1. ÉVÉNEMENTS      — le moment (un an, un choix)
2. GRAINES         — la conséquence différée (planter maintenant, récolter dans 30 ans)
3. INTRIGUES       — l'arc (machine à états sur plusieurs années ou générations)
4. AGENTS          — les PNJ qui poursuivent leurs propres buts
```

---

## 1. Événements

### 1.1 Définition

```ts
interface EventDef {
  id: string;
  tags: string[];
  scope: 'character' | 'house' | 'faction' | 'region' | 'world';

  requires: Condition;            // filtre dur : éligible ou non
  weight: (ctx) => number;        // poids doux : à quel point c'est pertinent maintenant
  cooldown: { years: number; scope: 'character'|'dynasty'|'world' };
  once?: 'life' | 'dynasty' | 'game';

  roles: Record<string, RolePicker>;   // qui joue dans cette scène
  text: TemplateFn;                    // texte paramétré
  options: EventOption[];
}

interface EventOption {
  id: string;
  label: TemplateFn;
  requires?: Condition;           // option grisée avec sa raison si non remplie
  hint?: 'risqué' | 'coûteux' | 'cruel' | 'irréversible';
  outcomes: WeightedOutcome[];    // le choix n'est pas le résultat
}

interface Outcome {
  weight: (ctx) => number;
  effects: Effect[];
  text: TemplateFn;
}
```

### 1.2 Le point critique : les rôles

Un événement ne dit pas « un vieil homme ». Il dit :

```ts
roles: {
  vieillard: pick.knownCharacter({
    minAge: 60,
    health: 'mourant',
    prefer: ['relation.any', 'sameSettlement'],
    fallback: 'generate',
  }),
}
```

Le sélecteur va chercher **quelqu'un qui existe déjà dans votre vie**. C'est la différence entre
un événement générique et un événement dont vous vous souviendrez. Le `fallback: 'generate'` crée
un personnage cohérent (nom culturel, âge, lieu) seulement si personne ne convient.

### 1.3 Les effets sont des données

Un vocabulaire fermé et volontairement petit (~30 verbes) :

```
modStat · modHidden · addTrait · removeTrait · modWealth · modHealth · injure
addRelation · modRelation · createCharacter · killCharacter · learnSecret · spreadRumor
setFlag · addMemory · grantTitle · revokeTitle · modPrestige · modReputation
startPlot · advancePlot · plantSeed · queueEvent · unlockPath · modKarma · modCorruption
```

Pourquoi fermé : n'importe qui (moi, toi, un moddeur, un LLM) peut écrire du contenu sans toucher au
moteur, et le validateur peut vérifier statiquement que tout le contenu est correct.

### 1.4 Sélection à chaque tick

```
1. filtrer par requires (index par tags + tranche d'âge → on ne teste pas 5 000 événements)
2. retirer ce qui est en cooldown ou déjà vu (once)
3. calculer les poids
4. appliquer la saturation de tags (si 3 événements "trahison" en 10 ans, écraser le poids)
5. tirer 0 à 3 événements, pondérés, sans remise
6. réserver 1 emplacement aux événements d'intrigue en cours (priorité absolue)
```

L'étape 4 est ce qui empêche le jeu de sembler répétitif au bout de 2 heures.

### 1.5 Combien de contenu ?

| Phase | Événements écrits à la main | Combinaisons produites |
|---|---|---|
| 1 | 120 | ~5 000 |
| 3 | 400 | ~100 000 |
| 6 | 900 | ~10⁶ |

Le multiplicateur vient des rôles, des variantes d'issue et de la sensibilité au contexte.
On n'écrira jamais 5 000 événements à la main, et il ne le faut pas.

---

## 2. Graines : la conséquence différée

**Le système le plus important du jeu pour la qualité narrative.**

```ts
interface Seed {
  id: SeedId;
  plantedTick: Tick;
  matureAfter: { min: number; max: number };   // en années
  condition?: Condition;                        // ne germe que si le monde s'y prête
  payload: { eventId } | { plotId } | { effects };
  actors: EntityId[];                           // suivis ; si tous morts → la graine meurt ou mute
  decay?: number;                               // certaines rancunes s'éteignent
}
```

Exemples concrets :

| Acte | Graine plantée | Germination |
|---|---|---|
| Vous volez un forgeron à 9 ans | rancune(forgeron) | 25 ans plus tard, son fils est le capitaine de la garde qui vous arrête |
| Vous épargnez un ennemi | dette(ennemi) | 15 ans plus tard, il refuse de vous trahir — ou vous tue par honte |
| Vous abandonnez un bâtard | revendication_cachée | 40 ans plus tard, il réclame votre trône |
| Vous pillez un temple | malédiction_cultuelle | 3 générations plus tard, une secte traque votre lignée |

Une bonne partie doit avoir **20 à 60 graines actives** en permanence. C'est ce qui donne l'impression
que le monde se souvient.

---

## 3. Intrigues (Plots)

Une intrigue est une **machine à états** qui survit à travers les années et parfois les générations.

```ts
interface Plot {
  id, defId;
  state: string;
  participants: Record<Role, EntityId>;
  stakes: Stakes;
  startedTick, deadlineTick?;
  progress: number;
  visibility: Map<EntityId, 'ignore'|'soupçonne'|'sait'>;   // qui est au courant
}
```

Types : complot d'assassinat · conquête · courtisation · guerre de succession · schisme religieux ·
enquête · vendetta · ascension d'un ordre · découverte scientifique · effondrement d'empire.

Le champ `visibility` est essentiel : **savoir ou ne pas savoir est un enjeu de jeu**. Un complot
que vous ignorez est terrifiant. Un complot que vous soupçonnez sans preuve est un dilemme.

Les intrigues sont **poursuivies par les PNJ**, pas seulement par le joueur.

---

## 4. Agentivité PNJ

Sans ça, le monde est un décor. Avec ça, il est vivant.

### 4.1 Pulsions

Chaque PNJ de palier 0/1 a un vecteur de pulsions dérivé de ses traits et de son histoire :

```
survie · richesse · statut · pouvoir · amour · famille · foi · savoir · vengeance · liberté
```

### 4.2 IA utilitaire

À chaque tick, un PNJ évalue un petit catalogue d'actions (~25) :

```
score(action) = Σ (pulsion_i × satisfaction_i(action))
              × faisabilité(action)
              × risque_toléré(traits)
              × opportunité(état du monde)
```

Il exécute la meilleure. Actions typiques : chercher un emploi · courtiser · se marier ·
avoir un enfant · s'entraîner · voyager · comploter contre X · trahir X · rejoindre une faction ·
fonder une maison · déclarer une guerre · fonder un culte · assassiner · fuir · se venger.

25 actions × un monde riche = un nombre gigantesque de comportements crédibles. On n'écrit pas de
comportements, on écrit des motivations.

### 4.3 Conséquence assumée : un PNJ peut gagner

Un PNJ suffisamment doué et chanceux peut bâtir un empire pendant que vous êtes meunier. C'est
**voulu**. C'est ce qui crée des rivaux légendaires et des mondes qu'on n'a pas fait soi-même.

### 4.4 Information locale

Un PNJ n'agit que sur ce qu'il **sait**. L'information voyage (voyageurs, marchands, espions,
rumeurs) et se déforme. Ça produit gratuitement : des malentendus, de la désinformation
délibérée, et de l'espionnage réellement utile.

---

## 5. La Chronique

Chaque fait marquant écrit une entrée **structurée** (pas de la prose) :

```ts
interface ChronicleEntry {
  tick; scope; importance: 1..5;
  kind: 'naissance'|'mort'|'mariage'|'guerre'|'trahison'|'ascension'|'chute'|'fondation'|…;
  actors: EntityId[];
  data: Record<string, unknown>;
}
```

Un moteur de rendu transforme ça en texte, à trois niveaux de zoom :
- **Vie** — « À 34 ans, vous avez fait exiler votre fils aîné. »
- **Dynastie** — « La Maison Vaur perdit son héritier en 412 et ne s'en releva jamais vraiment. »
- **Époque** — « Le Troisième Âge s'acheva avec la chute de l'Empire d'Orion, 4 200 ans après sa fondation. »

Le rendu est séparé du stockage : on peut améliorer l'écriture sans retoucher la simulation, et
traduire le jeu sans y toucher non plus.

**Exportable** en Markdown. Une partie produit un texte que le joueur a envie de garder — c'est le
véritable objet que le jeu fabrique.

---

## 6. Sur l'usage de l'IA générative

Tentation évidente : brancher un LLM pour écrire les textes d'événements.

**Position : non pour le noyau, oui en option cosmétique.**

- Le déterminisme et la reproductibilité passent avant tout.
- Une partie doit tourner hors-ligne, gratuitement, instantanément.
- Les modèles de texte paramétrés bien écrits sont excellents et coûtent zéro latence.

En revanche, une option activable *par-dessus* la Chronique — reformuler les entrées en prose pour
l'export — ne touche à aucune mécanique et apporte beaucoup. C'est le bon endroit, et le seul.
