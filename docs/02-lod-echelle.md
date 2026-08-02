# 02 — LOD & échelles

**C'est le document le plus important du projet.** Il répond à la seule question qui décide si la
vision est réalisable ou non : *comment simuler des milliards de descendants sur des millions
d'années sans que la machine fonde ?*

Réponse courte : on ne les simule pas. On les rend **matérialisables**.

---

## 1. Les 4 paliers de simulation

| Palier | Nom | Population | Ce qui est stocké | Ce qui est simulé |
|---|---|---|---|---|
| **T0** | Focus | 50 – 300 | tout : stats, mémoire, relations, secrets | tout, chaque tick, avec événements à choix |
| **T1** | Actif | 2 000 – 10 000 | fiche complète, mémoire réduite | systèmes principaux, pas d'événements à choix |
| **T2** | Cohorte | 10⁴ – 10⁷ | agrégats par (maison, génération, âge, lieu) | statistiques : natalité, mortalité, richesse |
| **T3** | Génératif | illimité | **rien** — juste des paramètres | rien, jusqu'à ce qu'on regarde |

### Qui est à quel palier ?

Un **score d'importance** calculé chaque tick :

```
importance =
    proximité_généalogique(joueur)     × 40      // enfant=40, petit-enfant=20, cousin=8…
  + titre_détenu                        × 30      // roi, chef de maison, grand prêtre
  + implication_dans_une_intrigue       × 25
  + intensité_relationnelle(joueur)     × 20      // amour, haine, dette, serment
  + puissance_relative                  × 15
  + consulté_récemment_par_le_joueur    × 50      // décroît sur 10 ans
  + célébrité_historique                × 10
```

- T0 = les 200 meilleurs scores. Budget dur.
- T1 = les 10 000 suivants.
- En dessous → rétrogradé en T2 (fondu dans une cohorte).
- **Promotion à la demande** : si le joueur clique sur quelqu'un en T2/T3, il est promu en T1
  instantanément (matérialisé si besoin) et le reste tant qu'il garde de l'attention.

Le tie-break se fait sur `id` pour rester déterministe.

---

## 2. Le coeur du truc : la matérialisation générative paresseuse

### Le principe

Un descendant lointain n'existe pas en mémoire. Ce qui existe, c'est une **branche** :

```ts
interface Branch {
  id: BranchId;
  founderId: EntityId;         // le dernier ancêtre réellement simulé
  founderSeed: bigint;
  foundedTick: Tick;
  generations: number;
  fertility: Params;           // moyenne + variance, dérivées de la culture et de l'époque
  mortality: Params;
  prestige: number;
  traitPool: WeightedTraits;   // ce que cette branche transmet (génétique + culture)
  culture: CultureId;
  region: RegionId;
  status: 'prospère' | 'déclinante' | 'éteinte' | 'exilée';
}
```

Le **nombre** de descendants est calculé analytiquement (processus de branchement, voir §4).
L'**individu**, lui, est fabriqué à la demande :

```ts
function materialize(branch: Branch, path: GenealogyPath): Character {
  const seed = hash(branch.founderSeed, path);   // déterministe, sans état
  const rng  = new Rng(seed);
  // nom, sexe, année de naissance, traits tirés du traitPool,
  // génétique héritée le long du chemin, métier tiré du profil régional/économique,
  // 1 à 3 faits de vie tirés de la table d'époque
  return character;
}
```

Propriétés obtenues :

- **Stable** : le même chemin donne toujours la même personne. Le joueur revient dans 3 heures,
  Aldric le meunier de la 47ᵉ génération est toujours Aldric le meunier.
- **Coût mémoire : zéro** tant qu'on ne regarde pas.
- **Coût CPU : ~microseconde** par matérialisation.
- **Navigable à l'infini** : on peut descendre l'arbre généalogique aussi loin qu'on veut.

