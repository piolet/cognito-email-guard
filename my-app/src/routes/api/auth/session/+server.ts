// src/routes/api/auth/session/+server.js
import { json } from '@sveltejs/kit';

type CookieOptions = {
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
}
/**
 * POST - Stocker les tokens dans des cookies httpOnly
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, cookies }) {
    try {
        const { accessToken, idToken, refreshToken } = await request.json();

        // Validation basique
        if (!accessToken || !idToken) {
            return json(
                { success: false, error: 'Tokens manquants' },
                { status: 400 }
            );
        }

        // Options de cookies sécurisées
        const cookieOptions = {
            path: '/',
            httpOnly: true, // Inaccessible au JavaScript client (protection XSS)
            secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en prod
            sameSite: 'lax' // Protection CSRF
        } as CookieOptions;

        // Stocker l'access token (courte durée - 1 heure)
        cookies.set('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 60 * 60 // 1 heure en secondes
        });

        // Stocker l'id token (courte durée - 1 heure)
        cookies.set('idToken', idToken, {
            ...cookieOptions,
            maxAge: 60 * 60 // 1 heure
        });

        // Stocker le refresh token si présent (longue durée - 30 jours)
        if (refreshToken) {
            cookies.set('refreshToken', refreshToken, {
                ...cookieOptions,
                maxAge: 60 * 60 * 24 * 30 // 30 jours
            });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Erreur lors du stockage des tokens:', error);
        return json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Supprimer tous les cookies d'authentification
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ cookies }) {
    try {
        // Supprimer tous les cookies d'auth
        cookies.delete('accessToken', { path: '/' });
        cookies.delete('idToken', { path: '/' });
        cookies.delete('refreshToken', { path: '/' });

        return json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression des tokens:', error);
        return json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * GET - Vérifier si l'utilisateur est authentifié
 * Optionnel : utile pour des checks côté client
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ cookies }) {
    const accessToken = cookies.get('accessToken');
    const idToken = cookies.get('idToken');

    if (accessToken && idToken) {
        try {
            // Décoder le idToken pour obtenir les infos utilisateur
            const payload = JSON.parse(atob(idToken.split('.')[1]));

            // Vérifier si le token n'est pas expiré
            const isExpired = payload.exp * 1000 <= Date.now();

            if (!isExpired) {
                return json({
                    authenticated: true,
                    user: {
                        email: payload.email,
                        sub: payload.sub,
                        // Ajoutez d'autres champs selon vos besoins
                    }
                });
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
        }
    }

    return json({ authenticated: false, user: null });
}