import { TraceRing, type AppInfo } from './zoo';

export const info: AppInfo = {
	name: 'sveltekit-ssr',
	stack: 'SvelteKit adapter-node',
	build: { built_at: __BUILT_AT__ }
};

export const traces = new TraceRing();
