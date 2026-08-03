# Tour des Pactes — Contexte projet

Jeu de combat au tour par tour (navigateur). Interface React pilotée par un moteur de combat Rust/WASM.

## 🛠️ COMMANDES ESSENTIELLES

**Installation initiale (ordre obligatoire) :**
```bash
cd moteur_wasm && wasm-pack build --target web && cd ..
npm install
```
(`moteur_wasm` est une dépendance npm locale `file:moteur_wasm/pkg` — le pkg doit exister AVANT `npm install`)

**Développement :**
```bash
npm run dev          # Vite, http://localhost:5173
```

**Après TOUTE modification dans `moteur_wasm/src/*.rs` :**
```bash
cd moteur_wasm
cargo check --target wasm32-unknown-unknown   # vérif rapide sans rebuild complet
wasm-pack build --target web                  # OBLIGATOIRE avant de tester côté TS
```
⚠️ Sans ce rebuild, le HMR de Vite ne recharge PAS le binaire `.wasm` — le TS compile mais tourne sur l'ancien moteur.

**Build / qualité / déploiement :**
```bash
npm run build         # tsc -b && vite build
npm run lint           # eslint .
npm run preview        # sert le build de prod en local
```
- Déploiement : Vercel (auto-détecte Vite sur push git, pas de config locale)
- Avant de considérer une tâche terminée : `tsc -b` + `eslint .` propres, `cargo check` si Rust touché, **et test manuel dans le navigateur** (compilation ≠ fonctionnement)

## 🏗️ ARCHITECTURE ET STACK

**Stack :** React 19 + TypeScript + Vite · Rust → WebAssembly (wasm-bindgen) · `localStorage` (pas de backend)
Pas de state manager externe, pas de router — état 100% dans un hook custom, écrans gérés par un type union.

**Dossiers clés :**
- `moteur_wasm/src/` — moteur de combat (source de vérité des calculs)
  - `entite.rs` — structs `Entite`/`StructureEtage` (miroir exact de `src/types.ts`)
  - `combat.rs` — calculs purs : dégâts, combo, esquive
  - `boss_data.rs` — données des étages/monstres/boss (aucune logique, juste des données)
  - `lib.rs` — bindings `wasm_bindgen` exposés au JS (`jouer_tour`, `get_donnees_etages`)
- `src/hooks/useGameState.ts` — **le cerveau de l'app** : tout l'état persistant (`localStorage`) + toute la logique métier (actions, progression, pactes)
- `src/components/` — écrans/composants de rendu uniquement (pas de logique métier lourde ; délèguent via callbacks reçus en props)
- `src/utils/` — fonctions pures sans état (pactes, animations, calculs de récompense/compétences)
- `src/types.ts` — types partagés, DOIT rester en miroir de `entite.rs` (camelCase TS ↔ snake_case Rust via `serde(rename_all = "camelCase")`)
- `public/sprites/<personnage>/` — feuilles de sprites pixel art (une par animation)
- `public/images/` — illustrations de cinématique de boss (une par pacte)

**Pas de pages classiques (Accueil/Tarifs/Contact)** — jeu à écran unique. Navigation = type `Ecran` (union de string literals dans `types.ts`) + rendu conditionnel dans `App.tsx`.

## 📏 CONVENTIONS DE CODE

- **Langue : tout en français** (variables, fonctions, composants, commentaires). Anglais uniquement pour mots-clés techniques/libs.
- Composants : PascalCase (`CombatArene.tsx`). Hooks : camelCase préfixé `use`. Utils : camelCase, un fichier = un domaine.
- **Synchro Rust ↔ TS obligatoire** : toute nouvelle propriété sur `Entite` doit exister des deux côtés (snake_case Rust / camelCase TS).
- **Registre de pactes** : source unique de vérité = `PACTES_REGISTRY` dans `utils/pactes.ts`. Ajouter une entrée suffit à l'activer partout.
- **Nouvel étage** : ajouter `get_etage_xxx()` dans `boss_data.rs` + l'enregistrer dans `get_tous_les_etages()`. Réutiliser les helpers existants (`esquive_std()`, `kit_complet()`, `nom_boss*()`...) plutôt que des littéraux dupliqués.
- **Style** : classes CSS uniquement, tout dans `App.css`/`index.css` (sections commentées par écran). Style inline réservé aux valeurs calculées à l'exécution (ex: largeur de barre de progression). Un seul breakpoint responsive à 768px — toujours vérifier l'absence de débordement horizontal et l'alignement entre cartes symétriques (joueur/monstre) après un changement visuel.
- **React** : jamais de `setState` synchrone dans un `useEffect` (règle ESLint active) — utiliser l'ajustement d'état pendant le rendu quand la condition redevient fausse d'elle-même après mise à jour. `prefer-const` actif.
- **Commentaires** : uniquement pour un "pourquoi" non-évident (contrainte cachée, workaround). Pas de commentaires qui répètent le code.
- **Modèle à respecter pour un nouveau fichier** : une responsabilité claire (composant = rendu, hook = état+logique, util = fonction pure), pas de mélange logique métier / JSX au-delà de l'orchestration.

