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
