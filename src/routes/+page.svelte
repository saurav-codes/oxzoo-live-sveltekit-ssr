<script lang="ts">
	let { data } = $props();
	const passed = $derived(data.calls.filter((c) => c.ok).length);
</script>

<main>
	<h1>SSR fan-out</h1>
	<p>
		Rendered on <strong>{data.name}@{data.server}</strong> in {data.ms} ms: three calls in parallel,
		server-side, {passed} of {data.calls.length} passed. Signed calls use a key the browser never sees.
	</p>
	<table>
		<thead>
			<tr><th>Step</th><th>Peer</th><th>Path</th><th>Status</th><th>ms</th><th>Result</th></tr>
		</thead>
		<tbody>
			{#each data.calls as c (c.step)}
				<tr class={c.ok ? 'ok' : 'fail'}>
					<td>{c.step}</td>
					<td>{c.peer}</td>
					<td><code>{c.path}</code></td>
					<td>{c.status ?? '-'}</td>
					<td>{c.ms}</td>
					<td>
						{#if c.ok}{c.summary}{:else}{c.error}{/if}
						{#if c.preview}<pre>{c.preview}</pre>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p><a href="/_zoo/health">health</a> · <a href="/_zoo/probe">probe</a></p>
</main>

<style>
	main { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #333; }
	table { border-collapse: collapse; width: 100%; }
	th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #ddd; vertical-align: top; }
	tr.ok td:first-child { border-left: 4px solid #2e9d5b; }
	tr.fail td:first-child { border-left: 4px solid #d64545; }
	pre { margin: 0.3rem 0 0; font-size: 0.75rem; white-space: pre-wrap; word-break: break-all; color: #777; }
</style>
