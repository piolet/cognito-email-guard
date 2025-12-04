// src/hooks.server.js (ou .ts)
import { redirect } from '@sveltejs/kit';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { PUBLIC_COGNITO_CLIENT_ID, PUBLIC_AWS_REGION } from '$env/static/public'

const cognitoClient = new CognitoIdentityProviderClient({
    region: PUBLIC_AWS_REGION,
    endpoint: 'http://localhost:9229'
});

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // LOGS DE DEBUG
    console.log('🔍 Hook appelé pour:', event.url.pathname);
    console.log('📁 Route ID:', event.route.id);

    // Récupérer les tokens depuis les cookies
    let accessToken = event.cookies.get('accessToken');
    let idToken = event.cookies.get('idToken');
    const refreshToken = event.cookies.get('refreshToken');

    console.log('🍪 Tokens présents:', {
        accessToken: !!accessToken,
        idToken: !!idToken,
        refreshToken: !!refreshToken
    });

    // IMPORTANT : Initialiser locals.user avec la structure attendue par vos services
    event.locals.user = null;

    // Variable pour savoir s'il faut tenter un refresh
    let needsRefresh = false;
    let isExpired = false;

    // Vérifier si les tokens actuels sont valides
    if (accessToken && idToken) {
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            isExpired = payload.exp * 1000 <= Date.now();

            if (isExpired) {
                console.log('⚠️ Tokens expirés');
                needsRefresh = true;
            } else {
                // Tokens valides
                event.locals.user = {
                    id: parseInt(payload.sub) || payload.sub,
                    email: payload.email,
                    sub: payload.sub,
                    token: idToken, // ⭐ Le token pour vos API calls
                    username: payload['cognito:username'],
                    roles: payload['cognito:groups'] || []
                };

                console.log('✅ Tokens valides, utilisateur:', event.locals.user.email);
            }
        } catch (e) {
            console.error('❌ Erreur de décodage du token:', e);
            // Token corrompu, on va tenter un refresh si possible
            needsRefresh = true;
        }
    } else if (refreshToken) {
        // Pas de tokens access/id mais on a un refresh token
        console.log('⚠️ Tokens manquants mais refresh token présent');
        needsRefresh = true;
    }

    // Tenter de rafraîchir les tokens si nécessaire
    if (needsRefresh && refreshToken) {
        try {
            console.log('🔄 Rafraîchissement des tokens...', PUBLIC_COGNITO_CLIENT_ID);

            // Rafraîchir les tokens via AWS SDK
            const command = new InitiateAuthCommand({
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: PUBLIC_COGNITO_CLIENT_ID,
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken
                }
            });

            const response = await cognitoClient.send(command);

            // Vérifier que la réponse contient les tokens
            if (!response.AuthenticationResult?.AccessToken || !response.AuthenticationResult?.IdToken) {
                throw new Error('Tokens manquants dans la réponse');
            }

            // Mettre à jour les tokens
            accessToken = response.AuthenticationResult.AccessToken;
            idToken = response.AuthenticationResult.IdToken;

            // Stocker les nouveaux tokens dans les cookies
            const cookieOptions = {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                maxAge: 60 * 60 // 1 heure
            };

            event.cookies.set('accessToken', accessToken, cookieOptions);
            event.cookies.set('idToken', idToken, cookieOptions);

            // Si un nouveau refresh token est fourni, le mettre à jour aussi
            if (response.AuthenticationResult.RefreshToken) {
                event.cookies.set('refreshToken', response.AuthenticationResult.RefreshToken, {
                    ...cookieOptions,
                    maxAge: 60 * 60 * 24 * 30 // 30 jours
                });
            }

            // Décoder le nouveau token et peupler locals.user
            const newPayload = JSON.parse(atob(idToken.split('.')[1]));

            event.locals.user = {
                id: parseInt(newPayload.sub) || newPayload.sub,
                email: newPayload.email,
                sub: newPayload.sub,
                token: idToken, // ⭐ Le token pour vos API calls
                username: newPayload['cognito:username'],
                roles: newPayload['cognito:groups'] || []
            };

            console.log('✅ Tokens rafraîchis avec succès pour:', event.locals.user.email);
        } catch (refreshError) {
            console.error('❌ Échec du refresh:', refreshError);

            // Supprimer tous les tokens si le refresh échoue
            event.cookies.delete('accessToken', { path: '/' });
            event.cookies.delete('idToken', { path: '/' });
            event.cookies.delete('refreshToken', { path: '/' });

            event.locals.user = null;
        }
    } else if (!refreshToken && (isExpired || (!accessToken && !idToken))) {
        // Pas de refresh token et tokens expirés/manquants -> nettoyer
        console.log('🧹 Nettoyage des tokens expirés sans refresh token');
        event.cookies.delete('accessToken', { path: '/' });
        event.cookies.delete('idToken', { path: '/' });
    }

    // Protéger les routes privées
    console.log('🔐 Vérification route privée:', event.route.id?.startsWith('/(private)'));
    console.log('👤 User connecté:', !!event.locals.user);

    if (!event.route.id?.startsWith('/(private)')) {
        console.log('✅ ACCÈS AUTORISÉ pour:', event.locals.user?.email);
        return resolve(event);
    }
    if (!event.locals.user) {
        console.log('❌ ACCÈS REFUSÉ - Redirection vers /login');
        throw redirect(303, '/login?redirectTo=' + event.url.pathname);
    }

    return resolve(event);
}