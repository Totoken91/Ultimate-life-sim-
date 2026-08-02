# 09 — Échelle totale : métiers, conflits, ères, patrimoine

Ce document répond à une demande précise : *pouvoir aller du clochard mutilé à l'empereur
stellaire, avec des métiers infinis qui se créent tout seuls, des batailles de la rixe au
bombardement orbital, et un patrimoine qui va du taudis au vaisseau-planète.*

L'architecture des docs 01 et 02 encaisse tout ça sans réécriture. Ce qui manquait, ce sont
**quatre systèmes** — et un avertissement.

---

## 0. L'avertissement, d'abord

« Tout est possible, rien n'est rigide » est une bonne intention et un piège mortel.
Un monde où tout est permis et où rien ne coûte n'est pas un bac à sable : c'est de la
bouillie. Le joueur perd la notion de progrès en trois heures.

**La règle qui rend la liberté jouable :** *toute capacité nouvelle doit arriver avec une
rareté nouvelle.* C'est l'échelle de sens du [doc 00](00-vision.md) §1, et elle s'applique
sans exception :

| On débloque | Ce qui devient rare |
|---|---|
| une arme à feu | la poudre, et la loi qui vous poursuit |
| une armée | la loyauté et la logistique |
| une flotte stellaire | l'antimatière, le temps de transit, la sécession |
| un vaisseau-planète | l'entretien annuel — l'économie d'un système entier |
| l'immortalité | la mémoire, et les gens qui meurent quand même |

Un pouvoir sans nouvelle rareté est un pouvoir qui tue le jeu. C'est la seule ligne rouge
de ce document.

---

## 1. Métiers compositionnels — la vraie réponse à « métiers infinis »

Aujourd'hui : 22 métiers dans une table. Ça ne montera jamais jusqu'à « femme de ménage de
la 446ᵉ station du 285ᵉ système ». Une table ne s'étend pas à l'infini, quelle que soit sa
longueur.

**Un métier n'est pas une entrée de liste. C'est une composition :**

```
Occupation = Verbe × Domaine × Institution × Échelle × Ère × Légitimité
```

| Axe | Exemples | Cardinal visé |
|---|---|---|
| **Verbe** | soigner, tuer, transporter, bâtir, extraire, vendre, prêter, juger, gouverner, commander, enseigner, prêcher, divertir, séduire, voler, espionner, chercher, réparer, servir, chasser, garder, écrire, piloter, nettoyer | ~24 |
| **Domaine** | corps, esprit, terre, mer, ciel, vide, métal, bêtes, machines, information, argent, foi, art, loi, armes, vaisseaux, énergie, gènes, réalité | ~20 |
| **Institution** | soi-même, famille, guilde, entreprise, État, armée, temple, syndicat criminel, académie, média, corporation stellaire, culte | ~12 |
| **Échelle** | rue, quartier, ville, région, nation, planète, système, secteur, galaxie | 9 |
| **Ère** | fer, poudre, industriel, atomique, information, orbital, interplanétaire, interstellaire, post-matière | 9 |
| **Légitimité** | légal, gris, criminel, clandestin | 4 |

### Ça produit quoi, concrètement

| Composition | Nom |
|---|---|
| soigner × corps × temple × ville × fer × légal | guérisseur du temple |
| soigner × corps × corporation × système × interstellaire × légal | médecin de bord |
| tuer × corps × soi-même × quartier × industriel × criminel | **tueur en série** |
| tuer × corps × syndicat × région × information × criminel | **tueur à gages** |
| tuer × corps × armée × planète × orbital × légal | **officier de frappe orbitale** |
| transporter × marchandises × soi × région × industriel × légal | **routier** |
| transporter × marchandises × soi × secteur × interstellaire × gris | **contrebandier** |
| divertir × art × média × planète × information × légal | **rockstar** |
| écrire × information × média × nation × information × légal | **présentateur** |
| gouverner × loi × État × nation × industriel × légal | **ministre** |
| prêcher × foi × temple × ville × industriel × légal | **imam** |
| séduire × corps × soi-même × quartier × moderne × gris | **travailleur du sexe** |
| garder × bêtes × entreprise × ville × information × légal | **directeur de zoo** |
| chasser × bêtes × soi-même × région × industriel × criminel | **braconnier** |
| vendre × argent × entreprise × planète × information × légal | **trader** |
| nettoyer × machines × corporation × station × interstellaire × légal | **agent d'entretien de station** |

