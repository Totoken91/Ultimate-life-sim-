# 11 — Économie et gouvernements

Ce document répond à deux demandes : *une vraie économie simulée à toutes les
échelles, du village de deux habitants à l'empire multi-mondes*, et *des
gouvernements qui ne sont pas figés — dictature, élection, féodalité, et le
reste*.

Les deux problèmes ont la même solution : **une seule structure récursive**.

---

## 1. Le principe : un seul objet, à toutes les échelles

L'erreur serait d'écrire une économie de village, puis une économie de royaume,
puis une économie stellaire. Trois systèmes, trois fois la maintenance, aucune
continuité — et le moment où le joueur passe de l'un à l'autre serait une
cassure.

**Une seule entité : le `Domaine`.** Un foyer est un domaine. Un village est un
domaine. Un empire galactique est un domaine. Ils diffèrent par leur *échelle*
et leur *contenu*, jamais par leur nature.

```ts
interface Domain {
  id: DomainId;
  parent: DomainId | null;      // le domaine qui l'englobe
  children: DomainId[];         // ce qu'il contient
  scale: Scale;                 // foyer → hameau → … → galaxie
  population: Quantity;
  stocks: Record<GoodId, Quantity>;
  production: Record<GoodId, Quantity>;   // par an
  consumption: Record<GoodId, Quantity>;
  prices: Record<GoodId, number>;         // locaux, pas globaux
  routes: RouteId[];            // ce qui entre et sort
  government: Government;
  treasury: Quantity;
  legitimacy: number;
  unrest: number;
}
```

Un village de deux habitants a un `Domain` avec deux personnes, trois biens et
un gouvernement « personne ne commande ». Un empire multi-mondes a le même objet
avec 10¹⁴ habitants, quarante biens et un gouvernement impérial. **Le même code
les fait tourner.**

### Résolution par niveau de détail

C'est là que le [doc 02](02-lod-echelle.md) paie :

| Palier | Ce qui est simulé | Exemple |
|---|---|---|
| **Fin** | chaque personne produit et consomme | votre village de 2 habitants |
| **Agrégé** | des cohortes de métiers | une cité de 20 000 âmes |
| **Statistique** | des flux, plus personne | une planète |
| **Paramétrique** | une courbe et trois nombres | une galaxie |

Le domaine *où vous êtes* est toujours simulé finement. Ceux d'à côté le sont
grossièrement. Ceux à mille années-lumière sont trois nombres. Et quand vous
vous déplacez, le palier suit — c'est la promotion LOD déjà en place pour les
personnages.

C'est ce qui permet littéralement : *chef d'un village de deux habitants avec
une économie entièrement simulée, connectée au reste de l'univers*.

---

## 2. Les biens, et pourquoi ils sont peu nombreux

Un bien n'est pas un objet, c'est une **catégorie de besoin**. Une quinzaine
suffit à tout couvrir, du néolithique au post-matière :

| Bien | Produit par | Consommé par |
|---|---|---|
| vivres | terre, mer, hydroponie | tout le monde, chaque année |
| eau | puits, nappes, recycleurs | tout le monde |
| matériaux | bois, pierre, acier, composites | bâti, industrie |
| énergie | bois, charbon, fission, étoiles | industrie, transport |
| outils | artisanat, usines | production |
| armes | forges, arsenaux | armées |
| luxe | orfèvrerie, art, expériences | statut, prestige |
| soins | herbes, médecine, régénération | santé, longévité |
| savoir | écoles, académies | technologie |
| main-d'œuvre | population | tout |
| information | scribes, réseaux | gouvernance, marchés |
| exotique | ce que l'ère débloque | ce que l'ère débloque |

**Règle** : on n'ajoute un bien que si son absence change une décision. Un jeu
avec quatre-vingts ressources n'est pas plus profond, il est plus long à lire.

### Les prix sont locaux

Un prix n'est jamais global. Il naît de la rareté **ici** :

