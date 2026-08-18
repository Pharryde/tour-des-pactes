# 🗼 Tour des Pactes

Un jeu de combat au tour par tour en navigateur : gravissez une tour de 12 étages thématiques, affrontez leurs Gardiens, et arrachez-leur des **Pactes** — des pouvoirs permanents que vous pourrez équiper lors de vos prochaines ascensions.

La logique de jeu (combat, dégâts, esquive, combos, brûlure, poison) est écrite en **Rust** et compilée en **WebAssembly**, pilotée par une interface **React**.

📖 **Les règles complètes du jeu sont dans [`REGLES.md`](REGLES.md)** — document lisible rangé par catégorie, qui décrit ce que le jeu fait réellement, avec les valeurs exactes en vigueur.

## ✨ Concept

- La Tour compte **12 étages**, chacun associé à un Pacte : Armure, Esquive, Combo, Vie, Ombre, Temps, Fluidité, Puissance Brute, Froid, Foudre, Feu, Poison. Leur ordre est **tiré au hasard à chaque ascension** — sauf pour la toute première partie, dont les deux premiers étages sont choisis parmi les mécaniques les plus simples.
- Chaque étage compte **4 salles** : trois créatures, puis son Gardien — soit **48 combats** pour une ascension complète.
- Chaque tour, les deux camps programment **5 actions à l'avance** (⚔️ Attaque, 🎯 Précise, 🛡️ Défense, 💨 Esquive) et les regardent se résoudre ensemble. Enchaîner la même action déclenche un **combo**.
- Un Gardien existe en trois formes. Affronter la forme supérieure est un choix : plus risqué, mais c'est la seule façon d'arracher son Pacte de **Niveau I** puis de **Niveau II**.
- Les Pactes obtenus sont **acquis définitivement** et s'équipent depuis le Hub, jusqu'à **3 de Niveau I + 1 de Niveau II**.
- Certaines combinaisons de 4 Pactes révèlent une **Synergie cachée** — un bonus secret qu'aucun écran n'annonce à l'avance.
- Après le 12ᵉ étage, les Gardiens vaincus convergent en un **Gardien Absolu**, à terrasser avant la victoire totale. Le **Mode Infini** permet ensuite de poursuivre par cycles de 12 étages supplémentaires.
- Une fois la Tour vaincue, le **Mode Hardcore** se débloque : un second profil de progression, où la mort efface tout et où la seule parade est de s'extraire volontairement à la fin d'un étage. Il alimente un **classement en ligne**.
- 96 **succès** et un **bestiaire** suivent la progression sur les deux profils.

## 🛠️ Stack technique

| Côté | Techno |
|---|---|
| Interface | React 19 + TypeScript + Vite |
| Logique de combat | Rust → WebAssembly (via `wasm-bindgen`) |
| Persistance | `localStorage` (source de vérité immédiate) + Supabase (miroir cloud asynchrone) |
| Tests | Vitest (fonctions pures : calculs miroirs du moteur, registres, télémétrie) |
| Hébergement | Vercel |

Pas de state manager externe ni de router : l'état vit dans un hook custom (`useGameState`) et les écrans sont gérés par un type union.

## 📋 Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (édition 2021) avec la cible `wasm32-unknown-unknown`
- `wasm-bindgen-cli`, **à la version exacte du `Cargo.lock`** — sinon les liaisons générées sont incompatibles :
  ```bash
  cargo install wasm-bindgen-cli --version 0.2.126 --locked
  ```

## 🚀 Installation et lancement en développement

Le moteur de combat doit être compilé en WebAssembly **avant** d'installer les dépendances : `moteur_wasm` est déclaré comme dépendance npm locale (`file:moteur_wasm/pkg`), le paquet doit donc exister au moment du `npm install`.

```bash
npm run wasm
```

```bash
npm install
```

```bash
npm run dev
```

L'application est ensuite accessible sur `http://localhost:5173`.

> ⚠️ **Après toute modification du code Rust (`moteur_wasm/src/*.rs`), relancez `npm run wasm`.** Ce script enchaîne le build Rust, la génération des liaisons et la purge de `node_modules/.vite` — sans cette dernière, Vite continue de servir l'ancien moteur depuis son cache de pré-bundling, et le HMR ne recharge jamais le binaire `.wasm`. Aucun `npm install` n'est nécessaire ensuite.

