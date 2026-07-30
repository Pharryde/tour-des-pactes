// src/hooks/useLocalStorage.ts
import { useState } from 'react';

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