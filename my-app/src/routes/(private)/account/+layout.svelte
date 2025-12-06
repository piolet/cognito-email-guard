<script lang="ts">
	import type { Snippet } from 'svelte'
    import { onMount } from 'svelte';
    import { authStore } from '$lib/store/authStore';

	interface Props {
		data: any
		children?: Snippet
	}

	let { data, children }: Props = $props()
    const { places, user } = data

    let idToken = $state(data.idToken)
    onMount(() => {
        authStore.init();
    });
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1>Compte privé</h1>
{@render children?.()}
<pre>{JSON.stringify(places, null, 2)}</pre>
<input bind:value={idToken} type="text"/>
<style>
	form {
		display: none;
	}
</style>