> ℹ️ `npm run wasm` reproduit ce que faisait `wasm-pack build --target web`, à l'étape `wasm-opt` près — compensée par le profil `[profile.release]` de `moteur_wasm/Cargo.toml`.

### Variables d'environnement

La sauvegarde cloud et la protection anti-abus nécessitent un fichier `.env.local` (non commité) :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TURNSTILE_SITE_KEY=...
```

⚠️ Sans ces variables, `npm run dev` **démarre normalement** — c'est la page qui casse au chargement (écran blanc + erreur console), `supabaseClient.ts` créant son client au niveau module. L'erreur n'apparaîtra jamais dans le terminal.

## 📦 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run wasm` | Compile le moteur Rust → WebAssembly et purge le cache Vite |
| `npm run dev` | Lance le serveur de développement Vite |
| `npm run build` | Vérifie les types (`tsc -b`) puis génère le build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | Analyse le code avec ESLint |
| `npm test` | Lance la suite Vitest (une passe, pas de mode watch) |

## 📁 Structure du projet

```
tour-des-pactes/
├── REGLES.md                 # Règles du jeu, lisibles et rangées par catégorie
│
├── moteur_wasm/              # Moteur de combat en Rust (source de vérité des calculs)
│   └── src/
│       ├── lib.rs            # Bindings wasm-bindgen (jouer_tour, get_donnees_etages)
│       ├── entite.rs         # Structs Entite / StructureEtage, miroir de src/types.ts
│       ├── combat.rs         # Calculs purs : dégâts, combo, esquive
│       └── boss_data.rs      # Données des 12 étages, monstres et Gardiens
│
├── src/
│   ├── components/           # Écrans et composants de rendu uniquement
│   ├── hooks/
│   │   ├── useGameState.ts   # Le cerveau de l'app : état persistant + logique métier
│   │   ├── useSauvegardeCloud.ts
│   │   ├── useCombatResume.ts
│   │   └── useLocalStorage.ts
│   ├── utils/                # Fonctions pures, un fichier = un domaine
│   │   ├── pactes.ts         # PACTES_REGISTRY : source unique de vérité des Pactes
│   │   ├── synergies.ts      # SYNERGIES_REGISTRY
│   │   ├── succes.ts         # Registre des succès, généré depuis une table de séries
│   │   ├── combat.ts         # Actions des monstres, miroirs TS des calculs du moteur
│   │   └── *.test.ts         # Tests co-localisés (fonctions pures, sans JSX/WASM/DOM)
│   ├── types.ts              # Types partagés, miroir de entite.rs
│   └── App.tsx               # Orchestration des écrans
│
├── supabase/migrations/      # Schéma SQL, déployé automatiquement sur `main`
├── outils/sprites/           # Feuilles de sprites générées par script (voir plus bas)
└── public/
    ├── sprites/              # Feuilles de sprites pixel art, par personnage
    └── images/               # Illustrations des cinématiques de Gardiens
```

## 🧩 Étendre le jeu

- **Nouveau Pacte** : tout est centralisé dans `PACTES_REGISTRY` (`src/utils/pactes.ts`). Ajouter une entrée suffit à l'activer partout (effets, badges d'inventaire, cinématique).
- **Nouvel étage** : ajouter `get_etage_xxx()` dans `boss_data.rs` et l'enregistrer dans `get_tous_les_etages()`, en réutilisant les helpers existants plutôt que des littéraux dupliqués.
- **Nouvelle propriété sur une entité** : elle doit exister **des deux côtés** (`entite.rs` en snake_case, `types.ts` en camelCase) — la conversion se fait via `#[serde(rename_all = "camelCase")]`.
- **Sprites générés** : certaines feuilles ne viennent pas d'un pack tiers, elles sont dessinées frame par frame par un script (`outils/sprites/`, sans aucune dépendance npm). Ne jamais retoucher ces PNG à la main : la prochaine exécution du script les écrase.

Conventions : **tout est en français** (variables, fonctions, composants, commentaires), l'anglais restant réservé aux mots-clés techniques.

## 💾 Sauvegardes

La progression est stockée sous des clés préfixées `tdp_` dans le `localStorage`, qui reste la **source de vérité immédiate**. Un instantané est ensuite poussé vers Supabase de façon asynchrone, identifié par une session anonyme — aucun compte ni mot de passe côté joueur.

Un numéro de version (`APP_VERSION`, dans `src/utils/versionApp.ts`) purge automatiquement les sauvegardes locales devenues incompatibles, et fait rejeter les instantanés cloud d'une autre version.