```
prix(bien, domaine) = base × (demande / max(offre, ε))^élasticité × friction(routes)
```

C'est ce qui rend le commerce jouable : acheter là où c'est abondant, vendre là
où ça manque, et le transport coûte. Un blocus, une route coupée, une mauvaise
récolte se lisent immédiatement dans les prix — sans qu'on écrive un événement
« il y a une famine ».

### Les routes

Une route relie deux domaines et porte : capacité, coût, risque, latence. Une
caravane met trois semaines ; un vaisseau interstellaire met huit ans. **La
latence est une mécanique, pas un détail** : commander du grain à huit ans de
distance change complètement la nature du problème.

---

## 3. L'économie d'une personne

Le lien entre la macro et vous. Chaque personnage a :

- une **production** (dérivée de son occupation — voir [doc 09](09-echelle-totale.md) §1) ;
- une **consommation** (vivres, eau, soins, plus du luxe selon son rang) ;
- un **patrimoine** (les `Holding` du doc 09 §4) ;
- des **dettes** et des **créanciers**, qui sont des personnes.

Aujourd'hui, l'économie du jeu est un revenu et un coût de la vie. C'est un
placeholder honnête pour la Phase 2 ; le jour où le `Domain` existe, le revenu
d'un forgeron devient *ce qu'il vend, à qui, à quel prix* — et une pénurie de
métal se voit dans sa bourse.

### Entreprises

Une entreprise est un domaine minuscule avec des employés :

```ts
interface Enterprise extends Domain {
  ownerId: EntityId;
  employees: EntityId[] | Quantity;   // nommés, ou comptés
  wages: Quantity;
  margin: number;
}
```

D'où les statistiques que tu veux : revenus d'une société de transport, marge,
effectifs, routes exploitées, part de marché. Elles tombent du modèle, on n'a pas
à les inventer.

---

## 4. Gouvernements — rien n'est figé

Un gouvernement n'est pas un type énuméré. C'est un **jeu de règles** que l'on
peut modifier une par une, et dont les combinaisons produisent tous les régimes.

```ts
interface Government {
  // qui décide
  power: 'un' | 'quelques-uns' | 'beaucoup' | 'tous' | 'personne';
  // comment on y accède
  access: 'sang' | 'élection' | 'conquête' | 'fortune' | 'mérite'
        | 'tirage' | 'foi' | 'ancienneté' | 'désignation';
  // combien de temps on garde
  tenure: 'à vie' | 'mandat' | 'révocable' | 'héréditaire';
  // ce que le pouvoir peut faire sans consentement
  reach: number;        // 0 = coutume, 100 = totalitaire
  // qui possède la terre et le capital
  property: 'privée' | 'commune' | 'seigneuriale' | 'd\'État' | 'corporative';
  // ce qui légitime
  mandate: 'tradition' | 'divin' | 'populaire' | 'force' | 'compétence' | 'contrat';
  // qui paie quoi
  taxation: 'corvée' | 'dîme' | 'cens' | 'proportionnelle' | 'progressive' | 'aucune';
}
```

Les régimes classiques ne sont que des points dans cet espace :

| Régime | power | access | tenure | mandate | property |
|---|---|---|---|---|---|
| Chefferie villageoise | un | ancienneté | à vie | tradition | commune |
| Féodalité | quelques-uns | sang | héréditaire | divin | seigneuriale |
| Monarchie absolue | un | sang | héréditaire | divin | privée |
| République | beaucoup | élection | mandat | populaire | privée |
| Dictature militaire | un | conquête | à vie | force | d'État |
| Théocratie | quelques-uns | foi | à vie | divin | corporative |
| Démocratie directe | tous | tirage | révocable | populaire | commune |
| Technocratie | quelques-uns | mérite | mandat | compétence | d'État |
| Corporatocratie stellaire | quelques-uns | fortune | révocable | contrat | corporative |
| Culte impérial du joueur | un | désignation | à vie | divin | d'État |

