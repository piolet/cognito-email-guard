<script lang="ts">
    import { onMount } from 'svelte';
    import { configureAmplify } from '$lib/config/amplifyConfig';
    import { fetchUserAttributes, updateUserAttributes, confirmUserAttribute, fetchAuthSession } from 'aws-amplify/auth';
    import { CognitoIdentityProviderClient, GetUserAttributeVerificationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
    import { PUBLIC_AWS_REGION } from '$env/static/public';
    import { authStore } from '$lib/store/authStore';

    // Configuration Amplify (idempotent)
    configureAmplify();

    const logout = async (e: Event): Promise<void> => {
        e.preventDefault();
        await authStore.logout();
    };

    // Etats généraux
    let loadingProfile = $state(true);
    let globalError = $state('');

    // Attributs utilisateur (pré-remplis)
    let firstName = $state('');
    let lastName = $state('');
    let email = $state('');
    let phone = $state('');

    // Formulaire Noms
    let namesLoading = $state(false);
    let namesError = $state('');
    let namesSuccess = $state('');

    // Formulaire Email
    let emailInput = $state('');
    let emailLoading = $state(false);
    let emailError = $state('');
    let emailSuccess = $state('');
    let emailStep: 'edit' | 'verify' = $state('edit');
    let emailCode = $state('');

    // Formulaire Téléphone
    let phoneInput = $state('');
    let phoneLoading = $state(false);
    let phoneError = $state('');
    let phoneSuccess = $state('');
    let phoneStep: 'edit' | 'verify' = $state('edit');
    let phoneCode = $state('');

    onMount(async () => {
        try {
            const attrs = await fetchUserAttributes();
            firstName = attrs.given_name || '';
            lastName = attrs.family_name || '';
            email = attrs.email || '';
            phone = attrs.phone_number || '';

            // Pré-remplir les champs d'édition
            emailInput = email;
            phoneInput = phone;
        } catch (err: any) {
            console.error('Erreur fetchUserAttributes:', err);
            globalError = err?.message || 'Impossible de charger vos informations.';
        } finally {
            loadingProfile = false;
        }
    });

    async function handleUpdateNames(e: Event) {
        e.preventDefault();
        namesLoading = true;
        namesError = '';
        namesSuccess = '';
        try {
            await updateUserAttributes({
                userAttributes: {
                    given_name: firstName,
                    family_name: lastName
                }
            });
            namesSuccess = 'Nom et prénom mis à jour.';
        } catch (err: any) {
            console.error('Update names error:', err);
            namesError = err?.message || 'Erreur lors de la mise à jour des noms.';
        } finally {
            namesLoading = false;
        }
    }

    async function handleUpdateEmail(e: Event) {
        e.preventDefault();
        emailLoading = true;
        emailError = '';
        emailSuccess = '';
        try {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
                emailError = 'Email invalide';
                return;
            }
            await updateUserAttributes({ userAttributes: { email: emailInput } });
            // Cognito envoie normalement un code automatiquement après mise à jour de l'attribut.
            emailStep = 'verify';
            emailSuccess = `Un code a été envoyé à ${emailInput}.`;
        } catch (err: any) {
            console.error('Update email error:', err);
            emailError = err?.message || 'Erreur lors de la mise à jour de l\'email.';
        } finally {
            emailLoading = false;
        }
    }

    async function handleConfirmEmail(e: Event) {
        e.preventDefault();
        emailLoading = true;
        emailError = '';
        emailSuccess = '';
        try {
            await confirmUserAttribute({ userAttributeKey: 'email', confirmationCode: emailCode });
            emailSuccess = 'Email vérifié et mis à jour.';
            email = emailInput;
            emailStep = 'edit';
            emailCode = '';
        } catch (err: any) {
            console.error('Confirm email error:', err);
            emailError = err?.message || 'Code invalide ou expiré.';
        } finally {
            emailLoading = false;
        }
    }

    async function resendAttributeCode(userAttributeKey: 'email' | 'phone_number') {
        const setLoading = (val: boolean) => {
            if (userAttributeKey === 'email') emailLoading = val; else phoneLoading = val;
        };
        const setError = (msg: string) => {
            if (userAttributeKey === 'email') emailError = msg; else phoneError = msg;
        };
        const setSuccess = (msg: string) => {
            if (userAttributeKey === 'email') emailSuccess = msg; else phoneSuccess = msg;
        };
        try {
            setLoading(true);
            setError('');
            const { tokens } = await fetchAuthSession({ forceRefresh: false });
            const accessToken = tokens?.accessToken?.toString();
            if (!accessToken) throw new Error('Session invalide');
            const client = new CognitoIdentityProviderClient({ region: PUBLIC_AWS_REGION });
            await client.send(new GetUserAttributeVerificationCodeCommand({
                AccessToken: accessToken,
                AttributeName: userAttributeKey
            }));
            setSuccess(userAttributeKey === 'email' ? `Un nouveau code a été envoyé à ${emailInput}.` : 'Un nouveau code a été envoyé par SMS.');
        } catch (err: any) {
            console.error('Resend attribute code error:', err);
            setError(err?.message || 'Impossible de renvoyer le code.');
        } finally {
            setLoading(false);
        }
    }

    async function resendEmailCode() { await resendAttributeCode('email'); }
    async function resendPhoneCode() { await resendAttributeCode('phone_number'); }

    function normalizePhone(input: string): string {
        // Très simple validation/normalisation: exige le format E.164
        const trimmed = input.replace(/\s|-/g, '');
        return trimmed.startsWith('+') ? trimmed : trimmed;
    }

    async function handleUpdatePhone(e: Event) {
        e.preventDefault();
        phoneLoading = true;
        phoneError = '';
        phoneSuccess = '';
        try {
            const normalized = normalizePhone(phoneInput);
            if (!/^\+\d{7,15}$/.test(normalized)) {
                phoneError = 'Numéro invalide. Utilisez le format international, ex: +33612345678';
                return;
            }
            await updateUserAttributes({ userAttributes: { phone_number: normalized } });
            phoneStep = 'verify';
            phoneSuccess = 'Un code a été envoyé par SMS.';
        } catch (err: any) {
            console.error('Update phone error:', err);
            phoneError = err?.message || 'Erreur lors de la mise à jour du téléphone.';
        } finally {
            phoneLoading = false;
        }
    }

    async function handleConfirmPhone(e: Event) {
        e.preventDefault();
        phoneLoading = true;
        phoneError = '';
        phoneSuccess = '';
        try {
            await confirmUserAttribute({ userAttributeKey: 'phone_number', confirmationCode: phoneCode });
            phoneSuccess = 'Téléphone vérifié et mis à jour.';
            phone = phoneInput;
            phoneStep = 'edit';
            phoneCode = '';
        } catch (err: any) {
            console.error('Confirm phone error:', err);
            phoneError = err?.message || 'Code invalide ou expiré.';
        } finally {
            phoneLoading = false;
        }
    }
