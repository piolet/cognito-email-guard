<script lang="ts">
    import { authStore } from '$lib/store/authStore';
    import { Amplify, type ResourcesConfig } from 'aws-amplify';
    import { goto } from '$app/navigation';

    const amplifyConfig: ResourcesConfig = {
        Auth: {
            Cognito: {
                userPoolId: 'eu-west-3_4BacGSrqU',
                userPoolClientId: '6f4slbdfishgmv4kc1hj15etjv',
                region: 'eu-west-3'
            }
        }
    } as ResourcesConfig;
    Amplify.configure(amplifyConfig);

    let email = '';
    let password = '';
    let loading = false;
    let error = '';

    async function onLogin(e: Event) {
        e.preventDefault();
        loading = true;
        error = '';

        const { success, error: loginError } = await authStore.login(email, password);

        if (success) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirectTo') || '/';

            console.log('Login succeeded, redirecting to', redirectTo);
            await goto(redirectTo);
        } else {
            error = loginError || 'Échec de la connexion';
            loading = false;
        }
    }
</script>

<div class="container">
    <h1>Connexion</h1>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    <form on:submit={onLogin}>
        <div class="field">
            <label for="email">Email</label>
            <input
                    id="email"
                    type="email"
                    bind:value={email}
                    placeholder="votre@email.com"
                    required
                    disabled={loading}
            />
        </div>

        <div class="field">
            <label for="password">Mot de passe</label>
            <input
                    id="password"
                    type="password"
                    bind:value={password}
                    placeholder="••••••••"
                    required
                    disabled={loading}
            />
        </div>

        <div class="forgot-password">
            <a href="/lost-login">Mot de passe oublié ?</a>
        </div>

        <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
        </button>
    </form>

    <div class="signup-link">
        Pas encore de compte ? <a href="/signup">S'inscrire</a>
    </div>
</div>

<style>
    .container {
        max-width: 450px;
        margin: 50px auto;
        padding: 30px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    h1 {
        margin: 0 0 25px 0;
        font-size: 24px;
        color: #333;
        text-align: center;
    }

    .error {
        background: #f8d7da;
        color: #721c24;
        padding: 12px 15px;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 14px;
        border: 1px solid #f5c6cb;
    }

    .field {
        margin-bottom: 18px;
    }

    label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
        font-size: 14px;
    }

    input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 15px;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }

    input:focus {
        outline: none;
        border-color: #0066cc;
    }

    input:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
    }

    .forgot-password {
        text-align: right;
        margin-bottom: 20px;
    }

    .forgot-password a {
        color: #0066cc;
        text-decoration: none;
        font-size: 14px;
    }

    .forgot-password a:hover {
        text-decoration: underline;
    }

    button[type='submit'] {
        width: 100%;
        padding: 12px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: background 0.2s;
    }

    button[type='submit']:hover:not(:disabled) {
        background: #0052a3;
    }

    button[type='submit']:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .signup-link {
        margin-top: 20px;
        text-align: center;
        font-size: 14px;
        color: #666;
    }

    .signup-link a {
        color: #0066cc;
        text-decoration: none;
        font-weight: 500;
    }

    .signup-link a:hover {
        text-decoration: underline;
    }
</style>