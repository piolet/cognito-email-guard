<script lang="ts">
    import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
    import { goto } from '$app/navigation';

    // États du formulaire
    let step: 'request' | 'confirm' = 'request';
    let email = '';
    let code = '';
    let newPassword = '';
    let confirmPassword = '';
    let loading = false;
    let error = '';
    let success = '';

    /**
     * Étape 1 : Demander l'envoi du code de réinitialisation
     */
    async function handleRequestReset(e: Event) {
        e.preventDefault();
        loading = true;
        error = '';
        success = '';

        try {
            const output = await resetPassword({ username: email });

            console.log('Reset password output:', output);

            // Cognito envoie un code par email
            success = `Un code de vérification a été envoyé à ${email}`;
            step = 'confirm';

            // Log pour debug
            console.log('Code delivery:', output.nextStep.codeDeliveryDetails);
        } catch (err: any) {
            console.error('Error requesting password reset:', err);
            error = err.message || 'Erreur lors de la demande de réinitialisation';
        } finally {
            loading = false;
        }
    }

    /**
     * Étape 2 : Confirmer avec le code et définir le nouveau mot de passe
     */
    async function handleConfirmReset(e: Event) {
        e.preventDefault();
        loading = true;
        error = '';
        success = '';

        // Validation
        if (newPassword !== confirmPassword) {
            error = 'Les mots de passe ne correspondent pas';
            loading = false;
            return;
        }

        if (newPassword.length < 8) {
            error = 'Le mot de passe doit contenir au moins 8 caractères';
            loading = false;
            return;
        }

        try {
            await confirmResetPassword({
                username: email,
                confirmationCode: code,
                newPassword: newPassword
            });

            success = 'Mot de passe réinitialisé avec succès !';

            // Rediriger vers la page de login après 2 secondes
            setTimeout(() => {
                goto('/login');
            }, 2000);
        } catch (err: any) {
            console.error('Error confirming password reset:', err);

            // Messages d'erreur spécifiques
            if (err.name === 'CodeMismatchException') {
                error = 'Code invalide. Veuillez vérifier le code reçu par email.';
            } else if (err.name === 'ExpiredCodeException') {
                error = 'Le code a expiré. Veuillez demander un nouveau code.';
            } else if (err.name === 'InvalidPasswordException') {
                error = 'Le mot de passe ne respecte pas les critères requis.';
            } else {
                error = err.message || 'Erreur lors de la réinitialisation';
            }
        } finally {
            loading = false;
        }
    }

    /**
     * Revenir à l'étape 1
     */
    function backToRequest() {
        step = 'request';
        code = '';
        newPassword = '';
        confirmPassword = '';
        error = '';
        success = '';
    }
</script>

<div class="container">
    <h1>Mot de passe oublié</h1>

    {#if success}
        <div class="alert success">{success}</div>
    {/if}

    {#if error}
        <div class="alert error">{error}</div>
    {/if}

    {#if step === 'request'}
        <!-- Étape 1 : Demander le code -->
        <p class="description">
            Entrez votre adresse email pour recevoir un code de réinitialisation.
        </p>

        <form on:submit={handleRequestReset}>
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

            <button type="submit" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </button>
        </form>

        <div class="links">
            <a href="/login">Retour à la connexion</a>
        </div>
    {:else}
        <!-- Étape 2 : Confirmer avec le code -->
        <p class="description">
            Un code a été envoyé à <strong>{email}</strong>.
            Entrez ce code et choisissez un nouveau mot de passe.
        </p>

        <form on:submit={handleConfirmReset}>
            <div class="field">
                <label for="code">Code de vérification</label>
                <input
                        id="code"
                        type="text"
                        bind:value={code}
                        placeholder="123456"
                        required
                        disabled={loading}
                        maxlength="6"
                />
                <small>Le code reçu par email (6 chiffres)</small>
            </div>

            <div class="field">
                <label for="newPassword">Nouveau mot de passe</label>
                <input
                        id="newPassword"
                        type="password"
                        bind:value={newPassword}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        minlength="8"
                />
                <small>Minimum 8 caractères</small>
            </div>

            <div class="field">
                <label for="confirmPassword">Confirmer le mot de passe</label>
                <input
                        id="confirmPassword"
                        type="password"
                        bind:value={confirmPassword}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        minlength="8"
                />
            </div>

            <button type="submit" disabled={loading}>
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>
        </form>

        <div class="links">
            <button class="link-button" on:click={backToRequest} disabled={loading}>
                Renvoyer un code
            </button>
            <span class="separator">•</span>
            <a href="/login">Retour à la connexion</a>
        </div>
    {/if}
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
        margin: 0 0 10px 0;
        font-size: 24px;
        color: #333;
    }

    .description {
        color: #666;
        margin-bottom: 25px;
        line-height: 1.5;
    }

    .alert {
        padding: 12px 15px;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 14px;
    }

    .alert.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .alert.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }

    .field {
        margin-bottom: 20px;
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

    small {
        display: block;
        margin-top: 5px;
        color: #666;
        font-size: 13px;
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

    .links {
        margin-top: 20px;
        text-align: center;
        font-size: 14px;
    }

    .links a {
        color: #0066cc;
        text-decoration: none;
    }

    .links a:hover {
        text-decoration: underline;
    }

    .link-button {
        background: none;
        border: none;
        color: #0066cc;
        cursor: pointer;
        padding: 0;
        font-size: 14px;
        text-decoration: none;
    }

    .link-button:hover:not(:disabled) {
        text-decoration: underline;
    }

    .link-button:disabled {
        color: #999;
        cursor: not-allowed;
    }

    .separator {
        margin: 0 10px;
        color: #999;
    }
</style>