// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { signIn, signOut, getCurrentUser, type GetCurrentUserOutput } from 'aws-amplify/auth';
import { goto } from '$app/navigation';
import { syncTokensToCookies, clearTokensFromCookies } from '$lib/utils/authSync';

function createAuthStore() {
    const { subscribe, set, update } = writable<{user: GetCurrentUserOutput | null, loading: boolean}>({
        user: null,
        loading: true
    });

    return {
        subscribe,

        // Initialiser l'état d'authentification
        async init() {
            try {
                const user = await getCurrentUser();

                if (user) {
                    // Synchroniser les tokens vers les cookies
                    await syncTokensToCookies();
                    set({ user, loading: false });
                } else {
                    set({ user: null, loading: false });
                }
            } catch (error) {
                console.error('Auth init error:', error);
                set({ user: null, loading: false });
            }
        },

        // Connexion
        async login(username: string, password: string) {
            try {
                update(state => ({ ...state, loading: true }));

                const { isSignedIn } = await signIn({
                    username,
                    password,
                    options: {
                        authFlowType: 'USER_PASSWORD_AUTH',   // 👈 important pour User Migration
                        userAttributes: { email: username } // important si ton pool vérifie l'email
                    }
                });

                if (isSignedIn) {
                    const user = await getCurrentUser();

                    // Synchroniser les tokens vers les cookies
                    await syncTokensToCookies();

                    set({ user, loading: false });
                    return { success: true };
                }

                return { success: false, error: 'Connexion échouée' };
            } catch (error: any) {
                set({ user: null, loading: false });
                return { success: false, error: error.message };
            }
        },

        // Déconnexion
        async logout() {
            try {
                await signOut();

                // Supprimer les cookies
                await clearTokensFromCookies();

                set({ user: null, loading: false });
                await goto('/');
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    };
}

export const authStore = createAuthStore();