Le dernier est exactement « femme de ménage dans la 446ᵉ station » — et il n'a été écrit
par personne.

### Comment un métier reçoit un nom

1. **Lexique** — table `(verbe, domaine, institution, ère) → nom`, ~400 entrées écrites à
   la main pour les combinaisons qui méritent un vrai mot (« imam », « routier »,
   « braconnier »).
2. **Composition** — sinon, on fabrique : « pilote de fret du secteur », « celle qui tient
   les registres du culte ».
3. **Épithète de lieu** — l'échelle et le lieu s'accrochent au nom quand ça aide :
   « médecin de bord du *Cendre-de-Kaleth* ».

### D'où vient l'émergence (le vrai point)

Un métier **apparaît** quand une combinaison devient valide, et ça arrive tout seul :

- **une ère avance** → nouveaux Domaines (vide, gènes, réalité) et nouvelles Échelles ;
- **quelqu'un fonde une institution** → le joueur crée un culte, une corporation, un
  syndicat ; toutes les combinaisons `verbe × domaine × cette institution` s'ouvrent ;
- **un lieu s'ouvre** → une lune colonisée crée son économie et ses postes ;
- **une ressource est découverte** → un Domaine s'active.

Et un métier **meurt** : quand l'ère passe, « conducteur de diligence » disparaît des
tirages, et les personnages qui l'exerçaient deviennent des reconversions ou des ruines.
C'est ça, un monde qui évolue.

### Coût mécanique

Chaque axe porte ses propres modificateurs (revenu, danger, prestige, compétences
entraînées, légalité). Le métier n'est plus un objet écrit : il est **calculé**. Un
`JobDef` écrit à la main reste possible pour les métiers iconiques qui méritent leurs
propres événements — les deux coexistent.

**Validation :** des règles d'admissibilité (`piloter` exige `vaisseaux` + ère ≥ orbital)
éliminent l'immense majorité des combinaisons absurdes. On vise quelques dizaines de
milliers d'occupations valides — assez pour que le joueur n'en fasse jamais le tour.

---

## 2. Conflits — un seul système, de la rixe à la guerre galactique

Erreur à ne pas commettre : écrire un système de bagarre, *puis* un système de bataille,
*puis* un système de guerre spatiale. Trois systèmes = trois fois la maintenance et zéro
cohérence.

**Un seul système, avec une échelle et deux couches de résolution.**

### L'échelle

| Palier | Effectifs | Exemple |
|---|---|---|
| 0 | 1–2 | duel, agression dans une ruelle |
| 1 | 3–20 | rixe entre bandes, embuscade |
| 2 | 20–200 | escarmouche, razzia |
| 3 | 10² – 10⁴ | bataille rangée |
| 4 | 10⁴ – 10⁶ | campagne, front |
| 5 | 10⁶ – 10⁸ | guerre planétaire, invasion |
| 6 | 10⁸ – 10¹¹ | guerre stellaire, bombardement orbital |
| 7 | au-delà | extinction, guerre de civilisations |

### Les deux couches

**Couche A — la bataille se résout à son échelle.** Même formule à tous les paliers :

```
puissance = effectifs^0,8 × qualité × palier_tech² × doctrine
            × terrain × logistique × moral × commandement
```

Le carré sur le palier technologique est ce qui rend une guerre asymétrique crédible :
mille lanciers ne battent pas une escouade blindée, jamais. C'est aussi ce qui rend le
saut d'ère *désirable*.

**Couche B — votre fil personnel se résout *dans* la bataille.** Et c'est là que se joue
la différence entre « soldat dans une tranchée » et « général dans un vaisseau » :

| Votre poste | Ce que vous jouez | Ce qui vous tue |
|---|---|---|
| piétaille | survivre, votre secteur, vos camarades | un tir que vous n'avez pas vu |
| sous-officier | tenir vingt hommes | tenir trop longtemps |
| officier | une décision qui compte pour un flanc | la décision d'un autre |
| commandant | doctrine, logistique, sacrifices | la trahison, pas l'ennemi |

Le résultat de A conditionne les options de B, et B peut faire basculer A quand vous êtes
assez haut. Un seul système, tous les récits.

### Ce que ça permet, avec le même code

Rixe au couteau · siège médiéval · tranchée · guerre blindée · frappe de drones · guerre
sous-marine · invasion insectoïde façon *Starship Troopers* · bombardement orbital ·
guerre de flottes · duel de mages, si le mode de monde est *Mythe*.

