import { describe, it, expect } from 'vitest';
import { CLES_PROFIL, CLES_PROFIL_HARDCORE, cleProfil } from './hardcore';

describe('cleProfil', () => {
    it('laisse la clé intacte en mode normal', () => {
        expect(cleProfil('tdp_xp_total', false)).toBe('tdp_xp_total');
    });

    it('bascule sur le préfixe hardcore', () => {
        expect(cleProfil('tdp_xp_total', true)).toBe('tdp_hc_xp_total');
        expect(cleProfil('tdp_pactes_debloques', true)).toBe('tdp_hc_pactes_debloques');
    });

    // Une collision entre les deux jeux de clés ferait fuiter la progression d'un profil dans
    // l'autre — exactement ce que le mode est censé rendre impossible.
    it('ne produit aucune collision entre les deux profils', () => {
        const toutes = [...CLES_PROFIL, ...CLES_PROFIL_HARDCORE];
        expect(new Set(toutes).size).toBe(toutes.length);
    });

    // La synchro cloud (CLES_SYNCHRONISEES) doit couvrir le profil dormant : sans ça, mourir en
    // hardcore effacerait localement une progression normale que le cloud ne saurait plus restaurer.
    it('expose autant de clés hardcore que de clés de profil', () => {
        expect(CLES_PROFIL_HARDCORE).toHaveLength(CLES_PROFIL.length);
        expect(CLES_PROFIL_HARDCORE.every(cle => cle.startsWith('tdp_hc_'))).toBe(true);
    });
});
