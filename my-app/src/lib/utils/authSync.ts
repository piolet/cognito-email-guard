// src/lib/utils/authSync.js
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Synchronise les tokens d'Amplify (localStorage) vers les cookies (serveur)
 */
export async function syncTokensToCookies() {
    try {
        const session = await fetchAuthSession();

        if (session.tokens) {
            const tokens = {
                accessToken: session.tokens.accessToken.toString(),
                idToken: session.tokens.idToken.toString(),
            };

            // Extraire le refresh token du localStorage
            // Amplify le stocke dans une clé spécifique
            const cognitoKey = Object.keys(localStorage).find(key =>
                key.includes('CognitoIdentityServiceProvider') && key.includes('refreshToken')
            );

            if (cognitoKey) {
                tokens.refreshToken = localStorage.getItem(cognitoKey);
            }

            // Envoyer au serveur pour stockage dans les cookies
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tokens)
            });

            return response.ok;
        }

        return false;
    } catch (error) {
        console.error('Erreur de synchronisation des tokens:', error);
        return false;
    }
}

/**
 * Supprime les tokens des cookies
 */
export async function clearTokensFromCookies() {
    try {
        await fetch('/api/auth/session', {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error('Erreur de suppression des tokens:', error);
        return false;
    }
}