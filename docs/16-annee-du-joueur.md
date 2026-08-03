# 16 — L'année du joueur

> « Retravaille le système d'action année par année, j'aime pas le système
> BitLife, je trouve ça nul et rigide, trouve un truc mieux et plus intéressant. »
> — Kenny

Il a raison, et le défaut est plus profond qu'il n'y paraît.

---

## 0. Ce qui n'allait pas

« Une action par année, choisie dans une liste » a trois problèmes, et le
troisième est le vrai :

1. **Le budget est faux.** Un enfant de huit ans, un forgeron qui élève quatre
   gosses et un seigneur qui gouverne une cité avaient exactement la même
   liberté : une action. Une année n'est pas une unité de décision, c'est une
   quantité de temps — et cette quantité *dit qui vous êtes*.

2. **Rien ne dure.** Chaque action se refermait sur elle-même. Apprendre à lire
   était un bouton. Courtiser quelqu'un était un jet de dés. Or ce qui fait une
   vie, ce ne sont pas des actes isolés : ce sont des choses qu'on reprend
   pendant des années, qui s'enlisent, qui coûtent, et qui finissent par payer.

3. **Le menu ignorait le monde.** C'est le pire. Les trois derniers chantiers
   ont donné au jeu des PNJ qui agissent ([doc 13](13-agentivite.md)), des
   factions qui recrutent et se battent ([doc 14](14-factions-et-conflits.md)),
   des prix qui montent et des régimes qui tombent
   ([doc 15](15-domaines-et-pouvoir.md)) — et le joueur voyait **la même liste
   de seize verbes** qu'il soit mendiant aux Marches Grises pendant une famine
   ou seigneur de Vardhèn l'année d'une victoire.

Le menu doit être une **vue de l'état du monde**, pas une table.

---

## 1. Le temps

Une année donne un **budget**. Quatre temps quand rien ne pèse, et chaque ligne
retirée est une chose qu'on peut lire dans sa vie :

```
◆◆◇◇   2 temps sur 4
       on décide encore pour vous (−1) · votre métier (−1)
```

| Ce qui prend du temps | Ce que ça coûte |
|---|---|
| avoir moins de 7, 13, 17 ans | l'enfance n'est pas libre |
| l'âge, après 68 ans | 1 |
| ne pas être bien (santé < 55) | 1 |
| un métier | 1 |
| deux enfants en bas âge ou plus | 1 |
| gouverner un domaine | 1 |
| mener une faction | 1 |

Un seigneur malade qui élève trois enfants n'a plus qu'un temps par an. Ce n'est
pas une punition : c'est ce que veut dire « avoir réussi ». Et **on garde
toujours au moins un temps** — une vie sans aucune marge n'est plus une vie
jouable, c'est un couloir.

---

## 2. Les entreprises

Ce qui manquait le plus. Une entreprise est une **histoire à laquelle on donne
du temps**, sur plusieurs années :

```
▸ Apprendre à lire      ▓▓▓▓▓▓▓▓░░░░   vous y êtes presque
```

Chaque versement produit un récit qui avance :

> Les lettres ne veulent rien dire. Vous recopiez des formes.
> Vous reconnaissez votre nom. C'est peu et c'est immense.
> Vous lisez lentement, à voix haute, en suivant du doigt.
> Vous lisez sans bouger les lèvres. On vous regarde autrement.

Quatre propriétés font la différence avec une action longue :

- **Le coût dépend de qui vous êtes.** Apprendre à lire prend deux fois moins de
  temps à quelqu'un de vif. Faire la cour coûte moins cher à qui a du charme.
- **Ça peut mal tourner.** Un revers rallonge la route et raconte mieux qu'un
  progrès : *« Quelqu'un d'autre tournait aussi autour de Mira. Vous l'apprenez mal. »*
- **Ça peut s'enliser.** Quatre années sans y toucher et l'entreprise s'éteint
  toute seule, avec une ligne dans le journal. Une chose abandonnée en silence
  est une histoire aussi — c'est même la plus courante.
- **Trois de front, pas plus.** On n'est pas une armée.

Onze entreprises aujourd'hui : apprendre à lire · devenir bon à quelque chose ·
faire la cour · élever un enfant pour de bon · se faire un nom · se faire des
hommes · fonder une maison · préparer sa revanche · monter une affaire · se
forger un corps · savoir d'où l'on vient.

