// import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION
});

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
    // Récupérer les tokens depuis les cookies
    console.log('Handling request for', event.url.pathname, event.route.id);
    let accessToken = event.cookies.get('accessToken');
    let idToken = event.cookies.get('idToken');
    const refreshToken = event.cookies.get('refreshToken');

    console.log('Tokens:', { accessToken, idToken, refreshToken });
    event.locals.user = null;

    if (accessToken && idToken) {
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            const isExpired = payload.exp * 1000 <= Date.now();

            // Si le token est expiré mais qu'on a un refresh token
            if (isExpired && refreshToken) {
                try {
                    // Rafraîchir les tokens via AWS SDK
                    const command = new InitiateAuthCommand({
                        AuthFlow: 'REFRESH_TOKEN_AUTH',
                        ClientId: process.env.COGNITO_CLIENT_ID,
                        AuthParameters: {
                            REFRESH_TOKEN: refreshToken
                        }
                    });

                    const response = await cognitoClient.send(command);

                    // Mettre à jour les cookies avec les nouveaux tokens
                    accessToken = response.AuthenticationResult.AccessToken;
                    idToken = response.AuthenticationResult.IdToken;

                    event.cookies.set('accessToken', accessToken, {
                        path: '/',
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        maxAge: 60 * 60 // 1 heure
                    });

                    event.cookies.set('idToken', idToken, {
                        path: '/',
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        maxAge: 60 * 60
                    });

                    // Décoder le nouveau token
                    const newPayload = JSON.parse(atob(idToken.split('.')[1]));
                    event.locals.user = {
                        email: newPayload.email,
                        sub: newPayload.sub,
                    };
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    // Supprimer tous les tokens si le refresh échoue
                    event.cookies.delete('accessToken', { path: '/' });
                    event.cookies.delete('idToken', { path: '/' });
                    event.cookies.delete('refreshToken', { path: '/' });
                }
            } else if (!isExpired) {
                // Token valide
                event.locals.user = {
                    email: payload.email,
                    sub: payload.sub,
                };
            } else {
                // Token expiré et pas de refresh token
                event.cookies.delete('accessToken', { path: '/' });
                event.cookies.delete('idToken', { path: '/' });
            }
        } catch (e) {
            console.error('Token validation error:', e);
            event.cookies.delete('accessToken', { path: '/' });
            event.cookies.delete('idToken', { path: '/' });
            event.cookies.delete('refreshToken', { path: '/' });
        }
    }

    console.log('User:', event.locals.user, event.route);
    // Protéger les routes privées
    if (!event.route.id?.startsWith('/(private)'))
        return resolve(event);
    if (!event.locals.user) {
        throw redirect(303, '/login?redirectTo=' + event.url.pathname);
    }

    return resolve(event);
}