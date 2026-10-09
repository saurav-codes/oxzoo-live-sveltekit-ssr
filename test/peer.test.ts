// The probe's peer check against a fake verifier: it passes only when the
// signature verifies and name, key_fp and public_url all match.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fp, peerCheck, runCheck, verifySignature } from '../src/lib/server/zoo.ts';

const info = { name: 'sveltekit-ssr', stack: 'test' };

async function fakePeer(key: string, answer: (url: string) => Record<string, unknown>) {
	const srv = createServer((req, res) => {
		const v = verifySignature(req.headers['x-zoo-signature'] as string, key, ['sveltekit-ssr'], req.method!, req.url!, '');
		res.writeHead(v.ok ? 200 : 401, { 'content-type': 'application/json' });
		res.end(JSON.stringify(v.ok ? answer(`http://127.0.0.1:${(srv.address() as AddressInfo).port}`) : v));
	});
	await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
	return { srv, url: `http://127.0.0.1:${(srv.address() as AddressInfo).port}` };
}

test('peer check passes with matching key, name and URL', async () => {
	const key = 'k-'.repeat(20);
	const { srv, url } = await fakePeer(key, (u) => ({ ok: true, name: 'catalog-api', key_fp: fp(key), public_url: u, server: 's2' }));
	process.env.CATALOG_URL = url + '/';
	process.env.INTERNAL_TOKEN = key;
	const c = await runCheck(info, peerCheck(info, 'catalog-api', 'CATALOG_URL', 'INTERNAL_TOKEN'));
	srv.close();
	assert.equal(c.ok, true, c.error);
	assert.deepEqual(c.hops, ['sveltekit-ssr@local', 'catalog-api@s2']);
	assert.deepEqual(c.env, ['CATALOG_URL', 'INTERNAL_TOKEN']);
});

test('peer check fails on wrong key, wrong name, wrong URL, missing var', async () => {
	const key = 'right-key-0123456789';
	const { srv, url } = await fakePeer(key, () => ({ ok: true, name: 'axum-cache', key_fp: fp(key), public_url: 'https://elsewhere.example' }));
	process.env.CATALOG_URL = url;
	process.env.INTERNAL_TOKEN = 'wrong-key-0123456789';
	const bad = await runCheck(info, peerCheck(info, 'catalog-api', 'CATALOG_URL', 'INTERNAL_TOKEN'));
	assert.equal(bad.ok, false);
	assert.match(bad.error!, /status 401: bad signature/);
	process.env.INTERNAL_TOKEN = key;
	const name = await runCheck(info, peerCheck(info, 'catalog-api', 'CATALOG_URL', 'INTERNAL_TOKEN'));
	assert.match(name.error!, /peer name is "axum-cache"/);
	const u = await runCheck(info, peerCheck(info, 'axum-cache', 'CATALOG_URL', 'INTERNAL_TOKEN'));
	assert.match(u.error!, /public_url .* != CATALOG_URL/);
	srv.close();
	delete process.env.INTERNAL_TOKEN;
	const missing = await runCheck(info, peerCheck(info, 'catalog-api', 'CATALOG_URL', 'INTERNAL_TOKEN'));
	assert.equal(missing.error, 'INTERNAL_TOKEN is not set');
});
