import { fanout } from '$lib/server/fanout';
import { traces } from '$lib/server/info';
import { json, preflight, startChain } from '$lib/server/zoo';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, params }) => {
	if (params.chain !== 'ssr-fanout') return json(request, 404, { error: 'unknown chain' });
	return startChain(request, async (trace) => {
		for (const c of await fanout(trace)) {
			const detail = c.ok ? `${c.peer} ${c.status} in ${c.ms} ms, ${c.summary}` : `${c.peer}: ${c.error}`;
			traces.add(trace, c.ok ? c.step : `${c.step}-failed`, detail);
		}
	});
};
export const OPTIONS: RequestHandler = ({ request }) => preflight(request);
