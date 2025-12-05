<script lang="ts">
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';

  type CognitoAttribute = { Name: string; Value?: string };
  type CognitoUser = {
    Username: string;
    UserStatus?: string;
    Enabled?: boolean;
    UserCreateDate?: string;
    UserLastModifiedDate?: string;
    Attributes?: CognitoAttribute[];
  };

  const defaultEndpoint = 'http://localhost:9229';
  const endpoint = writable(defaultEndpoint);
  const userPoolId = writable('');
  const users = writable<CognitoUser[]>([]);
  const loading = writable(false);
  const error = writable<string | null>(null);
  const success = writable<string | null>(null);
  const creating = writable(false);
  const deleting = writable<string | null>(null);
  const newUser = writable({ username: '', email: '', tempPassword: '' });

  const saveSettings = () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('cognitoEndpoint', get(endpoint));
    localStorage.setItem('cognitoPool', get(userPoolId));
  };

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    const storedEndpoint = localStorage.getItem('cognitoEndpoint');
    const storedPool = localStorage.getItem('cognitoPool');
    if (storedEndpoint) endpoint.set(storedEndpoint);
    if (storedPool) userPoolId.set(storedPool);
  });

  const buildUrl = () => {
    const base = new URL(window.location.href);
    base.pathname = '/api/users';
    base.search = '';
    return base;
  };

  async function fetchUsers() {
    if (!get(userPoolId)) {
      error.set('Merci de renseigner un user pool ID');
      return;
    }
    loading.set(true);
    error.set(null);
    success.set(null);
    saveSettings();
    try {
      const url = buildUrl();
      url.searchParams.set('endpoint', get(endpoint));
      url.searchParams.set('userPoolId', get(userPoolId));
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erreur API ${res.status}`);
      const data = await res.json();
      users.set(data.users ?? []);
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      loading.set(false);
    }
  }

  const getNewUser = () => get(newUser);

  async function createUser() {
    if (!get(userPoolId)) {
      error.set('Merci de renseigner un user pool ID');
      return;
    }
    creating.set(true);
    error.set(null);
    success.set(null);
    saveSettings();
    try {
      const current = getNewUser();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: get(endpoint),
          userPoolId: get(userPoolId),
          username: current.username,
          email: current.email,
          tempPassword: current.tempPassword || undefined
        })
      });
      if (!res.ok) throw new Error(await res.text());
      success.set('Utilisateur créé');
      newUser.set({ username: '', email: '', tempPassword: '' });
      await fetchUsers();
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Impossible de créer l’utilisateur');
    } finally {
      creating.set(false);
    }
  }

  async function deleteUser(username: string) {
    if (!confirm(`Supprimer ${username} ?`)) return;
    deleting.set(username);
    error.set(null);
    success.set(null);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: get(endpoint),
          userPoolId: get(userPoolId),
          username
        })
      });
      if (!res.ok) throw new Error(await res.text());
      success.set('Utilisateur supprimé');
      await fetchUsers();
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Impossible de supprimer l’utilisateur');
    } finally {
      deleting.set(null);
    }
  }
</script>

<section>
  <h1>Dashboard Cognito Local</h1>
  <form class="settings" on:submit|preventDefault={fetchUsers}>
    <label>
      Endpoint
      <input bind:value={$endpoint} placeholder="http://localhost:9229" required />
    </label>
    <label>
      User pool ID
      <input bind:value={$userPoolId} placeholder="heustach-local" required />
    </label>
    <button type="submit" disabled={$loading}>
      {$loading ? 'Chargement…' : 'Charger les utilisateurs'}
    </button>
  </form>

  {#if $error}
    <p class="alert error">{$error}</p>
  {/if}
  {#if $success}
    <p class="alert success">{$success}</p>
  {/if}

  <form class="create" on:submit|preventDefault={createUser}>
    <h2>Créer un utilisateur</h2>
    <div class="fields">
      <label>
        Username
        <input bind:value={$newUser.username} required />
      </label>
      <label>
        Email
        <input type="email" bind:value={$newUser.email} required />
      </label>
      <label>
        Mot de passe temporaire
        <input bind:value={$newUser.tempPassword} placeholder="Optionnel" />
      </label>
    </div>
    <button type="submit" disabled={$creating}>
      {$creating ? 'Création…' : 'Créer'}
    </button>
  </form>

  {#if $users.length === 0}
    <p>Aucun utilisateur à afficher.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Status</th>
          <th>Enabled</th>
          <th>Attributs</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each $users as user}
          <tr>
            <td>
              <strong>{user.Username}</strong>
              <small>
                Créé le {user.UserCreateDate ? new Date(user.UserCreateDate).toLocaleString() : '—'}
              </small>
            </td>
            <td>{user.UserStatus ?? '—'}</td>
            <td>{user.Enabled ? 'Oui' : 'Non'}</td>
            <td>
              {#if user.Attributes?.length}
                <ul>
                  {#each user.Attributes as attr}
                    <li><span>{attr.Name}</span>: {attr.Value ?? '—'}</li>
                  {/each}
                </ul>
              {:else}
                —
              {/if}
            </td>
            <td>
              <button
                type="button"
                class="danger"
                on:click={() => deleteUser(user.Username)}
                disabled={$deleting === user.Username}
              >
                {$deleting === user.Username ? 'Suppression…' : 'Supprimer'}
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .settings,
  .create {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #f6f8fa;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .settings label,
  .create label {
    display: flex;
    flex-direction: column;
    font-weight: 600;
  }

  input,
  button {
    padding: 0.5rem;
    font-size: 1rem;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
  }

  .alert.error {
    background: #ffe6e6;
    color: #8a1f1f;
  }

  .alert.success {
    background: #e5f9ed;
    color: #116329;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid #d0d7de;
    padding: 0.75rem;
    text-align: left;
    vertical-align: top;
  }

  ul {
    margin: 0;
    padding-left: 1rem;
  }

  .danger {
    background: #fdf2f2;
    border: 1px solid #f97373;
  }
</style>
