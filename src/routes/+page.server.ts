import { fanout } from '$lib/server/fanout';
import { info } from '$lib/server/info';
import { serverLabel } from '$lib/server/zoo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const t0 = Date.now();
	const calls = await fanout();
	return { name: info.name, server: serverLabel(), calls, ms: Date.now() - t0 };
};