C'est exactement la technique de la génération procédurale d'univers (No Man's Sky, Elite),
appliquée à la généalogie.

### Ce qui remonte des profondeurs

Une branche T3 ne fait pas rien : chaque tick, elle a une petite probabilité de produire un
**événement de branche** — un descendant devient célèbre, une branche s'éteint, une branche se
rebelle contre la lignée principale, une branche redécouvre le nom de la maison 2 000 ans après.

Quand ça arrive, l'individu concerné est matérialisé, promu en T1, et devient un vrai personnage.

C'est comme ça qu'on obtient : *« Un descendant oublié de votre 312ᵉ génération vient de fonder une
secte qui vous vénère comme un dieu. »* — sans jamais avoir stocké 10⁹ personnes.

---

## 3. Le temps élastique

On ne peut pas jouer 1 million d'années à 1 an par tick. Le temps change d'unité selon ce que le
joueur est devenu.

| Mode | Unité de tick | Portée | Qui est simulé finement | Déclencheur |
|---|---|---|---|---|
| **Vie** | 1 an (4 saisons internes) | 0 – 200 ans | le personnage + son entourage | par défaut |
| **Dynastie** | 1 an, résolution agrégée | 200 – 5 000 ans | chefs de maison, héritiers | maison établie, plusieurs branches |
| **Ère** | 10 → 100 ans | 5 000 – 10⁶ ans | factions, civilisations | empire stable ou joueur immortel |
| **Cosmique** | 10³ → 10⁶ ans | au-delà | civilisations, lois physiques | ascension cosmique |

**Le joueur peut toujours redescendre.** Un immortel en mode Ère qui décide de s'intéresser à un
arrière-arrière-petit-fils repasse en mode Vie et suit sa vie année par année. La granularité est
un choix de jeu, pas une punition de fin de partie.

**Règle de conception :** plus le tick est gros, plus les événements sont *civilisationnels* et moins
ils sont *personnels*. En mode Ère, on ne demande pas « épousez-vous Lyanna ? », on demande
« votre culte impérial absorbe-t-il la religion des mondes conquis ? ».

### Résolution agrégée
En mode Ère, un tick de 100 ans ne fait pas tourner 100 ticks. Il applique des **transformées
fermées** : croissance démographique intégrée, décroissance du prestige, tirage d'événements
d'époque pondéré par la durée, et 1 à 3 « moments » matérialisés en détail (une guerre, une peste,
un schisme) qui, eux, sont joués finement.

---

## 4. Les maths démographiques

Ne pas laisser la population exploser bêtement en exponentielle : 10⁹ descendants en 300 ans est
absurde et casse l'immersion. On utilise un **processus de branchement borné par la capacité
d'accueil**.

```
N(t+1) = N(t) · (1 + r) · (1 − N(t)/K)         [logistique]
r = f(fertilité culturelle, richesse, paix, médecine, technologie)
K = capacité d'accueil de la région / planète / système / galaxie
```

- `K` monte par **paliers technologiques** : agriculture → industrie → orbital → interstellaire →
  ingénierie stellaire. C'est ce qui autorise honnêtement les grands nombres : on n'atteint pas
  le milliard de descendants sans avoir colonisé quelque chose.
- La variance vient d'un bruit seedé, pas de tirages individuels.
- Les **catastrophes** (peste, guerre, effondrement, extinction) tapent dans `N` et peuvent tuer
  des branches entières. Une dynastie doit pouvoir *reculer*.
- L'endogamie et la consanguinité sont suivies au niveau de la branche (coefficient moyen), avec
  effets sur santé et fertilité.

**Ordre de grandeur cible et honnête :**

| Époque | Ancienneté de la dynastie | Descendants vivants plausibles |
|---|---|---|
| Médiévale | 300 ans | 10² – 10³ |
| Renaissance | 800 ans | 10³ – 10⁴ |
| Industrielle | 1 500 ans | 10⁵ – 10⁶ |
| Interplanétaire | 5 000 ans | 10⁷ – 10⁸ |
| Interstellaire | 50 000 ans | 10⁹ – 10¹¹ |

Les 8,5 milliards de l'exemple de la vision sont donc atteignables — mais après une expansion
stellaire, pas au bout de 4 générations de paysans. Le nombre garde du sens.

---

## 5. Les grands nombres à l'écran

Stockage interne des quantités énormes (richesse, puissance, population) :

```ts
type Quantity = { m: number; e: number };   // m × 10^e, normalisé — pattern éprouvé des idle games
```

Ni `number` (perd la précision), ni `BigInt` partout (lent et inutile).

Affichage : **bandes nommées en premier, chiffre en second.**

```
Richesse : ✦ Souveraine  (2,4 × 10¹⁵)
Puissance : Demi-dieu mineur  ·  palier 14/25
```

Un joueur retient « Souveraine » et « Demi-dieu mineur ». Il ne retient pas « 847 quadrillions ».
Les bandes donnent une progression lisible même quand l'exposant s'emballe.

---

## 6. Budgets par palier

| Palier | Plafond | Éviction |
|---|---|---|
| T0 | 300 personnages | plus faible importance, tie-break sur `id` |
| T1 | 10 000 | idem, fondu dans une cohorte T2 |
| T2 | 50 000 cohortes | fusion des cohortes proches |
| T3 | 100 000 branches | fusion des branches mineures en une méta-branche |

Quand une entité est rétrogradée, elle n'est pas détruite : ses faits marquants sont poussés dans la
**Chronique** et son identité (nom, dates, lien) reste consultable. On perd le détail, jamais le
souvenir. Un personnage important qui meurt devient une entrée d'histoire, pas un `null`.
