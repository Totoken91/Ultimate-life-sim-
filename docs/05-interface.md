# 05 — Interface

## 1. Principes

1. **Un écran = une question.** Jamais deux décisions différentes sur le même écran.
2. **Le texte est le jeu.** La mise en page sert la lecture, elle ne la décore pas.
3. **Toujours saisissable au clavier seul**, chiffres et lettres, jamais la souris obligatoire.
4. **Les chiffres viennent après les mots.** « Riche (8,4 M) », pas « 8400000 ».
5. **Rien n'est irréversible sans avertissement explicite.**
6. **Le rendu est un client jetable.** Zéro logique de jeu dans l'UI. Une UI web devra pouvoir
   être écrite plus tard sans toucher au moteur.

## 2. Écran principal — mode Vie

```
┌──────────────────────────────────────────────────────────────┐
│  KENNY, fils de personne                          An 412 · Printemps │
│  14 ans · Ruelles de Vardhen · Maison : aucune                │
├──────────────────────────────────────────────────────────────┤
│  Santé    ████████░░  bon        Bourse    3 sous (misère)    │
│  Humeur   ████░░░░░░  amer       Réputation  inconnu           │
│                                                               │
│  For 41   Int 68   Cha 55   Agi 72   End 38   Vol 81          │
├──────────────────────────────────────────────────────────────┤
│  Proches                                                      │
│   Maela, 12 ans — sœur ................ dévouée               │
│   Perrin, 51 ans — forgeron ........... méfiant  ⚑             │
│                                                               │
│  ⚑ un signe indique quelque chose que vous savez… ou pas      │
├──────────────────────────────────────────────────────────────┤
│  1  Passer l'année                                            │
│  2  Agir              (travailler, voler, s'entraîner, …)     │
│  3  Gens              (relations, famille, ennemis)           │
│  4  Vous              (compétences, traits, corps, souvenirs) │
│  5  Le monde          (Vardhen, rumeurs, événements)          │
│  6  Chronique                                                 │
│  0  Menu                                                      │
└──────────────────────────────────────────────────────────────┘
> _
```

Six entrées maximum au niveau racine. Toute la profondeur est dans les sous-menus, jamais dans un
menu principal à 25 lignes.

## 3. Écran d'événement

```
┌──────────────────────────────────────────────────────────────┐
│  An 419 · vous avez 21 ans                                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Perrin le forgeron est mourant.                              │
│                                                               │
│  Il vous a fait appeler — vous, le gamin qui lui a volé       │
│  trois lames il y a douze ans. Sa main tremble sur un cuir    │
│  roulé qu'il serre contre lui.                                │
│                                                               │
│  « J'ai jamais dit à personne. J'ai attendu de savoir à qui   │
│  ça devait aller. »                                           │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  1  Prendre la carte et écouter                               │
│  2  Avouer le vol avant d'accepter                            │
│  3  Attendre qu'il s'éteigne, puis prendre                    │  cruel
│  4  Refuser                                                   │
└──────────────────────────────────────────────────────────────┘
```

Notes de conception :
- **Le choix cruel n'est pas caché** — mais il est marqué. Le joueur doit toujours pouvoir être
  mauvais en le sachant.
- **Aucun pourcentage affiché.** Le joueur pèse une situation, pas un tableur.
- **Le contexte réel est cité** (le vol d'il y a douze ans). C'est le système de mémoire qui
  alimente le texte. Sans ça, aucun événement n'est mémorable.

## 4. Écran dynastie

```
┌──────────────────────────────────────────────────────────────┐
│  MAISON VAUR                    fondée en 431 · 2 840 ans     │
│  Rang : Dynastie stellaire      Prestige : Légendaire         │
├──────────────────────────────────────────────────────────────┤
│  Vivants ..... 41 800 214        Branches actives ..... 1 129 │
│  Total ....... 8 542 921 442     Branches éteintes .... 4 067 │
│  Générations . 118                                            │
├──────────────────────────────────────────────────────────────┤
│  Branche principale                                           │
│   ▸ Kenny VII ................ vous · 12 450 ans              │
│     ▸ Ysera, 8 900 ans ....... régente d'Orion                │
│     ▸ Talin, 340 ans ......... exilé                    ⚔     │
│                                                               │
│  Branches notables                                            │
│   ▸ Vaur-des-Cendres ......... 2,1 M · hostile           ⚔    │
│   ▸ Vaur de Kaleth ........... 900 k · vous vénère       ✦    │
│   ▸ 1 126 autres ............. [parcourir]                    │
└──────────────────────────────────────────────────────────────┘
```

Le « [parcourir] » descend dans les branches T3 et **matérialise les individus à la demande**.
Le joueur peut littéralement descendre jusqu'à un paysan anonyme de la 94ᵉ génération sur une lune
oubliée, lire son nom, son métier, ses trois faits de vie — et il sera toujours le même demain.

## 5. Mode Ère

Quand le temps s'accélère, l'écran change de nature : moins de corps, plus de civilisation.

```
┌──────────────────────────────────────────────────────────────┐
│  KENNY VII · Immortel                     An 12 862 → 12 962  │
│  Un siècle passe.                                             │
├──────────────────────────────────────────────────────────────┤
│  · La Concorde d'Orion a tenu. Quatrième siècle de paix.      │
│  · Une famine sur Kaleth-3 a tué 40 millions. On vous en      │
│    tient pour responsable.                                    │
│  · Un culte vous nommant « Le Père Qui Ne Meurt Pas » compte  │
│    désormais 2 milliards de fidèles. Vous ne l'avez pas       │
│    fondé.                                                     │
│  · Votre mémoire du visage de Maela s'est effacée.            │
├──────────────────────────────────────────────────────────────┤
│  1  Intervenir sur Kaleth-3                                   │
│  2  Reconnaître ou renier le culte                            │
│  3  Descendre chez les vôtres  (retour au mode Vie)           │
│  4  Laisser le siècle suivant passer                          │
└──────────────────────────────────────────────────────────────┘
```

La ligne sur Maela est la mécanique d'**érosion de la mémoire** : un immortel oublie. C'est la
rareté du palier Immortalité (voir [00](00-vision.md) §1). Le joueur peut dépenser des ressources
rares pour préserver un souvenir — et devra choisir lesquels.

## 6. Accessibilité et confort

- largeur cible 80 colonnes, dégradation propre jusqu'à 60
- mode sans couleur et sans caractères unicode décoratifs
- historique consultable, jamais de texte important qui défile sans retour possible
- `?` sur n'importe quel écran → aide contextuelle
- vitesse de jeu configurable (auto-passage des années sans événement)

## 7. Vers une UI web (plus tard)

Le `game` expose déjà une API de vue :

```ts
interface GameFacade {
  getView(): ViewModel;          // état sérialisable, prêt à afficher
  submit(command: Command): CommandResult;
  subscribe(fn: (v: ViewModel) => void): Unsubscribe;
}
```

Le CLI n'est qu'un rendu de `ViewModel`. Une UI web est donc un projet de front, pas une réécriture.
On ne construit **pas** cette UI web avant la Phase 7 — mais on ne se ferme jamais la porte.

---

## Note — l'année du joueur a changé

Ce document décrivait « une action volontaire par année ». Ce n'est plus vrai :
une année donne un **budget de temps** que l'on répartit entre des entreprises
longues, des occasions ouvertes par le monde et des coups ponctuels. Voir le
[doc 16](16-annee-du-joueur.md), qui fait autorité sur ce point.
