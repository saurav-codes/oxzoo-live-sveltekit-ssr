# sveltekit-ssr

Deployed with [ox](https://deploywithox.com): deploy a repo to your own server with one command, no Docker. [Docs](https://deploywithox.com/docs) · [Guide for this stack](https://deploywithox.com/docs/guides/sveltekit)

**Live demo:** https://sveltekit-ssr.s1.zoo.sorv.dev

> **Role in the zoo:** project `sveltekit-ssr` of [oxzoo-live](https://github.com/saurav-codes/oxzoo-live-control/blob/main/zoo/README.md#projects), deployed with [ox](https://deploywithox.com) on server s1 at https://sveltekit-ssr.s1.zoo.sorv.dev. The contract it follows is [DESIGN.md](https://github.com/saurav-codes/oxzoo-live-control/blob/main/zoo/DESIGN.md).

SvelteKit with `@sveltejs/adapter-node`, on s1. The home page's server `load`
fans out, in parallel and server-side, to three projects on two other servers:

| Step | Peer | Call | Auth |
|------|------|------|------|
| `catalog` | catalog-api (s2) | `GET ${CATALOG_URL}/api/items` | zoo-sig v1 with `INTERNAL_TOKEN` |
| `search` | search-svc (s2) | `GET ${SEARCH_URL}/api/search?q=zoo` | public |
| `axum` | axum-cache (s4) | `GET ${AXUM_URL}/api/cache/zoo` | zoo-sig v1 with `INTERNAL_TOKEN` |

Each call has an 8 s timeout, and the page shows each one's status, time and a
short preview. The key is read from `$env/dynamic/private` and only signs on the
server: it is never serialized into the page or the client bundle.

## What it proves

- Proof level P3: signed cross-server calls with a shared secret set as an ox
  variable, with matching key fingerprints and URL values.
- Chain `ssr-fanout` (starter): `POST /_zoo/chain/ssr-fanout {"trace": "<uuid>"}`
  runs the three calls with `X-Zoo-Trace`, and records the hops `catalog`,
  `search`, `axum` (or `<step>-failed` with the reason) in a 200-entry in-memory
  ring with a 1 h TTL, read at `GET /_zoo/trace/<id>`.
- `ORIGIN=${PUBLIC_URL}`: an ox reference to a provided key, which adapter-node
  needs to know its public origin behind Caddy.

## ox features exercised

- Zero-config detection of SvelteKit adapter-node: `npm ci`, `npm run build`,
  start `node build` (adapter-node reads `HOST` and `PORT`).
- Node pinned by `package.json` `engines.node` (24).
- Variables: secrets of yours, plain values, and a `${PUBLIC_URL}` reference.

## Endpoints

| Path | What |
|------|------|
| `GET /` | the SSR fan-out page |
| `GET /_zoo/health` | contract health (`build.built_at` is a build-time constant) |
| `GET /_zoo/probe` | checks below |
| `POST /_zoo/chain/ssr-fanout` | starts the chain (202, 10 starts a minute) |
| `GET /_zoo/trace/<id>` | hops recorded for a trace |

Probe checks:

- `peer:catalog-api`, `peer:axum-cache`: signed `GET /_zoo/verify`; passes only on
  status 200, the expected `name`, `key_fp` equal to our fp of `INTERNAL_TOKEN`, and
  `public_url` equal to `CATALOG_URL` / `AXUM_URL`.
- `peer:search-svc`: `GET ${SEARCH_URL}/_zoo/health` names search-svc, and
  `GET /api/search?q=zoo` answers 200 with JSON.
- `origin`: `ORIGIN` equals `PUBLIC_URL`.

## Variables

| Name | Source | Role in probe |
|------|--------|---------------|
| `PORT`, `HOST`, `PUBLIC_URL`, `PUBLIC_HOST`, `OX_ENV`, `OX_RELEASE` | provided by ox | `PUBLIC_URL` plain |
| `INTERNAL_TOKEN` | yours, secret, shared with catalog-api and axum-cache | signs (fp only) |
| `ORIGIN` | yours, `${PUBLIC_URL}` | reference, peer `PUBLIC_URL` |
| `CATALOG_URL` | yours, `https://catalog-api.s2.zoo.sorv.dev` | url |
| `SEARCH_URL` | yours, `https://search-svc.s2.zoo.sorv.dev` | url |
| `AXUM_URL` | yours, `https://axum-cache.s4.zoo.sorv.dev` | url |
| `ZOO_PANEL_ORIGIN` | yours, `https://zoo-control.s1.zoo.sorv.dev` | plain |

## Run and test

```sh
npm ci
npm test                 # node:test: zoo-sig vectors, verify reasons, CORS, trace ids, ring, rate limit, probe lock, peer check against a fake verifier
npm run build
PORT=3000 HOST=127.0.0.1 ORIGIN=http://127.0.0.1:3000 INTERNAL_TOKEN=... CATALOG_URL=... SEARCH_URL=... AXUM_URL=... node build
```

Local result (2026-10-09): `npm test` 10 of 10 pass; `npm run build` passes; with
three fake peers on loopback (two verifying zoo-sig v1) the page renders 3 of 3,
`/_zoo/probe` is `ok: true`, the chain records `catalog`, `search`, `axum`, the
11th chain start in a minute gets 429, the key does not appear in the HTML or in
`build/client`, and CORS answers only `ZOO_PANEL_ORIGIN` (preflight 204 with
methods, headers and max age). Not verified here: the real peers over HTTPS.

## ox check

```console
ox check ~/oxzoo-live/sveltekit-ssr (manifest: none)

  app.start                  node build                                           detected:svelte.config.js
  build.install              npm ci                                               detected:package-lock.json
  build.commands[0]          npm run build                                        detected:package.json
  tools.node                 24                                                   detected:package.json

  Provided by ox: PORT, HOST, OX_ENV, OX_PROJECT, OX_RELEASE, OX_DATA_DIR, PUBLIC_URL, PUBLIC_HOST
  Set on the dashboard before the first deploy: INTERNAL_TOKEN, ORIGIN, CATALOG_URL, SEARCH_URL, AXUM_URL, ZOO_PANEL_ORIGIN

Ready to deploy.
```
