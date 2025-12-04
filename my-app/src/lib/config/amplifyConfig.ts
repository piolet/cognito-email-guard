// src/lib/config/amplifyConfig.ts
import { Amplify, type ResourcesConfig } from 'aws-amplify';
import { PUBLIC_DEV, PUBLIC_AWS_REGION, PUBLIC_COGNITO_CLIENT_ID, PUBLIC_COGNITO_USER_POOL_ID } from '$env/static/public'

// Variable pour éviter de configurer plusieurs fois
let isConfigured = false;

// Détection de l'environnement de développement
const isDev = PUBLIC_DEV === 'true';
const cognitoLocalEndpoint = 'http://localhost:9229'; // Port par défaut de cognito-local
const cognitoLocalOverrides = isDev
    ? {
        userPoolEndpoint: cognitoLocalEndpoint,
        dangerouslyConnectToHttpEndpointForTesting: true
    }
    : undefined;

export const amplifyConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            userPoolId: PUBLIC_COGNITO_USER_POOL_ID,
            userPoolClientId: PUBLIC_COGNITO_CLIENT_ID,
            region: PUBLIC_AWS_REGION,
            ...cognitoLocalOverrides,
            loginWith: {
                oauth: {
                    domain: '', // Pas nécessaire si vous n'utilisez pas OAuth/Hosted UI
                    scopes: [
                        'openid',
                        'email',
                        'profile',
                        'aws.cognito.signin.user.admin' // ← Pour accéder aux attributs custom
                    ],
                    // redirectSignIn: ['http://localhost:5173/'],
                    // redirectSignOut: ['http://localhost:5173/'],
                    responseType: 'code' // ou 'token'
                }
            }
        }
    }
} as ResourcesConfig;

/**
 * Configure Amplify (idempotent - peut être appelé plusieurs fois sans problème)
 */
export function configureAmplify() {
    if (!isConfigured) {
        Amplify.configure(amplifyConfig);
        isConfigured = true;
        console.log(`✅ Amplify configuré ${isDev ? '(cognito-local)' : '(AWS Cognito)'}`);
    }
}

// Configuration automatique au chargement du module
configureAmplify();