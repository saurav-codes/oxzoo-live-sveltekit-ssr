import { info } from '$lib/server/info';
import { env, peerCheck, preflight, probe, readJSON, variable, type CheckSpec } from '$lib/server/zoo';
import type { RequestHandler } from './$types';

const checks: CheckSpec[] = [
	peerCheck(info, 'catalog-api', 'CATALOG_URL', 'INTERNAL_TOKEN'),
	peerCheck(info, 'axum-cache', 'AXUM_URL', 'INTERNAL_TOKEN'),
	{
		id: 'peer:search-svc',
		label: 'Public search on search-svc',
		env: ['SEARCH_URL'],
		cross: true,
		async run(ctx) {
			const base = env('SEARCH_URL')!.replace(/\/+$/, '');
			const h = await fetch(`${base}/_zoo/health`, { signal: ctx.signal, redirect: 'manual' });
			const hb = await readJSON(h);
			if (hb.server) ctx.hops.push(`search-svc@${hb.server}`);
			if (h.status !== 200 || hb.name !== 'search-svc') throw new Error(`health status ${h.status}, name ${JSON.stringify(hb.name)}`);
			const res = await fetch(`${base}/api/search?q=zoo`, { signal: ctx.signal, redirect: 'manual' });
			const body = await readJSON(res);
			if (res.status !== 200) throw new Error(`/api/search status ${res.status}`);
			return `search-svc answered /api/search?q=zoo with keys ${Object.keys(body).slice(0, 5).join(', ')}`;
		}
	},
	{
		id: 'origin',
		label: 'ORIGIN matches PUBLIC_URL',
		env: ['ORIGIN', 'PUBLIC_URL'],
		async run() {
			if (env('ORIGIN') !== env('PUBLIC_URL')) throw new Error('ORIGIN differs from PUBLIC_URL (set ORIGIN=${PUBLIC_URL})');
			return 'adapter-node origin equals the provided PUBLIC_URL';
		}
	}
];

export const GET: RequestHandler = ({ request }) =>
	probe(request, info, checks, [
		variable('INTERNAL_TOKEN', 'signs'),
		variable('ORIGIN', 'reference', { peer: 'PUBLIC_URL' }),
		variable('PUBLIC_URL', 'plain', { show: true }),
		variable('CATALOG_URL', 'url', { peer: 'catalog-api', show: true }),
		variable('SEARCH_URL', 'url', { peer: 'search-svc', show: true }),
		variable('AXUM_URL', 'url', { peer: 'axum-cache', show: true }),
		variable('ZOO_PANEL_ORIGIN', 'plain', { show: true })
	]);
export const OPTIONS: RequestHandler = ({ request }) => preflight(request);
