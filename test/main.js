import { Amplify } from 'aws-amplify';
import {
    signUp,
    confirmSignUp,
    signIn,
    fetchAuthSession,
    signOut
} from 'aws-amplify/auth';

// ⚠️ Remplace par tes valeurs
const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: "eu-west-3_p6Ohktpw3", // ton User Pool ID
            userPoolClientId: '6c5ivp9rttl45ga4tjl5sbsfnl',
            region: 'eu-west-3'
        }
    }
};
Amplify.configure(amplifyConfig);
// const userPool = new CognitoUserPool(poolData);

function log(msg) {
    document.getElementById("output").textContent += msg + "\n";
}

// Login
document.getElementById("login-form")
    .addEventListener("submit", async (e) => {
        e.preventDefault()
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        console.log(email, password);

        try {
            const res = await signIn({ username: email, password });
            log('Connexion OK. Étape suivante:', res.nextStep);
        } catch (err) {
            console.log('erreur', err);
            log('Erreur connexion:', { message: err?.message });
        }

        // const authDetails = new AuthenticationDetails({
        //     Username: email,
        //     Password: password
        // });

        // const user = new CognitoUser({ Username: email, Pool: userPool });
        //
        // user.authenticateUser(authDetails, {
        //     onSuccess: (result) => {
        //         log("Connexion OK");
        //         log("ID Token: " + result.getIdToken().getJwtToken());
        //     },
        //     onFailure: (err) => {
        //         log("Erreur login: " + (err.message || JSON.stringify(err)));
        //     }
        // });
    });

// Signup
document.getElementById("signup-form")
    .addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;


        console.log(email, password);
        try {
            const res = await signUp({
                username: email,     // côté Amplify, "username" = identifiant ; on met l'email
                password,
                options: {
                    userAttributes: { email } // important si ton pool vérifie l'email
                }
            });
            log('Inscription OK. Étape suivante:', res.nextStep);
        } catch (err) {
            console.log('erreur', err);
            log('Erreur inscription:', { message: err?.message });
        }
        // userPool.signUp(email, password, [], null, (err, result) => {
        //     if (err) {
        //         log("Erreur signup: " + (err.message || JSON.stringify(err)));
        //         return;
        //     }
        //     log("Inscription OK: " + result.user.getUsername());
        // });
    });

document.getElementById('resend-form')
    .addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('rs-email').value.trim();
    try {
        const res = await resendSignUpCode({ username: email });
        log('Code renvoyé avec succès:', res);
    } catch (err) {
        log('Erreur renvoi code:', { message: err?.message });
    }
});