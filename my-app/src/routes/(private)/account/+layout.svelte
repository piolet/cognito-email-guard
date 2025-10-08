<script lang="ts">
	import type { Snippet } from 'svelte'
	interface Props {
		data: any
		children?: Snippet
	}

	let { children }: Props = $props()
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1>Compte privé</h1>
{@render children?.()}
<style>
	form {
		display: none;
	}
</style>