## 🎯 CONTEXTE ACTUEL (Current Task)

- Intégration d'un système d'animations sprite pixel art (héros + monstre) en 2 temps : action propre du personnage, puis résolution de l'action adverse (`SpriteAnime.tsx`, `utils/animations*.ts`).
- Ajout d'un nouvel étage "Puissance Brute" (monstres sans action Précise) + pacte associé (bonus % dégâts d'Attaque + bonus combo) + règle globale de scaling de puissance des monstres par paliers d'étages pairs.
- Modifications en cours non commitées (voir `git status`) sur le moteur Rust (`boss_data.rs`, `combat.rs`, `entite.rs`) et le TS associé — penser à valider (`cargo check` + `wasm-pack build` + `tsc -b`) avant tout commit.
- Écran de fin enrichi avec les statistiques de la run (étage/record, monstres tués, pactes débloqués, dégâts infligés/bloqués/esquivés) — capturées via `lireValeurPersistante` (localStorage) plutôt que l'état React fermé, pour éviter un piège de closure obsolète sur le tour fatal (cf. `utils/logs.ts`).
- Boss de l'Armure : chance croissante (25/33/50 %) d'enchaîner une Défense après une Défense (`chanceSuiteDefense`), pour finir le tour avec plus d'armure et déclencher plus souvent son effet de fin de tour au lvl2.
- Étage de l'Ombre : `actionsCachees` (bool) remplacé par `actionsVisibles` (nombre, tiré aléatoirement chaque tour) — 3/5 sans pacte, 2/5 face au boss évolué, 1/5 face à sa forme finale. Pacte de l'Ombre II boosté avec Dégâts Précis x2 en plus du blocage d'esquive.
- Nouvel écran "Sortie de la Tour" + combat final contre le Gardien Absolu (agglomérat des 8 Gardiens de Niveau II de la run, PV = nb d'étages × 100, change de forme aléatoirement — sans répétition consécutive — à chaque tour ; voir `utils/megaboss.ts`) avant la victoire totale.
- Arrondi des calculs de dégâts corrigé côté moteur (`.round()` au lieu d'un `as i32` qui tronquait toujours vers zéro) — affectait notamment le Pacte de la Puissance Brute.
- Stat `⚔️` affichée en combat recalculée pour intégrer les bonus % du Pacte de la Puissance Brute (`calculerAttaqueAffichee`) — sinon le joueur ne voyait jamais son bonus contrairement aux pactes à bonus plat (ex: Pacte de la Vie).
- Le Pacte du Combo (multiplicateur) s'applique désormais aussi à la progression du niveau d'Esquive lors d'un enchaînement d'Esquive (auparavant l'Esquive réinitialisait toujours le compteur de combo côté moteur, rendant le pacte inopérant sur cette action).
- Écran d'avertissement dédié affiché à chaque entrée sur un étage PAIR (palier de puissance des monstres, cf. `buffProgressionEtage`), sans détailler les stats concrètes. Ce palier ajoute aussi désormais +10 PV (max et actuels) par palier aux monstres normaux et +20 PV aux boss (peu importe leur forme).
- Validation des points de compétence : `ArbreCompetences.tsx` utilise un brouillon local (`useState`), propagé au jeu (`setCompetences`) uniquement au clic sur "Valider" — abandonner via "Retour au Hub" sans valider annule les changements. Une animation de forgeron (`utils/animationsForge.ts`, sprite `public/sprites/blacksmith/`) se joue 2s après validation : centrée dans l'espace vide entre le bord de l'écran et la colonne de contenu (600px) sur bureau, sous le compteur de points en mobile — échelle ET position calculées à partir de la même variable CSS pour ne jamais chevaucher le contenu.
- Boutons de cet écran alignés sur le vocabulaire partagé du jeu (`.btn-menu` + variante de couleur type `.btn-jouer`/`.btn-danger`) plutôt que des classes propres à l'écran, pour garder la même hauteur/apparence entre tous les boutons d'un même pied de page.
- Pacte du Combo sur l'Esquive : le multiplicateur ne fait plus sauter un palier d'esquive (le niveau reste un décompte fidèle du nombre d'Esquive enchaînées, important pour la décroissance après une autre action). Il amplifie l'écart entre paliers consécutifs à partir du 2e (`paliers_esquive_effectifs()` dans `combat.rs`, mirorée côté TS par `calculerPaliersEsquiveAffiches` pour l'affichage — sinon le % à l'écran restait figé sur les paliers de base, même bug que `calculerAttaqueAffichee`).
- Log de combat explicite quand l'Esquive d'un camp est neutralisée par `bloqueEsquiveOpposant` (Le Vent Mortel forme finale, ou le joueur avec le Pacte de l'Ombre II) : "(Votre esquive est neutralisée !)" / "(L'esquive ennemie est neutralisée !)".
- Régénération de PV (10%) recentrée sur le bon boss : L'Anomalie (Pacte de la Vie) régénère tous les 5 tours en forme évoluée, tous les 3 tours en forme finale — ce mécanisme avait été implémenté par erreur sur Chronos (Pacte du Temps), qui n'a que sa perte de PV.
- Zone de Repos : les 5 choix sont disponibles à la 1ère visite d'une run ; ensuite, seuls 3 (tirés aléatoirement à chaque visite, cf. `melangerAleatoirement` exportée de `utils/etages.ts`) restent actifs, les 2 autres sont grisés (`.btn-action:disabled`, en `!important` pour passer devant les couleurs `.bg-*`).
- Le Gardien Absolu emprunte désormais aussi le pouvoir spécial de sa forme du tour (pas seulement ses stats) : renvoi d'armure, esquive neutralisée, régénération/altération de PV, etc. (`appliquerFormeMegaBoss` dans `utils/megaboss.ts`). Les effets "tous les X tours" sont forcés à un intervalle de 1 pour se déclencher à chaque tour où la forme est active (la forme changeant chaque tour, un intervalle réel de 3-5 tours ne se déclencherait presque jamais). Victoire contre le Gardien Absolu = +10 XP.
- Synergies cachées (`utils/synergies.ts`, source unique de vérité `SYNERGIES_REGISTRY`) : équiper 4 Pactes précis (peu importe leur niveau) au lancement d'une run révèle un bonus de combat secret pour le joueur — `Entite.synergieActive` (enum `Synergie` mirorée Rust/TS). Comme seuls 4 Pactes max peuvent être équipés (3 Niveau I + 1 Niveau II), une seule synergie est active à la fois. Chaque Pacte n'intervient que dans 2 synergies par design.
  - **Guerrier** (Vie/Armure/Force/Temps) : +2 Armure par Attaque programmée, +2 dégâts de base (non permanent, réinitialisé chaque tour) par Défense programmée.
  - **Ninja** (Esquive/Ombre/Combo/Fluidité) : une Esquive réussie arme un Coup Critique (x2) pour la prochaine Précise du même tour.
  - **Tank** (Vie/Armure/Esquive/Fluidité) : une Esquive réussie renvoie l'Armure actuelle en dégâts (absorbés par l'armure adverse comme une Attaque normale) et soigne 10% de cette Armure.
  - **Assassin** (Force/Temps/Ombre/Combo) : Attaque et Précise fusionnent dans la même jauge de combo (`gerer_combo` avec `fusion_ap`), et la Précise bénéficie aussi des bonus du Pacte de la Puissance Brute (normalement réservés à l'Attaque).
  - Découverte suivie à vie (`synergiesDecouvertes`, indépendant des stats de run) : 1ère fois = message dramatique + entrée dans les Archives (Tuto) ; ensuite, simple rappel "Synergie active" en début de run.
- `DefinitionAnimation` supporte désormais `frameDebut`/`frameFin` optionnels pour ne jouer qu'un sous-segment d'une feuille de sprites (ex: `attack.png` du mushroom sert à la fois pour l'Esquive — mouvement complet 10 frames — et l'Attaque/la Précise — juste la fin, frames 5-9, le coup de griffe). `frames` doit toujours rester le nombre RÉEL de frames de l'image (nécessaire au calcul CSS `background-size`), jamais la taille du sous-segment.
- Stats de combat affichées (⚔️/🎯) toujours recalculées via `calculerAttaqueAffichee`/`calculerPreciseAffichee` (jamais `entite.baseA`/`baseP` bruts) dès qu'un pacte ou une synergie change un dégât de façon inconditionnelle — sinon le joueur ne voit jamais le bonus agir. `calculerAttaqueAffichee` accepte en plus les actions en attente du joueur pour prévisualiser en direct le bonus temporaire de la Synergie Guerrier (+2 dégâts par Défense déjà posée dans la file, avant même de valider le tour).
