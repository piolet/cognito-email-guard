// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { signIn, signOut, getCurrentUser, type GetCurrentUserOutput } from 'aws-amplify/auth';
import { goto } from '$app/navigation';
import { syncTokensToCookies, clearTokensFromCookies } from '$lib/utils/authSync';
import {configureAmplify} from "$lib/config/amplifyConfig";

function createAuthStore() {
    const { subscribe, set, update } = writable<{user: GetCurrentUserOutput | null, loading: boolean}>({
        user: null,
        loading: true
    });

    configureAmplify()

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
                console.log('Logging out...');
                await signOut();

                console.log('Clearing tokens from cookies...');
                // Supprimer les cookies
                await clearTokensFromCookies();

                console.log('Resetting auth store...');
                set({ user: null, loading: false });
                await goto('/');
            } catch (error) {
                console.error('Logout error:', error);
            }
        },

        async requestPasswordReset(username: string) {
            try {
                const { resetPassword } = await import('aws-amplify/auth');
                const output = await resetPassword({ username });

                return {
                    success: true,
                    codeDelivery: output.nextStep.codeDeliveryDetails
                };
            } catch (error: any) {
                console.error('Password reset request error:', error);
                return {
                    success: false,
                    error: error.message || 'Erreur lors de la demande'
                };
            }
        },

        // Réinitialisation du mot de passe - Étape 2 : Confirmer avec le code
        async confirmPasswordReset(username: string, code: string, newPassword: string) {
            try {
                const { confirmResetPassword } = await import('aws-amplify/auth');
                await confirmResetPassword({
                    username,
                    confirmationCode: code,
                    newPassword
                });

                return { success: true };
            } catch (error: any) {
                console.error('Password reset confirmation error:', error);
                return {
                    success: false,
                    error: error.message || 'Erreur lors de la confirmation'
                };
            }
        }
    };
}

export const authStore = createAuthStore();