---

## 3. Les occasions

C'est là que le monde entre dans le menu. Une occasion est une **lecture de
l'état de la simulation**, jamais une entrée de table :

| Ce qui l'ouvre | Ce que le joueur voit |
|---|---|
| le prix du grain est tombé sous 0,72× sa référence | *Acheter du grain pendant qu'il ne vaut rien à Orin-sur-Loë — Le grain est tombé à 3,9 sous. Il ne restera pas là.* |
| une faction locale a pris le but `croitre` | *Entrer chez les gens de Gwaered — On cherche des bras. Ils sont 4 et tiennent une partie d'Orin-sur-Loë.* |
| le domaine n'a plus de dirigeant | *Personne ne gouverne Vardhèn — féodalité sans personne dedans, et vous n'êtes pas le seul à y penser.* |
| le mécontentement dépasse 55 | *Prendre la parole contre ceux qui gouvernent* |
| le domaine manque de vivres | *Vendre cher à ceux qui ont faim* — ou *Nourrir ceux qui n'ont rien* |
| un voisin exerce un métier et vous n'en avez pas | *Tegwen Tirmawr cherche quelqu'un à former* |
| on mange mieux ailleurs | *Partir ailleurs — On mange mieux à Kaleth. Tout le monde le sait, personne ne bouge.* |

Quinze occasions, **trois au maximum par année**. Au-delà, ce n'est plus un
choix, c'est une liste.

Et surtout : **une occasion se referme.** Elle dure une ou deux années, puis
elle est partie. C'est précisément ce qui donne du poids à une année où l'on n'a
que deux temps.

---

## 4. Les coups

Les seize actions d'origine n'ont pas disparu : elles sont devenues ce qu'elles
auraient dû être — des **coups**, rapides, sans lendemain, un temps chacun, et
on peut en faire plusieurs dans une année si on a le temps.

Plus **souffler** : verser tout ce qui reste dans rien du tout, et s'en porter
mieux. Ne rien faire de son année est un choix, et il soigne.

---

## 5. Ce que la sortie du jeu a corrigé

Quatre défauts, tous lus dans une partie réelle, aucun dans le code :

| Ce que le joueur lisait | Ce qui n'allait pas |
|---|---|
| *« Vous écoutez **quelqu'un** pendant des heures »* | le vieux était mort entre-temps. Une porte qui mène à un mort n'est plus une porte : on la ferme, en fin d'année comme au tirage |
| *« On cherche des bras **des** gens de Gwaered »* | contraction appliquée là où il fallait une préposition |
| *« une partie **de** Orin-sur-Loë »* | élision manquante |
| *« Acheter du grain »* proposé **six années de suite** | mécaniquement juste — le grain était vraiment bas — et parfaitement lassant. Une occasion saisie ne revient pas avant six ans |

---

## 6. Ce que ça change ailleurs

Le joueur automatique du banc d'émergence dépense désormais son temps comme
n'importe qui : il saisit ce qui passe, nourrit ce qu'il a commencé, et parfois
ouvre quelque chose. C'est ce qui fait que tout ce document est **testé à
chaque exécution du banc**, et pas seulement à la main.

La sauvegarde porte l'année : entreprises en cours, occasions ouvertes, temps
déjà dépensé. Et une nouvelle vie n'hérite de rien — ce qu'on n'a pas fini
meurt avec celui qui l'avait commencé.

---

## 7. Ce qui manque encore

- **Les occasions n'écrivent pas de graines.** Une porte refusée devrait
  parfois revenir sous une autre forme, des années plus tard
  ([doc 04](04-moteur-evenements.md) §2).
- **Les entreprises ne se croisent pas.** Mener « préparer sa revanche » et
  « se faire des hommes » en même temps devrait ouvrir quelque chose que ni
  l'une ni l'autre n'ouvre seule.
- **Le monde ne voit pas ce qu'on mène.** Les PNJ ignorent que vous apprenez à
  lire ou que vous rassemblez des gens ; ils devraient réagir.
- **Le temps ne s'achète pas.** Un intendant, une nourrice, un homme de main
  devraient rendre du temps. C'est le vrai luxe, et c'est ce que l'argent
  devrait acheter en premier.
- **Pas d'entreprise à l'échelle d'une dynastie.** Certaines choses devraient
  demander plus d'une vie, et se transmettre à l'héritier.
