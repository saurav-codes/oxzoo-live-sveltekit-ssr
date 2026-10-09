import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: { __BUILT_AT__: JSON.stringify(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')) }
});
