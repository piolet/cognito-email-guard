// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { signIn, signOut, getCurrentUser, type GetCurrentUserOutput } from 'aws-amplify/auth';
import { goto } from '$app/navigation';
import { syncTokensToCookies, clearTokensFromCookies } from '$lib/utils/authSync';
import {configureAmplify} from "$lib/config/amplifyConfig";

function createAuthStore() {
    const { subscribe, set, update } = writable<{ user: GetCurrentUserOutput | null; loading: boolean; initialized: boolean }>(
        {
            user: null,
            loading: true,
            initialized: false
        }
    );

    configureAmplify();

    const setState = (next: { user: GetCurrentUserOutput | null; loading: boolean; initialized?: boolean }) => {
        set({ ...next, initialized: next.initialized ?? true });
    };

    return {
        subscribe,

        // Initialiser l'état d'authentification
        async init() {
            console.log('[authStore] init → start');
            try {
                const user = await getCurrentUser();
                console.log('[authStore] getCurrentUser →', user ? user.userId : 'null');

                if (user) {
                    await syncTokensToCookies();
                    console.log('[authStore] tokens synchronisés dans les cookies');
                    setState({ user, loading: false, initialized: true });
                } else {
                    console.log('[authStore] aucun utilisateur courant');
                    setState({ user: null, loading: false, initialized: true });
                }
            } catch (error: any) {
                console.error('[authStore] init error:', error);
                const unauthenticated = error?.name === 'UserNotAuthenticatedException';
                if (unauthenticated) {
                    console.warn('[authStore] init → aucune session active');
                }
                setState({ user: null, loading: false, initialized: true });
            }
        },

        // Connexion
        async login(username: string, password: string) {
            console.log('[authStore] login →', username);
            try {
                update((state) => ({ ...state, loading: true }));

                const { isSignedIn } = await signIn({
                    username,
                    password,
                    options: {
                        authFlowType: 'USER_PASSWORD_AUTH',
                        userAttributes: { email: username }
                    }
                });
                console.log('[authStore] signIn result →', { isSignedIn });

                if (isSignedIn) {
                    const user = await getCurrentUser();
                    console.log('[authStore] user après signIn →', user?.userId);

                    await syncTokensToCookies();
                    console.log('[authStore] tokens synchronisés après login');

                    setState({ user, loading: false, initialized: true });
                    return { success: true };
                }

                console.warn('[authStore] signIn non complété');
                setState({ user: null, loading: false, initialized: true });
                return { success: false, error: 'Connexion échouée' };
            } catch (error: any) {
                console.error('[authStore] login error:', error);
                setState({ user: null, loading: false, initialized: true });
                return { success: false, error: error.message };
            }
        },

        // Déconnexion
        async logout() {
            try {
                console.log('Logging out...');
                await signOut();

                console.log('Clearing tokens from cookies...');
                await clearTokensFromCookies();

                console.log('Resetting auth store...');
                setState({ user: null, loading: false, initialized: true });
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