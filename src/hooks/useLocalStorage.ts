// src/hooks/useLocalStorage.ts
import { useState } from 'react';

// NOUVEAU : Modifie cette constante (ex: "1.1") quand tu changes tes structures de données (Entite, Ecran...)
// Cela forcera le nettoyage automatique des sauvegardes obsolètes chez les joueurs.
const APP_VERSION = "1.0";

try {
    if (window.localStorage.getItem('tdp_version') !== APP_VERSION) {
        Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('tdp_')) {
                window.localStorage.removeItem(key);
            }
        });
        window.localStorage.setItem('tdp_version', APP_VERSION);
        console.warn("Mise à jour détectée : Les sauvegardes locales ont été purgées pour éviter les conflits.");
    }
} catch (error) {
    console.error("Erreur lors de la vérification de la version du cache:", error);
}

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error("Erreur de lecture LocalStorage:", error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        // CORRECTION : On utilise l'état précédent (prev) garanti par React pour ne rater aucune mise à jour en rafale
        setStoredValue((prev) => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error("Erreur d'écriture LocalStorage:", error);
            }
            return valueToStore;
        });
    };

    return [storedValue, setValue] as const;
}