Le contenu change (unités, doctrines, textes) ; le moteur, non.

---

## 3. Ères technologiques — l'axe qui débloque tout le reste

Une seule échelle globale, qui monte lentement au niveau du monde et que le joueur peut
**pousser** (voie savante) ou **freiner** :

```
fer → poudre → industriel → atomique → information → orbital
    → interplanétaire → interstellaire → post-matière
```

Chaque palier ouvre : des Domaines et Échelles de métier, des unités et paliers de
conflit, des types de patrimoine, et surtout la **capacité d'accueil `K`** du doc 02 §4 —
donc l'ordre de grandeur démographique honnête de votre dynastie.

C'est ce qui fait que le milliard de descendants **veut dire quelque chose** : on ne
l'atteint pas en restant paysan.

---

## 4. Patrimoine — du taudis au vaisseau-planète

Même schéma pour tout ce qu'on possède :

```ts
interface Holding {
  kind: 'logis' | 'atelier' | 'domaine' | 'navire' | 'forteresse'
      | 'usine' | 'orbitale' | 'flotte' | 'monde' | 'astronef';
  tier: number;         // 0 = paillasse, 20 = vaisseau de la taille d'une planète
  capacity: number;     // habitants, production, tonnage, canons
  staff: number;        // du domestique unique aux millions de serviteurs
  upkeep: Quantity;     // par an — c'est ici que se joue tout l'équilibre
  prestige: number;
  unlocks: string[];    // capacités : voyager, produire, abriter, projeter la force
}
```

**L'entretien est la mécanique centrale, pas la décoration.** Une villa vous coûte un
revenu de marchand. Un vaisseau-planète avec des millions de serviteurs vous coûte
l'économie d'un système entier, chaque année, pour toujours. Vous ne le gardez que tant
que votre empire tient — et le jour où il ne tient plus, vous le regardez s'éteindre
étage par étage.

C'est comme ça qu'on obtient le fantasme *et* la tension.

---

## 5. Continuations — « son descendant ou un gars random »

**Livré.** À la mort, trois voies :

1. **Votre sang** — un héritier, avec les biens *et* les inimitiés du défunt.
2. **Suivre quelqu'un d'autre** — trois vies tirées dans le monde, pondérées par leur
   intérêt narratif (liens, titres, ennemis, fortune extrême, dettes), avec une accroche
   d'une ligne. Leur entourage est **matérialisé au moment où on entre dedans** : on
   n'atterrit jamais dans une vie vide.
3. **Un nouveau-né, ailleurs** — le monde garde ses années et son histoire ; vous
   recommencez dedans.

C'est le mécanisme qui permet de changer d'échelle sans tricher : mourir gueux dans une
ruelle et réapparaître dans la vie de quelqu'un qui, lui, a une place.

À venir (Phase 6) : réincarnation avec souvenirs fragmentaires, clone, transfert de
conscience, ascension divine.

---

## 6. Ce que ça change dans la roadmap

| Phase | Ajout |
|---|---|
| **4** | occupations compositionnelles (les 6 axes, le lexique, les règles d'admissibilité) ; conflits paliers 0–3 |
| **5** | ères technologiques ; conflits paliers 4–6 avec les deux couches ; patrimoine complet ; institutions fondables |
| **6** | conflit palier 7 ; patrimoine post-matière ; continuations exotiques |

Rien de tout ça n'invalide ce qui est écrit. Les occupations remplacent une table par un
générateur, les conflits ajoutent un système, le reste s'accroche à l'existant.

---

## 7. Ce qui est honnêtement le mur

Ce n'est pas le moteur. Le moteur encaisse.

**C'est le contenu.** Un système d'occupations compositionnelles a besoin de ~400 entrées
de lexique et de plusieurs centaines d'événements sensibles au métier, sinon être routier
et être imam produisent exactement les mêmes années. Un système de conflit a besoin
d'unités, de doctrines et de textes pour chaque ère.

Ça se compte en centaines d'heures d'écriture, pas en semaines de code. La bonne nouvelle,
c'est que **c'est du travail additif, à faible risque, faisable par petits bouts** — et
que c'est précisément le genre de tâche qu'on peut abattre les soirs où on n'a pas
l'énergie de toucher à l'architecture (doc 07, R11).

L'ordre reste le même : d'abord que la boucle d'une vie soit bonne, ensuite l'échelle.
Un empire galactique ennuyeux reste ennuyeux.
