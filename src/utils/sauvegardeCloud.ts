// src/utils/sauvegardeCloud.ts
// Miroir asynchrone de l'état persistant du joueur vers Supabase. localStorage reste la source de
// vérité immédiate (voir useLocalStorage.ts) ; ce module ne fait que pousser/tirer un instantané
// JSON de ce qui s'y trouve déjà, identifié par un utilisateur Supabase anonyme.
import { supabase } from './supabaseClient';
import { obtenirTokenTurnstile } from './turnstile';

// Clés localStorage gérées par useGameState.ts (progression de run + méta-progression + stats de
// run) à synchroniser. Exclut volontairement `tdp_version` (détail d'implémentation purement
// local) et les clés `tdp_c_*`/`tdp_active_combat_key` de useCombatResume.ts, écrites à chaque
// tick de combat non pausé — trop bavard et purement éphémère (reprise de combat après un refresh).
const CLES_SYNCHRONISEES = [
    'tdp_pactes_debloques',
    'tdp_pactes_equipes',
    'tdp_ecran',
    'tdp_liste_etages',
    'tdp_joueur',
    'tdp_index_etage',
    'tdp_index_salle',
    'tdp_historique_logs',
    'tdp_victoire',
    'tdp_combat_pacte',
    'tdp_type_pacte',
    'tdp_logs_mort',
    'tdp_combat_megaboss',
    'tdp_monstre_megaboss',
    'tdp_repos_visites',
    'tdp_choix_repos_actifs',
    'tdp_synergies_decouvertes',
    'tdp_tuto_intro_fait',
    'tdp_monstre_tuto',
    'tdp_a_pacte_chat',
    'tdp_monstres_tues',
    'tdp_competences',
    'tdp_xp_total',
    'tdp_bestiaire',
    'tdp_a_connu_buff',
    'tdp_tuto_vues',
    'tdp_pactes_vus',
    'tdp_premiere_partie_faite',
    'tdp_monstres_tues_run',
    'tdp_pactes_debloques_run',
    'tdp_degats_infliges_run',
    'tdp_degats_bloques_run',
    'tdp_degats_esquives_run',
    'tdp_etage_record',
    'tdp_stats_derniere_run',
] as const;

type SnapshotSauvegarde = Record<string, unknown>;

export function lireSnapshotLocal(): SnapshotSauvegarde {
    const snapshot: SnapshotSauvegarde = {};
    for (const cle of CLES_SYNCHRONISEES) {
        const valeur = window.localStorage.getItem(cle);
        if (valeur === null) continue;
        try {
            snapshot[cle] = JSON.parse(valeur);
        } catch {
            // Valeur corrompue : on l'ignore plutôt que de faire planter toute la synchro.
        }
    }
    return snapshot;
}

export function ecrireSnapshotLocal(snapshot: SnapshotSauvegarde) {
    for (const cle of CLES_SYNCHRONISEES) {
        if (cle in snapshot) {
            window.localStorage.setItem(cle, JSON.stringify(snapshot[cle]));
        }
    }
}

// Réutilise la session Supabase existante (persistée par supabase-js dans son propre coin de
// localStorage) ou en crée une nouvelle, anonyme — aucun compte/mot de passe requis côté joueur.
// Le jeton Turnstile n'est demandé que lors de la toute première création de session par
// navigateur (jamais au retour d'un joueur déjà connu), et son absence/échec ne bloque pas la
// tentative — Supabase la rejettera lui-même si la protection captcha est active côté projet.
export async function assurerSessionAnonyme(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user.id;

    let captchaToken: string | undefined;
    try {
        captchaToken = await obtenirTokenTurnstile();
    } catch (error) {
        console.error("Vérification Turnstile indisponible:", error);
    }

    const { data, error } = await supabase.auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined
    );
    if (error) {
        console.error("Impossible de créer une session Supabase anonyme:", error);
        return null;
    }
    return data.user?.id ?? null;
}

export async function pousserSauvegarde(userId: string, snapshot: SnapshotSauvegarde) {
    const { error } = await supabase
        .from('sauvegardes')
        .upsert({ user_id: userId, donnees: snapshot, mis_a_jour_le: new Date().toISOString() });
    if (error) console.error("Erreur d'envoi de la sauvegarde cloud:", error);
}

export async function tirerSauvegarde(userId: string): Promise<SnapshotSauvegarde | null> {
    const { data, error } = await supabase
        .from('sauvegardes')
        .select('donnees')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        console.error("Erreur de lecture de la sauvegarde cloud:", error);
        return null;
    }
    return (data?.donnees as SnapshotSauvegarde | undefined) ?? null;
}
