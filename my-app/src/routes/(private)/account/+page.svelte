<script lang="ts">
    import { authStore } from '$lib/store/authStore';

    const logout = async (e: Event): Promise<void> => {
        e.preventDefault();
        await authStore.logout();
    };
</script>
<h2>Ma page privée</h2>

<a href="/">Accueil</a>

<a onclick={logout} href="#">Se déconnecter</a>