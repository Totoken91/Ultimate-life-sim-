# 03 — Systèmes de jeu

## 1. Le personnage

### 1.1 Attributs visibles (0–100, plafond mou dépassable)

| Attribut | Rôle mécanique principal |
|---|---|
| Force | violence, travaux physiques, intimidation |
| Intelligence | apprentissage, science, gestion, stratégie |
| Charisme | persuasion, séduction, ralliement |
| Agilité | vol, esquive, artisanat fin, discrétion |
| Endurance | santé, résistance, longévité, campagnes militaires |
| Volonté | résistance à la corruption, à la manipulation, à la folie |
| Chance | pondération des tirages, événements rares |
| Créativité | art, invention, solutions non prévues |
| Leadership | taille et loyauté des groupes commandés |
| Aura | présence, terreur/révérence, poids symbolique |
| Spiritualité | mysticisme, foi, accès au surnaturel |

Ce sont **11 attributs, c'est beaucoup**. Recommandation : en Phase 1, n'en implémenter que 6
(Force, Intelligence, Charisme, Agilité, Endurance, Volonté) et introduire les 5 autres quand les
systèmes qui les consomment existent. Un attribut sans consommateur est un chiffre décoratif.

### 1.2 Attributs cachés

Jamais affichés en clair. Le joueur les devine par les effets et le texte.

| Caché | Effet |
|---|---|
| Potentiel | plafond réel de croissance des attributs |
| Destinée | fréquence et intensité des événements extraordinaires |
| Génétique | patrimoine transmissible (santé, longévité, beauté, prédispositions) |
| Karma | mémoire du monde de vos actes ; module les réactions et les retours de bâton |
| Folie | distorsion de la perception, options de dialogue instables, risque de rupture |
| Corruption | prix payé pour le pouvoir ; ouvre des voies et en ferme d'autres |
| Ambition | ce que le personnage *veut* — pilote l'IA si le personnage devient PNJ |
| Influence | portée sociale réelle, distincte de la réputation |

**Règle :** un attribut caché ne doit jamais être un simple modificateur. Il doit **ouvrir ou fermer
des portes**. La corruption à 70 doit rendre certaines options inaccessibles et d'autres visibles.

### 1.3 Traits

Trois familles :
- **Innés** — génétique, tirés à la naissance (génie, sickly, beau, hémophile…)
- **Acquis** — formés par l'expérience (méfiant, cruel, pieux, brisé, indomptable)
- **États** — temporaires ou évolutifs (endeuillé, amoureux, traqué, mourant)

Les traits **s'obtiennent par l'histoire vécue**, pas par un menu. Un enfant battu à 7 ans a une
probabilité élevée de développer « méfiant » ou « violent » — c'est le système d'événements qui les
pose, pas un choix de création de personnage.

### 1.4 Compétences

Séparées des attributs. ~40 compétences groupées en 8 familles (combat, artisanat, savoir, social,
crime, commandement, occulte, technique). Progression logarithmique, décroissance si inutilisées,
plafond dépendant de l'attribut lié et du potentiel.

### 1.5 Corps et santé

Santé, blessures localisées, cicatrices, membres perdus, maladies chroniques, dépendances,
vieillissement. **Les blessures sont narratives autant que mécaniques** : perdre un œil à 14 ans
doit être mentionné dans les descriptions le reste de la vie et ouvrir/fermer des événements.

---

## 2. La naissance

C'est le premier écran du jeu et il donne le ton. Il ne doit **jamais** être un simple tirage de stats.

### 2.1 Le scénario de naissance

```ts
interface BirthScenario {
  id: string;
  weight: number;
  tier: 'catastrophe' | 'misère' | 'commun' | 'aisé' | 'privilégié' | 'exceptionnel';
  setup(ctx): {           // il construit un contexte, pas juste des chiffres
    family, location, wealth, statBias, startingTraits,
    startingRelations,    // parents, fratrie, ennemis pré-existants
    openHooks,            // intrigues déjà en cours autour de vous
    forbiddenPaths,       // ce qui vous est fermé au départ
    hiddenTruths,         // ce que le joueur ignore et découvrira
  };
}
```

### 2.2 Distribution

| Palier | Poids | Exemples |
|---|---|---|
| Catastrophe | 8 % | nourrisson abandonné, né esclave, né mutilé, né pendant un massacre |
| Misère | 22 % | orphelin, famille endettée, enfant des rues, réfugié |
| Commun | 40 % | paysan, artisan, soldat, petit commerçant |
| Aisé | 18 % | marchand, lettré, officier, clergé |
| Privilégié | 9 % | noblesse mineure, riche famille, cour royale |
| Exceptionnel | 3 % | héritier royal, enfant prophétisé, lignée surnaturelle, dernier d'une dynastie oubliée |

