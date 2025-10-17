<script lang="ts">
    import { configureAmplify } from '$lib/config/amplifyConfig';
    import { signUp, confirmSignUp, resendSignUpCode, autoSignIn } from 'aws-amplify/auth';
    import { goto } from '$app/navigation';

    // Configuration Amplify
    configureAmplify();

    // États du formulaire
    let step: 'signup' | 'confirm' = $state('signup');
    let email = $state('piolet91@gmail.com');
    let password = $state('One2three');
    let confirmPassword = $state('One2three');
    let firstName = $state('test');
    let lastName = $state('test');
    let userType: 'customer' | 'merchant' = $state('customer'); // Type d'utilisateur
    let cgu = $state(false); // Acceptation des CGU
    let newsletter = $state(false); // Acceptation des CGU
    let confirmationCode = $state('');
    let loading = $state(false);
    let error = $state('');
    let success = $state('');

    /**
     * Étape 1 : Inscription
     */
    async function handleSignup(e: Event) {
        e.preventDefault();
        loading = true;
        error = '';
        success = '';

        // Validation
        if (password !== confirmPassword) {
            error = 'Les mots de passe ne correspondent pas';
            loading = false;
            return;
        }

        if (password.length < 8) {
            error = 'Le mot de passe doit contenir au moins 8 caractères';
            loading = false;
            return;
        }

        try {
            const { isSignUpComplete, userId, nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                        given_name: firstName,
                        family_name: lastName,
                        'custom:userType': userType, // Attribut custom pour le type d'utilisateur
                        'custom:cguAccepted': cgu.toString(), // Attribut custom pour CGU
                        'custom:newsletterSubscribed': newsletter.toString() // Attribut custom pour newsletter
                    },
                    // Auto sign-in après confirmation
                    autoSignIn: true
                }
            });

            console.log('Sign up result:', { isSignUpComplete, userId, nextStep });

            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                success = `Un code de confirmation a été envoyé à ${email}`;
                step = 'confirm';
            } else if (nextStep.signUpStep === 'DONE') {
                success = 'Inscription réussie !';
                // Auto sign-in activé, rediriger
                setTimeout(() => goto('/'), 2000);
            }
        } catch (err: any) {
            console.error('Signup error:', err, err?.name, err?.code);

            // Messages d'erreur personnalisés
            if (err.name === 'UsernameExistsException') {
                error = 'Cet email est déjà utilisé';
            } else if (err.name === 'InvalidPasswordException') {
                error = 'Le mot de passe ne respecte pas les critères requis';
            } else if (err.name === 'InvalidParameterException') {
                error = 'Paramètres invalides. Vérifiez vos informations.';
            } else if (err.message?.includes('CGU_ACCEPTANCE_REQUIRED')) {
                error = 'Vous devez accepter les Conditions Générales d\'Utilisation pour vous inscrire.';
            } else {
                error = err.message || 'Erreur lors de l\'inscription';
            }
        } finally {
            loading = false;
        }
    }

    /**
     * Étape 2 : Confirmation du code
     */
    async function handleConfirm(e: Event) {
        e.preventDefault();
        loading = true;
        error = '';
        success = '';

        try {
            const { isSignUpComplete, nextStep } = await confirmSignUp({
                username: email,
                confirmationCode
            });

            console.log('Confirm result:', { isSignUpComplete, nextStep });

            if (isSignUpComplete) {
                success = 'Inscription confirmée avec succès !';

                // Tenter l'auto sign-in
                try {
                    await autoSignIn();
                    setTimeout(() => goto('/'), 2000);
                } catch (autoSignInError) {
                    // Si l'auto sign-in échoue, rediriger vers login
                    console.error('Auto sign-in failed:', autoSignInError);
                    setTimeout(() => goto('/login'), 2000);
                }
            }
        } catch (err: any) {
            console.error('Confirmation error:', err);

            // Messages d'erreur personnalisés
            if (err.name === 'CodeMismatchException') {
                error = 'Code invalide. Veuillez vérifier le code reçu par email.';
            } else if (err.name === 'ExpiredCodeException') {
                error = 'Le code a expiré. Veuillez demander un nouveau code.';
            } else if (err.name === 'NotAuthorizedException') {
                error = 'Code invalide ou déjà utilisé';
            } else {
                error = err.message || 'Erreur lors de la confirmation';
            }
        } finally {
            loading = false;
        }
    }

    /**
     * Renvoyer le code de confirmation
     */
    async function handleResendCode() {
        loading = true;
        error = '';
        success = '';

        try {
            await resendSignUpCode({ username: email });
            success = `Un nouveau code a été envoyé à ${email}`;
        } catch (err: any) {
            console.error('Resend code error:', err);
            error = err.message || 'Erreur lors du renvoi du code';
        } finally {
            loading = false;
        }
    }

    /**
     * Revenir à l'étape d'inscription
     */
    function backToSignup() {
        step = 'signup';
        confirmationCode = '';
        error = '';
        success = '';
    }
