<script lang="ts">
	import type { Snippet } from 'svelte'
	interface Props {
		data: any
		children?: Snippet
	}

	let { data, children }: Props = $props()
    const { places } = data
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1>Compte privé</h1>
{@render children?.()}
<pre>{JSON.stringify(places, null, 2)}</pre>
<style>
	form {
		display: none;
	}
</style>
