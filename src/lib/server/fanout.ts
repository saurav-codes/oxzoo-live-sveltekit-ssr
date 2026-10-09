// The ssr-fanout calls: catalog-api and axum-cache signed with INTERNAL_TOKEN,
// search-svc public. Server-side only: the secret never reaches the browser.
import { env } from '$env/dynamic/private';
import { errorText, readJSON, signedFetch } from './zoo';

export type Step = 'catalog' | 'search' | 'axum';

export interface Call {
	step: Step;
	peer: string;
	path: string;
	ok: boolean;
	status?: number;
	ms: number;
	summary?: string;
	preview?: string;
	error?: string;
}

const TIMEOUT_MS = 8000;

const targets: { step: Step; peer: string; urlVar: string; path: string; signed: boolean }[] = [
	{ step: 'catalog', peer: 'catalog-api', urlVar: 'CATALOG_URL', path: '/api/items', signed: true },
	{ step: 'search', peer: 'search-svc', urlVar: 'SEARCH_URL', path: '/api/search?q=zoo', signed: false },
	{ step: 'axum', peer: 'axum-cache', urlVar: 'AXUM_URL', path: '/api/cache/zoo', signed: true }
];

export function summarize(body: unknown): string {
	if (Array.isArray(body)) return `${body.length} entries`;
	if (body && typeof body === 'object') {
		for (const key of ['items', 'hits', 'results']) {
			const v = (body as Record<string, unknown>)[key];
			if (Array.isArray(v)) return `${v.length} ${key}`;
		}
		return `keys: ${Object.keys(body).slice(0, 8).join(', ')}`;
	}
	return typeof body;
}

async function call(t: (typeof targets)[number], trace?: string): Promise<Call> {
	const t0 = Date.now();
	const out: Call = { step: t.step, peer: t.peer, path: t.path, ok: false, ms: 0 };
	try {
		const base = env[t.urlVar]?.replace(/\/+$/, '');
		if (!base) throw new Error(`${t.urlVar} is not set`);
		const url = base + t.path;
		const signal = AbortSignal.timeout(TIMEOUT_MS);
		let res: Response;
		if (t.signed) {
			const key = env.INTERNAL_TOKEN;
			if (!key) throw new Error('INTERNAL_TOKEN is not set');
			res = await signedFetch(url, key, 'sveltekit-ssr', { signal, trace });
		} else {
			res = await fetch(url, { signal, redirect: 'manual', headers: trace ? { 'X-Zoo-Trace': trace } : {} });
		}
		out.status = res.status;
		const body = await readJSON(res);
		out.summary = summarize(body);
		out.preview = JSON.stringify(body).slice(0, 400);
		if (res.status !== 200) throw new Error(`status ${res.status}${body.error ? `: ${body.error}` : ''}`);
		out.ok = true;
	} catch (e) {
		out.error = errorText(e as Error, TIMEOUT_MS);
	}
	out.ms = Date.now() - t0;
	return out;
}

export function fanout(trace?: string): Promise<Call[]> {
	return Promise.all(targets.map((t) => call(t, trace)));
}
