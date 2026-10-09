import { info } from '$lib/server/info';
import { health, json, preflight } from '$lib/server/zoo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => json(request, 200, health(info));
export const OPTIONS: RequestHandler = ({ request }) => preflight(request);
