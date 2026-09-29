# VEYNOA

**Speak. Think. Remember.** An account-free, local-first Expo notebook with optional Cloudflare AI.

This is an implemented development baseline across phases 0–12, **not a production-complete release**. See [the phase audit](docs/AUDIT.md) for scope, evidence and remaining work.

The workspace expansion adds inbox, collections, projects, planning, templates, scoped Ask, note actions, reminders, links, history, attachments, meetings, sharing, Commands and an encrypted vault. The new **Intelligence studio** adds a knowledge graph, historical memory, analytics, experimental web-local models, multimodal evidence search, decisions, resurfacing, learning cards and approved goal plans, plus an upgraded thinking canvas. See the [advanced implementation audit](docs/INTELLIGENCE_AUDIT.md), [20-feature audit](docs/FEATURE_EXPANSION_AUDIT.md), and [complete baseline + 30 manual testing guide](docs/FEATURE_TESTING_GUIDE.md).

## Run

Requires Node 24 and npm.

```sh
npm ci
npm start
```

Scan the QR with an SDK-55-compatible Expo Go app. Notes work without a gateway; cloud AI starts disabled. On this Windows machine, use the working npm command shim if `npm.ps1` fails:

Incoming system sharing and Face ID require a native development build containing the configured plugins. A successful Expo export does not validate those native integrations. Use the web preview for local workspace testing first.

```powershell
& 'C:\Program Files\nodejs\npm.cmd' start
```

Web preview with SQLite WASM isolation headers:

```sh
npm run export -w @veynoa/mobile
node scripts/preview.mjs
```

Open [the preview](http://127.0.0.1:8081). Web supports persistent notes and a text-search fallback; durable audio is native-only. Web hosting requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Expo web SQLite is experimental.

## AI gateway

```sh
npm run gateway:dev
# Authenticate Wrangler to your Cloudflare account before deployment:
npm run gateway:deploy
```

Review `services/ai-gateway/wrangler.jsonc`. Set allowed browser origins, verify model availability and quotas, then copy the deployed HTTPS Worker URL into app Settings. Turning local-only off permits selected note/audio content to be sent to this gateway and Workers AI. Provider credentials never belong in the app.

The gateway has per-IP and per-installation limits. An installation UUID is not authentication or a global spending cap. Configure provider budget controls before public exposure. No deployment was performed during implementation.

## Verify

```sh
npm run typecheck
npm test
npm run dry-run -w @veynoa/ai-gateway
```

Run the [physical-device checklist](docs/DEVICE_CHECKLIST.md) before release. Successful JavaScript bundles are not installed APK/IPA builds.

## Repository

- `apps/mobile`: routes, UI, state/use cases, SQLite, audio and inference client.
- `packages/domain`: unified note model and deterministic helpers.
- `packages/ai-contracts`: executable Zod contracts.
- `services/ai-gateway`: stateless Cloudflare inference routes.
- `tests`: domain, SQLite, privacy and gateway checks.
- Root specification documents: scope, architecture, database, AI, design and roadmap.

Implementation references: [Expo SDK 55 audio](https://docs.expo.dev/versions/v55.0.0/sdk/audio/), [Expo SQLite](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/), [Cloudflare Whisper](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/), [Workers AI models](https://developers.cloudflare.com/workers-ai/models/). Free allowances do not guarantee unlimited free service.
