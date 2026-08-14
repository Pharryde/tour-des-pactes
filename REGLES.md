# Tour des Pactes — Règles du jeu

Document de référence **lisible**, rangé par catégorie. Il décrit ce que le jeu fait réellement, avec
les valeurs exactes en vigueur.

Les sources de vérité techniques restent le moteur (`moteur_wasm/src/`) et les registres TypeScript
(`src/utils/pactes.ts`, `synergies.ts`, `benedictions.ts`). **Toute modification de règle doit être
répercutée ici.**

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Le tour de combat](#2-le-tour-de-combat)
3. [Les quatre actions](#3-les-quatre-actions)
4. [Le Combo](#4-le-combo)
5. [L'Armure](#5-larmure)
6. [L'Esquive](#6-lesquive)
7. [Brûlure et Poison](#7-brûlure-et-poison)
8. [La fin de tour, dans l'ordre](#8-la-fin-de-tour-dans-lordre)
9. [Comportement des monstres](#9-comportement-des-monstres)
10. [La Tour : structure d'une ascension](#10-la-tour--structure-dune-ascension)
11. [Les douze Gardiens et leurs pouvoirs](#11-les-douze-gardiens-et-leurs-pouvoirs)
12. [Les Pactes](#12-les-pactes)
13. [Les Synergies cachées](#13-les-synergies-cachées)
14. [La Bénédiction du Chat et la Roue de la Chance](#14-la-bénédiction-du-chat-et-la-roue-de-la-chance)
15. [La Zone de Repos](#15-la-zone-de-repos)
16. [XP et Arbre de Compétences](#16-xp-et-arbre-de-compétences)
17. [Le Gardien Absolu](#17-le-gardien-absolu)
18. [Ce qui se perd et ce qui reste](#18-ce-qui-se-perd-et-ce-qui-reste)

---

## 1. Vue d'ensemble

Le joueur gravit une Tour de **12 étages**. Chaque étage compte **4 salles** : trois créatures, puis
son **Gardien** — soit **48 combats** par ascension complète, avant l'affrontement final.

Vaincre un Gardien permet de lui **arracher son Pacte**, un pouvoir permanent réutilisable lors des
ascensions suivantes. Mourir met fin à l'ascension : les Pactes et l'XP sont conservés, tout le
reste est perdu.

Chaque combat est un duel au tour par tour où **les deux camps programment cinq actions à l'avance**,
puis les regardent se résoudre ensemble. Il n'y a aucun aléa de dégâts : tout est déterministe, sauf
l'esquive, le critique et les tirages du Froid.

---

## 2. Le tour de combat

Un tour se déroule en trois temps.

**a. Programmation.** Le joueur choisit **exactement 5 actions**, dans l'ordre. Les actions de
l'adversaire sont déjà tirées et affichées face aux siennes (sauf sur l'Étage de l'Ombre, où
certaines restent masquées).

**b. Résolution, créneau par créneau.** Les cinq créneaux se résolvent dans l'ordre, du 1er au 5e.
Sur un créneau normal, les deux camps agissent **en simultané** :

1. Les deux gardes se lèvent d'abord (une Défense donne son armure, une Esquive monte son palier).
2. Les deux coups sont ensuite calculés **sur ce même état**.
3. Les dégâts sont appliqués des deux côtés.

Personne ne profite donc de l'action de l'autre sur le même créneau : une Défense programmée en face
d'une Attaque protège bien, mais une Attaque ne bénéficie jamais d'un affaiblissement provoqué le
même créneau.

> **Exception — Étage du Froid.** Sur les créneaux « déréglés », le porteur du pouvoir agit **avant**
> l'autre. Sa propre garde le protège, mais la garde adverse arrive trop tard pour amortir son coup.
> Et s'il frappe **assez fort pour tuer**, l'adversaire n'a plus l'occasion de riposter : sur un
> créneau déréglé, il n'y a pas de double KO. En simultané, au contraire, les deux coups partent
> quoi qu'il arrive.

**c. Fin de tour.** Voir [§8](#8-la-fin-de-tour-dans-lordre).

La résolution s'arrête immédiatement dès qu'un camp tombe à 0 PV : les créneaux restants ne sont pas
joués. Les effets de fin de tour, eux, s'appliquent quand même (voir §8).

---

## 3. Les quatre actions

| Action | Symbole | Effet |
|---|---|---|
| **Attaque** | ⚔️ | Dégâts **absorbés par l'armure** de la cible ; seul le surplus entame les PV. |
| **Précise** | 🎯 | Dégâts **qui ignorent totalement l'armure** et vont droit aux PV. Valeur de base plus faible. |
| **Défense** | 🛡️ | Ajoute sa valeur à votre **armure**, pour la durée du tour. |
| **Esquive** | 💨 | N'inflige rien. Monte votre **palier d'esquive** d'un cran. |

**Valeurs de départ du héros** (sans compétence ni Pacte) : 100 PV, ⚔️ 10, 🎯 4, 🛡️ 10.

L'écart entre ⚔️ et 🎯 est le cœur du dilemme : l'Attaque frappe fort mais se heurte aux gardes, la
Précise frappe faiblement mais ne se heurte à rien.

---

## 4. Le Combo

Répéter la **même action** sur des créneaux consécutifs la renforce à chaque répétition :

| Action répétée | Bonus par répétition |
|---|---|
| ⚔️ Attaque | **+5** |
| 🎯 Précise | **+2** |
| 🛡️ Défense | **+5** |

Le compteur repart à 1 dès qu'une action différente est jouée. **L'Esquive remet toujours le combo à
zéro** : son propre enchaînement se mesure avec le palier d'esquive, pas avec le combo.

Formule : `valeur = base + (répétitions − 1) × bonus`, puis application du **multiplicateur de combo**
(Pacte du Combo) à partir de la 2ᵉ répétition, puis des bonus en pourcentage.

**Ce qui interfère avec le combo :**

- **Pacte de la Fluidité (adverse)** : limite le nombre d'actions identiques que vous pouvez
  enchaîner — le bouton se grise au-delà.
- **Fluidité II** : votre combo est calculé comme s'il valait 1, quel que soit l'enchaînement réussi.
- **Action gelée (Froid)** : l'action est annulée. Elle **ne casse pas** le combo, mais **ne le fait
  pas avancer** non plus : le compteur reprend là où il en était au créneau suivant.
- **Synergie Assassin** : ⚔️ et 🎯 comptent comme une **seule et même action** pour le combo.

---

## 5. L'Armure

- L'armure s'accumule pendant le tour à chaque Défense jouée.
- Elle **absorbe les Attaques** (⚔️) et la **Brûlure**, jamais les Précises (🎯) ni le **Poison**.
- Elle est **entièrement remise à zéro à la fin de chaque tour**. Rien ne se reporte.

**Points d'attention :**

- Porter de l'armure est **dangereux face à la Foudre** : ses dégâts sont multipliés tant que la
  cible en porte, Précise comprise.
- Un porteur de « Pointes d'Acier » / du **Pacte de l'Armure II** convertit son armure restante en
  dégâts en fin de tour. Cette armure est alors **dépensée** : elle ne sert plus de bouclier contre
  l'assaut d'en face. Deux porteurs face à face encaissent donc tout, chacun de son côté.

---

## 6. L'Esquive

L'esquive fonctionne par **paliers**, de 0 à 3 (**3 est le maximum**).

- Chaque Esquive jouée monte le palier de **+1**.
- Toute autre action le fait redescendre de **−1**.
- Le palier retombe à **0** à la fin de chaque tour.

**Chance d'esquive du héros** (paliers de base, sans compétence ni Pacte) :

| Palier | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Chance | 0 % | 50 % | 75 % | 100 % |

La chance réellement appliquée est : `palier + bonus plat − réduction imposée par l'attaquant`, bornée
entre 0 et 100 %.

- **Grâce Féline** (Bénédiction) ajoute un bonus **plat**, actif **même au palier 0**.
- **Regard Hypnotique** (Bénédiction) retranche 25 % à l'esquive adverse.
- **Neutralisation** (Pacte de l'Ombre II, Le Vent Mortel forme finale) : la chance tombe à **0 %**,
  quels que soient les paliers. Le journal l'indique explicitement.

Une esquive réussie annule **entièrement** le coup — y compris la pose d'une Brûlure ou d'un Poison.

**Le journal affiche la chance appliquée** à chaque coup offensif (`💨 L'ennemi esquive ! (75% d'esquive)`,
`💥 L'ennemi perd 16 PV. (75% d'esquive déjouée)`), et reste muet quand elle est nulle. Sans ce
rappel, un enchaînement d'esquives ressemble à de la malchance au lieu d'un palier atteint.

⚠️ **Un créneau déréglé (Froid) ne contourne pas l'esquive** : il fait frapper *avant* que la garde
adverse ne se lève, donc contre le palier **précédent**. Face à quelqu'un qui enchaîne les Esquives,
les chances passent de 50/75/100/100 % à 0/50/75/100 % — c'est là tout le gain du pouvoir.

---

## 7. Brûlure et Poison

Deux états qui **transforment une action offensive** en dégâts différés, résolus en fin de tour. Ils
sont le miroir l'un de l'autre.

|  | 🔥 **Brûlure** | 🧪 **Poison** |
|---|---|---|
| Action convertie | **⚔️ Attaque** (et elle seule) | **🎯 Précise** (et elle seule) |
| Montant posé | Une **part des dégâts réels** de l'action | Une **part des dégâts réels** de l'action |
| Armure | **Absorbée** par l'armure restante | **Traverse** l'armure |
| Cumul dans le tour | S'additionne | S'additionne |
| D'un tour à l'autre | **S'accumule**, puis **divisée par deux** après chaque tic | **S'accumule** ; ne décroît **jamais** |
| Esquivable | Oui | Oui |
| Après la mort de l'ennemi | **Le tic s'applique quand même** | **Le tic s'applique quand même** |

**Quelle part ?** Le porteur du pouvoir en décide :

| Porteur | Part convertie |
|---|---|
| **Pacte de Niveau I** | **50 %** des dégâts de l'action |
| **Pacte de Niveau II** | **100 %** des dégâts de l'action |
| Créatures des étages du Feu et du Poison | **100 %** des dégâts de l'action |

Une conversion totale dès le Niveau I rendrait ces deux Pactes strictement supérieurs à l'action
qu'ils remplacent — une brûlure qui s'empile ou un poison qui ignore l'armure, pour le même montant.

**La base de calcul, ce sont les dégâts réels de l'action** : **combos**, multiplicateurs du **Pacte
du Temps** et critiques compris, jamais une valeur forfaitaire. Une 5ᵉ action doublée par le Temps
pose donc deux fois plus de brûlure, et un combo x5 pose la dose du combo x5.

**La dose affichée fait foi.** La conversion est arrondie une seule fois, sur la valeur de base, et
les multiplicateurs de tour portent ensuite sur cette dose entière. Un héros à 7 de Précise sous
Pacte du Poison I lit `🧪 4` : sa 5ᵉ action doublée par le Temps en pose **8**, pas 7. Ce que
l'écran annonce et ce que l'ennemi encaisse ne peuvent pas diverger.

La **Foudre**, elle, reste à part : elle vit dans le calcul de dégâts direct, dont une action
convertie ressort à zéro. Une brûlure n'en profite **qu'avec la Synergie Élémentaire**.

> **Exemple.** Avec le Pacte du Feu **II**, une 4ᵉ action à 12 puis une 5ᵉ action en Combo x2 à 34
> posent **46** de brûlure en fin de tour (12 + 34). Avec le Niveau I, la même séquence en pose 23.

> **Exemple.** Un poison de 10 posé au tour 1, puis 10 encore au tour 2, donne **20** — et frappe 10
> puis 20. Laisser un combat s'éterniser face au poison coûte de plus en plus cher à chaque tour.

**À l'écran.** Comme ces pouvoirs *remplacent* l'action au lieu de s'y ajouter, **l'icône change** :
⚔️ devient 🔥 et 🎯 devient 🧪 — sur les boutons, les cases d'action, les statistiques et le journal,
pour le joueur comme pour les créatures. Le reliquat en cours s'affiche à côté des PV (`🔥 24`,
`🧪 12`) et **monte action par action pendant la résolution**, pas seulement une fois le tour soldé :
en pas-à-pas manuel, on suit la jauge se remplir.

La statistique ⚔️/🎯 affiche directement **la dose posée**, pas les dégâts qui ne seront jamais
infligés : une Attaque à 11 sous Pacte du Feu de Niveau I se lit `🔥 6`. Le détail au survol montre
la conversion ligne par ligne. Et chaque action convertie l'annonce dans le journal
(`🔥 L'ennemi s'embrase : +16 de brûlure.`) — sans quoi un coup qui porte sans blesser ne produirait
aucune ligne, et resterait indistinguable d'un coup esquivé.

**Conséquences importantes :**

- Une action convertie **cesse de blesser sur le coup**. Le Feu et le Poison sont des styles de jeu à
  dégâts différés, pas des bonus qui s'ajoutent.
- **Tuer l'adversaire n'annule pas ce qu'on a déjà dans les veines** : le tic se résout après le coup
  fatal et peut emporter le vainqueur (double KO).
- Les deux états sont nettoyés **entre deux salles** : ils ne se transportent jamais d'un combat au
  suivant.
- Les occupants de l'Étage du Feu **n'ont pas la Précise** ; ceux de l'Étage du Poison **n'ont pas
  l'Attaque**. Toutes leurs offensives passent donc par leur état.

---

## 8. La fin de tour, dans l'ordre

L'ordre est imposé et **n'est pas cosmétique** : les flammes rongent la plaque avant qu'elle ne parte
à l'assaut.

1. **Les doses de poison du tour** rejoignent le poison en cours (on garde la plus forte).
2. **Brûlure puis Poison** frappent les deux camps — **même si le combat est déjà terminé**.
3. Les effets suivants ne s'appliquent que **si les deux camps sont encore en vie** :
   - **Assauts d'armure** (« Pointes d'Acier » et Pacte de l'Armure II). Les deux se résolvent sur le
     **même instantané d'armure**, pris avant tout échange : sans cela, le résultat dépendrait de
     l'ordre du code plutôt que des règles.
   - **Régénération de PV** du Gardien (tous les X tours).
   - **Altération temporelle** (perte de PV imposée au joueur, tous les X tours).
   - **Remise à zéro** de l'armure et du palier d'esquive des deux camps.
4. **Pacte de la Vie II** : tous les 5 tours, le joueur récupère **10 % de ses PV max**. Le soin ne
   dépend que de **sa propre survie** — tuer l'ennemi au tour 5 ne l'annule pas.
5. **Vie de Chat** (Bénédiction) : si le joueur est tombé, il se relève. Un écran bloquant l'annonce.

*Exemple d'ordre : 155 d'armure moins 40 de brûlure donne un assaut de 115, pas de 155.*

---

## 9. Comportement des monstres

Les monstres tirent leurs 5 actions au hasard parmi leur panoplie, avec une **chance d'enchaîner**
l'action précédente (20 % par défaut, 50 % sur l'Étage du Combo, et un bonus spécifique après une
Défense pour les Gardiens de l'Armure : 25 / 33 / 50 % selon la forme).

**Obligation d'attaquer.** Une créature ne peut **jamais** passer un tour entier à se défendre et
esquiver : si aucune offensive n'est sortie du tirage, l'une de ses actions est remplacée par une ⚔️
ou une 🎯. Un tour sans offensive serait un tour offert au joueur.

**Unique dérogation** : les créatures de l'**Étage du Poison**, une fois que la dose déjà injectée
dans le joueur **dépasse 10**. Leur poison travaille alors tout seul, et attendre devient une vraie
tactique plutôt qu'un temps mort. En dessous du seuil, elles doivent continuer d'injecter comme tout
le monde.

**Panoplies restreintes.** Certains étages n'ont pas accès aux quatre actions : ni Précise sur les
étages de la Vie, de la Brute et du Feu ; ni Attaque sur l'Étage du Poison ; ni Défense sur l'Étage
de la Vitesse ; ni Esquive sur l'Étage de l'Armure.

---

## 10. La Tour : structure d'une ascension

**Ordre des étages.** Tiré au hasard à chaque ascension. Exception d'apprentissage : pour la toute
première partie d'un joueur, les **deux premiers étages** sont choisis parmi l'Armure, la Vie et la
Brute — trois mécaniques lisibles, sans effet caché ni différé.

**Paliers de puissance.** À chaque étage **pair** (2ᵉ, 4ᵉ, 6ᵉ…), tous les monstres montent d'un
palier — définitivement, et cumulativement. Un écran d'avertissement prévient le joueur à l'entrée.

Par palier franchi :

| | Monstre normal | Gardien (toutes formes) |
|---|---|---|
| PV (max et actuels) | **+10** | **+20** |
| ⚔️ Attaque | +2 | +2 |
| 🛡️ Défense | +2 | +2 |
| 🎯 Précise | +1 | +1 |
| Paliers d'esquive 1 à 3 | +2 % | +2 % |

**Résonance du Pacte.** Équiper le Pacte correspondant à un étage rend cet étage plus dangereux :

- **Pacte de Niveau I équipé** : les créatures de l'étage sont renforcées de **10 %**, et son Gardien
  apparaît directement dans sa **Forme Évoluée**.
- **Pacte de Niveau II équipé** : renforcement de **20 %**, et le Gardien apparaît directement dans sa
  **Forme Finale**.

**Arracher un Pacte.** Après avoir vaincu un Gardien, si le joueur ne possède pas encore son Pacte,
un écran de choix s'ouvre : continuer l'ascension tranquillement, ou **réveiller le Gardien dans sa
forme supérieure** pour lui arracher son Pacte. C'est un risque volontaire, jamais imposé.

- Sans Pacte de cet étage → affronter la **Forme Évoluée** pour le **Niveau I**.
- Avec le **Niveau I équipé** → affronter la **Forme Finale** pour le **Niveau II**.

Entre chaque étage, le joueur passe par une [Zone de Repos](#15-la-zone-de-repos).

---

## 11. Les douze Gardiens et leurs pouvoirs

Chaque Gardien existe en trois formes de puissance croissante : **normale**, **évoluée** (Niveau I) et
**finale** (Niveau II).

| Étage | Gardien | Pouvoir |
|---|---|---|
| **Armure** | Le Mur de Fer | Enchaîne les Défenses (25/33/50 %). En forme finale, convertit son armure restante en dégâts de fin de tour (**Pointes d'Acier**). |
| **Vitesse** | Le Vent Mortel | Paliers d'esquive très élevés, aucune Défense. En forme finale, **neutralise entièrement votre esquive**. |
| **Combo** | L'Harmonie Brisée | Enchaîne ses actions une fois sur deux, avec un multiplicateur de combo **x1,5** puis **x2**. |
| **Vie** | L'Anomalie | Réserve de PV énorme (160 → 300). **Régénère 10 % de ses PV max** tous les 5 tours (évoluée), tous les 3 tours (finale). |
| **Ombre** | Le Cauchemar | **Masque ses actions** : seules 3/5, puis 2/5, puis 1/5 de ses actions sont visibles. |
| **Temps** | Chronos | **Altération temporelle** : vous fait perdre 10 % de vos PV (actuels, puis max) tous les 5 tours, puis tous les 3. |
| **Fluidité** | Le Maître des Courants | **Limite vos enchaînements** (4, puis 3, puis 2 actions identiques max). En forme finale, **annule aussi vos bonus de combo**. |
| **Brute** | Le Poing Primordial | Aucune Précise, mais une Attaque écrasante (16 → 22 de base). |
| **Froid** | Le Souffle Immobile | **Dérègle l'ordre de résolution** : agit avant vous sur 2 créneaux. Sa forme évoluée **gèle** une action ; la finale cumule les deux. |
| **Foudre** | La Colère du Ciel | **x1,5 / x2 / x3 sur ses dégâts totaux** tant que sa cible porte de l'armure. Se défendre contre lui est un piège. Les stats ⚔️/🎯 et la jauge de combo affichent la valeur **déjà amplifiée** dès que la cible est armée — y compris l'armure que le « Pelage d'Acier » n'a pas encore créditée, puisqu'elle tombera de toute façon. |
| **Feu** | Le Brasier Vorace | Son **Attaque devient une Brûlure** cumulée, résolue en fin de tour. Aucune Précise. |
| **Poison** | La Sève Noire | Sa **Précise devient un Poison** qui traverse l'armure, s'accumule de tour en tour et ne décroît jamais. Aucune Attaque. |

---

## 12. Les Pactes

Un Pacte est un pouvoir **permanent**, acquis en arrachant sa forme supérieure à un Gardien, et
conservé d'une ascension à l'autre. Il existe en **Niveau I** et **Niveau II**.

**Emplacements d'équipement : 3 Pactes de Niveau I + 1 Pacte de Niveau II.** On ne peut jamais porter
le Niveau I et le Niveau II d'un même Pacte en même temps.

Chaque Pacte **retourne contre les monstres la mécanique de son Gardien**.

| Pacte | Niveau I | Niveau II |
|---|---|---|
| **Vie** | +10 % PV Max | +25 % PV Max, et **soin de 10 % des PV max tous les 5 tours** |
| **Armure** | +5 Défense | +5 Défense, et **renvoi de l'armure restante** en fin de tour |
| **Esquive** | +10 % sur les paliers d'esquive | +30 % sur les paliers d'esquive |
| **Combo** | Multiplicateur de combo **x1,5** | Multiplicateur de combo **x2** |
| **Ombre** | Dégâts Précis **x2** | Dégâts Précis x2, et **neutralise l'esquive ennemie** |
| **Temps** | La **5ᵉ action** compte double | La **3ᵉ action** compte triple |
| **Fluidité** | Limite l'ennemi à 3 actions identiques | Limite à 2, et **casse ses bonus de combo** |
| **Brute** | +10 % de dégâts d'Attaque | +20 % de dégâts d'Attaque, et +1 de combo par palier |
| **Froid** | 2 actions résolues **avant** l'ennemi | 2 actions en premier, **et gèle 1 action ennemie** |
| **Foudre** | **x1,5** dégâts si la cible a de l'armure | **x2** dégâts si la cible a de l'armure |
| **Feu** | Vos **Attaques deviennent une Brûlure** de 50 % des dégâts | Brûlure de **100 %** des dégâts |
| **Poison** | Vos **Précises deviennent un Poison** de 50 % des dégâts | Poison de **100 %** des dégâts |

**Sur les Pactes du Temps** : sur la 5ᵉ (ou 3ᵉ) action, une Esquive monte de 2 (ou 3) paliers d'un
coup au lieu de doubler/tripler une valeur de dégâts.

**Sur le Froid** : un pouvoir porté **des deux côtés s'annule**. Seul l'écart compte — porter le
Pacte du Froid à l'Étage du Froid ne donne donc l'avantage que sur la différence. Les créneaux
concernés sont tirés **avant le tour** et **affichés sur les cases d'action** pendant la phase de
programmation, avec trois repères distincts :

| Repère | Signification |
|---|---|
| Bordure **dorée** | Créneau déréglé : vous agissez avant l'ennemi (ou lui avant vous). |
| Bordure **glacée**, case éteinte | Action **gelée** : purement annulée. |
| Bordure **grise** | Dérèglement **neutralisé** : les deux camps le portaient ici, l'action se résout normalement. |

Le troisième cas est signalé exprès : sans lui, un Pacte du Froid entièrement contré passerait pour
un Pacte qui ne fonctionne pas.

**Le Pacte du Chat** (Niveau 0) est purement décoratif : offert à la fin du tutoriel, il n'a aucun
effet mécanique.

---

## 13. Les Synergies cachées

Équiper **quatre Pactes précis** (peu importe leur niveau) au lancement d'une ascension révèle un
bonus de combat secret, actif toute la run. Rien dans le jeu ne les annonce : elles se découvrent.

Comme il n'y a que 4 emplacements, **une seule synergie peut être active à la fois**.

| Synergie | Pactes requis | Effet |
|---|---|---|
| **Guerrier**<br>*Posture du Seigneur de Guerre* | Vie · Armure · Brute · Temps | Chaque **Attaque** donne **+2 Armure**. Chaque **Défense** donne **+2 dégâts de base** pour le reste du tour. |
| **Ninja**<br>*Frappe Insaisissable* | Esquive · Ombre · Combo · Fluidité | Une **Esquive réussie** arme un **Coup Critique (x2)** sur la prochaine Précise du même tour. |
| **Tank**<br>*Riposte Fluide* | Vie · Armure · Esquive · Fluidité | Une **Esquive réussie** renvoie votre **Armure actuelle** en dégâts (absorbés comme une Attaque) et vous **soigne de 10 %** de cette armure. |
| **Assassin**<br>*Danse des Lames* | Brute · Temps · Ombre · Combo | **⚔️ et 🎯 fusionnent dans la même jauge de combo** (A-A-P-P-P = Combo x5), et la Précise profite aussi des bonus du Pacte de la Brute. |
| **Élémentaire**<br>*Communion des Éléments* | Foudre · Feu · Poison · Froid | Vos **Brûlures profitent de la Foudre** (amplifiées si la cible porte de l'Armure), et toute **dose de Poison posée sur un créneau où le Froid est intervenu en votre faveur est doublée**. |

Le bonus du Guerrier est **temporaire** : il repart de zéro à chaque tour.

L'Élémentaire réunit les quatre Gardiens élémentaires, qui s'ignorent complètement sans elle : la
Brûlure quitte le calcul de dégâts avant que la Foudre ne s'y applique, et le Froid ne touche que
l'ordre de résolution. Un « créneau en votre faveur » est un créneau où vous agissez avant l'ennemi,
ou dont son action est gelée.

**Découverte.** La première fois qu'une synergie s'active, un message la révèle et elle entre dans les
Archives. Ensuite, un simple rappel s'affiche en début de run. Dès qu'un joueur possède un Pacte de
Niveau II, les quatre synergies apparaissent **grisées** dans les Archives — nom visible, effet
masqué — pour lui donner une piste sans lui donner la réponse.

**Aides à l'équipement.** Dès que 3 des 4 Pactes d'une synergie sont équipés, le 4ᵉ (s'il est possédé)
s'illumine dans l'Inventaire. Une synergie déjà découverte peut aussi être équipée **en un clic**.

---

## 14. La Bénédiction du Chat et la Roue de la Chance

À la sortie de la **première ascension achevée** — victoire ou défaite, seul le ton change —, le Chat
Mystérieux accorde sa Bénédiction. Dès lors, **à chaque entrée dans la Tour**, la Roue de la Chance
tire **un** bonus valable pour toute l'ascension.

| Bonus | Effet |
|---|---|
| 💨 **Grâce Féline** | **+5 % d'esquive à plat**, actif même sans avoir joué Esquive (donc dès le palier 0). |
| 🐾 **Griffe Acérée** | **10 %** de chance qu'une Attaque ou une Précise frappe en **Coup Critique (×1,5)**. |
| 🛡️ **Pelage d'Acier** | **+10 Armure** offerts au début de chaque tour, avant même la première action. |
| 👁️ **Regard Hypnotique** | **−25 %** de chance d'esquive pour vos adversaires. |
| 🐈 **Vie de Chat** | La première fois que vous tombez, vous vous relevez à **50 % de vos PV max**. Une fois par ascension. |
| 📖 **Leçon du Maître** | Toute l'**XP** gagnée pendant l'ascension est **doublée**. |

**Vie de Chat** est consommée *avant* les branches de fin de combat : un double KO se règle donc en
votre faveur (vous vous relevez, l'adversaire reste mort). Un **écran bloquant** l'annonce — jamais
une simple ligne de journal, qui passerait inaperçue en mode automatique.

**Le Chat apparaît aussi entre les runs**, une scène au maximum et une seule fois chacune : la
Bénédiction après la 1ʳᵉ ascension achevée, la présentation du Forgeron à partir de la 2ᵉ, puis un
rappel sur le Combo. L'Arbre de Compétences n'est accessible qu'**une fois le Forgeron présenté**.

**Les leçons de mort.** Une fois ces trois scènes passées, le Chat revient commenter les morts dont
la cause est facile à ne jamais voir.

| Vous êtes mort... | Le Chat vous demande... | Fréquence |
|---|---|---|
| De l'**Altération Temporelle** de Chronos (le coup fatal tombe en fin de tour) | Si vous aviez vu qu'il tuait sans vous toucher | Une fois |
| De l'**assaut d'armure** du Mur de Fer en fin de tour | Si vous aviez vu que sa carapace explosait | **À chaque fois** |
| Contre **Le Vent Mortel** alors qu'il neutralisait votre esquive | Si vous aviez remarqué que vos Esquives ne servaient à rien | **À chaque fois** |
| Contre **L'Anomalie** après qu'elle se soit régénérée | Si vous aviez vu sa barre de vie remonter | Une fois |
| Contre **Le Poing Primordial** | S'il vous a semblé qu'il tapait fort (il n'a rien d'autre à dire) | Une fois |

Les deux leçons répétées sont celles des pièges dans lesquels on **retombe** : se faire à nouveau
bloquer l'esquive ou exploser par une armure prouve que la leçon n'a pas porté.

Trois restrictions :

- Il faut être tombé pendant le combat du **Gardien** — ces pouvoirs n'appartiennent qu'à lui, pas
  aux créatures de son étage.
- Chronos et le Mur de Fer exigent que le coup fatal soit bien leur **tic de fin de tour**. Mourir
  sous leurs coups ordinaires n'apprend rien sur leur pouvoir.
- Seule la **forme qui porte le pouvoir** compte. Le Vent Mortel ne bloque l'esquive que sous sa
  forme finale : les deux autres ne déclenchent rien. Idem pour l'assaut d'armure du Mur de Fer
  (forme finale) et la régénération de L'Anomalie (formes évoluée et finale).

---

## 15. La Zone de Repos

Entre deux étages, le joueur choisit **un** bonus.

| Choix | Effet |
|---|---|
| **Se soigner** | Rend **50 % des PV max** (**+10 %** avec un Pacte de la Vie) |
| **+ PV Max** | **+10 PV max** et actuels (**+10 %** avec un Pacte de la Vie) |
| **+ Attaque** | **+2** ⚔️ |
| **+ Précise** | **+1** 🎯 |
| **+ Défense** | **+2** 🛡️ |

Les **cinq** choix sont disponibles à la **première** Zone de Repos d'une ascension. Ensuite, seuls
**trois** — tirés au hasard à chaque visite — restent actifs ; les deux autres sont grisés.

---

## 16. XP et Arbre de Compétences

**Gains d'XP** (doublés par la Leçon du Maître) :

| Adversaire vaincu | XP |
|---|---|
| Créature normale | **1** |
| Gardien, forme normale | **2** |
| Gardien, Forme Évoluée (Niveau I) | **4** |
| Gardien, Forme Finale (Niveau II) | **8** |
| Le Gardien Absolu | **10** |

**Points de compétence.** L'XP est **cumulative à vie**. Un point est accordé à chaque palier :
**5, 10, 25, 50, 100 XP**, puis **tous les 100 XP**.

| Compétence | Coût | Gain par point |
|---|---|---|
| PV | 1 point | +10 PV max |
| Attaque | 1 point | +1 ⚔️ |
| Défense | 1 point | +1 🛡️ |
| Esquive | 1 point | +5 % sur les paliers 1 à 3 |
| **Précise** | **2 points** | +1 🎯 |

Les modifications de l'Arbre ne sont **validées qu'au clic sur « Valider »** : quitter l'écran sans
valider annule tout. Une réinitialisation est toujours possible.

---

## 17. Le Gardien Absolu

Après le 12ᵉ étage, l'ascension n'est pas finie : les Gardiens vaincus **convergent en une seule
entité**, à affronter avant la victoire totale.

- **PV** : nombre d'étages **× 100**, soit **1200 PV**, sans régénération globale.
- **Changement de forme à chaque tour**, sans jamais répéter la précédente, parmi tous les Gardiens de
  **Niveau II** de la run.
- Il emprunte à sa forme du tour **ses statistiques *et* son pouvoir spécial** : renvoi d'armure,
  esquive neutralisée, brûlure, poison, gel, multiplicateur contre l'armure, régénération…
- Les effets « tous les X tours » sont forcés à **chaque tour** où la forme est active — la forme
  changeant à chaque tour, un intervalle réel de 3 à 5 tours ne se déclencherait presque jamais.
- Seuls ses **PV, son armure et son palier d'esquive** en cours restent les siens d'un tour à l'autre.
  Une brûlure ou un poison qu'il subit **survit à ses changements d'apparence**.

Le vaincre accorde **+10 XP** et la **victoire totale**.

---

## 18. Ce qui se perd et ce qui reste

**Perdu à la fin d'une ascension** (mort, abandon ou victoire) : les PV, l'armure, les bonus de Zone
de Repos, l'ordre des étages, la Bénédiction tirée, les statistiques de la run.

**Conservé définitivement** : les **Pactes arrachés**, l'**XP totale** et les points de compétence,
les **Synergies découvertes**, les Pactes **victorieux** (trophées), le bestiaire, l'étage record, et
les progrès du Chat (Bénédiction, Forgeron présenté, leçons vues).

La progression vit dans le **navigateur** (`localStorage`), doublée d'une **sauvegarde cloud**
anonyme et automatique — un miroir de secours, pas un compte.