**Ce qui rend ça vivant, ce ne sont pas les étiquettes, ce sont les tensions.**
Chaque axe a un coût :

- `reach` élevé → contrôle fort, mais mécontentement et coût administratif ;
- `access: 'sang'` → stabilité, mais un héritier incapable ruine tout ;
- `access: 'élection'` → renouvellement, mais campagnes, factions, corruption ;
- `tenure: 'à vie'` → continuité, mais on ne se débarrasse pas d'un tyran ;
- `property: 'commune'` → cohésion, mais production plus faible sans contrainte ;
- `taxation: 'progressive'` → recettes, mais les riches financent vos rivaux.

Et un gouvernement **change** : par réforme (le dirigeant modifie un axe, contre
de la légitimité), par révolution (le mécontentement dépasse un seuil), par
conquête (le vainqueur impose le sien), par effondrement (plus personne ne
décide, on retombe sur `power: 'personne'`).

C'est le même mécanisme que la loi de succession déjà livrée en Phase 2 : une
règle modifiable, un coût pour la changer, des gens que ça froisse.

### Légitimité et mécontentement

Deux nombres portent tout le système :

```
légitimité  ← mandat respecté, victoires, prospérité, durée
            ↓ usurpation, défaites, famine, réformes brutales

mécontentement ← faim, impôts, injustice, répression, défaites
               ↓ prospérité, fêtes, victoires, justice rendue
```

Quand `mécontentement > légitimité`, quelque chose casse — et *quoi* dépend du
régime. Une monarchie fait une guerre civile de succession, une république une
crise électorale, une dictature un coup d'État, un village un départ collectif.

---

## 5. Ce que ça donne, concrètement

- Vous êtes chef d'un village de deux habitants. Vous voyez vos deux stocks de
  vivres, votre unique route vers le bourg voisin, et le prix du grain qui monte
  parce qu'il a plu sur les Marches. Votre gouvernement est
  `{ power: 'un', access: 'ancienneté', reach: 12 }` : vous ne pouvez rien
  imposer, seulement convaincre.
- Trois cents ans plus tard, votre descendante gouverne un secteur de dix-neuf
  mondes. Même écran, mêmes colonnes, échelle différente. Elle a passé la
  propriété en `corporative` pour financer une flotte, et la légitimité paie
  encore l'addition deux générations après.
- Un rival coupe une route commerciale : le prix de l'énergie double sur trois
  mondes, le mécontentement monte, et vous n'avez pas eu besoin d'un événement
  scripté pour que ça arrive.

---

## 6. Où ça s'insère dans la roadmap

| Phase | Ce qui arrive |
|---|---|
| **3** | `Domain` aux échelles foyer → région, biens de base, prix locaux, routes terrestres. Gouvernements aux échelles locales. |
| **4** | entreprises, salaires, marges, dettes portées par des personnes. Occupations branchées sur la production réelle. |
| **5** | domaines planétaires et stellaires, résolution agrégée et statistique, légitimité / mécontentement complets, révolutions et coups d'État. |
| **6** | économies post-rareté, et la question qui va avec : *que vaut le pouvoir quand plus rien ne manque ?* — c'est la rareté du dernier palier de l'échelle de sens ([doc 00](00-vision.md) §1). |

---

## 7. Les deux pièges

**Le tableur.** Une économie qui demande au joueur d'équilibrer douze courbes
n'est pas une simulation de vie, c'est un jeu de gestion. Règle : le joueur voit
toujours **des conséquences humaines** avant des chiffres. « Le grain a doublé,
votre voisin a vendu sa fille en apprentissage » avant « prix : 2,4 ».

**La bouillie.** Un système où tout est modifiable et où rien ne coûte produit
des régimes incohérents et sans enjeu. Chaque axe de gouvernement doit avoir un
prix payé par quelqu'un de nommé — sinon on ne fait que cliquer.