### 2.3 La vérité cachée

Un scénario de naissance sur trois porte une **vérité cachée** que le joueur ne connaît pas au départ
et qui se révèle plus tard :
- vous n'êtes pas l'enfant de vos parents
- votre mère était l'héritière d'une maison éteinte
- votre difformité est la marque d'une lignée divine
- quelqu'un vous cherche depuis votre naissance pour vous tuer

C'est le meilleur générateur d'histoires du jeu pour un coût de conception dérisoire.

### 2.4 Anti-frustration

Une naissance catastrophique **ne doit pas être une partie perdue**. Contrepartie systématique :
- « Destinée » élevée (plus d'événements extraordinaires),
- traits de survie puissants,
- absence d'attaches = liberté totale de voie,
- des chemins que les nobles n'auront jamais (pègre, mysticisme brut, révolution).

Une naissance royale **ne doit pas être une partie gagnée** : héritiers rivaux, obligations,
espérance de vie politique courte, régicide, et l'impossibilité de disparaître.

---

## 3. Le cycle de vie

| Étape | Âge | Enjeu principal | Ce qui se joue |
|---|---|---|---|
| Petite enfance | 0–5 | survivre | mortalité infantile réelle, traits fondateurs, attachement |
| Enfance | 6–12 | être formé ou négligé | apprentissage, premières amitiés/humiliations |
| Adolescence | 13–17 | s'orienter | traits acquis, première voie, premières relations |
| Jeune adulte | 18–29 | s'établir | métier, alliance, ambition posée |
| Maturité | 30–49 | construire | apogée de puissance, enfants, rivaux |
| Âge mûr | 50–64 | consolider ou perdre | succession préparée, corps qui lâche |
| Vieillesse | 65+ | transmettre | infirmité, sagesse, peur de la fin |
| Fin | — | ce qui reste | mort, ou transition |

Les 0–17 ans sont joués **plus finement que dans BitLife**, parce que c'est là que se fabrique le
personnage. Une enfance en 4 clics gâche 80 % du potentiel narratif.

### La mort et après

Toujours proposer une **transition**, jamais un écran « Game Over » sec :

| Continuation | Coût / condition | Effet |
|---|---|---|
| Héritier | avoir une descendance | on reprend au tick suivant, avec l'héritage |
| Bâtard reconnu | avoir semé | reprise avec réputation dégradée |
| Branche cadette | maison établie | reprise depuis une branche, la principale devient PNJ |
| Fantôme / conseiller | mort violente + volonté élevée | influence limitée, pas de corps |
| Réincarnation | spiritualité + karma | nouvelle vie, souvenirs fragmentaires |
| Clone / transfert | technologie | continuité, mais qui êtes-vous vraiment ? |
| Ascension | culte + aura + spiritualité | quitte le mode Vie pour le mode Ère |

**Si le joueur n'a rien** (mort sans descendance, sans culte, sans clone) : la partie s'arrête et la
Chronique est produite. C'est une vraie défaite et elle doit exister, sinon rien n'a d'enjeu.

---

## 4. Relations

### 4.1 Modèle

Une relation est une **arête dirigée** — A peut aimer B pendant que B méprise A. C'est non
négociable pour la qualité du drame.

```ts
interface Relation {
  from, to: EntityId;
  type: 'sang' | 'mariage' | 'amitié' | 'amour' | 'rivalité' | 'haine'
      | 'serment' | 'dette' | 'mentorat' | 'vassalité' | 'complot';
  affection: number;   // -100 … +100
  trust: number;
  respect: number;
  fear: number;
  history: MemoryRef[];   // pourquoi ils en sont là
  secrets: SecretRef[];   // ce que l'un sait sur l'autre
}
```

`fear` séparé de `respect` : c'est la différence entre régner par l'amour et régner par la terreur,
et les deux doivent avoir des conséquences opposées à la succession.

### 4.2 Secrets

Un secret a un détenteur, un sujet, une gravité et une probabilité de fuite qui monte avec le nombre
de détenteurs. Il peut être vendu, échangé, utilisé pour du chantage, ou révélé au pire moment.
C'est un des systèmes les plus rentables du jeu en ratio complexité/drame.

### 4.3 Réputation contextuelle

Pas un chiffre. Une **matrice** : votre réputation diffère selon le groupe (votre maison, le clergé,
la pègre, le peuple, les rivaux) et selon la distance (les rumeurs se déforment en voyageant).
Un roi peut être adoré du peuple et haï de sa cour.

---

## 5. Dynastie

```
Inconnue → Maison locale → Noblesse mineure → Grande maison → Royauté →
Empire → Dynastie interstellaire → Lignée éternelle
```

La montée d'un palier exige : prestige accumulé + un titre + une durée + un acte fondateur.
Pas juste de l'argent.

### Systèmes dynastiques

- **Succession** : primogéniture, ultimogéniture, élective, par mérite, par combat, désignation,
  partition. Le mode de succession est une **loi modifiable** — et le changer provoque des crises.
- **Héritiers** : chacun a ses propres ambitions. Un héritier ambitieux et impatient est un danger.
- **Bâtards** : reconnaissance, légitimation, revendications futures.
- **Branches cadettes** : se détachent, prospèrent ou s'éteignent, peuvent revendiquer le titre.
- **Guerres civiles** : quand deux revendications sont légitimes.
- **Prestige de maison** : accumulé par les exploits, érodé par les humiliations et le temps.
- **Traditions de maison** : débloquées à long terme, elles donnent une identité (« nos aînés
  meurent au combat », « nous n'oublions jamais une dette »). Elles influencent les PNJ de la maison.

### L'arbre généalogique
Consultable, navigable, avec repli/déploiement des branches, et matérialisation à la demande des
descendants T3 (voir [02](02-lod-echelle.md)). C'est un écran phare : c'est là que le joueur
ressent l'ampleur de ce qu'il a construit.

---

## 6. Économie

Progression : mendicité → petits travaux → métier → atelier → commerce → entreprise → banque →
domaine → royaume → économie planétaire → économie stellaire.

Principes :
- **La richesse est un stock ET un flux.** Le flux (revenu net) compte plus que le stock.
- **La richesse est illiquide en haut** : un roi n'a pas 10 millions en poche, il a des terres,
  des dettes et des obligations. Ça évite l'achat de la victoire.
- **L'argent achète du temps et des gens**, pas des statistiques.
- Prix dynamiques par région, pénuries, routes commerciales, effondrements monétaires.
- **Dette et créanciers** : emprunter est une mécanique majeure et les créanciers sont des
  personnages qui n'oublient pas.

---

## 7. Les voies de pouvoir

Cinq voies. Elles ne sont **pas exclusives** mais elles se contraignent mutuellement (le temps
d'une vie est fini, et certaines réputations sont incompatibles).

| Voie | Progression | Ressource clé | Coût typique |
|---|---|---|---|
| Militaire | soldat → officier → général → conquérant → seigneur de guerre | loyauté des troupes | brutalisation, ennemis permanents |
| Politique | citoyen → notable → noble → souverain → empereur | légitimité | compromis, mariages subis, paranoïa |
| Savante | apprenti → érudit → maître → génie → démiurge | savoir, mécénat | isolement, hérésie, obsession |
| Mystique | croyant → initié → mage → immortel → divinité | foi, énergie | corruption, folie, déshumanisation |
| Criminelle | voleur → homme de main → chef → parrain → roi de l'ombre | peur, réseau | traque, trahison, mort violente |

Chaque voie a ~15 rangs et débloque des **actions exclusives** dans le menu principal. C'est ce qui
fait qu'une partie de mage ne ressemble pas à une partie de marchand.

---

## 8. Le monde vivant

- **Régions et implantations** — population, richesse, stabilité, culture, ressources.
- **Factions** — maisons, royaumes, guildes, ordres religieux, syndicats du crime. Elles ont des
  objectifs et agissent (voir [04](04-moteur-evenements.md) §3).
- **Cultures** — valeurs, tabous, coutumes matrimoniales, dérive et fusion sur le long terme.
- **Religions** — dogmes, hérésies, schismes. **Le joueur peut en fonder une**, ce qui est un des
  chemins vers la divinité.
- **Technologie** — arbre lent au niveau civilisationnel, qui déverrouille les paliers de capacité
  d'accueil et donc l'échelle démographique.
- **Catastrophes** — pestes, famines, invasions, effondrements, extinctions. Elles doivent pouvoir
  **détruire l'œuvre du joueur**. Un monde où on ne peut que monter est un monde sans enjeu.

---

## 9. Le surnaturel : un interrupteur

Le mystique et le cosmique ne doivent pas être imposés à qui veut jouer une chronique historique.

**Trois modes de monde, choisis à la création de partie :**

| Mode | Contenu |
|---|---|
| Chronique | 100 % historique/plausible. Le mysticisme existe comme croyance, jamais comme fait. |
| Légende | Le surnaturel est réel mais rare, ambigu, coûteux. *Mode par défaut.* |
| Mythe | Magie, dieux, immortalité, cosmique pleinement assumés. |

Même moteur, packs de contenu différents. Ça double la durée de vie du jeu pour un coût faible.