</script>

<div class="container">
    <h1>Mon compte</h1>

    {#if globalError}
        <div class="alert error">{globalError}</div>
    {/if}

    {#if loadingProfile}
        <p>Chargement…</p>
    {:else}
        <section class="card">
            <h2>Identité</h2>
            {#if namesSuccess}<div class="alert success">{namesSuccess}</div>{/if}
            {#if namesError}<div class="alert error">{namesError}</div>{/if}
            <form onsubmit={handleUpdateNames} class="form">
                <div class="row">
                    <div class="field">
                        <label for="firstName">Prénom</label>
                        <input id="firstName" type="text" bind:value={firstName} required disabled={namesLoading} />
                    </div>
                    <div class="field">
                        <label for="lastName">Nom</label>
                        <input id="lastName" type="text" bind:value={lastName} required disabled={namesLoading} />
                    </div>
                </div>
                <button type="submit" disabled={namesLoading}>{namesLoading ? 'Enregistrement…' : 'Mettre à jour'}</button>
            </form>
        </section>

        <section class="card">
            <h2>Email</h2>
            {#if emailSuccess}<div class="alert success">{emailSuccess}</div>{/if}
            {#if emailError}<div class="alert error">{emailError}</div>{/if}

            {#if emailStep === 'edit'}
                <form onsubmit={handleUpdateEmail} class="form">
                    <div class="field">
                        <label for="email">Email</label>
                        <input id="email" type="email" bind:value={emailInput} required disabled={emailLoading} />
                        <small>Actuel: {email || '—'}</small>
                    </div>
                    <button type="submit" disabled={emailLoading}>{emailLoading ? 'Envoi du code…' : 'Mettre à jour l\'email'}</button>
                </form>
            {:else}
                <form onsubmit={handleConfirmEmail} class="form">
                    <div class="field">
                        <label for="emailCode">Code de vérification</label>
                        <input id="emailCode" type="text" bind:value={emailCode} placeholder="123456" maxlength="6" required disabled={emailLoading} />
                        <small>Un code a été envoyé à {emailInput}.</small>
                    </div>
                    <div class="row">
                        <button type="submit" disabled={emailLoading}>{emailLoading ? 'Vérification…' : 'Confirmer l\'email'}</button>
                        <button type="button" onclick={resendEmailCode} disabled={emailLoading}>Renvoyer le code</button>
                    </div>
                </form>
            {/if}
        </section>

        <section class="card">
            <h2>Téléphone</h2>
            {#if phoneSuccess}<div class="alert success">{phoneSuccess}</div>{/if}
            {#if phoneError}<div class="alert error">{phoneError}</div>{/if}

            {#if phoneStep === 'edit'}
                <form onsubmit={handleUpdatePhone} class="form">
                    <div class="field">
                        <label for="phone">Téléphone</label>
                        <input id="phone" type="tel" bind:value={phoneInput} placeholder="+33612345678" required disabled={phoneLoading} />
                        <small>Actuel: {phone || '—'}</small>
                    </div>
                    <button type="submit" disabled={phoneLoading}>{phoneLoading ? 'Envoi du code…' : 'Mettre à jour le téléphone'}</button>
                </form>
            {:else}
                <form onsubmit={handleConfirmPhone} class="form">
                    <div class="field">
                        <label for="phoneCode">Code SMS</label>
                        <input id="phoneCode" type="text" bind:value={phoneCode} placeholder="123456" maxlength="6" required disabled={phoneLoading} />
                        <small>Un code a été envoyé par SMS.</small>
                    </div>
                    <div class="row">
                        <button type="submit" disabled={phoneLoading}>{phoneLoading ? 'Vérification…' : 'Confirmer le téléphone'}</button>
                        <button type="button" onclick={resendPhoneCode} disabled={phoneLoading}>Renvoyer le code</button>
                    </div>
                </form>
            {/if}
        </section>

        <div class="links">
            <a href="/">Accueil</a>
            <span class="separator">•</span>
            <button type="button" onclick={logout} class="link-button">Se déconnecter</button>
        </div>
    {/if}
</div>

<style>
    .container { max-width: 700px; margin: 30px auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
    h1 { margin: 0 0 20px; font-size: 24px; text-align: center; }
    .card { border-top: 1px solid #eee; padding-top: 18px; margin-top: 18px; }
    .form { margin-top: 12px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { margin-bottom: 14px; }
    label { display:block; margin-bottom:6px; font-weight:500; }
    input { width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:4px; font-size:15px; }
    input:disabled { background: #f5f5f5; }
    small { display:block; margin-top:6px; color:#666; }
    button { padding:10px 14px; background:#0066cc; color:#fff; border:none; border-radius:4px; cursor:pointer; }
    button:disabled { background:#ccc; cursor:not-allowed; }
    .alert { padding:10px 12px; border-radius:4px; margin: 8px 0; font-size:14px; }
    .alert.success { background:#d4edda; color:#155724; border:1px solid #c3e6cb; }
    .alert.error { background:#f8d7da; color:#721c24; border:1px solid #f5c6cb; }
    .links { text-align:center; margin-top: 18px; }
    .separator { margin: 0 8px; color: #999; }
    .link-button { background:none; border:none; color:#0066cc; cursor:pointer; padding:0; font-size:14px; }
    .link-button:hover { text-decoration: underline; }
    @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
</style>
