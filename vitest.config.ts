import { defineConfig } from 'vitest/config';

// Config volontairement distincte de vite.config.ts : les tests ne couvrent que des fonctions
// pures (aucun JSX, aucun WASM, aucun DOM), donc inutile de charger le plugin React ici.
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
    },
});
