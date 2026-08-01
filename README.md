# 🗼 Tour des Pactes

Un jeu de combat au tour par tour en navigateur : gravissez une tour composée de 6 étages thématiques, affrontez leurs gardiens, et arrachez-leur des **Pactes** — des bonus permanents que vous pourrez équiper lors de vos prochaines ascensions.

La logique de jeu (combat, dégâts, esquive, combos) est écrite en **Rust** et compilée en **WebAssembly**, pilotée par une interface **React**.

## ✨ Concept

- Chaque **étage** est associé à un Pacte (Armure, Esquive, Combo, Vie, Ombre, Temps).
- Vous affrontez 3 monstres puis le Gardien de l'étage.
- Avant le Gardien, un choix s'offre à vous : continuer prudemment, ou provoquer sa **Forme Héroïque** pour tenter de lui arracher son Pacte (plus risqué, plus gratifiant).
- Les Pactes obtenus se **débloquent définitivement** et peuvent être équipés depuis le Hub (jusqu'à 3 Pactes de Niveau I + 1 Pacte de Niveau II) avant de lancer une nouvelle ascension.
- Chaque tour de combat consiste à préparer une séquence de 5 actions (⚔️ Attaque, 🎯 Précise, 🛡️ Défense, 💨 Esquive) qui s'affrontent simultanément à celles du monstre. Enchaîner la même action plusieurs fois déclenche un **combo**.
- La progression (run en cours, pactes débloqués/équipés, préférences d'affichage) est sauvegardée automatiquement dans le `localStorage` du navigateur.

## 🛠️ Stack technique

| Côté | Techno |
|---|---|
| Interface | React 19 + TypeScript + Vite |
| Logique de combat | Rust → WebAssembly (via `wasm-bindgen` / `wasm-pack`) |
| Persistance | `localStorage` (avec versionnement automatique des sauvegardes) |

## 📋 Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (édition 2021)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

## 🚀 Installation et lancement en développement

Le moteur de combat doit être compilé en WebAssembly **avant** de lancer l'interface, car le front-end en dépend directement (`moteur_wasm` est déclaré comme dépendance locale dans `package.json`).

```bash
# 1. Compiler le moteur Rust → WebAssembly
cd moteur_wasm
wasm-pack build --target web
cd ..

# 2. Installer les dépendances front-end
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application est ensuite accessible sur `http://localhost:5173`.

> ⚠️ Après toute modification du code Rust (`moteur_wasm/src/*.rs`), il faut relancer `wasm-pack build --target web` pour régénérer `moteur_wasm/pkg/` avant que les changements soient visibles côté React.

## 📦 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement Vite |
| `npm run build` | Vérifie les types (`tsc -b`) puis génère le build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | Analyse le code avec ESLint |

## 📁 Structure du projet

```
tour-des-pactes/
├── moteur_wasm/            # Moteur de combat en Rust
│   └── src/
│       ├── lib.rs           # Point d'entrée wasm-bindgen (jouer_tour, get_donnees_etages)
│       ├── entite.rs        # Structures de données (Entite, StructureEtage)
│       ├── combat.rs        # Calcul des dégâts, esquive, combos
│       └── boss_data.rs     # Définition des 6 étages, monstres et boss
│
├── src/
│   ├── components/          # Écrans et composants React (Hub, CombatArene, Inventaire...)
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── utils/
│   │   ├── pactes.ts        # PACTES_REGISTRY : source unique de vérité pour tous les Pactes
│   │   └── combat.ts        # Génération des actions de l'IA monstre
│   ├── types.ts              # Types partagés (Entite, StructureEtage, Ecran...)
│   └── App.tsx                # Orchestration des écrans et de l'état global
│
└── public/images/            # Illustrations des cinématiques de boss
```

## 🧩 Ajouter un nouveau Pacte

Toute la définition d'un Pacte (description, effet appliqué au joueur, bonus de repos) est centralisée dans `PACTES_REGISTRY` (`src/utils/pactes.ts`). Ajouter une entrée à cet objet suffit à le rendre disponible partout dans le jeu (application des effets, badges d'inventaire, image de cinématique).

## 💾 Sauvegardes locales

Les données de progression sont stockées sous des clés préfixées par `tdp_` dans le `localStorage`. Un système de version (`APP_VERSION` dans `useLocalStorage.ts`) purge automatiquement les anciennes sauvegardes incompatibles lors d'une mise à jour du jeu.