</script>

<div class="container">
    <h1>Créer un compte</h1>

    {#if success}
        <div class="alert success">{success}</div>
    {/if}

    {#if error}
        <div class="alert error">{error}</div>
    {/if}

    {#if step === 'signup'}
        <!-- Étape 1 : Formulaire d'inscription -->
        <form onsubmit={handleSignup}>
            <div class="row">
                <div class="field">
                    <label for="firstName">Prénom</label>
                    <input
                            id="firstName"
                            type="text"
                            bind:value={firstName}
                            placeholder="Jean"
                            required
                            disabled={loading}
                    />
                </div>

                <div class="field">
                    <label for="lastName">Nom</label>
                    <input
                            id="lastName"
                            type="text"
                            bind:value={lastName}
                            placeholder="Dupont"
                            required
                            disabled={loading}
                    />
                </div>
            </div>

            <div class="row">
                <div class="field">
                    <label>
                        <input
                                type="radio"
                                bind:group={userType}
                                value="customer"
                                disabled={loading}
                                checked
                        />
                        Client
                    </label>
                </div>
                <div class="field">
                    <label style="margin-left: 20px;">
                        <input
                                type="radio"
                                bind:group={userType}
                                value="merchant"
                                disabled={loading}
                        />
                        Commerçant
                    </label>
                </div>
            </div>

            <div class="row">
                <div class="field">
                    <label>
                        <input
                                type="checkbox"
                                required={false}
                                bind:checked={cgu}
                                disabled={loading}
                        />
                        J'accepte les <a href="/terms" target="_blank">Conditions Générales d'Utilisation</a>
                    </label>
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <label>
                        <input
                                type="checkbox"
                                required={false}
                                bind:checked={newsletter}
                                disabled={loading}
                        />
                        J'accepte de recevoir des newsletter
                    </label>
                </div>
            </div>



            <div class="field">
                <label for="email">Email</label>
                <input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="jean.dupont@example.com"
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
                        minlength="8"
                />
                <small>Minimum 8 caractères, avec majuscules, minuscules et chiffres</small>
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
                {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
        </form>

        <div class="links">
            Vous avez déjà un compte ? <a href="/login">Se connecter</a>
        </div>
    {:else}
        <!-- Étape 2 : Confirmation du code -->
        <p class="description">
            Un code de confirmation a été envoyé à <strong>{email}</strong>.
            Entrez ce code pour activer votre compte.
        </p>

        <form onsubmit={handleConfirm}>
            <div class="field">
                <label for="confirmationCode">Code de confirmation</label>
                <input
                        id="confirmationCode"
                        type="text"
                        bind:value={confirmationCode}
                        placeholder="123456"
                        required
                        disabled={loading}
                        maxlength="6"
                        autofocus
                />
                <small>Le code reçu par email (6 chiffres)</small>
            </div>

            <button type="submit" disabled={loading}>
                {loading ? 'Confirmation...' : 'Confirmer mon inscription'}
            </button>
        </form>

        <div class="links">
            <button class="link-button" onclick={handleResendCode} disabled={loading}>
                Renvoyer le code
            </button>
            <span class="separator">•</span>
            <button class="link-button" onclick={backToSignup} disabled={loading}>
                Modifier mes informations
            </button>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 500px;
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

    .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 18px;
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
        margin-top: 10px;
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
        color: #666;
    }

    .links a {
        color: #0066cc;
        text-decoration: none;
        font-weight: 500;
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

    @media (max-width: 600px) {
        .row {
            grid-template-columns: 1fr;
        }
    }
</style>