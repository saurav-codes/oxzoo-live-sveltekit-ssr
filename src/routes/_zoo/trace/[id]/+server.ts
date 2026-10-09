import { traces } from '$lib/server/info';
import { preflight, traceResponse } from '$lib/server/zoo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, params }) => traceResponse(request, traces, params.id);
export const OPTIONS: RequestHandler = ({ request }) => preflight(request);
