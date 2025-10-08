<script lang="ts">
    import { authStore } from "$lib/store/authStore";

    import { Amplify, type ResourcesConfig } from 'aws-amplify';
    import {
        type SignUpInput,
        signUp,
        confirmSignUp,
        signIn,
        fetchAuthSession,
        signOut,
        resendSignUpCode
    } from 'aws-amplify/auth';
    import {goto} from "$app/navigation";

    function log(msg, ...args) {
        output.textContent += msg + ' ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
    }

    const onLogin = async (e: Event) => {
        e.preventDefault()
        const data = new FormData(e.target as HTMLFormElement);
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        const {success} = await authStore.login(email, password);
        console.log(email, password, success);

        if (success) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirectTo') || '/';

            log('Login succeeded')
            console.log('Redirecting to', redirectTo);
            await goto(redirectTo)
            console.log('Redirected');
        } else {
            log('Login failed')
        }
        // try {
        //     const input: SignUpInput = {
        //         username: email,     // côté Amplify, "username" = identifiant ; on met l'email
        //         password,
        //         options: {
        //             authFlowType: 'USER_PASSWORD_AUTH',   // 👈 important pour User Migration
        //             userAttributes: { email } // important si ton pool vérifie l'email
        //         }
        //     };
        //     const res = await signIn(input);
        //     log('Connexion OK. Étape suivante:', res.nextStep);
        //
        //     // get params from URL redirectTo
        //     const urlParams = new URLSearchParams(window.location.search);
        //     const redirectTo = urlParams.get('redirectTo') || '/';
        //
        //     console.log('Redirecting to', redirectTo);
        //     await goto(redirectTo)
        //     console.log('Redirected');
        // } catch (err) {
        //     console.log('erreur', err);
        //     log('Erreur connexion:', { message: err?.message });
        // }
    }

    // ⚠️ Remplace par tes valeurs
    const amplifyConfig: ResourcesConfig = {
        Auth: {
            Cognito: {
                userPoolId: "eu-west-3_4BacGSrqU", // ton User Pool ID
                userPoolClientId: '6f4slbdfishgmv4kc1hj15etjv',
                region: 'eu-west-3'
            }
        }
    } as ResourcesConfig;
    Amplify.configure(amplifyConfig);

    let output: HTMLPreElement
    // const userPool = new CognitoUserPool(poolData);

    // Login
    // document.getElementById("login-form")
    //     .addEventListener("submit", async (e) => {
    //         e.preventDefault()
    //         const email = document.getElementById("email").value;
    //         const password = document.getElementById("password").value;
    //
    //         console.log(email, password);
    //
    //         try {
    //             const res = await signIn({
    //                 username: email,
    //                 password,
    //                 options: {
    //                     authFlowType: 'USER_PASSWORD_AUTH'   // 👈 important pour User Migration
    //                 }
    //             });
    //             log('Connexion OK. Étape suivante:', res.nextStep);
    //         } catch (err) {
    //             console.log('erreur', err);
    //             log('Erreur connexion:', { message: err?.message });
    //         }
    //
    //         // const authDetails = new AuthenticationDetails({
    //         //     Username: email,
    //         //     Password: password
    //         // });
    //
    //         // const user = new CognitoUser({ Username: email, Pool: userPool });
    //         //
    //         // user.authenticateUser(authDetails, {
    //         //     onSuccess: (result) => {
    //         //         log("Connexion OK");
    //         //         log("ID Token: " + result.getIdToken().getJwtToken());
    //         //     },
    //         //     onFailure: (err) => {
    //         //         log("Erreur login: " + (err.message || JSON.stringify(err)));
    //         //     }
    //         // });
    //     });
    //
    // // Signup
    // document.getElementById("signup-form")
    //     .addEventListener("submit", async (e) => {
    //         e.preventDefault();
    //         const email = document.getElementById("signup-email").value;
    //         const password = document.getElementById("signup-password").value;
    //
    //
    //         console.log(email, password);
    //         try {
    //             const res = await signUp({
    //                 username: email,     // côté Amplify, "username" = identifiant ; on met l'email
    //                 password,
    //                 options: {
    //                     userAttributes: { email } // important si ton pool vérifie l'email
    //                 }
    //             });
    //             log('Inscription OK. Étape suivante:', res.nextStep);
    //         } catch (err) {
    //             console.log('erreur', err);
    //             log('Erreur inscription:', { message: err?.message });
    //         }
    //         // userPool.signUp(email, password, [], null, (err, result) => {
    //         //     if (err) {
    //         //         log("Erreur signup: " + (err.message || JSON.stringify(err)));
    //         //         return;
    //         //     }
    //         //     log("Inscription OK: " + result.user.getUsername());
    //         // });
    //     });
    //
    // document.getElementById('resend-form')
    //     .addEventListener('submit', async (e) => {
    //         e.preventDefault();
    //         const email = document.getElementById('rs-email').value.trim();
    //         try {
    //             const res = await resendSignUpCode({ username: email });
    //             log('Code renvoyé avec succès:', res);
    //         } catch (err) {
    //             log('Erreur renvoi code:', { message: err?.message });
    //         }
    //     });
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<h1>Login Cognito</h1>

<form onsubmit={onLogin}>
    <label for="email">Email :</label>
    <input type="email" name="email" required><br>
    <label for="password">Mot de passe :</label>
    <input type="password" name="password" required><br>
    <button type="submit">Se connecter</button>
</form>

<pre bind:this={output} id="output"></pre>
